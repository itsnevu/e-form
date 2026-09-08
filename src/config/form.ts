/**
 * SATU-SATUNYA tempat mendefinisikan isi form.
 * Ubah di sini lalu restart app — tidak perlu migrasi database.
 */

export type FieldType = "text" | "email" | "tel" | "textarea" | "select" | "radio";

export type FormField = {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  help?: string;
  required?: boolean;
  options?: string[];
};

export const EVENT = {
  org: "Nama Organisasi",
  title: "Pendaftaran Peserta",
  description:
    "Lengkapi data di bawah ini, lakukan pembayaran, lalu unggah bukti transfer. Konfirmasi dikirim ke email kamu setelah diverifikasi panitia.",
  price: 150_000,
  bank: {
    name: "BCA",
    account: "1234567890",
    holder: "Nama Organisasi",
  },
  supportEmail: "admin@domain.com",
} as const;

export const FIELDS: FormField[] = [
  { id: "name", type: "text", label: "Nama lengkap", placeholder: "Sesuai KTP", required: true },
  { id: "email", type: "email", label: "Email aktif", placeholder: "nama@email.com", required: true,
    help: "Konfirmasi pembayaran akan dikirim ke alamat ini." },
  { id: "phone", type: "tel", label: "Nomor WhatsApp", placeholder: "08xxxxxxxxxx", required: true },
  { id: "institution", type: "text", label: "Asal instansi / kampus", required: true },
  { id: "ticket", type: "select", label: "Kategori tiket", required: true,
    options: ["Reguler", "Mahasiswa", "Grup (min. 3 orang)"] },
  { id: "notes", type: "textarea", label: "Catatan tambahan", required: false,
    placeholder: "Kebutuhan khusus, pertanyaan, dll. (opsional)" },
];

/** Field mana yang dipakai sebagai identitas & tujuan email. Harus ada di FIELDS. */
export const IDENTITY = { nameField: "name", emailField: "email" } as const;

export const UPLOAD = {
  maxBytes: 5 * 1024 * 1024,
  accept: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
} as const;

export const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
