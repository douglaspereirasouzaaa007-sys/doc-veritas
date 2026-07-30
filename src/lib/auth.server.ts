/**
 * Utilitários de autenticação — SERVER-ONLY.
 * Este arquivo só deve ser importado por outros arquivos .server.ts / middleware.
 */
import { createMiddleware } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";

const COOKIE_NAME = "dv_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// ── HMAC helpers ──────────────────────────────────────────────────────────────

async function hmacSign(data: string): Promise<string> {
  const secret = process.env.SESSION_SECRET ?? "local-dev-secret-please-change";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createSessionToken(userId: string): Promise<string> {
  const payload = Buffer.from(
    JSON.stringify({ userId, exp: Date.now() + SESSION_TTL_MS }),
  ).toString("base64url");
  const sig = await hmacSign(payload);
  return `${payload}.${sig}`;
}

export async function parseSessionToken(token: string): Promise<{ userId: string } | null> {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmacSign(payload);
  if (expected !== sig) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
    return { userId: parsed.userId };
  } catch {
    return null;
  }
}

// ── Session from request ──────────────────────────────────────────────────────

export async function getSessionFromHeaders(): Promise<{ userId: string } | null> {
  const token = getCookie(COOKIE_NAME);
  if (!token) return null;
  return parseSessionToken(token);
}

// ── Middleware ────────────────────────────────────────────────────────────────

export const requireLocalAuth = createMiddleware().server(async ({ next }) => {
  const session = await getSessionFromHeaders();
  if (!session) throw new Error("Não autenticado. Faça login para continuar.");
  return next({ context: { userId: session.userId } });
});
