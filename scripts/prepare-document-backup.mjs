import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import QRCode from "qrcode";

// Operates exclusively on an already exported local file. No database access.
const root = path.resolve("generated-artifacts/backup-memed");
const source = await fs.readFile(path.join(root, "documentos/documentos.json"));
const documents = JSON.parse(source);
if (!Array.isArray(documents) || documents.length !== 4099)
  throw new Error("Quantidade de documentos inesperada.");
const domain = "https://memedsolutions.com";
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const manifest = {
  format_version: 1,
  source: "production",
  domain,
  generated_at: new Date().toISOString(),
  document_count: documents.length,
  documents_sha256: sha256(source),
  qr_options: { width: 512, margin: 1, errorCorrectionLevel: "M" },
  documents: [],
};
await fs.mkdir(path.join(root, "qr/png"), { recursive: true });
await fs.mkdir(path.join(root, "qr/svg"), { recursive: true });
const codeGroups = new Map();
const tokenGroups = new Map();
for (const [index, doc] of documents.entries()) {
  if (!doc.id || !doc.code || !doc.token) throw new Error("Identificador ausente.");
  for (const [groups, value] of [[codeGroups, doc.code], [tokenGroups, doc.token]]) {
    const group = groups.get(value) ?? [];
    group.push({ index: index + 1, id: doc.id });
    groups.set(value, group);
  }
  // Index prevents overwrites even when a code, token or ID is repeated.
  const filename = `${String(index + 1).padStart(5, "0")}-${String(doc.id).replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  const url = `${domain}/d/${doc.code}`;
  const options = { margin: 1, width: 512, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#FFFFFF" } };
  const png = await QRCode.toBuffer(url, { ...options, type: "png" });
  const svg = await QRCode.toString(url, { ...options, type: "svg" });
  const pngPath = `qr/png/${filename}.png`;
  const svgPath = `qr/svg/${filename}.svg`;
  await fs.writeFile(path.join(root, pngPath), png);
  await fs.writeFile(path.join(root, svgPath), svg);
  manifest.documents.push({
    index: index + 1, id: doc.id, token: doc.token, code: doc.code,
    verification_url: url, token_url: `${domain}/d/${doc.token}`,
    png: pngPath, svg: svgPath, png_sha256: sha256(png), svg_sha256: sha256(svg),
  });
}
const duplicates = (groups) => [...groups.entries()]
  .filter(([, rows]) => rows.length > 1)
  .map(([value, rows]) => ({ value, documents: rows }));
const duplicateCodes = duplicates(codeGroups);
const duplicateTokens = duplicates(tokenGroups);
const counters = {};
for (const doc of documents) {
  const match = /^([A-Z]+)-(\d+)$/.exec(doc.token);
  if (match) counters[match[1]] = Math.max(counters[match[1]] ?? 10000, Number(match[2]));
}
await fs.writeFile(path.join(root, "manifesto.json"), JSON.stringify(manifest, null, 2));
await fs.writeFile(path.join(root, "conferencia.json"), JSON.stringify({
  total_documents: documents.length,
  total_png: manifest.documents.length,
  total_svg: manifest.documents.length,
  distinct_codes: codeGroups.size,
  distinct_tokens: tokenGroups.size,
  duplicate_codes: duplicateCodes,
  duplicate_tokens: duplicateTokens,
  suggested_minimum_counters: counters,
  warning: "Não renumerar identificadores automaticamente. Códigos repetidos apontam para o mesmo endereço público e exigem análise antes da restauração.",
}, null, 2));
const columns = [...new Set(documents.flatMap((doc) => Object.keys(doc)))];
const csvCell = (value) => {
  let text = value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};
await fs.writeFile(path.join(root, "documentos/documentos.csv"),
  "\uFEFF" + [columns.map(csvCell).join(";"), ...documents.map((doc) => columns.map((key) => csvCell(doc[key])).join(";"))].join("\r\n"));
const linkColumns = ["index", "id", "token", "code", "verification_url", "png", "svg"];
await fs.writeFile(path.join(root, "links-e-qr-codes.csv"),
  "\uFEFF" + [linkColumns.map(csvCell).join(";"), ...manifest.documents.map((doc) => linkColumns.map((key) => csvCell(doc[key])).join(";"))].join("\r\n"));
await fs.copyFile("scripts/backup-restoration-guide.md", path.join(root, "LEIA-ME-RESTAURACAO.md"));
const files = [];
async function collect(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await collect(absolute);
    else files.push(absolute);
  }
}
await collect(root);
const sums = [];
for (const filename of files.sort()) {
  sums.push(`${sha256(await fs.readFile(filename))}  ${path.relative(root, filename)}`);
}
await fs.writeFile(path.join(root, "SHA256SUMS.txt"), sums.join("\n") + "\n");
console.log(JSON.stringify({
  documents: documents.length, png: manifest.documents.length, svg: manifest.documents.length,
  distinctCodes: codeGroups.size, distinctTokens: tokenGroups.size,
  duplicateCodeGroups: duplicateCodes.length, duplicateTokenGroups: duplicateTokens.length,
  documentsSha256: manifest.documents_sha256,
}));
