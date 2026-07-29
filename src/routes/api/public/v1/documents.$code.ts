import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { normalizeCode, prettyCode, DOCUMENT_STATUSES } from "@/lib/documents.shared";
import { authenticateApiKey, CORS_HEADERS, json } from "@/lib/api-keys.server";

const FIELDS =
  "code, type, status, establishment_name, establishment_address, patient_name, patient_birth_date, patient_cpf, professional_name, professional_council, professional_council_number, professional_specialty, body_text, cid, leave_start_date, leave_end_date, leave_days, issued_at, metadata, created_at";

export const Route = createFileRoute("/api/public/v1/documents/$code")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),

      GET: async ({ request, params }) => {
        const auth = await authenticateApiKey(request);
        if (!auth.ok) return json({ error: auth.error }, auth.status);

        const code = prettyCode(normalizeCode(params.code));
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("documents")
          .select(FIELDS)
          .eq("code", code)
          .maybeSingle();
        if (error) return json({ error: error.message }, 500);
        if (!data) return json({ error: "Documento não encontrado.", code }, 404);

        const origin = new URL(request.url).origin;
        return json({
          data,
          verification_url: `${origin}/d/${code}`,
          qrcode_url: `${origin}/api/public/v1/qrcode/${code}`,
        });
      },

      PATCH: async ({ request, params }) => {
        const auth = await authenticateApiKey(request);
        if (!auth.ok) return json({ error: auth.error }, auth.status);

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: "Corpo da requisição inválido (JSON esperado)." }, 400);
        }

        const parsed = z
          .object({
            status: z.enum(DOCUMENT_STATUSES).optional(),
            body_text: z.string().max(20000).optional(),
          })
          .safeParse(body);
        if (!parsed.success) return json({ error: "Dados inválidos." }, 422);

        const code = prettyCode(normalizeCode(params.code));
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("documents")
          .update(parsed.data)
          .eq("code", code)
          .select(FIELDS)
          .maybeSingle();
        if (error) return json({ error: error.message }, 500);
        if (!data) return json({ error: "Documento não encontrado." }, 404);
        return json({ data });
      },

      DELETE: async ({ request, params }) => {
        const auth = await authenticateApiKey(request);
        if (!auth.ok) return json({ error: auth.error }, auth.status);

        const code = prettyCode(normalizeCode(params.code));
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin
          .from("documents")
          .update({ status: "revogado" })
          .eq("code", code);
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true, status: "revogado", code });
      },
    },
  },
});
