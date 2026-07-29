// Helpers server-only para chaves de API.
export function randomApiKey(): { key: string; prefix: string } {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const raw = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  const key = `dv_live_${raw}`;
  return { key, prefix: key.slice(0, 16) };
}

export async function hashApiKey(key: string): Promise<string> {
  const data = new TextEncoder().encode(key);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export type ApiKeyRow = { id: string; name: string; active: boolean };

/** Valida o header de autenticação da API pública e devolve a chave usada. */
export async function authenticateApiKey(request: Request): Promise<
  { ok: true; apiKey: ApiKeyRow } | { ok: false; status: number; error: string }
> {
  const header =
    request.headers.get("x-api-key") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";

  if (!header) {
    return { ok: false, status: 401, error: "Chave de API ausente. Envie o header x-api-key." };
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const hash = await hashApiKey(header.trim());
  const { data, error } = await supabaseAdmin
    .from("api_keys")
    .select("id, name, active, requests_count")
    .eq("key_hash", hash)
    .maybeSingle();

  if (error) return { ok: false, status: 500, error: "Falha ao validar a chave de API." };
  if (!data) return { ok: false, status: 401, error: "Chave de API inválida." };
  if (!data.active) return { ok: false, status: 403, error: "Chave de API desativada." };

  await supabaseAdmin
    .from("api_keys")
    .update({
      last_used_at: new Date().toISOString(),
      requests_count: (data.requests_count ?? 0) + 1,
    })
    .eq("id", data.id);

  return { ok: true, apiKey: { id: data.id, name: data.name, active: data.active } };
}

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
  "Access-Control-Max-Age": "86400",
} as const;

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS_HEADERS },
  });
}
