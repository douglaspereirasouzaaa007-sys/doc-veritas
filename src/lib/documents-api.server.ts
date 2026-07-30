// Handlers compartilhados da API pública de documentos (por tipo).
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

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const PUBLIC_FIELDS =
  "token, code, type, status, establishment_name, establishment_address, patient_name, patient_birth_date, patient_cpf, professional_name, professional_council, professional_council_number, professional_specialty, body_text, cid, leave_start_date, leave_end_date, leave_days, issued_at, metadata, created_at";

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

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let query = supabaseAdmin
    .from("documents")
    .select(PUBLIC_FIELDS, { count: "exact" })
    .order("created_at", { ascending: false });

  if (queryType) {
    if (!DOCUMENT_TYPES.includes(queryType)) return json({ error: "Tipo inválido." }, 422);
    query = query.eq("type", queryType);
  }
  if (cpf) query = query.eq("patient_cpf", cpf.replace(/\D/g, "").length === 11 ? cpf : cpf);
  if (status) {
    if (!DOCUMENT_STATUSES.includes(status as (typeof DOCUMENT_STATUSES)[number]))
      return json({ error: "Status inválido." }, 422);
    query = query.eq("status", status as (typeof DOCUMENT_STATUSES)[number]);
  }

  const { data, count, error } = await query.range(offset, offset + limit - 1);
  if (error) return json({ error: error.message }, 500);
  return json({ data, total: count ?? 0, limit, offset });
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
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  let establishment_name = values.establishment_name ?? null;
  let establishment_address = values.establishment_address ?? null;
  if (values.establishment_id) {
    const { data: est } = await supabaseAdmin
      .from("establishments")
      .select("*")
      .eq("id", values.establishment_id)
      .maybeSingle();
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

  const { data, error } = await supabaseAdmin
    .from("documents")
    .insert({
      ...values,
      establishment_name,
      establishment_address,
      metadata: values.metadata ?? {},
      issued_at: values.issued_at ?? new Date().toISOString(),
      code: generateDocumentCode(),
      api_key_id: auth.apiKey.id,
    })
    .select(PUBLIC_FIELDS)
    .single();

  if (error) return json({ error: error.message }, 500);

  const qrcode_base64 = await qrcodeDataUrl(data.code);
  return json({ data, ...links(data), qrcode_base64 }, 201);

}

/** GET — consulta por token ou código de acesso. */
export async function getDocument(request: Request, code: string, type?: DocumentType) {
  const auth = await authenticateApiKey(request);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  const lookup = normalizeLookup(code);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let query = supabaseAdmin.from("documents").select(PUBLIC_FIELDS).eq(lookup.kind, lookup.value);
  if (type) query = query.eq("type", type);

  const { data, error } = await query.maybeSingle();
  if (error) return json({ error: error.message }, 500);
  if (!data) return json({ error: "Documento não encontrado.", code: lookup.value }, 404);

  const qrcode_base64 = await qrcodeDataUrl(data.code);
  return json({ data, ...links(data), qrcode_base64 });

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
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let query = supabaseAdmin.from("documents").update(parsed.data).eq(lookup.kind, lookup.value);
  if (type) query = query.eq("type", type);

  const { data, error } = await query.select(PUBLIC_FIELDS).maybeSingle();
  if (error) return json({ error: error.message }, 500);
  if (!data) return json({ error: "Documento não encontrado." }, 404);
  return json({ data });
}

/** DELETE — revoga o documento (mantém histórico). */
export async function revokeDocument(request: Request, code: string, type?: DocumentType) {
  const auth = await authenticateApiKey(request);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  const lookup = normalizeLookup(code);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let query = supabaseAdmin
    .from("documents")
    .update({ status: "revogado" as const })
    .eq(lookup.kind, lookup.value);
  if (type) query = query.eq("type", type);

  const { data, error } = await query.select("token, code, status").maybeSingle();
  if (error) return json({ error: error.message }, 500);
  if (!data) return json({ error: "Documento não encontrado." }, 404);
  return json({ ok: true, status: "revogado", token: data.token, access_code: data.code });
}
