import { createFileRoute } from "@tanstack/react-router";
import { CORS_HEADERS } from "@/lib/api-keys.server";
import { getDocument, patchDocument, revokeDocument } from "@/lib/documents-api.server";

export const Route = createFileRoute("/api/public/v1/receitas/$code")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async ({ request, params }) => getDocument(request, params.code, "receita"),
      PATCH: async ({ request, params }) => patchDocument(request, params.code, "receita"),
      DELETE: async ({ request, params }) => revokeDocument(request, params.code, "receita"),
    },
  },
});
