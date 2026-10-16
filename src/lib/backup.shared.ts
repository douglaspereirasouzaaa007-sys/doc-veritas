import { z } from "zod";
import type { DocumentRow, Store } from "./store.server";

export const MAX_BACKUP_BYTES = 40 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;
const optionalString = z.string().nullable().optional();
const rowSchema = z.object({
  id: z.string().min(1).max(200),
  code: z.string().regex(/^[a-zA-Z0-9-]+$/).max(100),
  token: z.string().regex(/^[a-zA-Z0-9-]+$/).max(100),
  type: z.enum(["atestado", "receita", "laudo", "exame", "declaracao"]),
  status: z.enum(["valido", "revogado", "expirado"]),
  patient_name: z.string().min(1),
  // Legacy issue dates may use a non-ISO format. Restore their exact value;
  // backups must not silently rewrite dates on medical documents.
  issued_at: z.string().min(1),
  created_at: z.string().refine((v) => Number.isFinite(Date.parse(v)), "Data de criação inválida"),
  views_count: z.number().int().nonnegative(),
  metadata: z.record(z.unknown()),
  establishment_id: optionalString,
  establishment_name: optionalString,
  establishment_address: optionalString,
  patient_birth_date: optionalString,
  patient_cpf: optionalString,
  professional_name: optionalString,
  professional_council: optionalString,
  professional_council_number: optionalString,
  professional_specialty: optionalString,
  body_text: optionalString,
  cid: optionalString,
  leave_start_date: optionalString,
  leave_end_date: optionalString,
  leave_days: z.number().nullable().optional(),
  created_by: optionalString,
  api_key_id: optionalString,
}).passthrough();

export function parseBackupDocuments(value: unknown): DocumentRow[] {
  const parsed = z.array(rowSchema).min(1).max(25000).safeParse(value);
  if (!parsed.success) throw new Error("Documentos inválidos ou incompletos no backup. Nada foi importado.");
  const ids = new Set<string>();
  for (const doc of parsed.data) {
    if (ids.has(doc.id)) throw new Error("O backup contém IDs de documento repetidos. Nada foi importado.");
    ids.add(doc.id);
  }
  return parsed.data as DocumentRow[];
}

export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function documentSummary(documents: DocumentRow[]) {
  const codes = new Set(documents.map((d) => d.code));
  const tokens = new Set(documents.map((d) => d.token));
  return { count: documents.length, repeatedCodes: documents.length - codes.size,
    repeatedTokens: documents.length - tokens.size };
}

export function planImport(existing: DocumentRow[], incoming: DocumentRow[]) {
  const byId = new Map(existing.map((doc) => [doc.id, doc]));
  const codes = new Set(existing.map((doc) => doc.code));
  const tokens = new Set(existing.map((doc) => doc.token));
  const additions: DocumentRow[] = [];
  let skipped = 0;
  for (const doc of incoming) {
    const found = byId.get(doc.id);
    if (found) {
      if (canonical(found) !== canonical(doc))
        throw new Error("Há um documento com o mesmo ID e conteúdo diferente no destino. Importação bloqueada; nenhum dado foi sobrescrito.");
      skipped++;
    } else {
      if (codes.has(doc.code) || tokens.has(doc.token))
        throw new Error("Um código ou token do backup já pertence a outro documento no destino. Importe em uma base vazia ou analise os conflitos; nada será sobrescrito.");
      additions.push(doc);
    }
  }
  return { additions, skipped, ...documentSummary(incoming), destinationCount: existing.length };
}

export function countersFor(documents: DocumentRow[], existing: Record<string, number>) {
  const counters = { ...existing };
  for (const doc of documents) {
    const match = /^([A-Z]+)-(\d+)$/.exec(doc.token);
    if (match && Number.isSafeInteger(Number(match[2])))
      counters[match[1]] = Math.max(counters[match[1]] ?? 10000, Number(match[2]));
  }
  return counters;
}

// Merge only actual edits from a read snapshot. Unrelated concurrent writes
// (including an import or token reservation) must never be overwritten.
export function mergeStoreChanges(before: Store, edited: Store, current: Store): Store {
  const result = structuredClone(current);
  const collections = ["documents", "establishments", "api_keys", "verifications"] as const;
  for (const name of collections) {
    const oldRows = new Map(before[name].map((row) => [row.id, row]));
    const newRows = new Map(edited[name].map((row) => [row.id, row]));
    const currentRows = new Map(current[name].map((row) => [row.id, row]));
    for (const [id, oldRow] of oldRows) {
      const changedRow = newRows.get(id);
      if (canonical(oldRow) === canonical(changedRow)) continue;
      if (canonical(currentRows.get(id)) !== canonical(oldRow))
        throw new Error("Dados alterados por outra operação. Atualize a página e tente novamente.");
      if (changedRow) currentRows.set(id, changedRow);
      else currentRows.delete(id);
    }
    for (const [id, row] of newRows) {
      if (oldRows.has(id)) continue;
      if (currentRows.has(id) && canonical(currentRows.get(id)) !== canonical(row))
        throw new Error("Identificador já utilizado por outra operação.");
      currentRows.set(id, row);
    }
    (result[name] as unknown[]) = [...currentRows.values()];
  }
  result.counters = countersFor(result.documents, current.counters);
  for (const [key, count] of Object.entries(edited.counters))
    result.counters[key] = Math.max(result.counters[key] ?? 10000, count);
  if (canonical(before.owner) !== canonical(edited.owner)) {
    if (canonical(before.owner) !== canonical(current.owner))
      throw new Error("Cadastro alterado por outra operação.");
    result.owner = edited.owner;
  }
  return result;
}
