import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { UPLOAD } from "@/config/form";

export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "data", "uploads");

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

/** Cek magic bytes — header Content-Type dari browser bisa dipalsukan. */
function sniff(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return "image/png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP")
    return "image/webp";
  if (buf.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  return null;
}

export async function saveProof(file: File) {
  if (file.size > UPLOAD.maxBytes) {
    throw new Error(`Ukuran file maksimal ${UPLOAD.maxBytes / 1024 / 1024}MB`);
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const mime = sniff(buf);
  if (!mime || !UPLOAD.accept.includes(mime as (typeof UPLOAD.accept)[number])) {
    throw new Error("File harus berupa JPG, PNG, WEBP, atau PDF");
  }

  const now = new Date();
  const dir = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
  // Nama file di-generate ulang; nama asli dari user tidak pernah dipakai.
  const rel = `${dir}/${randomUUID()}.${EXT[mime]}`;

  await mkdir(path.join(UPLOAD_DIR, dir), { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, rel), buf, { mode: 0o640 });

  return { path: rel, mime, size: buf.length };
}

/** Cegah path traversal saat membaca kembali file. */
export function resolveProof(rel: string) {
  const abs = path.resolve(UPLOAD_DIR, rel);
  if (!abs.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) throw new Error("Invalid path");
  return abs;
}
