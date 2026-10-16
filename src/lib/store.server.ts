/**
 * Armazenamento persistente via PostgreSQL (Replit built-in).
 *
 * Usa uma única tabela `store_state` com uma linha JSONB para manter
 * compatibilidade com a interface anterior (readStore/writeStore),
 * mas com persistência real independente de deployment target.
 *
 * Todas as funções são async — use `await` nos callers.
 */
import pg from "pg";
import { mergeStoreChanges, planImport, countersFor, canonical } from "./backup.shared";
import { createHash } from "node:crypto";
import { allocateDocumentIdentifiers, findDocumentMatches } from "./document-identifiers";

const { Pool } = pg;

// Pool de conexões — reutilizado entre requests no mesmo processo
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

// Loga conexão na inicialização
pool.on("connect", () => console.log("[store] PostgreSQL conectado"));
pool.on("error", (err) => console.error("[store] Erro no pool PostgreSQL:", err.message));

export type DocumentStatus = "valido" | "revogado" | "expirado";
export type DocumentType = "atestado" | "receita" | "laudo" | "exame" | "declaracao";

export type DocumentRow = {
  id: string;
  token: string;
  code: string;
  type: DocumentType;
  status: DocumentStatus;
  establishment_id?: string | null;
  establishment_name?: string | null;
  establishment_address?: string | null;
  patient_name: string;
  patient_birth_date?: string | null;
  patient_cpf?: string | null;
  professional_name?: string | null;
  professional_council?: string | null;
  professional_council_number?: string | null;
  professional_specialty?: string | null;
  body_text?: string | null;
  cid?: string | null;
  leave_start_date?: string | null;
  leave_end_date?: string | null;
  leave_days?: number | null;
  issued_at: string;
  metadata: Record<string, unknown>;
  views_count: number;
  created_at: string;
  created_by?: string | null;
  api_key_id?: string | null;
};

export type EstablishmentRow = {
  id: string;
  name: string;
  cnpj?: string | null;
  address_street?: string | null;
  address_number?: string | null;
  address_complement?: string | null;
  address_district?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_zip?: string | null;
  phone?: string | null;
  active: boolean;
  created_at: string;
};

export type ApiKeyRow = {
  id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  active: boolean;
  requests_count: number;
  last_used_at?: string | null;
  created_at: string;
  created_by?: string | null;
};

export type VerificationRow = {
  id: string;
  code: string;
  document_id?: string | null;
  found: boolean;
  created_at: string;
};

export type OwnerRow = {
  email: string;
  passwordHash: string;
  registeredAt: string;
};

export type Store = {
  documents: DocumentRow[];
  establishments: EstablishmentRow[];
  api_keys: ApiKeyRow[];
  verifications: VerificationRow[];
  counters: Record<string, number>;
  owner: OwnerRow | null;
};

const DEFAULT_STORE: Store = {
  documents: [],
  establishments: [],
  api_keys: [],
  verifications: [],
  counters: {},
  owner: null,
};

// ── Garante que a tabela existe (idempotente) ─────────────────────────────────

async function ensureTable(): Promise<void> {
  // Two separate queries — pg rejects multi-statement parameterized queries
  await pool.query(`
    CREATE TABLE IF NOT EXISTS store_state (
      id         INTEGER     PRIMARY KEY DEFAULT 1,
      data       JSONB       NOT NULL    DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ             DEFAULT NOW()
    )
  `);
  await pool.query(
    `INSERT INTO store_state (id, data)
     VALUES (1, $1::jsonb)
     ON CONFLICT (id) DO NOTHING`,
    [JSON.stringify(DEFAULT_STORE)],
  );
}

let _tableReady = false;
async function getPool(): Promise<pg.Pool> {
  if (!_tableReady) {
    await ensureTable();
    _tableReady = true;
  }
  return pool;
}

// ── readStore / writeStore ────────────────────────────────────────────────────
const snapshots = new WeakMap<Store, Store>();

export async function readStore(): Promise<Store> {
  const db = await getPool();
  const res = await db.query<{ data: Store }>("SELECT data FROM store_state WHERE id = 1");
  if (res.rows.length === 0) return structuredClone(DEFAULT_STORE);
  const store = { ...DEFAULT_STORE, ...res.rows[0].data };
  snapshots.set(store, structuredClone(store));
  return store;
}

export async function writeStore(store: Store): Promise<void> {
  const before = snapshots.get(store);
  if (!before) throw new Error("Gravação sem leitura de origem bloqueada.");
  const db = await getPool();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ data: Store }>("SELECT data FROM store_state WHERE id=1 FOR UPDATE");
    if (!rows[0]) throw new Error("Armazenamento não encontrado.");
    const merged = mergeStoreChanges(before, store, { ...DEFAULT_STORE, ...rows[0].data });
    await client.query("UPDATE store_state SET data=$1::jsonb, updated_at=NOW() WHERE id=1", [JSON.stringify(merged)]);
    await client.query("COMMIT");
    Object.assign(store, merged);
    snapshots.set(store, structuredClone(merged));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

/** Reserve identifiers and append in one transaction, including concurrent API/panel requests. */
export async function createDocumentSafely(input: Omit<DocumentRow, "code" | "token">): Promise<DocumentRow> {
  const db = await getPool();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ data: Store }>("SELECT data FROM store_state WHERE id=1 FOR UPDATE");
    if (!rows[0]) throw new Error("Armazenamento não encontrado.");
    const current = { ...DEFAULT_STORE, ...rows[0].data };
    if (current.documents.some((row) => row.id === input.id))
      throw new Error("Identificador de documento já utilizado.");
    const { code, token, counters } = allocateDocumentIdentifiers(current.documents, current.counters, input.type);
    const row = { ...input, code, token };
    await client.query(
      "UPDATE store_state SET data=jsonb_set(jsonb_set(data, '{documents}', $1::jsonb), '{counters}', $2::jsonb), updated_at=NOW() WHERE id=1",
      [JSON.stringify([...current.documents, row]), JSON.stringify(counters)],
    );
    await client.query("COMMIT");
    return row;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

async function updateStoreAtomically<T>(edit: (store: Store) => T): Promise<T> {
  const db = await getPool();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ data: Store }>("SELECT data FROM store_state WHERE id=1 FOR UPDATE");
    if (!rows[0]) throw new Error("Armazenamento não encontrado.");
    const current = { ...DEFAULT_STORE, ...rows[0].data };
    const result = edit(current);
    await client.query("UPDATE store_state SET data=$1::jsonb, updated_at=NOW() WHERE id=1", [JSON.stringify(current)]);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

/** Logging simultaneous scans must not cause lost documents or conflicting view counts. */
export function recordPublicDocumentLookup(reference: string) {
  return updateStoreAtomically((store) => {
    const matches = findDocumentMatches(store.documents, reference);
    if (matches.length > 1) return { row: null, ambiguous: true };
    const row = matches[0] ?? null;
    store.verifications.push({
      id: uuid(), code: reference, document_id: row?.id ?? null,
      found: Boolean(row), created_at: new Date().toISOString(),
    });
    if (row) row.views_count = (row.views_count ?? 0) + 1;
    return { row, ambiguous: false };
  });
}

/** Concurrent calls using the same API key cannot invalidate one another's usage updates. */
export function recordApiKeyUsage(hash: string) {
  return updateStoreAtomically((store) => {
    const row = store.api_keys.find((key) => key.key_hash === hash);
    if (!row) return { ok: false as const, status: 401, error: "Chave de API inválida." };
    if (!row.active) return { ok: false as const, status: 403, error: "Chave de API desativada." };
    row.last_used_at = new Date().toISOString();
    row.requests_count = (row.requests_count ?? 0) + 1;
    return { ok: true as const, apiKey: { id: row.id, name: row.name, active: row.active } };
  });
}

export function documentFingerprint(documents: DocumentRow[]) {
  return createHash("sha256").update(canonical(documents)).digest("hex");
}

/** Append-only restoration, rechecked under the same database row lock as all writes. */
export async function importDocumentsSafely(incoming: DocumentRow[], expectedDestination: string) {
  const db = await getPool();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ data: Store }>("SELECT data FROM store_state WHERE id=1 FOR UPDATE");
    if (!rows[0]) throw new Error("Armazenamento não encontrado.");
    const current = { ...DEFAULT_STORE, ...rows[0].data };
    if (documentFingerprint(current.documents) !== expectedDestination)
      throw new Error("A base mudou após a conferência. Confira o arquivo novamente antes de importar.");
    const plan = planImport(current.documents, incoming);
    const documents = [...current.documents, ...plan.additions];
    const counters = countersFor(documents, current.counters);
    await client.query(
      "UPDATE store_state SET data=jsonb_set(jsonb_set(data, '{documents}', $1::jsonb), '{counters}', $2::jsonb), updated_at=NOW() WHERE id=1",
      [JSON.stringify(documents), JSON.stringify(counters)],
    );
    await client.query("COMMIT");
    return { imported: plan.additions.length, skipped: plan.skipped, total: documents.length };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

// ── Owner ─────────────────────────────────────────────────────────────────────

export async function getOwner(): Promise<OwnerRow | null> {
  const db = await getPool();
  const res = await db.query<{ owner: OwnerRow | null }>(
    "SELECT data->>'owner' IS NOT NULL AS has_owner, data->'owner' AS owner FROM store_state WHERE id = 1",
  );
  if (res.rows.length === 0) return null;
  return res.rows[0].owner ?? null;
}

/** Atomically claims the single owner slot; concurrent signups cannot replace the first owner. */
export async function registerOwner(owner: OwnerRow): Promise<boolean> {
  const db = await getPool();
  const result = await db.query(
    `UPDATE store_state
     SET data = jsonb_set(data, '{owner}', $1::jsonb, true),
         updated_at = NOW()
     WHERE id = 1
       AND (data->'owner' IS NULL OR data->'owner' = 'null'::jsonb)
     RETURNING id`,
    [JSON.stringify(owner)],
  );
  return result.rowCount === 1;
}

// ── nextToken — atômico no banco para evitar duplicatas ───────────────────────

const TOKEN_PREFIXES: Record<string, string> = {
  atestado: "ATE",
  receita: "REC",
  laudo: "LAU",
  exame: "EXA",
  declaracao: "DEC",
};

export async function nextToken(type: string): Promise<string> {
  const db = await getPool();
  const prefix = TOKEN_PREFIXES[type] ?? type.slice(0, 3).toUpperCase();
  // Atualiza atomicamente o contador no banco e retorna o novo valor
  const res = await db.query<{ count: string }>(
    `UPDATE store_state
     SET data = jsonb_set(
       data,
       ARRAY['counters', $1::text],
       to_jsonb(COALESCE((data->'counters'->$1::text)::text::int, 10000) + 1)
     ),
     updated_at = NOW()
     WHERE id = 1
     RETURNING (data->'counters'->$1::text)::text::int AS count`,
    [prefix],
  );
  const count = Number(res.rows[0]?.count ?? 10001);
  return `${prefix}-${count}`;
}

// ── uuid ──────────────────────────────────────────────────────────────────────

export function uuid(): string {
  return crypto.randomUUID();
}
