import { createMiddleware } from "@tanstack/react-start";

/**
 * No-op: autenticação agora é via cookie HttpOnly.
 * O cookie é enviado automaticamente pelo browser em toda requisição same-origin.
 */
export const attachSupabaseAuth = createMiddleware().server(async ({ next }) => {
  return next();
});
