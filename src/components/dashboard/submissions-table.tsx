"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FIELDS, formatIDR } from "@/config/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

export type Row = {
  id: string;
  name: string;
  email: string;
  amount: number;
  status: "AWAITING_REVIEW" | "APPROVED" | "REJECTED";
  senderName: string | null;
  answers: unknown;
  createdAt: string;
  emailSentAt: Date | string | null;
  emailError: string | null;
  rejectReason: string | null;
};

const STATUS = {
  AWAITING_REVIEW: { label: "Menunggu", dot: "bg-amber-500" },
  APPROVED: { label: "Disetujui", dot: "bg-emerald-600" },
  REJECTED: { label: "Ditolak", dot: "bg-red-600" },
} as const;

const TABS = [
  { key: "AWAITING_REVIEW", label: "Menunggu" },
  { key: "APPROVED", label: "Disetujui" },
  { key: "REJECTED", label: "Ditolak" },
  { key: "ALL", label: "Semua" },
] as const;

export function SubmissionsTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("AWAITING_REVIEW");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<Row | null>(null);
  const [confirm, setConfirm] = useState<"approve" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab !== "ALL" && r.status !== tab) return false;
      if (!needle) return true;
      return `${r.name} ${r.email} ${r.senderName ?? ""}`.toLowerCase().includes(needle);
    });
  }, [rows, tab, q]);

  // Hanya baris yang masih menunggu yang boleh diproses.
  const actionable = filtered.filter((r) => r.status === "AWAITING_REVIEW");
  const selectedIds = [...selected].filter((id) => actionable.some((r) => r.id === id));
  const allChecked = actionable.length > 0 && selectedIds.length === actionable.length;

  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(actionable.map((r) => r.id)));
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function run(action: "approve" | "reject") {
    const ids = selectedIds;
    const res = await fetch("/api/admin/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, action, reason: reason || undefined }),
    });
    const data = await res.json();

    if (!res.ok) return toast.error(data.error ?? "Gagal memproses");

    if (data.emailsFailed > 0) {
      toast.warning(
        `${data.processed} diproses, tetapi ${data.emailsFailed} email gagal terkirim. Cek kolom email di tabel.`,
      );
    } else {
      toast.success(`${data.processed} pendaftaran diproses, email terkirim.`);
    }

    setSelected(new Set());
    setConfirm(null);
    setReason("");
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-md border p-0.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setSelected(new Set()); }}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === t.key ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari nama, email, pengirim…"
          className="h-8 max-w-xs text-sm"
        />
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">{filtered.length} baris</span>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10">
                <Checkbox checked={allChecked} onCheckedChange={toggleAll} disabled={actionable.length === 0} aria-label="Pilih semua" />
              </TableHead>
              <TableHead>Peserta</TableHead>
              <TableHead className="hidden sm:table-cell">Pengirim</TableHead>
              <TableHead className="text-right">Nominal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Masuk</TableHead>
              <TableHead className="text-right">Bukti</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">
                  Belum ada pendaftaran di kategori ini.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((r) => (
              <TableRow key={r.id} data-state={selected.has(r.id) ? "selected" : undefined}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(r.id)}
                    onCheckedChange={() => toggle(r.id)}
                    disabled={r.status !== "AWAITING_REVIEW"}
                    aria-label={`Pilih ${r.name}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.email}</div>
                  {r.emailError && <div className="text-xs text-destructive">Email gagal terkirim</div>}
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                  {r.senderName ?? "—"}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">{formatIDR(r.amount)}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 text-xs">
                    <span className={`size-1.5 rounded-full ${STATUS[r.status].dot}`} aria-hidden />
                    {STATUS[r.status].label}
                  </span>
                </TableCell>
                <TableCell className="hidden text-xs text-muted-foreground md:table-cell tabular-nums">
                  {new Date(r.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setPreview(r)}>
                    Lihat
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedIds.length > 0 && (
        <div className="sticky bottom-4 z-10 flex items-center gap-3 rounded-lg border bg-background px-4 py-3 shadow-lg">
          <span className="text-sm font-medium tabular-nums">{selectedIds.length} dipilih</span>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            Batal
          </Button>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirm("reject")} disabled={pending}>
              Tolak
            </Button>
            <Button size="sm" onClick={() => setConfirm("approve")} disabled={pending}>
              Setujui {selectedIds.length}
            </Button>
          </div>
        </div>
      )}

      <Dialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirm === "approve" ? `Setujui ${selectedIds.length} pendaftaran?` : `Tolak ${selectedIds.length} pendaftaran?`}
            </DialogTitle>
            <DialogDescription>
              Email {confirm === "approve" ? "konfirmasi" : "pemberitahuan"} akan langsung dikirim ke masing-masing
              peserta. Tindakan ini tidak bisa dibatalkan.
            </DialogDescription>
          </DialogHeader>

          {confirm === "reject" && (
            <div className="space-y-2">
              <label htmlFor="reason" className="text-sm font-medium">
                Alasan <span className="font-normal text-muted-foreground">(muncul di email)</span>
              </label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="mis. nominal transfer tidak sesuai"
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Batal
            </Button>
            <Button onClick={() => confirm && run(confirm)} disabled={pending}>
              {pending ? "Memproses…" : "Ya, kirim email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={preview !== null} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{preview?.name}</DialogTitle>
            <DialogDescription>{preview?.email}</DialogDescription>
          </DialogHeader>

          {preview && (
            <div className="grid gap-6 sm:grid-cols-2">
              <dl className="space-y-2.5 text-sm">
                {FIELDS.map((f) => {
                  const v = (preview.answers as Record<string, string>)[f.id];
                  if (!v) return null;
                  return (
                    <div key={f.id}>
                      <dt className="text-xs text-muted-foreground">{f.label}</dt>
                      <dd className="font-medium">{v}</dd>
                    </div>
                  );
                })}
                {preview.rejectReason && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Alasan penolakan</dt>
                    <dd className="font-medium">{preview.rejectReason}</dd>
                  </div>
                )}
              </dl>

              <div className="overflow-hidden rounded-md border bg-muted/40">
                <a href={`/api/proof/${preview.id}`} target="_blank" rel="noreferrer">
                  <img
                    src={`/api/proof/${preview.id}`}
                    alt="Bukti pembayaran"
                    className="max-h-80 w-full object-contain"
                  />
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
