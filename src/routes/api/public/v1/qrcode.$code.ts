import { createFileRoute } from "@tanstack/react-router";
import QRCode from "qrcode";
import { normalizeCode, prettyCode } from "@/lib/documents.shared";
import { CORS_HEADERS } from "@/lib/api-keys.server";

export const Route = createFileRoute("/api/public/v1/qrcode/$code")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),

      GET: async ({ request, params }) => {
        const code = prettyCode(normalizeCode(params.code));
        const origin = new URL(request.url).origin;
        const svg = await QRCode.toString(`${origin}/d/${code}`, {
          type: "svg",
          margin: 1,
          width: 512,
          color: { dark: "#4B3BF0", light: "#FFFFFF" },
        });
        return new Response(svg, {
          status: 200,
          headers: {
            "Content-Type": "image/svg+xml; charset=utf-8",
            "Cache-Control": "public, max-age=86400",
            ...CORS_HEADERS,
          },
        });
      },
    },
  },
});
