import { z } from "zod";
import { FIELDS, type FormField } from "@/config/form";

function schemaForField(f: FormField) {
  if (f.type === "select" || f.type === "radio") {
    const opts = f.options ?? [];
    const base = z.enum(opts as [string, ...string[]]);
    return f.required ? base : base.optional().or(z.literal(""));
  }

  let base = z.string().trim();
  if (f.type === "email") base = base.email("Format email tidak valid");
  if (f.type === "tel") base = base.regex(/^[0-9+\-\s()]{8,20}$/, "Nomor telepon tidak valid");
  if (f.type === "textarea") base = base.max(2000, "Maksimal 2000 karakter");
  else base = base.max(200, "Maksimal 200 karakter");

  return f.required ? base.min(1, `${f.label} wajib diisi`) : base.optional().or(z.literal(""));
}

/** Dibangun sekali dari FIELDS — dipakai di client (RHF) dan di server (API). */
export const answersSchema = z.object(
  Object.fromEntries(FIELDS.map((f) => [f.id, schemaForField(f)])),
);

export type Answers = z.infer<typeof answersSchema>;
