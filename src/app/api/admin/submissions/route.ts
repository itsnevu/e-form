import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sendDecision } from "@/lib/email";

const bodySchema = z.object({
  ids: z.array(z.string().cuid()).min(1).max(200),
  action: z.enum(["approve", "reject"]),
  reason: z.string().max(300).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 });

  const { ids, action, reason } = parsed.data;
  const kind = action === "approve" ? "APPROVED" : "REJECTED";

  // Hanya proses yang masih AWAITING_REVIEW, supaya klik ganda tidak mengirim email dua kali.
  const targets = await prisma.submission.findMany({
    where: { id: { in: ids }, status: "AWAITING_REVIEW" },
    select: { id: true, email: true, name: true },
  });

  if (targets.length === 0) {
    return NextResponse.json({ error: "Tidak ada data yang bisa diproses" }, { status: 409 });
  }

  await prisma.submission.updateMany({
    where: { id: { in: targets.map((t) => t.id) } },
    data: {
      status: kind,
      reviewedAt: new Date(),
      reviewedBy: session.user.id,
      rejectReason: action === "reject" ? (reason ?? null) : null,
    },
  });

  // Status sudah tersimpan sebelum email dikirim: kalau SMTP gagal, keputusan tidak hilang
  // dan kegagalannya tercatat per baris untuk di-retry.
  const results = await Promise.allSettled(
    targets.map((t) => sendDecision(t.email, t.name, action === "approve" ? "approved" : "rejected", reason)),
  );

  const failed: { id: string; error: string }[] = [];
  await Promise.all(
    results.map((r, i) => {
      const t = targets[i];
      if (r.status === "fulfilled") {
        return prisma.submission.update({
          where: { id: t.id },
          data: { emailSentAt: new Date(), emailError: null },
        });
      }
      const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
      failed.push({ id: t.id, error: msg });
      return prisma.submission.update({ where: { id: t.id }, data: { emailError: msg.slice(0, 300) } });
    }),
  );

  return NextResponse.json({ processed: targets.length, emailsFailed: failed.length });
}
