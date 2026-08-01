// Helpers server-only para chaves de API — usa armazenamento local.
import { readStore, writeStore } from "./store.server";

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

  const hash = await hashApiKey(header.trim());
  const store = await readStore();
  const found = store.api_keys.find((k) => k.key_hash === hash);

  if (!found) return { ok: false, status: 401, error: "Chave de API inválida." };
  if (!found.active) return { ok: false, status: 403, error: "Chave de API desativada." };

  // Atualiza uso
  found.last_used_at = new Date().toISOString();
  found.requests_count = (found.requests_count ?? 0) + 1;
  await writeStore(store);

  return { ok: true, apiKey: { id: found.id, name: found.name, active: found.active } };
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
