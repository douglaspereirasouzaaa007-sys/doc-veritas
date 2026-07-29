import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { normalizeCode, prettyCode, type PublicDocument } from "./documents.shared";

/** Busca pública (somente leitura) de um documento pelo código de verificação. */
export const getPublicDocument = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ code: z.string().min(4).max(40) }).parse(data))
  .handler(async ({ data }): Promise<{ document: PublicDocument | null }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = prettyCode(normalizeCode(data.code));

    const { data: row } = await supabaseAdmin
      .from("documents")
      .select(
        "id, code, type, status, establishment_name, establishment_address, patient_name, patient_birth_date, patient_cpf, professional_name, professional_council, professional_council_number, professional_specialty, body_text, cid, leave_start_date, leave_end_date, leave_days, issued_at, metadata, views_count",
      )
      .eq("code", code)
      .maybeSingle();

    await supabaseAdmin.from("verifications").insert({
      document_id: row?.id ?? null,
      code,
      found: Boolean(row),
    });

    if (!row) return { document: null };

    await supabaseAdmin
      .from("documents")
      .update({ views_count: (row.views_count ?? 0) + 1 })
      .eq("id", row.id);

    const { id: _id, views_count: _v, ...rest } = row;
    return { document: { ...rest, metadata: (rest.metadata ?? {}) as Record<string, string | number | boolean | null> } };
  });
