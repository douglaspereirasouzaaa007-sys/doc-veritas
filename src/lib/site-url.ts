/**
 * Domínio público do sistema.
 * VITE_PUBLIC_SITE_URL é exposta pelo Vite em ambos SSR e browser — sem hydration mismatch.
 * Fallback: REPLIT_DEV_DOMAIN (apenas SSR) ou localhost.
 */
function resolveSiteUrl(): string {
  // VITE_* vars são injetadas tanto no bundle cliente quanto no SSR pelo Vite
  const viteUrl = import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined;
  if (viteUrl) return viteUrl;

  // Fallback apenas server-side (não afeta hydration pois REPLIT_DEV_DOMAIN não varia entre renders)
  if (typeof process !== "undefined" && process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  return "http://localhost:5000";
}

export const PUBLIC_SITE_URL = resolveSiteUrl();

/** Monta uma URL absoluta no domínio público. */
export function publicUrl(path: string): string {
  return `${PUBLIC_SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
