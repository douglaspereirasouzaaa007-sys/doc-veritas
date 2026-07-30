import { createFileRoute } from "@tanstack/react-router";
import { CORS_HEADERS } from "@/lib/api-keys.server";
import { getDocument, patchDocument, revokeDocument } from "@/lib/documents-api.server";

export const Route = createFileRoute("/api/public/v1/laudos/$code")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async ({ request, params }) => getDocument(request, params.code, "laudo"),
      PATCH: async ({ request, params }) => patchDocument(request, params.code, "laudo"),
      DELETE: async ({ request, params }) => revokeDocument(request, params.code, "laudo"),
    },
  },
});
