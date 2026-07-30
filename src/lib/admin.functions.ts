import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  documentInputSchema,
  generateDocumentCode,
  DOCUMENT_STATUSES,
  DOCUMENT_TYPES,
} from "./documents.shared";

export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", context.userId)
      .maybeSingle();
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { profile: profile ?? null, isAdmin: Boolean(isAdmin) };
  });

export const getStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [docs, valid, revoked, establishments, keys, verifications] = await Promise.all([
      context.supabase.from("documents").select("id", { count: "exact", head: true }),
      context.supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("status", "valido"),
      context.supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("status", "revogado"),
      context.supabase.from("establishments").select("id", { count: "exact", head: true }),
      context.supabase
        .from("api_keys")
        .select("id", { count: "exact", head: true })
        .eq("active", true),
      context.supabase.from("verifications").select("id", { count: "exact", head: true }),
    ]);

    const { data: byType } = await context.supabase.from("documents").select("type, created_at");
    const counts: Record<string, number> = {};
    const byDay: Record<string, number> = {};
    for (const row of byType ?? []) {
      counts[row.type] = (counts[row.type] ?? 0) + 1;
      const day = String(row.created_at).slice(0, 10);
      byDay[day] = (byDay[day] ?? 0) + 1;
    }

    return {
      documents: docs.count ?? 0,
      valid: valid.count ?? 0,
      revoked: revoked.count ?? 0,
      establishments: establishments.count ?? 0,
      apiKeys: keys.count ?? 0,
      verifications: verifications.count ?? 0,
      byType: counts,
      byDay,
    };
  });

export const listDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
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
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("documents")
      .select(
        "id, token, code, type, status, patient_name, patient_cpf, establishment_name, professional_name, issued_at, leave_days, views_count, created_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false });

    if (data.search) {
      const term = `%${data.search}%`;
      query = query.or(
        `patient_name.ilike.${term},token.ilike.${term},code.ilike.${term},patient_cpf.ilike.${term},establishment_name.ilike.${term}`,
      );
    }
    if (data.type && data.type !== "todos")
      query = query.eq("type", data.type as (typeof DOCUMENT_TYPES)[number]);
    if (data.status && data.status !== "todos")
      query = query.eq("status", data.status as (typeof DOCUMENT_STATUSES)[number]);

    const from = (data.page - 1) * data.pageSize;
    const { data: rows, count, error } = await query.range(from, from + data.pageSize - 1);
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0 };
  });

export const getDocument = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("documents")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { document: row };
  });

export const saveDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ id: z.string().uuid().optional(), values: documentInputSchema })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const payload = {
      ...data.values,
      metadata: data.values.metadata ?? {},
      issued_at: data.values.issued_at ?? new Date().toISOString(),
    };

    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("documents")
        .update(payload)
        .eq("id", data.id)
        .select("id, token, code")
        .maybeSingle();
      if (error) throw new Error(error.message);
      return { id: row?.id ?? data.id, code: row?.code ?? "", token: row?.token ?? "" };
    }

    const { data: row, error } = await context.supabase
      .from("documents")
      .insert({ ...payload, code: generateDocumentCode(), created_by: context.userId })
      .select("id, token, code")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id, code: row.code, token: row.token };
  });

export const setDocumentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ id: z.string().uuid(), status: z.enum(DOCUMENT_STATUSES) })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("documents")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("documents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listEstablishments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("establishments")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

export const saveEstablishment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
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
  .handler(async ({ data, context }) => {
    if (data.id) {
      const { error } = await context.supabase
        .from("establishments")
        .update(data.values)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("establishments")
      .insert(data.values)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteEstablishment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("establishments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listApiKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("api_keys")
      .select("id, name, key_prefix, active, last_used_at, requests_count, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

export const createApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ name: z.string().trim().min(2).max(80) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { randomApiKey, hashApiKey } = await import("./api-keys.server");
    const { key, prefix } = randomApiKey();
    const key_hash = await hashApiKey(key);
    const { error } = await context.supabase.from("api_keys").insert({
      name: data.name,
      key_prefix: prefix,
      key_hash,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { key };
  });

export const updateApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), active: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("api_keys")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("api_keys").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listVerifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("verifications")
      .select("id, code, found, created_at, document_id")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });
