"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FIELDS, EVENT, UPLOAD, formatIDR, type FormField } from "@/config/form";
import { answersSchema, type Answers } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

function FieldRow({ f, error, children }: { f: FormField; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={f.id} className="text-sm font-medium">
        {f.label}
        {!f.required && <span className="ml-1.5 font-normal text-muted-foreground">opsional</span>}
      </Label>
      {children}
      {f.help && !error && <p className="text-xs text-muted-foreground">{f.help}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function FormClient() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>();
  const [serverError, setServerError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Answers>({ resolver: zodResolver(answersSchema), mode: "onBlur" });

  function pickFile(f: File | null) {
    setFileError(undefined);
    if (!f) return setFile(null);
    if (f.size > UPLOAD.maxBytes) return setFileError("Ukuran file maksimal 5MB");
    if (!UPLOAD.accept.includes(f.type as (typeof UPLOAD.accept)[number]))
      return setFileError("Format harus JPG, PNG, WEBP, atau PDF");
    setFile(f);
  }

  const onSubmit = handleSubmit(async (values) => {
    if (!file) return setFileError("Bukti pembayaran wajib diunggah");

    setSubmitting(true);
    setServerError(undefined);

    const fd = new FormData();
    for (const [k, v] of Object.entries(values)) fd.append(k, String(v ?? ""));
    fd.append("proof", file);

    const res = await fetch("/api/submissions", { method: "POST", body: fd });
    const data = await res.json();

    if (!res.ok) {
      setSubmitting(false);
      return setServerError(data.error ?? "Terjadi kesalahan. Coba lagi.");
    }
    router.push(`/s/${data.token}`);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-10">
      <section className="space-y-5">
        <h2 className="text-sm font-medium tracking-tight">1. Data peserta</h2>
        {FIELDS.map((f) => {
          const err = errors[f.id as keyof Answers]?.message as string | undefined;
          const invalid = cn(err && "border-destructive");

          return (
            <FieldRow key={f.id} f={f} error={err}>
              {f.type === "textarea" ? (
                <Textarea id={f.id} rows={3} placeholder={f.placeholder} className={invalid} {...register(f.id as keyof Answers)} />
              ) : f.type === "select" || f.type === "radio" ? (
                <select
                  id={f.id}
                  className={cn(
                    "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    invalid,
                  )}
                  defaultValue=""
                  {...register(f.id as keyof Answers)}
                >
                  <option value="" disabled>
                    Pilih salah satu
                  </option>
                  {f.options?.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <Input id={f.id} type={f.type} placeholder={f.placeholder} className={invalid} {...register(f.id as keyof Answers)} />
              )}
            </FieldRow>
          );
        })}
      </section>

      <section className="space-y-5">
        <div>
          <h2 className="text-sm font-medium tracking-tight">2. Pembayaran</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Transfer sesuai nominal, lalu unggah bukti transfernya.
          </p>
        </div>

        <dl className="rounded-lg border bg-muted/40 p-4 text-sm">
          <div className="flex items-baseline justify-between gap-4 border-b pb-3">
            <dt className="text-muted-foreground">Total</dt>
            <dd className="text-lg font-semibold tabular-nums">{formatIDR(EVENT.price)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 pt-3">
            <dt className="text-muted-foreground">{EVENT.bank.name}</dt>
            <dd className="text-right">
              <span className="font-mono font-medium tabular-nums">{EVENT.bank.account}</span>
              <span className="block text-xs text-muted-foreground">a.n. {EVENT.bank.holder}</span>
            </dd>
          </div>
        </dl>

        <div className="space-y-2">
          <Label htmlFor="proof" className="text-sm font-medium">
            Bukti transfer
          </Label>
          <Input
            id="proof"
            type="file"
            accept={UPLOAD.accept.join(",")}
            className={cn("cursor-pointer file:mr-3 file:text-muted-foreground", fileError && "border-destructive")}
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
          {fileError ? (
            <p className="text-xs text-destructive">{fileError}</p>
          ) : (
            <p className="text-xs text-muted-foreground">JPG, PNG, WEBP, atau PDF. Maksimal 5MB.</p>
          )}
        </div>
      </section>

      {serverError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}

      <div className="flex items-center gap-4 border-t pt-6">
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? "Mengirim…" : "Kirim pendaftaran"}
        </Button>
        <p className="text-xs text-muted-foreground">Konfirmasi dikirim ke email kamu setelah diverifikasi.</p>
      </div>
    </form>
  );
}
