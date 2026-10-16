/**
 * Server functions e middleware de autenticação.
 * Usa importações dinâmicas para código server-only, evitando bundling no cliente.
 */
import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { z } from "zod";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const COOKIE_NAME = "dv_session";

// ── Helpers de senha ──────────────────────────────────────────────────────────

async function hashPassword(password: string): Promise<string> {
  const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password + salt),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("dv-password"));
  const hash = Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
  return `${salt}:${hash}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, expectedHash] = stored.split(":");
  if (!salt || !expectedHash) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password + salt),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("dv-password"));
  const computedHash = Array.from(new Uint8Array(sig), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  return computedHash === expectedHash;
}

// ── Middleware de autenticação ────────────────────────────────────────────────

export const requireLocalAuth = createMiddleware().server(async ({ next }) => {
  const { getSessionFromHeaders } = await import("./auth.server");
  const session = await getSessionFromHeaders();
  if (!session) throw new Error("Não autenticado. Faça login para continuar.");
  return next({ context: { userId: session.userId } });
});

// ── Utilitário interno: gravar cookie de sessão ───────────────────────────────

async function setSessionCookie(userId: string) {
  const { createSessionToken } = await import("./auth.server");
  const { setCookie } = await import("@tanstack/react-start/server");
  const token = await createSessionToken(userId);
  setCookie(COOKIE_NAME, token, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

// ── Server functions ──────────────────────────────────────────────────────────

/** Retorna se o proprietário já está cadastrado. */
export const getOwnerStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { getOwner } = await import("./store.server");
  return { registered: (await getOwner()) !== null };
});

/** Cadastro único do proprietário. Bloqueia automaticamente após o primeiro uso. */
export const register = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        email: z.string().trim().email("E-mail inválido."),
        password: z.string().min(6, "Senha deve ter ao menos 6 caracteres."),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    if (!process.env.SESSION_SECRET) {
      throw new Error("A configuração segura de sessão está ausente. Nenhum cadastro foi criado.");
    }
    const { registerOwner } = await import("./store.server");
    const passwordHash = await hashPassword(data.password);
    const registered = await registerOwner({
      email: data.email.toLowerCase(),
      passwordHash,
      registeredAt: new Date().toISOString(),
    });
    if (!registered) {
      throw new Error("Cadastro encerrado. O proprietário já foi registrado.");
    }
    await setSessionCookie("owner");
    return { ok: true };
  });

export const signIn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({ email: z.string().trim().email(), password: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { getOwner } = await import("./store.server");
    const owner = await getOwner();

    const authenticated =
      owner !== null &&
      owner.email.toLowerCase() === data.email.toLowerCase() &&
      (await verifyPassword(data.password, owner.passwordHash));

    if (!authenticated) throw new Error("E-mail ou senha incorretos.");
    await setSessionCookie("owner");
    return { ok: true };
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const { setCookie } = await import("@tanstack/react-start/server");
  setCookie(COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return { ok: true };
});

export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  const { getSessionFromHeaders } = await import("./auth.server");
  const session = await getSessionFromHeaders();
  return { loggedIn: Boolean(session) };
});
