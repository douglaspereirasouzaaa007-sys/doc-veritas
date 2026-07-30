import { createFileRoute } from "@tanstack/react-router";
import QRCode from "qrcode";
import { normalizeLookup } from "@/lib/documents.shared";
import { CORS_HEADERS } from "@/lib/api-keys.server";

export const Route = createFileRoute("/api/public/v1/qrcode/$code")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),

      GET: async ({ request, params }) => {
        const value = normalizeLookup(params.code).value;
        const origin = new URL(request.url).origin;
        const svg = await QRCode.toString(`${origin}/d/${value}`, {
          type: "svg",
          margin: 1,
          width: 512,
          errorCorrectionLevel: "M",
          color: { dark: "#000000", light: "#FFFFFF" },
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
