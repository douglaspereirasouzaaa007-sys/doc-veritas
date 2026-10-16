import { describe, test, expect } from "bun:test";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { zipSync, strToU8, unzipSync } from "fflate";
import { readBackupZip, createBackupZip } from "./backup.server";
import { parseBackupDocuments, planImport, countersFor, mergeStoreChanges, canonical } from "./backup.shared";
import type { DocumentRow, Store } from "./store.server";

const doc = (id = "one", code = "123456", token = "ATE-10001"): DocumentRow => ({
  id, code, token, type: "atestado", status: "valido",
  patient_name: "Paciente de teste", issued_at: "2026-10-16T12:00:00.000Z",
  created_at: "2026-10-16T12:00:00.000Z", views_count: 0, metadata: {},
});
const store = (documents = [doc()]): Store => ({
  documents, establishments: [], api_keys: [], verifications: [], counters: { ATE: 10001 }, owner: null,
});
function archive(documents: unknown[], sha?: string) {
  const bytes = strToU8(JSON.stringify(documents));
  return zipSync({
    "backup-memed/documentos/documentos.json": bytes,
    "backup-memed/manifesto.json": strToU8(JSON.stringify({
      format_version: 1, domain: "https://memedsolutions.com", document_count: documents.length,
      documents_sha256: sha ?? createHash("sha256").update(bytes).digest("hex"),
    })),
  });
}

describe("ZIP de documentos", () => {
  test("ida e volta preserva campos e cria PNG/SVG com nomes únicos", async () => {
    const documents = [doc(), doc("two", "123456", "ATE-10001")];
    documents[0].metadata = { nested: { important: "preservar" } };
    const bytes = await createBackupZip(documents, "https://memedsolutions.com");
    expect(readBackupZip(bytes).documents).toEqual(documents);
    const files = unzipSync(bytes);
    expect(Object.keys(files).filter((name) => name.endsWith(".png"))).toHaveLength(2);
    expect(Object.keys(files).filter((name) => name.endsWith(".svg"))).toHaveLength(2);
    const manifest = JSON.parse(new TextDecoder().decode(files["backup-memed/manifesto.json"]));
    expect(manifest.documents[0].verification_url).toBe("https://memedsolutions.com/d/123456");
    expect(files["backup-memed/documentos/documentos.json"]).not.toBeUndefined();
    expect(Object.keys(files).some((name) => name.includes("owner"))).toBe(false);
  });
  test("recusa checksum incorreto", () => {
    expect(() => readBackupZip(archive([doc()], "bad"))).toThrow("integridade");
  });
  test("recusa ZIP inválido ou sem manifesto", () => {
    expect(() => readBackupZip(new Uint8Array([1, 2, 3]))).toThrow();
    expect(() => readBackupZip(zipSync({ "documentos/documentos.json": strToU8("[]") }))).toThrow("manifesto");
  });
  test("recusa documento incompleto e IDs duplicados", () => {
    expect(() => parseBackupDocuments([{}])).toThrow();
    expect(() => parseBackupDocuments([doc(), doc()])).toThrow("IDs");
  });
  test("aceita prefixo raiz e domínio originais", () => {
    const result = readBackupZip(archive([doc()]));
    expect(result.domain).toBe("https://memedsolutions.com");
    expect(result.documents).toEqual([doc()]);
  });
  const prepared = "generated-artifacts/backup-memed-4099-documentos.zip";
  test.skipIf(!existsSync(prepared))("aceita o ZIP real dos 4.099 sem acesso ao banco", () => {
    const parsed = readBackupZip(new Uint8Array(readFileSync(prepared)));
    expect(parsed.documents).toHaveLength(4099);
    const plan = planImport([], parsed.documents);
    expect(plan.additions).toHaveLength(4099);
    expect(plan.repeatedCodes).toBe(4);
    expect(plan.repeatedTokens).toBe(4090);
    const again = planImport(parsed.documents, parsed.documents);
    expect(again.additions).toHaveLength(0);
    expect(again.skipped).toBe(4099);
  });
});

describe("restauração sem perda de dados", () => {
  test("preserva duplicidades internas sem renumerar", () => {
    const incoming = [doc(), doc("two", "123456", "ATE-10001")];
    const plan = planImport([], incoming);
    expect(plan.additions).toEqual(incoming);
    expect(plan.repeatedCodes).toBe(1);
    expect(plan.repeatedTokens).toBe(1);
  });
  test("não duplica documentos idênticos", () => {
    const result = planImport([doc()], [doc()]);
    expect(result.skipped).toBe(1);
    expect(result.additions).toHaveLength(0);
  });
  test("bloqueia ID alterado, código e token conflitantes", () => {
    expect(() => planImport([doc()], [{ ...doc(), patient_name: "Outro" }])).toThrow("ID");
    expect(() => planImport([doc()], [doc("two", "123456", "ATE-10002")])).toThrow("código");
    expect(() => planImport([doc()], [doc("two", "654321", "ATE-10001")])).toThrow("token");
  });
  test("aceita adicionar registros não conflitantes", () => {
    expect(planImport([doc()], [doc("two", "654321", "ATE-10002")]).additions).toHaveLength(1);
  });
  test("contadores nunca voltam para trás", () => {
    expect(countersFor([doc()], { ATE: 10100 })).toEqual({ ATE: 10100 });
    expect(countersFor([doc("two", "654321", "ATE-10200")], { ATE: 10100 })).toEqual({ ATE: 10200 });
  });
  test("gravação antiga não remove documentos importados nem contador reservado", () => {
    const before = store();
    const edited = structuredClone(before);
    edited.documents[0].views_count++;
    const current = structuredClone(before);
    current.documents.push(doc("imported", "654321", "ATE-10100"));
    current.counters.ATE = 10101;
    const result = mergeStoreChanges(before, edited, current);
    expect(result.documents).toHaveLength(2);
    expect(result.documents[0].views_count).toBe(1);
    expect(result.counters.ATE).toBe(10101);
  });
  test("preserva cadastro, estabelecimentos e chaves de outras operações", () => {
    const before = store();
    const edited = structuredClone(before);
    edited.documents.push(doc("new", "654321", "ATE-10002"));
    const current = structuredClone(before);
    current.owner = { email: "test@example.invalid", passwordHash: "fake-test-only", registeredAt: "2026-10-16" };
    current.establishments.push({ id: "est", name: "Teste", active: true, created_at: "2026-10-16" });
    const result = mergeStoreChanges(before, edited, current);
    expect(result.owner).toEqual(current.owner);
    expect(result.establishments).toEqual(current.establishments);
  });
  test("alterações concorrentes no mesmo documento falham sem sobrescrever", () => {
    const before = store();
    const edited = structuredClone(before);
    edited.documents[0].status = "revogado";
    const current = structuredClone(before);
    current.documents[0].views_count++;
    expect(() => mergeStoreChanges(before, edited, current)).toThrow("outra operação");
    expect(current.documents[0].status).toBe("valido");
  });
  test("comparação independe da ordem das propriedades JSONB", () => {
    expect(canonical({ a: 1, b: 2 })).toBe(canonical({ b: 2, a: 1 }));
  });
});
