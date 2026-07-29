import { createFileRoute } from "@tanstack/react-router";
import {
  documentInputSchema,
  generateDocumentCode,
  DOCUMENT_TYPES,
} from "@/lib/documents.shared";
import { authenticateApiKey, CORS_HEADERS, json } from "@/lib/api-keys.server";

const PUBLIC_FIELDS =
  "code, type, status, establishment_name, establishment_address, patient_name, patient_birth_date, patient_cpf, professional_name, professional_council, professional_council_number, professional_specialty, body_text, cid, leave_start_date, leave_end_date, leave_days, issued_at, metadata, created_at";

export const Route = createFileRoute("/api/public/v1/documents")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),

      GET: async ({ request }) => {
        const auth = await authenticateApiKey(request);
        if (!auth.ok) return json({ error: auth.error }, auth.status);

        const url = new URL(request.url);
        const limit = Math.min(Number(url.searchParams.get("limit") ?? 20) || 20, 100);
        const offset = Math.max(Number(url.searchParams.get("offset") ?? 0) || 0, 0);
        const type = url.searchParams.get("type");
        const cpf = url.searchParams.get("cpf");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let query = supabaseAdmin
          .from("documents")
          .select(PUBLIC_FIELDS, { count: "exact" })
          .order("created_at", { ascending: false });
        if (type) query = query.eq("type", type as (typeof DOCUMENT_TYPES)[number]);
        if (cpf) query = query.eq("patient_cpf", cpf);

        const { data, count, error } = await query.range(offset, offset + limit - 1);
        if (error) return json({ error: error.message }, 500);
        return json({ data, total: count ?? 0, limit, offset });
      },

      POST: async ({ request }) => {
        const auth = await authenticateApiKey(request);
        if (!auth.ok) return json({ error: auth.error }, auth.status);

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: "Corpo da requisição inválido (JSON esperado)." }, 400);
        }

        const parsed = documentInputSchema.safeParse(body);
        if (!parsed.success) {
          return json(
            {
              error: "Dados inválidos.",
              issues: parsed.error.issues.map((i) => ({
                field: i.path.join("."),
                message: i.message,
              })),
            },
            422,
          );
        }

        const values = parsed.data;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        let establishment_name = values.establishment_name ?? null;
        let establishment_address = values.establishment_address ?? null;
        if (values.establishment_id) {
          const { data: est } = await supabaseAdmin
            .from("establishments")
            .select("*")
            .eq("id", values.establishment_id)
            .maybeSingle();
          if (est) {
            establishment_name = establishment_name ?? est.name;
            establishment_address =
              establishment_address ??
              [
                [est.address_street, est.address_number].filter(Boolean).join(", "),
                est.address_complement,
                est.address_district,
                [est.address_city, est.address_state].filter(Boolean).join(" - "),
                est.address_zip ? `CEP ${est.address_zip}` : null,
              ]
                .filter(Boolean)
                .join(" • ");
          }
        }

        const { data, error } = await supabaseAdmin
          .from("documents")
          .insert({
            ...values,
            establishment_name,
            establishment_address,
            metadata: values.metadata ?? {},
            issued_at: values.issued_at ?? new Date().toISOString(),
            code: generateDocumentCode(),
            api_key_id: auth.apiKey.id,
          })
          .select(PUBLIC_FIELDS)
          .single();

        if (error) return json({ error: error.message }, 500);

        const origin = new URL(request.url).origin;
        return json(
          {
            data,
            verification_url: `${origin}/d/${data.code}`,
            qrcode_url: `${origin}/api/public/v1/qrcode/${data.code}.png`,
          },
          201,
        );
      },
    },
  },
});
