/** Domínio público oficial do sistema. Todos os links, QR Codes e páginas usam esta base. */
export const PUBLIC_SITE_URL = "https://memedsolutions.com";

/** Monta uma URL absoluta no domínio público. */
export function publicUrl(path: string): string {
  return `${PUBLIC_SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
