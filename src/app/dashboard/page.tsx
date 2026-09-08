import { prisma } from "@/lib/db";
import { formatIDR } from "@/config/form";
import { SubmissionsTable } from "@/components/dashboard/submissions-table";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [rows, counts, approvedSum] = await Promise.all([
    prisma.submission.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true, name: true, email: true, amount: true, status: true,
        senderName: true, answers: true, createdAt: true,
        emailSentAt: true, emailError: true, rejectReason: true,
      },
    }),
    prisma.submission.groupBy({ by: ["status"], _count: true }),
    prisma.submission.aggregate({ where: { status: "APPROVED" }, _sum: { amount: true } }),
  ]);

  const by = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;

  const stats = [
    { label: "Menunggu verifikasi", value: String(by("AWAITING_REVIEW")) },
    { label: "Disetujui", value: String(by("APPROVED")) },
    { label: "Ditolak", value: String(by("REJECTED")) },
    { label: "Total masuk", value: formatIDR(approvedSum._sum.amount ?? 0) },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Pendaftaran</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pilih beberapa baris untuk menyetujui atau menolak sekaligus. Email konfirmasi terkirim otomatis.
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-background px-4 py-3">
            <dt className="text-xs text-muted-foreground">{s.label}</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>

      <SubmissionsTable rows={rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))} />
    </div>
  );
}
