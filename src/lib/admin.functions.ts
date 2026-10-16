import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  documentInputSchema,
  DOCUMENT_STATUSES,
  DOCUMENT_TYPES,
} from "./documents.shared";
import { requireLocalAuth } from "./auth.functions";
import { readStore, writeStore, createDocumentSafely, uuid, type DocumentRow } from "./store.server";
import { randomApiKey, hashApiKey } from "./api-keys.server";

export const getMe = createServerFn({ method: "GET" })
  .middleware([requireLocalAuth])
  .handler(async () => {
    const { getOwner } = await import("./store.server");
    const owner = await getOwner();
    if (!owner) throw new Error("Cadastro do proprietário não encontrado.");
    return { profile: { full_name: "Proprietário", email: owner.email }, isAdmin: true };
  });

export const getStats = createServerFn({ method: "GET" })
  .middleware([requireLocalAuth])
  .handler(async () => {
    const store = await readStore();
    const counts: Record<string, number> = {};
    const byDay: Record<string, number> = {};
    for (const doc of store.documents) {
      counts[doc.type] = (counts[doc.type] ?? 0) + 1;
      const day = doc.created_at.slice(0, 10);
      byDay[day] = (byDay[day] ?? 0) + 1;
    }
    return {
      documents: store.documents.length,
      valid: store.documents.filter((d) => d.status === "valido").length,
      revoked: store.documents.filter((d) => d.status === "revogado").length,
      establishments: store.establishments.length,
      apiKeys: store.api_keys.filter((k) => k.active).length,
      verifications: store.verifications.length,
      byType: counts,
      byDay,
    };
  });

export const listDocuments = createServerFn({ method: "GET" })
  .middleware([requireLocalAuth])
  .validator((data: unknown) =>
    z
      .object({
        search: z.string().trim().max(120).optional(),
        type: z.string().optional(),
        status: z.string().optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data }) => {
    const store = await readStore();
    let docs = [...store.documents].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    if (data.search) {
      const term = data.search.toLowerCase();
      docs = docs.filter(
        (d) =>
          d.patient_name.toLowerCase().includes(term) ||
          d.token.toLowerCase().includes(term) ||
          d.code.toLowerCase().includes(term) ||
          (d.patient_cpf ?? "").includes(term) ||
          (d.establishment_name ?? "").toLowerCase().includes(term),
      );
    }
    if (data.type && data.type !== "todos")
      docs = docs.filter((d) => d.type === (data.type as (typeof DOCUMENT_TYPES)[number]));
    if (data.status && data.status !== "todos")
      docs = docs.filter((d) => d.status === (data.status as (typeof DOCUMENT_STATUSES)[number]));

    const total = docs.length;
    const from = (data.page - 1) * data.pageSize;
    const rows = docs.slice(from, from + data.pageSize).map((d) => ({
      id: d.id,
      token: d.token,
      code: d.code,
      type: d.type,
      status: d.status,
      patient_name: d.patient_name,
      patient_cpf: d.patient_cpf ?? null,
      establishment_name: d.establishment_name ?? null,
      professional_name: d.professional_name ?? null,
      issued_at: d.issued_at,
      leave_days: d.leave_days ?? null,
      views_count: d.views_count,
      created_at: d.created_at,
    }));

    return { rows, total };
  });

/** Serializa um DocumentRow para um objeto simples (sem tipos opacos). */
function serializeDocument(doc: DocumentRow) {
  return {
    id: doc.id,
    token: doc.token,
    code: doc.code,
    type: doc.type,
    status: doc.status,
    establishment_id: doc.establishment_id ?? null,
    establishment_name: doc.establishment_name ?? null,
    establishment_address: doc.establishment_address ?? null,
    patient_name: doc.patient_name,
    patient_birth_date: doc.patient_birth_date ?? null,
    patient_cpf: doc.patient_cpf ?? null,
    professional_name: doc.professional_name ?? null,
    professional_council: doc.professional_council ?? null,
    professional_council_number: doc.professional_council_number ?? null,
    professional_specialty: doc.professional_specialty ?? null,
    body_text: doc.body_text ?? null,
    cid: doc.cid ?? null,
    leave_start_date: doc.leave_start_date ?? null,
    leave_end_date: doc.leave_end_date ?? null,
    leave_days: doc.leave_days ?? null,
    issued_at: doc.issued_at,
    metadata: (doc.metadata ?? {}) as Record<string, string | number | boolean | null>,
    views_count: doc.views_count,
    created_at: doc.created_at,
    created_by: doc.created_by ?? null,
    api_key_id: doc.api_key_id ?? null,
  };
}

export const getDocument = createServerFn({ method: "GET" })
  .middleware([requireLocalAuth])
  .validator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const store = await readStore();
    const doc = store.documents.find((d) => d.id === data.id);
    return { document: doc ? serializeDocument(doc) : null };
  });

export const saveDocument = createServerFn({ method: "POST" })
  .middleware([requireLocalAuth])
  .validator((data: unknown) =>
    z.object({ id: z.string().optional(), values: documentInputSchema }).parse(data),
  )
  .handler(async ({ data }) => {
    const store = await readStore();
    const payload = {
      ...data.values,
      metadata: (data.values.metadata ?? {}) as Record<string, unknown>,
      issued_at: data.values.issued_at ?? new Date().toISOString(),
    };

    if (data.id) {
      const idx = store.documents.findIndex((d) => d.id === data.id);
      if (idx === -1) throw new Error("Documento não encontrado.");
      Object.assign(store.documents[idx], payload);
      await writeStore(store);
      const row = store.documents[idx];
      return { id: row.id, code: row.code, token: row.token };
    }

    const input: Omit<DocumentRow, "code" | "token"> = {
      id: uuid(),
      type: payload.type,
      status: (payload.status ?? "valido") as DocumentRow["status"],
      establishment_id: payload.establishment_id ?? null,
      establishment_name: payload.establishment_name ?? null,
      establishment_address: payload.establishment_address ?? null,
      patient_name: payload.patient_name,
      patient_birth_date: payload.patient_birth_date ?? null,
      patient_cpf: payload.patient_cpf ?? null,
      professional_name: payload.professional_name ?? null,
      professional_council: payload.professional_council ?? null,
      professional_council_number: payload.professional_council_number ?? null,
      professional_specialty: payload.professional_specialty ?? null,
      body_text: payload.body_text ?? null,
      cid: payload.cid ?? null,
      leave_start_date: payload.leave_start_date ?? null,
      leave_end_date: payload.leave_end_date ?? null,
      leave_days: payload.leave_days ?? null,
      issued_at: payload.issued_at,
      metadata: payload.metadata,
      views_count: 0,
      created_at: new Date().toISOString(),
      created_by: "owner",
    };
    const row = await createDocumentSafely(input);
    return { id: row.id, code: row.code, token: row.token };
  });

export const setDocumentStatus = createServerFn({ method: "POST" })
  .middleware([requireLocalAuth])
  .validator((data: unknown) =>
    z.object({ id: z.string(), status: z.enum(DOCUMENT_STATUSES) }).parse(data),
  )
  .handler(async ({ data }) => {
    const store = await readStore();
    const doc = store.documents.find((d) => d.id === data.id);
    if (!doc) throw new Error("Documento não encontrado.");
    doc.status = data.status;
    await writeStore(store);
    return { ok: true };
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireLocalAuth])
  .validator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const store = await readStore();
    const idx = store.documents.findIndex((d) => d.id === data.id);
    if (idx === -1) throw new Error("Documento não encontrado.");
    store.documents.splice(idx, 1);
    await writeStore(store);
    return { ok: true };
  });

export const listEstablishments = createServerFn({ method: "GET" })
  .middleware([requireLocalAuth])
  .handler(async () => {
    const store = await readStore();
    const rows = [...store.establishments].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    return { rows };
  });

export const saveEstablishment = createServerFn({ method: "POST" })
  .middleware([requireLocalAuth])
  .validator((data: unknown) =>
    z
      .object({
        id: z.string().optional(),
        values: z.object({
          name: z.string().trim().min(2).max(200),
          cnpj: z.string().trim().max(30).optional().nullable(),
          address_street: z.string().trim().max(200).optional().nullable(),
          address_number: z.string().trim().max(20).optional().nullable(),
          address_complement: z.string().trim().max(100).optional().nullable(),
          address_district: z.string().trim().max(100).optional().nullable(),
          address_city: z.string().trim().max(100).optional().nullable(),
          address_state: z.string().trim().max(2).optional().nullable(),
          address_zip: z.string().trim().max(12).optional().nullable(),
          phone: z.string().trim().max(20).optional().nullable(),
          active: z.boolean().optional(),
        }),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const store = await readStore();
    if (data.id) {
      const est = store.establishments.find((e) => e.id === data.id);
      if (!est) throw new Error("Estabelecimento não encontrado.");
      Object.assign(est, data.values);
      await writeStore(store);
      return { id: data.id };
    }
    const newEst = {
      id: uuid(),
      active: true,
      created_at: new Date().toISOString(),
      ...data.values,
    };
    store.establishments.push(newEst);
    await writeStore(store);
    return { id: newEst.id };
  });

export const deleteEstablishment = createServerFn({ method: "POST" })
  .middleware([requireLocalAuth])
  .validator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const store = await readStore();
    const idx = store.establishments.findIndex((e) => e.id === data.id);
    if (idx === -1) throw new Error("Estabelecimento não encontrado.");
    store.establishments.splice(idx, 1);
    await writeStore(store);
    return { ok: true };
  });

export const listApiKeys = createServerFn({ method: "GET" })
  .middleware([requireLocalAuth])
  .handler(async () => {
    const store = await readStore();
    const rows = store.api_keys
      .map(({ key_hash: _h, ...rest }) => rest)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return { rows };
  });

export const createApiKey = createServerFn({ method: "POST" })
  .middleware([requireLocalAuth])
  .validator((data: unknown) =>
    z.object({ name: z.string().trim().min(2).max(80) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { key, prefix } = randomApiKey();
    const key_hash = await hashApiKey(key);
    const store = await readStore();
    store.api_keys.push({
      id: uuid(),
      name: data.name,
      key_prefix: prefix,
      key_hash,
      active: true,
      requests_count: 0,
      last_used_at: null,
      created_at: new Date().toISOString(),
      created_by: "owner",
    });
    await writeStore(store);
    return { key };
  });

export const updateApiKey = createServerFn({ method: "POST" })
  .middleware([requireLocalAuth])
  .validator((data: unknown) =>
    z.object({ id: z.string(), active: z.boolean() }).parse(data),
  )
  .handler(async ({ data }) => {
    const store = await readStore();
    const key = store.api_keys.find((k) => k.id === data.id);
    if (!key) throw new Error("Chave não encontrada.");
    key.active = data.active;
    await writeStore(store);
    return { ok: true };
  });

export const deleteApiKey = createServerFn({ method: "POST" })
  .middleware([requireLocalAuth])
  .validator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const store = await readStore();
    const idx = store.api_keys.findIndex((k) => k.id === data.id);
    if (idx === -1) throw new Error("Chave não encontrada.");
    store.api_keys.splice(idx, 1);
    await writeStore(store);
    return { ok: true };
  });

export const listVerifications = createServerFn({ method: "GET" })
  .middleware([requireLocalAuth])
  .handler(async () => {
    const store = await readStore();
    const rows = [...store.verifications]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 100);
    return { rows };
  });
