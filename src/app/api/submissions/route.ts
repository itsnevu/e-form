import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { saveProof } from "@/lib/storage";
import { answersSchema } from "@/lib/validation";
import { EVENT, IDENTITY } from "@/config/form";
import { hit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!hit(`submit:${ip}`, 5, 60 * 60_000)) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan. Coba lagi dalam satu jam." },
      { status: 429 },
    );
  }

  const form = await req.formData();

  const raw = Object.fromEntries(
    Array.from(form.entries())
      .filter(([k, v]) => k !== "proof" && typeof v === "string")
      .map(([k, v]) => [k, v as string]),
  );

  const parsed = answersSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", fields: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const proof = form.get("proof");
  if (!(proof instanceof File) || proof.size === 0) {
    return NextResponse.json({ error: "Bukti pembayaran wajib diunggah" }, { status: 400 });
  }

  let saved;
  try {
    saved = await saveProof(proof);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  const answers = parsed.data as Record<string, string>;
  const submission = await prisma.submission.create({
    data: {
      name: answers[IDENTITY.nameField],
      email: answers[IDENTITY.emailField],
      answers,
      amount: EVENT.price,
      senderName: (form.get("senderName") as string) || null,
      proofPath: saved.path,
      proofMime: saved.mime,
      proofSize: saved.size,
    },
    select: { publicToken: true },
  });

  return NextResponse.json({ token: submission.publicToken });
}
