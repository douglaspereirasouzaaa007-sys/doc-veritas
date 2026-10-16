import { describe, expect, test } from "bun:test";
import { allocateDocumentIdentifiers, documentReference, findDocumentMatches } from "./document-identifiers";
import { normalizeLookup } from "./documents.shared";
import { createBackupZip, readBackupZip } from "./backup.server";
import { unzipSync } from "fflate";
import type { DocumentRow } from "./store.server";

const a = "11111111-1111-4111-8111-111111111111";
const b = "22222222-2222-4222-8222-222222222222";
const doc = (id = a): DocumentRow => ({
  id, code: "123456", token: "ATE-70000", type: "atestado", status: "valido",
  patient_name: "Teste não clínico", issued_at: "2026-10-16", created_at: "2026-10-16",
  metadata: {}, views_count: 0,
});

describe("identificadores e links individuais", () => {
  test("aceita UUID, token legado e código formatado", () => {
    expect(normalizeLookup(a.toUpperCase())).toEqual({ kind: "id", value: a });
    expect(normalizeLookup(" ate 00012 ")).toEqual({ kind: "token", value: "ATE-12" });
    expect(normalizeLookup("123 456")).toEqual({ kind: "code", value: "123456" });
  });
  test("não escolhe arbitrariamente em códigos e tokens históricos repetidos", () => {
    const docs = [doc(), doc(b)];
    expect(findDocumentMatches(docs, "123456")).toHaveLength(2);
    expect(findDocumentMatches(docs, "ATE-70000")).toHaveLength(2);
    expect(findDocumentMatches(docs, a)).toEqual([docs[0]]);
    expect(findDocumentMatches(docs, b)).toEqual([docs[1]]);
    expect(documentReference(docs[0])).toBe(a);
  });
  test("restringe o tipo antes de selecionar", () => {
    const docs = [doc(), { ...doc(b), type: "receita" as const }];
    expect(findDocumentMatches(docs, "123456", "receita")).toEqual([docs[1]]);
  });
  test("repete sorteio colidente e considera tokens importados acima do contador", () => {
    const candidates = ["123456", "654321"];
    expect(allocateDocumentIdentifiers([doc()], { ATE: 10001 }, "atestado", () => candidates.shift()!))
      .toEqual({ code: "654321", token: "ATE-70001", counters: { ATE: 70001 } });
  });
  test("não devolve um código repetido quando as tentativas se esgotam", () => {
    expect(() => allocateDocumentIdentifiers([doc()], {}, "atestado", () => "123456")).toThrow("exclusivo");
  });
  test("mantém o contador já reservado, mesmo sem os documentos correspondentes", () => {
    expect(allocateDocumentIdentifiers([doc()], { ATE: 90000 }, "atestado", () => "654321").token)
      .toBe("ATE-90001");
  });
  test("exportação nova produz links distintos sem alterar códigos ou tokens históricos", async () => {
    const docs = [doc(), doc(b)];
    const bytes = await createBackupZip(docs, "https://memedsolutions.com");
    expect(readBackupZip(bytes).documents).toEqual(docs);
    const files = unzipSync(bytes);
    const manifest = JSON.parse(new TextDecoder().decode(files["backup-memed/manifesto.json"]));
    expect(manifest.documents.map((row: { verification_url: string }) => row.verification_url))
      .toEqual([`https://memedsolutions.com/d/${a}`, `https://memedsolutions.com/d/${b}`]);
  });
});
