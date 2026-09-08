import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { EVENT, FIELDS, formatIDR } from "@/config/form";

const STATUS = {
  AWAITING_REVIEW: {
    label: "Menunggu verifikasi",
    dot: "bg-amber-500",
    note: "Bukti pembayaran kamu sedang diperiksa panitia. Konfirmasi dikirim ke email begitu selesai.",
  },
  APPROVED: {
    label: "Terverifikasi",
    dot: "bg-emerald-600",
    note: "Pendaftaran kamu sudah dikonfirmasi. Email konfirmasi sudah dikirim.",
  },
  REJECTED: {
    label: "Perlu diperbaiki",
    dot: "bg-red-600",
    note: "Bukti pembayaran belum bisa diverifikasi. Cek email kamu untuk detailnya.",
  },
} as const;

export default async function StatusPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const s = await prisma.submission.findUnique({ where: { publicToken: token } });
  if (!s) notFound();

  const st = STATUS[s.status];
  const answers = s.answers as Record<string, string>;

  return (
    <main className="mx-auto min-h-svh max-w-xl px-6 py-16 sm:py-24">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{EVENT.org}</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Pendaftaran diterima</h1>

      <div className="mt-8 rounded-lg border">
        <div className="flex items-center gap-2.5 border-b px-5 py-4">
          <span className={`size-2 rounded-full ${st.dot}`} aria-hidden />
          <span className="text-sm font-medium">{st.label}</span>
        </div>
        <p className="px-5 py-4 text-sm leading-relaxed text-muted-foreground">{st.note}</p>
      </div>

      <dl className="mt-8 space-y-3 text-sm">
        {FIELDS.filter((f) => answers[f.id]).map((f) => (
          <div key={f.id} className="flex justify-between gap-6 border-b pb-3">
            <dt className="text-muted-foreground">{f.label}</dt>
            <dd className="text-right font-medium">{answers[f.id]}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-6">
          <dt className="text-muted-foreground">Nominal</dt>
          <dd className="text-right font-medium tabular-nums">{formatIDR(s.amount)}</dd>
        </div>
      </dl>

      <p className="mt-10 text-xs text-muted-foreground">
        Simpan halaman ini untuk mengecek status kapan saja.
      </p>
    </main>
  );
}
