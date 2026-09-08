# Implementation Plan — MVP 1 HARI (deadline: besok sore)

## Yang DIPOTONG (dan kenapa aman)

| Dipotong | Ganti | Hemat |
|---|---|---|
| Form builder dinamis (CRUD field, drag-drop) | Field didefinisikan di `src/config/form.ts` — edit file, redeploy | **2 hari** |
| Multi-form | Satu form saja | 0.5 hari |
| Docker Compose + Caddy + worker container | 1 proses Next.js + Postgres. Email dikirim inline saat approve (batch < 100 aman) | 1 hari |
| Halaman settings, chart KPI, export CSV | KPI angka polos di header dashboard | 1 hari |
| Role ADMIN/REVIEWER | Semua user = admin | 0.3 hari |
| Register publik | Seed 1 admin lewat script | 0.3 hari |

## Yang TETAP ADA (permintaan client, 100% tercapai)

1. Form publik yang bisa diisi siapa saja
2. Setelah isi → halaman instruksi bayar + upload bukti transfer
3. Login admin di `/authorize` (tidak muncul di sisi client)
4. Dashboard dengan tabel submission + preview bukti bayar
5. **Bulk select → approve → email terkirim otomatis** via SMTP `admin@domain.com`
6. Desain simple & modern (shadcn blocks, bukan bikin dari nol)

## Stack final (minimum moving parts)

```
Next.js 15 App Router + TS + Tailwind + shadcn/ui
Postgres (Neon free tier — 0 setup, atau Postgres di VPS)
Prisma 6
Auth.js v5 credentials
Upload → filesystem lokal /data/uploads, di-serve lewat route terproteksi
Nodemailer pool → SMTP admin@domain.com
Deploy: VPS, `pm2 start npm -- start` di belakang Caddy/Nginx
```
Tidak ada Redis, tidak ada queue, tidak ada worker terpisah, tidak ada R2.

## Timeline (jam kerja)

| Jam | Target |
|---|---|
| 0–1 | Scaffold, Prisma schema, migrate, seed admin |
| 1–2 | shadcn blocks: login-03 + sidebar-07 + dashboard-01 |
| 2–4 | Form publik + submit + halaman bayar + upload bukti |
| 4–6 | Dashboard tabel + row selection + detail/preview bukti |
| 6–7.5 | Bulk approve + Nodemailer + template email |
| 7.5–9 | Polish desain, empty/error state, deploy ke VPS |

## Keputusan default yang kuambil (koreksi kalau salah)

- Field form: nama, email, no. HP, instansi, pilihan tiket → **ganti di `src/config/form.ts`**
- Status: `AWAITING_REVIEW` → `APPROVED` / `REJECTED` (tanpa PENDING_PAYMENT terpisah;
  submit dan upload bukti jadi satu halaman → lebih sedikit langkah untuk user & untuk aku)
- Email dikirim inline dalam request approve, dengan `Promise.allSettled` + pool SMTP.
  Aman sampai ~100 email per klik. Kalau lebih, approve dibatch per 50 di UI.

## Yang aku butuh dari kamu (bisa nyusul, ada placeholder di .env)

1. `SMTP_HOST/USER/PASS` untuk `admin@domain.com`
2. Nomor rekening + nama bank + atas nama
3. Daftar pertanyaan form yang sebenarnya + harga
4. Nama acara/organisasi untuk branding
