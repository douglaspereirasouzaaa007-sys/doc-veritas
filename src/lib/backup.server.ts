import { createHash } from "node:crypto";
import { zipSync, unzipSync, strToU8 } from "fflate";
import QRCode from "qrcode";
import { MAX_BACKUP_BYTES, MAX_DOCUMENT_BYTES, parseBackupDocuments, documentSummary } from "./backup.shared";
import type { DocumentRow } from "./store.server";

const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const decode = (bytes: Uint8Array) => new TextDecoder("utf-8", { fatal: true }).decode(bytes);

export function readBackupZip(bytes: Uint8Array) {
  if (bytes.byteLength > MAX_BACKUP_BYTES) throw new Error("ZIP maior que o limite de 40 MB.");
  const wanted = new Set(["documentos/documentos.json", "manifesto.json"]);
  const matches = new Map<string, string>();
  let expandedBytes = 0;
  let files: ReturnType<typeof unzipSync>;
  try {
    files = unzipSync(bytes, { filter: (entry) => {
      const name = entry.name.replace(/^backup-memed\//, "");
      if (!wanted.has(name)) return false;
      if (matches.has(name)) throw new Error("Arquivo repetido no ZIP.");
      matches.set(name, entry.name);
      expandedBytes += entry.originalSize;
      if (expandedBytes > MAX_DOCUMENT_BYTES + 15 * 1024 * 1024)
        throw new Error("Conteúdo descompactado excede o limite.");
      if (name === "documentos/documentos.json" && entry.originalSize > MAX_DOCUMENT_BYTES)
        throw new Error("Documentos excedem o limite de 25 MB.");
      return true;
    } });
  } catch { throw new Error("ZIP inválido, repetido ou com conteúdo grande demais."); }
  const docsName = matches.get("documentos/documentos.json");
  const manifestName = matches.get("manifesto.json");
  if (!docsName || !manifestName) throw new Error("ZIP não contém documentos/documentos.json e manifesto.json.");
  const documentBytes = files[docsName];
  let documents: DocumentRow[];
  let manifest: { format_version?: number; documents_sha256?: string; document_count?: number; domain?: string };
  try {
    manifest = JSON.parse(decode(files[manifestName]));
    documents = parseBackupDocuments(JSON.parse(decode(documentBytes)));
  } catch { throw new Error("JSON inválido ou documentos incompletos. Nada foi importado."); }
  if (!manifest || typeof manifest !== "object" ||
    (manifest.domain !== undefined && typeof manifest.domain !== "string") ||
    manifest.format_version !== 1 || manifest.documents_sha256 !== hash(documentBytes) ||
    manifest.document_count !== documents.length)
    throw new Error("A conferência de integridade falhou. Nada foi importado.");
  return { documents, sha256: hash(bytes), domain: manifest.domain ?? "" };
}

const csvCell = (value: unknown) => {
  let text = value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
};

export async function createBackupZip(documents: DocumentRow[], domain: string) {
  if (!/^https:\/\//.test(domain)) throw new Error("Configure uma URL pública HTTPS antes de gerar o backup.");
  const json = strToU8(JSON.stringify(documents));
  if (json.length > MAX_DOCUMENT_BYTES) throw new Error("Acervo excede 25 MB. Solicite uma exportação assistida.");
  const files: Record<string, Uint8Array> = { "backup-memed/documentos/documentos.json": json };
  const manifest = {
    format_version: 1, domain: domain.replace(/\/$/, ""), generated_at: new Date().toISOString(),
    document_count: documents.length, documents_sha256: hash(json),
    documents: [] as Record<string, unknown>[],
  };
  for (const [i, doc] of documents.entries()) {
    const stem = `${String(i + 1).padStart(5, "0")}-${doc.id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    const url = `${manifest.domain}/d/${doc.code}`;
    const options = { width: 512, margin: 1, errorCorrectionLevel: "M" as const, color: { dark: "#000000", light: "#FFFFFF" } };
    const png = await QRCode.toBuffer(url, { ...options, type: "png" });
    const svg = strToU8(await QRCode.toString(url, { ...options, type: "svg" }));
    const pngPath = `qr/png/${stem}.png`;
    const svgPath = `qr/svg/${stem}.svg`;
    files[`backup-memed/${pngPath}`] = png;
    files[`backup-memed/${svgPath}`] = svg;
    manifest.documents.push({ id: doc.id, code: doc.code, token: doc.token,
      verification_url: url, png: pngPath, svg: svgPath, png_sha256: hash(png), svg_sha256: hash(svg) });
  }
  const columns = [...new Set(documents.flatMap((doc) => Object.keys(doc)))];
  files["backup-memed/documentos/documentos.csv"] = strToU8("\uFEFF" +
    [columns.map(csvCell).join(";"), ...documents.map((doc) =>
      columns.map((key) => csvCell((doc as unknown as Record<string, unknown>)[key])).join(";"))].join("\r\n"));
  files["backup-memed/manifesto.json"] = strToU8(JSON.stringify(manifest, null, 2));
  files["backup-memed/conferencia.json"] = strToU8(JSON.stringify(documentSummary(documents), null, 2));
  files["backup-memed/LEIA-ME.txt"] = strToU8(
    "BACKUP PRIVADO: contém dados pessoais e médicos. O ZIP não é criptografado.\n" +
    "Importe este ZIP em Painel > Backup e importação da nova instância. Confira antes de confirmar.\n" +
    "A importação preserva documentos, códigos e tokens; não copia dono, senhas, chaves de API ou estabelecimentos.\n" +
    "QR Codes são gerados a partir dos links, não arquivos históricos. Repetições antigas são preservadas e sinalizadas.\n" +
    "Importar no Preview não garante dados em produção. Confira o painel no endereço publicado antes de transferir o domínio.\n" +
    "Mantenha domínio e caminhos iguais para os QR Codes antigos continuarem abrindo. Não exclua o projeto original.\n");
  files["backup-memed/SHA256SUMS.txt"] = strToU8(Object.entries(files).map(([name, bytes]) =>
    `${hash(bytes)}  ${name.replace(/^backup-memed\//, "")}`).join("\n") + "\n");
  const zip = zipSync(files, { level: 3 });
  if (zip.length > MAX_BACKUP_BYTES) throw new Error("Backup excede 40 MB. Solicite uma exportação assistida.");
  return zip;
}
