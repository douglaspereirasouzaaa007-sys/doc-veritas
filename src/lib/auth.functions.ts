/**
 * Server functions e middleware de autenticação — podem ser importadas pelo cliente via useServerFn.
 * Usa importações dinâmicas para código server-only, evitando bundling no cliente.
 */
import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Middleware de autenticação local — usa dynamic import para não puxar
 * @tanstack/react-start/server para o bundle do cliente.
 */
export const requireLocalAuth = createMiddleware().server(async ({ next }) => {
  const { getSessionFromHeaders } = await import("./auth.server");
  const session = await getSessionFromHeaders();
  if (!session) throw new Error("Não autenticado. Faça login para continuar.");
  return next({ context: { userId: session.userId } });
});

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const COOKIE_NAME = "dv_session";

export const signIn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({ email: z.string().email(), password: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data }) => {
    const expectedEmail = process.env.OWNER_EMAIL ?? "admin@localhost";
    const expectedPassword = process.env.OWNER_PASSWORD ?? "admin1234";

    if (data.email !== expectedEmail || data.password !== expectedPassword) {
      throw new Error("E-mail ou senha incorretos.");
    }

    const { createSessionToken } = await import("./auth.server");
    const { appendResponseHeader } = await import("@tanstack/react-start/server");

    const token = await createSessionToken("owner");
    const maxAge = Math.floor(SESSION_TTL_MS / 1000);
    appendResponseHeader(
      "set-cookie",
      `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`,
    );
    return { ok: true };
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const { appendResponseHeader } = await import("@tanstack/react-start/server");
  appendResponseHeader(
    "set-cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
  return { ok: true };
});

export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  const { getSessionFromHeaders } = await import("./auth.server");
  const session = await getSessionFromHeaders();
  return { loggedIn: Boolean(session) };
});
