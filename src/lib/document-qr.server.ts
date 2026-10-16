import QRCode from "qrcode";
import { readStore } from "./store.server";
import { documentReference, findDocumentMatches } from "./document-identifiers";
import { CORS_HEADERS, json } from "./api-keys.server";
import { PUBLIC_SITE_URL } from "./site-url";

export async function getDocumentQr(request: Request, reference: string): Promise<Response> {
  const store = await readStore();
  const matches = findDocumentMatches(store.documents, reference);
  if (!matches.length) return json({ error: "Documento não encontrado." }, 404);
  if (matches.length > 1)
    return json({ error: "Código ambíguo. Solicite ao emissor o link individual do documento." }, 409);
  const url = new URL(request.url);
  const target = `${PUBLIC_SITE_URL}/d/${documentReference(matches[0])}`;
  const format = (url.searchParams.get("format") ?? "svg").toLowerCase();
  if (!["png", "svg"].includes(format)) return json({ error: "Formato deve ser png ou svg." }, 422);
  const size = Number(url.searchParams.get("size") ?? 512);
  const width = Number.isFinite(size) ? Math.min(Math.max(Math.round(size), 96), 1024) : 512;
  const options = { margin: 1, width, errorCorrectionLevel: "M" as const, color: { dark: "#000000", light: "#FFFFFF" } };
  try {
    const bytes = format === "png"
      ? new Uint8Array(await QRCode.toBuffer(target, { ...options, type: "png" }))
      : await QRCode.toString(target, { ...options, type: "svg" });
    return new Response(bytes, {
      headers: {
        "Content-Type": format === "png" ? "image/png" : "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
        ...CORS_HEADERS,
      },
    });
  } catch {
    return json({ error: "Falha ao gerar o QR Code. Tente novamente." }, 503);
  }
}
