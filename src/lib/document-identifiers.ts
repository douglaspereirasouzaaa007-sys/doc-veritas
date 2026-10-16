import { generateDocumentCode, normalizeLookup, TOKEN_PREFIX } from "./documents.shared";
import type { DocumentRow, DocumentType } from "./store.server";

/** UUID links disambiguate legacy records without changing their original identifiers. */
export function documentReference(row: Pick<DocumentRow, "id" | "code">): string {
  return normalizeLookup(row.id).kind === "id" ? row.id : row.code;
}

export function findDocumentMatches(documents: DocumentRow[], value: string, type?: DocumentType) {
  const lookup = normalizeLookup(value);
  return documents.filter((row) =>
    (!type || row.type === type) && row[lookup.kind] === lookup.value,
  );
}

/** Must be called while holding the store row lock, together with the insert. */
export function allocateDocumentIdentifiers(
  documents: DocumentRow[],
  counters: Record<string, number>,
  type: DocumentType,
  randomCode = generateDocumentCode,
) {
  const usedCodes = new Set(documents.map((row) => row.code));
  let code = "";
  for (let attempt = 0; attempt < 100; attempt++) {
    const candidate = randomCode();
    if (/^\d{6}$/.test(candidate) && !usedCodes.has(candidate)) {
      code = candidate;
      break;
    }
  }
  if (!code) throw new Error("Não foi possível reservar um código exclusivo. Tente novamente.");
  const prefix = TOKEN_PREFIX[type];
  let count = counters[prefix] ?? 10000;
  for (const row of documents) {
    if (row.token.startsWith(`${prefix}-`)) {
      const n = Number(row.token.slice(prefix.length + 1));
      if (Number.isSafeInteger(n)) count = Math.max(count, n);
    }
  }
  const token = `${prefix}-${count + 1}`;
  return { code, token, counters: { ...counters, [prefix]: count + 1 } };
}
