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
  await pool.query(`
    CREATE TABLE IF NOT EXISTS store_state (
      id         INTEGER     PRIMARY KEY DEFAULT 1,
      data       JSONB       NOT NULL    DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ             DEFAULT NOW()
    );
    INSERT INTO store_state (id, data)
    VALUES (1, $1::jsonb)
    ON CONFLICT (id) DO NOTHING;
  `, [JSON.stringify(DEFAULT_STORE)]);
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

export async function readStore(): Promise<Store> {
  const db = await getPool();
  const res = await db.query<{ data: Store }>("SELECT data FROM store_state WHERE id = 1");
  if (res.rows.length === 0) return structuredClone(DEFAULT_STORE);
  return { ...DEFAULT_STORE, ...res.rows[0].data };
}

export async function writeStore(store: Store): Promise<void> {
  const db = await getPool();
  await db.query(
    `INSERT INTO store_state (id, data, updated_at)
     VALUES (1, $1::jsonb, NOW())
     ON CONFLICT (id) DO UPDATE SET data = $1::jsonb, updated_at = NOW()`,
    [JSON.stringify(store)],
  );
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

export async function saveOwner(owner: OwnerRow): Promise<void> {
  const db = await getPool();
  await db.query(
    `UPDATE store_state
     SET data = jsonb_set(data, '{owner}', $1::jsonb),
         updated_at = NOW()
     WHERE id = 1`,
    [JSON.stringify(owner)],
  );
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
