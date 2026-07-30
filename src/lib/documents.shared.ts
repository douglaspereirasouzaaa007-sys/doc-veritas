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

const baseDocumentSchema = z.object({
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

/** Aceita apelidos comuns usados por outros sistemas (texto do documento, CRM, etc.). */
function pick(source: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

/** Converte datas em formato brasileiro (DD/MM/AAAA) para ISO (AAAA-MM-DD). */
export function brDateToISO(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const v = value.trim();
  const br = /^(\d{2})[/.-](\d{2})[/.-](\d{4})$/.exec(v);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return v;
}

/** Converte data/hora brasileira (DD/MM/AAAA HH:mm[:ss]) para ISO com fuso de Brasília. */
export function brDateTimeToISO(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const v = value.trim();
  const m = /^(\d{2})[/.-](\d{2})[/.-](\d{4})(?:[\sT]+(\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(v);
  if (!m) return v;
  const [, d, mo, y, hh = "00", mi = "00", ss = "00"] = m;
  return `${y}-${mo}-${d}T${hh}:${mi}:${ss}-03:00`;
}

/** Aceita números em formato brasileiro (1.234,56 → 1234.56). */
function brNumber(value: unknown): unknown {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return value;
  const v = value.trim().replace(/\./g, "").replace(",", ".");
  const parsed = Number(v);
  return Number.isFinite(parsed) ? parsed : value;
}

const DATE_FIELDS = ["patient_birth_date", "leave_start_date", "leave_end_date"] as const;

export function normalizeDocumentPayload(input: unknown): unknown {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return input;
  const src = { ...(input as Record<string, unknown>) };

  const body = pick(src, ["body_text", "text", "texto", "content", "conteudo", "descricao"]);
  if (body !== undefined) src.body_text = body;

  const crm = pick(src, [
    "professional_council_number",
    "crm",
    "professional_crm",
    "medico_crm",
    "council_number",
  ]);
  if (crm !== undefined) {
    src.professional_council_number = String(crm);
    src.professional_council = src.professional_council ?? "CRM";
  }

  const name = pick(src, ["professional_name", "medico", "doctor_name", "professional"]);
  if (name !== undefined) src.professional_name = String(name);

  const specialty = pick(src, ["professional_specialty", "especialidade", "specialty"]);
  if (specialty !== undefined) src.professional_specialty = String(specialty);

  const patient = pick(src, ["patient_name", "paciente", "patient", "nome_paciente"]);
  if (patient !== undefined) src.patient_name = String(patient);

  const cpf = pick(src, ["patient_cpf", "cpf", "cpf_paciente"]);
  if (cpf !== undefined) src.patient_cpf = String(cpf);

  const birth = pick(src, [
    "patient_birth_date",
    "data_nascimento",
    "nascimento",
    "data_de_nascimento",
  ]);
  if (birth !== undefined) src.patient_birth_date = birth;

  const estName = pick(src, ["establishment_name", "estabelecimento", "clinica", "local"]);
  if (estName !== undefined) src.establishment_name = String(estName);

  const estAddress = pick(src, ["establishment_address", "endereco", "endereço"]);
  if (estAddress !== undefined) src.establishment_address = String(estAddress);

  const start = pick(src, ["leave_start_date", "data_inicio", "inicio", "afastamento_inicio"]);
  if (start !== undefined) src.leave_start_date = start;

  const end = pick(src, ["leave_end_date", "data_fim", "fim", "termino", "afastamento_fim"]);
  if (end !== undefined) src.leave_end_date = end;

  const days = pick(src, ["leave_days", "dias", "dias_afastamento", "quantidade_dias"]);
  if (days !== undefined) src.leave_days = days;

  const issued = pick(src, ["issued_at", "data_emissao", "emitido_em", "emissao"]);
  if (issued !== undefined) src.issued_at = brDateTimeToISO(issued);

  // Datas no padrão brasileiro → ISO
  for (const field of DATE_FIELDS) {
    if (src[field] !== undefined && src[field] !== null) src[field] = brDateToISO(src[field]);
  }

  if (src.leave_days !== undefined && src.leave_days !== null && src.leave_days !== "") {
    const parsed = brNumber(src.leave_days);
    if (typeof parsed === "number") src.leave_days = Math.round(parsed);
  }

  // Calcula automaticamente os dias de afastamento quando não informados
  if (
    (src.leave_days === undefined || src.leave_days === null || src.leave_days === "") &&
    typeof src.leave_start_date === "string" &&
    typeof src.leave_end_date === "string"
  ) {
    const start2 = new Date(`${src.leave_start_date}T00:00:00`);
    const end2 = new Date(`${src.leave_end_date}T00:00:00`);
    if (!Number.isNaN(start2.getTime()) && !Number.isNaN(end2.getTime()) && end2 >= start2) {
      src.leave_days = Math.round((end2.getTime() - start2.getTime()) / 86400000) + 1;
    }
  }

  return src;
}


export const documentInputSchema = z.preprocess(normalizeDocumentPayload, baseDocumentSchema);

export type DocumentInput = z.infer<typeof baseDocumentSchema>;

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

/** Prefixos de token por tipo de documento (ex.: ATE-161, REC-22144, LAU-16105). */
export const TOKEN_PREFIX: Record<(typeof DOCUMENT_TYPES)[number], string> = {
  atestado: "ATE",
  receita: "REC",
  laudo: "LAU",
  exame: "EXA",
  declaracao: "DEC",
};

const TOKEN_RE = /^(ATE|REC|LAU|EXA|DEC)-?\d{1,10}$/;

/** Detecta se o valor informado é um token (ATE-161) ou um código de acesso. */
export function isDocumentToken(value: string): boolean {
  return TOKEN_RE.test(value.trim().toUpperCase().replace(/\s+/g, ""));
}

/** Normaliza um token para o formato canônico PREFIXO-NUMERO. */
export function normalizeToken(value: string): string {
  const raw = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return `${raw.slice(0, 3)}-${raw.slice(3).replace(/^0+(?=\d)/, "")}`;
}

/** Aceita token ou código de acesso e devolve a chave de busca canônica. */
export function normalizeLookup(value: string): { kind: "token" | "code"; value: string } {
  if (isDocumentToken(value)) return { kind: "token", value: normalizeToken(value) };
  return { kind: "code", value: prettyCode(normalizeCode(value)) };
}

export type PublicDocument = {
  token: string;
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
  metadata: Record<string, string | number | boolean | null>;
};
