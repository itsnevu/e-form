# Checklist Sebelum Go-Live

Urut dari atas. Yang bertanda **WAJIB** kalau dilewat bikin acara berantakan atau data bocor.

---

## A. Isi konten (15 menit)

Semua ada di satu file: `src/config/form.ts`

- [ ] `EVENT.org` — nama organisasi/panitia (muncul di header form & email)
- [ ] `EVENT.title` — nama acara
- [ ] `EVENT.description` — kalimat pengantar di atas form
- [ ] `EVENT.price` — nominal, **angka polos tanpa titik**: `150_000` bukan `"150.000"`
- [ ] `EVENT.bank` — nama bank, nomor rekening, atas nama. **Cek ulang digit per digit.**
      Salah satu angka = uang peserta masuk ke rekening orang lain.
- [ ] `EVENT.supportEmail` — email yang muncul di footer email
- [ ] `FIELDS` — daftar pertanyaan asli. Hapus contoh yang tidak dipakai.
- [ ] Kalau mengubah `id` field nama/email, sesuaikan `IDENTITY` di file yang sama —
      kalau tidak, kolom nama & tujuan email di dashboard jadi kosong.

Setelah diubah: `npm run build` lagi (config dibaca saat build, bukan saat request).

**Uji:** buka form, submit satu pendaftaran percobaan, pastikan semua pertanyaan muncul benar.

---

## B. Kredensial & keamanan (WAJIB)

- [ ] **`AUTH_SECRET` diganti.** Jangan pakai nilai dev.
      ```bash
      openssl rand -base64 32
      ```
      Kalau nilainya ketebak, orang bisa memalsukan session admin dan meng-approve sendiri.
- [ ] **Password admin diganti** dari `admin12345`. Minimal 12 karakter acak.
- [ ] Setelah `npm run seed` jalan, **kosongkan `ADMIN_PASSWORD` di `.env`.**
      Seed hanya perlu sekali; membiarkannya = password produksi nganggur di plaintext.
- [ ] `.env` **tidak pernah** di-commit. (Sudah diblokir `.gitignore`, jangan pakai `git add -f`.)
- [ ] Password database bukan `gform` / `postgres` / yang dipakai saat development.
- [ ] Postgres **tidak** diekspos ke internet. Di Docker pakai `-p 127.0.0.1:5432:5432`,
      bukan `-p 5432:5432`. Tanpa `127.0.0.1`, database kamu terbuka ke seluruh dunia.
- [ ] `AUTH_URL` diisi domain asli dengan `https://`, bukan `localhost`.

---

## C. Email (WAJIB — paling sering jadi masalah)

- [ ] `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` diisi kredensial asli
- [ ] `MAIL_FROM` pakai domain yang sama dengan SMTP-nya
- [ ] **SPF, DKIM, DMARC dipasang di DNS domain.**
      Tanpa ini email approval hampir pasti masuk spam, dan kamu baru tahu setelah
      peserta komplain "kok saya nggak dapat email".
- [ ] **Tes kirim ke Gmail DAN Outlook**, lalu cek folder spam-nya, bukan cuma inbox.
      Cara cepat cek skor: kirim ke https://mail-tester.com
- [ ] Cek kuota SMTP provider. Hosting bersama sering dibatasi ~200 email/jam.
      Kalau peserta lebih banyak dari kuota per jam, turunkan `EMAIL_RATE_PER_MINUTE`
      dan approve per batch ~50 baris.
- [ ] Jangan pasang mail server sendiri di VPS. Port 25 keluar biasanya diblokir provider
      dan IP VPS baru sering sudah masuk blacklist. Pakai relay di port 587.

**Uji:** approve satu pendaftaran percobaan, pastikan emailnya benar-benar sampai.

---

## D. Server (WAJIB)

- [ ] Domain sudah diarahkan ke IP VPS (A record), tunggu propagasi
- [ ] HTTPS aktif. Caddy mengurus sertifikat otomatis — pastikan port 80 & 443 terbuka.
- [ ] `request_body { max_size 10MB }` ada di Caddyfile.
      Kalau tidak, upload bukti bisa ditolak diam-diam tanpa pesan error yang jelas.
- [ ] `UPLOAD_DIR` menunjuk ke folder **di luar** repo dan **di luar** `public/`,
      contoh `/srv/gform/uploads`. Kalau masuk `public/`, siapa pun yang menebak URL
      bisa melihat bukti transfer orang lain.
- [ ] Folder upload bisa ditulis oleh user yang menjalankan app
- [ ] `npx prisma migrate deploy` sudah dijalankan di server (bukan `migrate dev`)
- [ ] Process manager aktif supaya app hidup lagi setelah reboot:
      `pm2 start npm --name gform -- start && pm2 save && pm2 startup`
- [ ] Firewall: hanya port 22, 80, 443 yang terbuka
- [ ] SSH pakai key, login password dimatikan

---

## E. Backup (WAJIB — sebelum peserta pertama masuk)

- [ ] Cron backup harian aktif:
      ```bash
      docker exec gform-db pg_dump -U postgres gform | gzip > /backup/db-$(date +%F).sql.gz
      tar czf /backup/uploads-$(date +%F).tar.gz -C /srv/gform/uploads .
      ```
- [ ] Backup disalin **ke luar VPS**. Backup yang tersimpan di mesin yang sama tidak
      menolong saat mesinnya yang rusak.
- [ ] **Coba restore sekali.** Backup yang belum pernah di-restore belum terbukti backup.

---

## F. Uji alur lengkap di server produksi

Lakukan sebagai orang asing, dari HP, bukan dari laptop yang sudah login.

- [ ] Buka form → isi → upload bukti → submit → dapat halaman status
- [ ] Coba upload file yang bukan gambar → harus ditolak
- [ ] Coba submit dengan email ngawur → harus ada pesan error per kolom
- [ ] Buka `/dashboard` tanpa login → harus dilempar ke `/authorize`
- [ ] Login → pendaftaran barusan muncul di tab "Menunggu"
- [ ] Klik "Lihat" → foto bukti transfer tampil
- [ ] Centang beberapa → Setujui → **email betulan sampai ke inbox**
- [ ] Buka lagi halaman status peserta → statusnya sudah "Terverifikasi"
- [ ] Coba approve baris yang sama dua kali → ditolak, email tidak dobel
- [ ] Buka form di HP → layout tidak rusak

---

## G. Sebelum menyebar link

- [ ] Hapus semua data percobaan:
      ```sql
      DELETE FROM "Submission";
      ```
      dan hapus isi folder upload. Jangan sampai data tes ikut terhitung sebagai peserta.
- [ ] Pastikan `/authorize` tidak di-link dari halaman publik mana pun
- [ ] Siapkan orang cadangan yang tahu cara login dashboard, kalau kamu berhalangan

---

## Saat hari-H

**Kalau email gagal terkirim:** approve **tidak** hilang. Status tetap tersimpan, barisnya
ditandai "Email gagal terkirim" di tabel. Perbaiki SMTP, lalu kirim ulang manual ke peserta
yang bertanda merah.

**Kalau peserta bilang belum dapat email:** minta cek folder spam dulu. Kalau memang tidak ada,
cek kolom email di dashboard untuk baris itu.

**Jangan approve lebih dari ~100 baris dalam satu klik.** Email dikirim langsung saat approve;
batch terlalu besar bisa kena timeout atau kuota SMTP. Pecah per 50.
