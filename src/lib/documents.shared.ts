import { z } from "zod";

export const DOCUMENT_TYPES = [
  "atestado",
  "receita",
  "laudo",
  "exame",
  "declaracao",
] as const;

export const DOCUMENT_STATUSES = ["valido", "revogado", "expirado"] as const;

const optionalString = z.string().trim().max(2000).optional().nullable();
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato AAAA-MM-DD")
  .optional()
  .nullable();

export const documentInputSchema = z.object({
  type: z.enum(DOCUMENT_TYPES),
  status: z.enum(DOCUMENT_STATUSES).optional(),
  establishment_id: z.string().uuid().optional().nullable(),
  establishment_name: optionalString,
  establishment_address: optionalString,
  patient_name: z.string().trim().min(2, "Informe o nome do paciente").max(200),
  patient_birth_date: isoDate,
  patient_cpf: optionalString,
  professional_name: optionalString,
  professional_council: optionalString,
  professional_council_number: optionalString,
  professional_specialty: optionalString,
  body_text: z.string().trim().max(20000).optional().nullable(),
  cid: optionalString,
  leave_start_date: isoDate,
  leave_end_date: isoDate,
  leave_days: z.number().int().min(0).max(3650).optional().nullable(),
  issued_at: z.string().optional().nullable(),
  metadata: z.record(z.any()).optional(),
});

export type DocumentInput = z.infer<typeof documentInputSchema>;

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateDocumentCode(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const raw = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function prettyCode(code: string): string {
  const n = normalizeCode(code);
  return n.length === 12 ? `${n.slice(0, 4)}-${n.slice(4, 8)}-${n.slice(8, 12)}` : code;
}

export type PublicDocument = {
  code: string;
  type: string;
  status: string;
  establishment_name: string | null;
  establishment_address: string | null;
  patient_name: string;
  patient_birth_date: string | null;
  patient_cpf: string | null;
  professional_name: string | null;
  professional_council: string | null;
  professional_council_number: string | null;
  professional_specialty: string | null;
  body_text: string | null;
  cid: string | null;
  leave_start_date: string | null;
  leave_end_date: string | null;
  leave_days: number | null;
  issued_at: string;
  metadata: Record<string, unknown>;
};
