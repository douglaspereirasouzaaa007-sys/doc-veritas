import { createFileRoute } from "@tanstack/react-router";
import { CORS_HEADERS } from "@/lib/api-keys.server";
import { createDocument, listDocuments } from "@/lib/documents-api.server";

export const Route = createFileRoute("/api/public/v1/receitas")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async ({ request }) => listDocuments(request, "receita"),
      POST: async ({ request }) => createDocument(request, "receita"),
    },
  },
});
