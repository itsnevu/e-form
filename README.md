# Form Pendaftaran + Verifikasi Pembayaran

Form publik → upload bukti transfer → dashboard admin → bulk approve → email otomatis.

## Yang perlu kamu ubah sebelum dipakai

**`src/config/form.ts`** — satu-satunya file untuk isi form:
- `EVENT.org`, `EVENT.title`, `EVENT.description` — branding
- `EVENT.price` — nominal (integer rupiah)
- `EVENT.bank` — nama bank, nomor rekening, atas nama
- `FIELDS` — daftar pertanyaan. Tambah/hapus/urutkan bebas.

Field `id` yang dipakai sebagai nama & email peserta diatur di `IDENTITY`.
Tidak perlu migrasi database saat mengubah pertanyaan — jawaban disimpan sebagai JSON.

## Jalankan lokal

```bash
cp .env.example .env      # isi DATABASE_URL, AUTH_SECRET, SMTP_*, ADMIN_*
npm install
npx prisma migrate deploy
npm run seed              # buat akun admin dari ADMIN_EMAIL/ADMIN_PASSWORD
npm run dev
```

- Form publik: `/`
- Login admin: `/authorize` (tidak di-link dari halaman publik, `noindex`)
- Dashboard: `/dashboard`

Setelah admin dibuat, kosongkan `ADMIN_PASSWORD` di `.env`.

## Deploy ke VPS

```bash
# 1. Postgres
docker run -d --name gform-db --restart unless-stopped \
  -e POSTGRES_PASSWORD=<kuat> -e POSTGRES_DB=gform \
  -v /srv/gform/pgdata:/var/lib/postgresql/data -p 127.0.0.1:5432:5432 postgres:16-alpine

# 2. App
git clone <repo> /srv/gform/app && cd /srv/gform/app
cp .env.example .env && $EDITOR .env          # UPLOAD_DIR=/srv/gform/uploads
npm ci && npx prisma migrate deploy && npm run seed && npm run build
pm2 start npm --name gform -- start && pm2 save && pm2 startup
```

**Caddyfile:**
```
domain.com {
    encode gzip
    request_body { max_size 10MB }
    reverse_proxy 127.0.0.1:3000
    header Strict-Transport-Security "max-age=31536000"
    @private path /authorize* /dashboard*
    header @private X-Robots-Tag "noindex, nofollow"
}
```
`request_body max_size` wajib — default Caddy 10MB, tapi eksplisit lebih aman daripada
upload 5MB tertolak diam-diam.

## Email

Isi `SMTP_HOST/PORT/USER/PASS` untuk `admin@domain.com`, lalu **pasang SPF, DKIM, dan DMARC**
di DNS domain. Tanpa itu email approval hampir pasti masuk spam.

Catatan: port 25 keluar biasanya diblokir provider VPS dan IP VPS baru sering masuk blacklist —
gunakan SMTP relay di port 587, jangan pasang mail server sendiri.

Kalau kuota SMTP terbatas (shared hosting sering 200/jam), turunkan `EMAIL_RATE_PER_MINUTE`
dan approve per batch ~50 baris.

## Cara kerja approval

Status disimpan **sebelum** email dikirim. Kalau SMTP gagal, keputusan approve tidak hilang;
barisnya ditandai "Email gagal terkirim" di tabel dan bisa diproses ulang. Baris yang sudah
diputuskan tidak bisa di-approve dua kali (API menolak dengan 409), jadi klik ganda tidak
mengirim email dobel.

## Backup

```bash
docker exec gform-db pg_dump -U postgres gform | gzip > /backup/db-$(date +%F).sql.gz
tar czf /backup/uploads-$(date +%F).tar.gz -C /srv/gform/uploads .
```
Salin ke luar VPS, dan uji restore sekali sebelum acara dimulai.

## Catatan keamanan

- Bukti bayar disimpan di luar `public/` dan hanya bisa diakses lewat `/api/proof/[id]`
  yang mengecek session. Jangan pindahkan ke folder statis.
- Tipe file divalidasi dari magic bytes, bukan dari header browser.
- Rate limit submit 5/jam per IP, disimpan in-memory — akurat selama app jalan satu proses.
  Kalau nanti di-scale ke banyak instance, pindahkan ke Postgres atau Redis.
