/**
 * Development-only HTTP integration check. Creates non-clinical fixtures and removes
 * only records owned by its temporary API key, leaving the restored archive untouched.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import QRCode from "qrcode";
import { readStore, writeStore, uuid } from "../src/lib/store.server";
import { randomApiKey, hashApiKey } from "../src/lib/api-keys.server";
import { canonical } from "../src/lib/backup.shared";
import { findDocumentMatches } from "../src/lib/document-identifiers";
import { DOCUMENT_TYPES } from "../src/lib/documents.shared";
import { PUBLIC_SITE_URL } from "../src/lib/site-url";

type CreatedDocument = {
  document_id: string;
  data: { id: string };
  access_code: string;
  token: string;
  verification_url: string;
  qrcode_base64: string;
};

async function main() {
  assert(process.argv.includes("--development-only"), "Requer --development-only.");
  assert(process.env.NODE_ENV !== "production", "Proibido executar em produção.");
  const host = process.env.REPLIT_DEV_DOMAIN ?? "";
  assert(host.endsWith(".replit.dev"), "Requer o domínio de desenvolvimento Replit.");
  const origin = `https://${host}`;
  // Bun's bundled trust store omits the workspace proxy CA; keep TLS validation enabled.
  const ca = readFileSync("/etc/ssl/certs/ca-certificates.crt");
  const devFetch = (url: string, init: RequestInit = {}) => fetch(url, { ...init, tls: { ca } });
  const before = await readStore();
  assert.equal(before.documents.length, 4099, "Restaure o backup antes de validar o fluxo.");
  const baseline = canonical(before.documents);
  const keyId = uuid();
  const { key, prefix } = randomApiKey();
  before.api_keys.push({
    id: keyId, name: "Validação temporária não clínica", key_prefix: prefix,
    key_hash: await hashApiKey(key), active: true, requests_count: 0,
    created_at: new Date().toISOString(),
  });
  await writeStore(before);
  const request = (path: string, method = "GET", body?: unknown) => devFetch(`${origin}${path}`, {
    method, headers: { "x-api-key": key, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  try {
    assert.equal((await devFetch(`${origin}/api/public/v1/documents`)).status, 401);
    assert.equal((await request("/api/public/v1/documents", "POST", {})).status, 422);
    const creations = await Promise.allSettled(
      DOCUMENT_TYPES.flatMap((type) => Array.from({ length: 3 }, async () => {
        const response = await request("/api/public/v1/documents", "POST", {
          type, patient_name: "VALIDACAO_AUTOMATICA_NAO_CLINICA",
          body_text: "Documento sintético temporário de teste.",
        });
        assert.equal(response.status, 201);
        return await response.json() as CreatedDocument;
      })),
    );
    for (const result of creations) if (result.status === "rejected") throw result.reason;
    const created = creations.map((result) => (result as PromiseFulfilledResult<CreatedDocument>).value);
    assert.equal(new Set(created.map((result) => result.access_code)).size, 15);
    assert.equal(new Set(created.map((result) => result.token)).size, 15);
    const options = { margin: 1, width: 512, errorCorrectionLevel: "M" as const, color: { dark: "#000000", light: "#FFFFFF" } };
    for (const result of created) {
      const id = result.document_id;
      const target = `${PUBLIC_SITE_URL}/d/${id}`;
      assert.equal(result.verification_url, target);
      assert.equal(result.data.id, id);
      assert.equal(result.qrcode_base64, await QRCode.toDataURL(target, { ...options, type: "image/png" }));
      for (const ref of [id, result.access_code, result.token]) {
        const response = await request(`/api/public/v1/documents/${ref}`);
        assert.equal(response.status, 200);
        assert.equal((await response.json()).data.id, id);
      }
      const png = await request(`/api/public/v1/qrcode/${result.access_code}?format=png`);
      assert.equal(png.status, 200);
      assert.equal(png.headers.get("Content-Type"), "image/png");
      assert.deepEqual(new Uint8Array(await png.arrayBuffer()),
        new Uint8Array(await QRCode.toBuffer(target, { ...options, type: "png" })));
      const svg = await request(`/api/public/v1/qrcode/${id}?format=svg`);
      assert.equal(svg.status, 200);
      assert.equal(await svg.text(), await QRCode.toString(target, { ...options, type: "svg" }));
    }
    const first = created[0].document_id;
    const page = await devFetch(`${origin}/d/${first}`);
    assert.equal(page.status, 200);
    assert((await page.text()).includes("VALIDACAO_AUTOMATICA_NAO_CLINICA"));
    assert.equal((await request(`/api/public/v1/documents/${first}`, "PATCH", { body_text: "Atualização sintética." })).status, 200);
    assert.equal((await request(`/api/public/v1/documents/${first}`, "DELETE")).status, 200);
    assert.equal((await (await request(`/api/public/v1/documents/${first}`)).json()).data.status, "revogado");
    let unambiguousLegacyLinks = 0;
    for (const doc of before.documents) {
      assert.equal(findDocumentMatches(before.documents, doc.id).length, 1);
      if (findDocumentMatches(before.documents, doc.code).length === 1) unambiguousLegacyLinks++;
    }
    const duplicate = before.documents.find((doc) => findDocumentMatches(before.documents, doc.code).length > 1)!;
    assert.equal((await request(`/api/public/v1/documents/${duplicate.code}`)).status, 409);
    assert.equal((await request(`/api/public/v1/documents/${duplicate.code}`, "PATCH", { body_text: "Não aplicar" })).status, 409);
    assert.equal((await request(`/api/public/v1/documents/${duplicate.code}`, "DELETE")).status, 409);
    assert.equal((await request(`/api/public/v1/qrcode/${duplicate.code}`)).status, 409);
    const ambiguousPage = await devFetch(`${origin}/d/${duplicate.code}`);
    assert.equal(ambiguousPage.status, 200);
    const html = await ambiguousPage.text();
    assert(html.includes("Código compartilhado"));
    assert(!html.includes(duplicate.patient_name));
    assert.equal((await request(`/api/public/v1/documents/${duplicate.id}`)).status, 200);
    assert.equal((await request(`/api/public/v1/qrcode/${duplicate.id}?format=png`)).status, 200);
    console.log(JSON.stringify({
      apiCreations: created.length, documentTypes: 5, concurrentIdentifiersUnique: true,
      pngAndSvgTargetsVerified: true, legacyDocumentsWithUniqueIdLinks: before.documents.length,
      unambiguousLegacyCodeLinks: unambiguousLegacyLinks, ambiguousLegacyDocuments: 4099 - unambiguousLegacyLinks,
      ambiguousLookupBlocked: true, publicPagePassed: true, editAndRevokePassed: true,
    }));
  } finally {
    const cleanup = await readStore();
    const ids = new Set(cleanup.documents.filter((row) => row.api_key_id === keyId).map((row) => row.id));
    cleanup.documents = cleanup.documents.filter((row) => !ids.has(row.id));
    cleanup.api_keys = cleanup.api_keys.filter((row) => row.id !== keyId);
    cleanup.verifications = cleanup.verifications.filter((row) => !row.document_id || !ids.has(row.document_id));
    await writeStore(cleanup);
    const after = await readStore();
    assert.equal(canonical(after.documents), baseline, "O acervo original deve permanecer idêntico.");
    assert.equal(canonical(after.owner), canonical(before.owner), "O proprietário não deve ser alterado.");
    console.log(JSON.stringify({ restoredDocumentsUnchanged: after.documents.length, temporaryFixturesRemoved: true }));
  }
}

main().then(() => process.exit(0), (error) => {
  // Do not print requests, credentials, or clinical payloads.
  console.error("Falha na validação:", error instanceof Error ? error.message.slice(0, 500) : "erro desconhecido");
  process.exit(1);
});
