import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { normalizeLookup, type PublicDocument } from "./documents.shared";

const SELECT =
  "id, token, code, type, status, establishment_name, establishment_address, patient_name, patient_birth_date, patient_cpf, professional_name, professional_council, professional_council_number, professional_specialty, body_text, cid, leave_start_date, leave_end_date, leave_days, issued_at, metadata, views_count";

/** Busca pública (somente leitura) de um documento pelo token ou código de acesso. */
export const getPublicDocument = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ code: z.string().min(4).max(40) }).parse(data))
  .handler(async ({ data }): Promise<{ document: PublicDocument | null }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const lookup = normalizeLookup(data.code);

    const { data: row } = await supabaseAdmin
      .from("documents")
      .select(SELECT)
      .eq(lookup.kind, lookup.value)
      .maybeSingle();

    await supabaseAdmin.from("verifications").insert({
      document_id: row?.id ?? null,
      code: lookup.value,
      found: Boolean(row),
    });

    if (!row) return { document: null };

    await supabaseAdmin
      .from("documents")
      .update({ views_count: (row.views_count ?? 0) + 1 })
      .eq("id", row.id);

    const { id: _id, views_count: _v, ...rest } = row;
    return {
      document: {
        ...rest,
        metadata: (rest.metadata ?? {}) as Record<string, string | number | boolean | null>,
      },
    };
  });
