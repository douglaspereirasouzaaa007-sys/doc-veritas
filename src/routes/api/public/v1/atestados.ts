import { createFileRoute } from "@tanstack/react-router";
import { CORS_HEADERS } from "@/lib/api-keys.server";
import { createDocument, listDocuments } from "@/lib/documents-api.server";

export const Route = createFileRoute("/api/public/v1/atestados")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async ({ request }) => listDocuments(request, "atestado"),
      POST: async ({ request }) => createDocument(request, "atestado"),
    },
  },
});
