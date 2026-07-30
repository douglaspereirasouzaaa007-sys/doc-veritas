// Handlers compartilhados da API pública de documentos (por tipo) — armazenamento local.
import { z } from "zod";
import {
  documentInputSchema,
  generateDocumentCode,
  normalizeLookup,
  DOCUMENT_STATUSES,
  DOCUMENT_TYPES,
} from "./documents.shared";
import { authenticateApiKey, json } from "./api-keys.server";
import { PUBLIC_SITE_URL } from "./site-url";
import { readStore, writeStore, nextToken, uuid, type DocumentRow } from "./store.server";

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

function links(row: { token: string; code: string }) {
  const origin = PUBLIC_SITE_URL;
  return {
    token: row.token,
    access_code: row.code,
    verification_url: `${origin}/d/${row.code}`,
    token_url: `${origin}/d/${row.token}`,
    qrcode_url: `${origin}/api/public/v1/qrcode/${row.code}`,
    qrcode_png_url: `${origin}/api/public/v1/qrcode/${row.code}?format=png`,
    qrcode_svg_url: `${origin}/api/public/v1/qrcode/${row.code}?format=svg`,
  };
}

/** Gera o QR Code em PNG (data URL base64) apontando para a página pública do documento. */
async function qrcodeDataUrl(code: string): Promise<string | null> {
  try {
    const QRCode = (await import("qrcode")).default;
    return await QRCode.toDataURL(`${PUBLIC_SITE_URL}/d/${code}`, {
      margin: 1,
      width: 512,
      errorCorrectionLevel: "M",
      type: "image/png",
      color: { dark: "#000000", light: "#FFFFFF" },
    });
  } catch {
    return null;
  }
}

function toPublicFields(row: DocumentRow) {
  const {
    id: _id,
    views_count: _v,
    created_by: _cb,
    api_key_id: _ak,
    ...rest
  } = row;
  return rest;
}

/** GET — lista documentos, opcionalmente restrita a um tipo. */
export async function listDocuments(request: Request, type?: DocumentType) {
  const auth = await authenticateApiKey(request);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 20) || 20, 1), 100);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0) || 0, 0);
  const cpf = url.searchParams.get("cpf");
  const status = url.searchParams.get("status");
  const queryType = type ?? (url.searchParams.get("type") as DocumentType | null);

  const store = readStore();
  let docs = [...store.documents].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  if (queryType) {
    if (!DOCUMENT_TYPES.includes(queryType)) return json({ error: "Tipo inválido." }, 422);
    docs = docs.filter((d) => d.type === queryType);
  }
  if (cpf) docs = docs.filter((d) => d.patient_cpf?.replace(/\D/g, "") === cpf.replace(/\D/g, ""));
  if (status) {
    if (!DOCUMENT_STATUSES.includes(status as (typeof DOCUMENT_STATUSES)[number]))
      return json({ error: "Status inválido." }, 422);
    docs = docs.filter((d) => d.status === status);
  }

  const total = docs.length;
  const page = docs.slice(offset, offset + limit).map(toPublicFields);
  return json({ data: page, total, limit, offset });
}

/** POST — cria um documento. Quando `type` é fixo, ignora o campo do corpo. */
export async function createDocument(request: Request, type?: DocumentType) {
  const auth = await authenticateApiKey(request);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Corpo da requisição inválido (JSON esperado)." }, 400);
  }

  const payload =
    type && typeof body === "object" && body !== null && !Array.isArray(body)
      ? { ...(body as Record<string, unknown>), type }
      : body;

  const parsed = documentInputSchema.safeParse(payload);
  if (!parsed.success) {
    return json(
      {
        error: "Dados inválidos.",
        issues: parsed.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      },
      422,
    );
  }

  const values = parsed.data;
  const store = readStore();

  let establishment_name = values.establishment_name ?? null;
  let establishment_address = values.establishment_address ?? null;
  if (values.establishment_id) {
    const est = store.establishments.find((e) => e.id === values.establishment_id);
    if (est) {
      establishment_name = establishment_name ?? est.name;
      establishment_address =
        establishment_address ??
        [
          [est.address_street, est.address_number].filter(Boolean).join(", "),
          est.address_complement,
          est.address_district,
          [est.address_city, est.address_state].filter(Boolean).join(" - "),
          est.address_zip ? `CEP ${est.address_zip}` : null,
        ]
          .filter(Boolean)
          .join(" • ");
    }
  }

  const code = generateDocumentCode();
  const token = nextToken(values.type);
  const row: DocumentRow = {
    id: uuid(),
    token,
    code,
    type: values.type,
    status: (values.status ?? "valido") as DocumentRow["status"],
    establishment_id: values.establishment_id ?? null,
    establishment_name,
    establishment_address,
    patient_name: values.patient_name,
    patient_birth_date: values.patient_birth_date ?? null,
    patient_cpf: values.patient_cpf ?? null,
    professional_name: values.professional_name ?? null,
    professional_council: values.professional_council ?? null,
    professional_council_number: values.professional_council_number ?? null,
    professional_specialty: values.professional_specialty ?? null,
    body_text: values.body_text ?? null,
    cid: values.cid ?? null,
    leave_start_date: values.leave_start_date ?? null,
    leave_end_date: values.leave_end_date ?? null,
    leave_days: values.leave_days ?? null,
    issued_at: values.issued_at ?? new Date().toISOString(),
    metadata: (values.metadata ?? {}) as Record<string, unknown>,
    views_count: 0,
    created_at: new Date().toISOString(),
    api_key_id: auth.apiKey.id,
  };

  store.documents.push(row);
  writeStore(store);

  const qrcode_base64 = await qrcodeDataUrl(code);
  return json({ data: toPublicFields(row), ...links(row), qrcode_base64 }, 201);
}

/** GET — consulta por token ou código de acesso. */
export async function getDocument(request: Request, code: string, type?: DocumentType) {
  const auth = await authenticateApiKey(request);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  const lookup = normalizeLookup(code);
  const store = readStore();
  let row = store.documents.find((d) => d[lookup.kind] === lookup.value) ?? null;
  if (type && row && row.type !== type) row = null;

  if (!row) return json({ error: "Documento não encontrado.", code: lookup.value }, 404);

  const qrcode_base64 = await qrcodeDataUrl(row.code);
  return json({ data: toPublicFields(row), ...links(row), qrcode_base64 });
}

const patchSchema = z.object({
  status: z.enum(DOCUMENT_STATUSES).optional(),
  body_text: z.string().max(20000).optional(),
  cid: z.string().max(50).optional().nullable(),
});

/** PATCH — atualiza status/texto do documento. */
export async function patchDocument(request: Request, code: string, type?: DocumentType) {
  const auth = await authenticateApiKey(request);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Corpo da requisição inválido (JSON esperado)." }, 400);
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return json({ error: "Dados inválidos." }, 422);

  const lookup = normalizeLookup(code);
  const store = readStore();
  const idx = store.documents.findIndex((d) => d[lookup.kind] === lookup.value);
  if (idx === -1 || (type && store.documents[idx].type !== type))
    return json({ error: "Documento não encontrado." }, 404);

  Object.assign(store.documents[idx], parsed.data);
  writeStore(store);
  return json({ data: toPublicFields(store.documents[idx]) });
}

/** DELETE — revoga o documento (mantém histórico). */
export async function revokeDocument(request: Request, code: string, type?: DocumentType) {
  const auth = await authenticateApiKey(request);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  const lookup = normalizeLookup(code);
  const store = readStore();
  const idx = store.documents.findIndex((d) => d[lookup.kind] === lookup.value);
  if (idx === -1 || (type && store.documents[idx].type !== type))
    return json({ error: "Documento não encontrado." }, 404);

  store.documents[idx].status = "revogado";
  writeStore(store);
  const row = store.documents[idx];
  return json({ ok: true, status: "revogado", token: row.token, access_code: row.code });
}
