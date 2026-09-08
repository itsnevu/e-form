import nodemailer from "nodemailer";
import { EVENT, formatIDR } from "@/config/form";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: Number(process.env.SMTP_PORT ?? 587) === 465,
  // Relay tanpa autentikasi (mis. SMTP internal) tetap didukung.
  auth: process.env.SMTP_PASS
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
  pool: true,
  maxConnections: 3,
  maxMessages: 100,
  rateDelta: 60_000,
  rateLimit: Number(process.env.EMAIL_RATE_PER_MINUTE ?? 30),
});

const FROM = process.env.MAIL_FROM ?? `${EVENT.org} <${EVENT.supportEmail}>`;

function layout(heading: string, body: string) {
  return `<!doctype html><html lang="id"><body style="margin:0;background:#f5f5f4;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c1917">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="100%" style="max-width:520px;background:#fff;border:1px solid #e7e5e4;border-radius:12px" cellpadding="0" cellspacing="0">
      <tr><td style="padding:28px 32px 8px">
        <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#78716c">${EVENT.org}</div>
        <h1 style="margin:12px 0 0;font-size:20px;font-weight:600;line-height:1.3">${heading}</h1>
      </td></tr>
      <tr><td style="padding:8px 32px 28px;font-size:15px;line-height:1.6;color:#44403c">${body}</td></tr>
      <tr><td style="padding:16px 32px;border-top:1px solid #f5f5f4;font-size:13px;color:#78716c">
        Ada pertanyaan? Balas email ini atau hubungi ${EVENT.supportEmail}.
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

const templates = {
  approved: (name: string) => ({
    subject: `Pembayaran terverifikasi — ${EVENT.title}`,
    html: layout(
      `Halo ${name}, pendaftaran kamu sudah dikonfirmasi.`,
      `<p style="margin:0 0 16px">Bukti pembayaran sebesar <strong>${formatIDR(
        EVENT.price,
      )}</strong> sudah kami verifikasi. Tempat kamu di <strong>${EVENT.title}</strong> resmi terdaftar.</p>
       <p style="margin:0">Simpan email ini sebagai bukti pendaftaran. Informasi teknis akan menyusul di email terpisah.</p>`,
    ),
  }),
  rejected: (name: string, reason?: string) => ({
    subject: `Bukti pembayaran perlu diperbaiki — ${EVENT.title}`,
    html: layout(
      `Halo ${name}, bukti pembayaran kamu belum bisa kami verifikasi.`,
      `<p style="margin:0 0 16px">${
        reason
          ? `Catatan dari panitia: <strong>${reason}</strong>`
          : "Bukti transfer yang diunggah tidak dapat kami cocokkan dengan pembayaran yang masuk."
      }</p>
       <p style="margin:0">Silakan balas email ini dengan bukti transfer yang benar agar kami proses ulang.</p>`,
    ),
  }),
} as const;

export async function sendDecision(
  to: string,
  name: string,
  kind: "approved" | "rejected",
  reason?: string,
) {
  const t = kind === "approved" ? templates.approved(name) : templates.rejected(name, reason);
  await transporter.sendMail({ from: FROM, to, subject: t.subject, html: t.html });
}

export async function verifySmtp() {
  await transporter.verify();
}
