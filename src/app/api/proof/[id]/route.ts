import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { resolveProof } from "@/lib/storage";

/** Bukti bayar tidak pernah di-serve sebagai file statis — selalu lewat sini, dengan cek session. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const s = await prisma.submission.findUnique({
    where: { id },
    select: { proofPath: true, proofMime: true },
  });
  if (!s) return new NextResponse("Not found", { status: 404 });

  const abs = resolveProof(s.proofPath);
  const info = await stat(abs);

  return new NextResponse(Readable.toWeb(createReadStream(abs)) as ReadableStream, {
    headers: {
      "Content-Type": s.proofMime,
      "Content-Length": String(info.size),
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
    },
  });
}
