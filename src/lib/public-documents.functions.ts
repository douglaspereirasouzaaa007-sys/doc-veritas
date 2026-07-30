import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { normalizeLookup, type PublicDocument } from "./documents.shared";
import { readStore, writeStore } from "./store.server";
import { uuid } from "./store.server";

/** Busca pública (somente leitura) de um documento pelo token ou código de acesso. */
export const getPublicDocument = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ code: z.string().min(4).max(40) }).parse(data))
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
        metadata: (rest.metadata ?? {}) as Record<string, string | number | boolean | null>,
      },
    };
  });
