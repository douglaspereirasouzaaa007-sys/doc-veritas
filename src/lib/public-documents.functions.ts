import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { normalizeLookup, type PublicDocument } from "./documents.shared";
import { readStore, writeStore } from "./store.server";
import { uuid } from "./store.server";

/** Busca pública (somente leitura) de um documento pelo token ou código de acesso. */
export const getPublicDocument = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ code: z.string().min(4).max(40) }).parse(data))
  .handler(async ({ data }): Promise<{ document: PublicDocument | null }> => {
    const lookup = normalizeLookup(data.code);
    const store = readStore();

    const row = store.documents.find((d) => d[lookup.kind] === lookup.value) ?? null;

    // Registra verificação
    store.verifications.push({
      id: uuid(),
      code: lookup.value,
      document_id: row?.id ?? null,
      found: Boolean(row),
      created_at: new Date().toISOString(),
    });

    if (row) {
      row.views_count = (row.views_count ?? 0) + 1;
    }

    writeStore(store);

    if (!row) return { document: null };

    const {
      id: _id,
      views_count: _v,
      created_by: _cb,
      api_key_id: _ak,
      ...rest
    } = row;

    return {
      document: {
        ...rest,
        establishment_name: rest.establishment_name ?? null,
        establishment_address: rest.establishment_address ?? null,
        patient_birth_date: rest.patient_birth_date ?? null,
        patient_cpf: rest.patient_cpf ?? null,
        professional_name: rest.professional_name ?? null,
        professional_council: rest.professional_council ?? null,
        professional_council_number: rest.professional_council_number ?? null,
        professional_specialty: rest.professional_specialty ?? null,
        body_text: rest.body_text ?? null,
        cid: rest.cid ?? null,
        leave_start_date: rest.leave_start_date ?? null,
        leave_end_date: rest.leave_end_date ?? null,
        leave_days: rest.leave_days ?? null,
        metadata: (rest.metadata ?? {}) as Record<string, string | number | boolean | null>,
      },
    };
  });
