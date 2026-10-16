import { createFileRoute } from "@tanstack/react-router";
import { CORS_HEADERS } from "@/lib/api-keys.server";
import { getDocumentQr } from "@/lib/document-qr.server";

export const Route = createFileRoute("/api/public/v1/qrcode/$code")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async ({ request, params }) => getDocumentQr(request, params.code),
    },
  },
});
