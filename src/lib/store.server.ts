/**
 * Armazenamento local em JSON — substitui o Supabase.
 * Lê e escreve em data/store.json na raiz do projeto.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";

const DATA_PATH = resolve(process.cwd(), "data", "store.json");

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

type Store = {
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

/** Retorna as credenciais do proprietário cadastrado, ou null se ainda não há cadastro. */
export function getOwner(): OwnerRow | null {
  return readStore().owner ?? null;
}

/** Salva o proprietário no store. */
export function saveOwner(owner: OwnerRow): void {
  const store = readStore();
  store.owner = owner;
  writeStore(store);
}

const TOKEN_PREFIXES: Record<string, string> = {
  atestado: "ATE",
  receita: "REC",
  laudo: "LAU",
  exame: "EXA",
  declaracao: "DEC",
};

function ensureDir(): void {
  const dir = dirname(DATA_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function readStore(): Store {
  ensureDir();
  if (!existsSync(DATA_PATH)) return structuredClone(DEFAULT_STORE);
  try {
    const raw = readFileSync(DATA_PATH, "utf-8");
    return { ...DEFAULT_STORE, ...JSON.parse(raw) };
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
}

export function writeStore(store: Store): void {
  ensureDir();
  writeFileSync(DATA_PATH, JSON.stringify(store, null, 2), "utf-8");
}

/** Gera o próximo token sequencial no formato PREFIXO-NNNNN (mínimo 5 dígitos). */
export function nextToken(type: string): string {
  const store = readStore();
  const prefix = TOKEN_PREFIXES[type] ?? type.slice(0, 3).toUpperCase();
  // Inicia em 10000 para que o primeiro token já tenha 5 dígitos (ex.: ATE-10001).
  const count = (store.counters[prefix] ?? 10000) + 1;
  store.counters[prefix] = count;
  writeStore(store);
  return `${prefix}-${count}`;
}

export function uuid(): string {
  return crypto.randomUUID();
}
