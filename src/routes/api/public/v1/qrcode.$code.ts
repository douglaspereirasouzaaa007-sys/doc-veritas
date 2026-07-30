import { createFileRoute } from "@tanstack/react-router";
import QRCode from "qrcode";
import { normalizeLookup } from "@/lib/documents.shared";
import { CORS_HEADERS } from "@/lib/api-keys.server";

export const Route = createFileRoute("/api/public/v1/qrcode/$code")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),

      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        const value = normalizeLookup(params.code).value;
        const origin = url.origin;
        const target = `${origin}/d/${value}`;
        const format = (url.searchParams.get("format") ?? "svg").toLowerCase();
        const width = Math.min(Math.max(Number(url.searchParams.get("size") ?? 512) || 512, 96), 1024);
        const options = {
          margin: 1,
          width,
          errorCorrectionLevel: "M" as const,
          color: { dark: "#000000", light: "#FFFFFF" },
        };

        if (format === "png") {
          const dataUrl = await QRCode.toDataURL(target, { ...options, type: "image/png" });
          const base64 = dataUrl.split(",")[1] ?? "";
          const binary = atob(base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
          return new Response(bytes, {
            status: 200,
            headers: {
              "Content-Type": "image/png",
              "Cache-Control": "public, max-age=86400",
              ...CORS_HEADERS,
            },
          });
        }

        const svg = await QRCode.toString(target, { type: "svg", ...options });
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
