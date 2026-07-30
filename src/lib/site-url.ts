/** Domínio público do sistema. Usa o domínio Replit em dev, ou PUBLIC_SITE_URL em produção. */
function resolveSiteUrl(): string {
  if (typeof process !== "undefined") {
    if (process.env.PUBLIC_SITE_URL) return process.env.PUBLIC_SITE_URL;
    if (process.env.REPLIT_DEV_DOMAIN) return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  return "http://localhost:5000";
}

export const PUBLIC_SITE_URL = resolveSiteUrl();

/** Monta uma URL absoluta no domínio público. */
export function publicUrl(path: string): string {
  return `${PUBLIC_SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
