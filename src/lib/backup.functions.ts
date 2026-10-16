import { createServerFn } from "@tanstack/react-start";
import { requireLocalAuth } from "./auth.functions";

export const getBackupStatus = createServerFn({ method: "GET" })
  .middleware([requireLocalAuth])
  .handler(async () => {
    const { readStore } = await import("./store.server");
    const { documentSummary } = await import("./backup.shared");
    const { access } = await import("node:fs/promises");
    let preparedAvailable = false;
    try {
      await access("generated-artifacts/backup-memed-4099-documentos.zip");
      preparedAvailable = true;
    } catch { /* Prepared export is deliberately not shipped with the application. */ }
    return { ...documentSummary((await readStore()).documents), preparedAvailable };
  });

export const processBackupImport = createServerFn({ method: "POST" })
  .middleware([requireLocalAuth])
  .validator((data: FormData) => {
    if (!(data instanceof FormData)) throw new Error("Envie o arquivo ZIP.");
    return data;
  })
  .handler(async ({ data }) => {
    const { MAX_BACKUP_BYTES, planImport } = await import("./backup.shared");
    const file = data.get("file");
    if (!(file instanceof Blob) || file.size === 0 || file.size > MAX_BACKUP_BYTES)
      throw new Error("Selecione um ZIP de até 40 MB.");
    const action = data.get("action");
    if (action !== "preview" && action !== "import") throw new Error("Operação inválida.");
    const { readBackupZip } = await import("./backup.server");
    const { readStore, documentFingerprint, importDocumentsSafely } = await import("./store.server");
    const backup = readBackupZip(new Uint8Array(await file.arrayBuffer()));
    const current = await readStore();
    const plan = planImport(current.documents, backup.documents);
    const destinationFingerprint = documentFingerprint(current.documents);
    if (action === "import") {
      if (data.get("confirmed") !== "yes" || data.get("sha256") !== backup.sha256 ||
        data.get("destinationFingerprint") !== destinationFingerprint)
        throw new Error("Confira o arquivo e a base novamente antes de confirmar.");
      const result = await importDocumentsSafely(backup.documents, destinationFingerprint);
      return { mode: "import" as const, ...result, count: plan.count, repeatedCodes: plan.repeatedCodes,
        repeatedTokens: plan.repeatedTokens, additions: plan.additions.length, skipped: plan.skipped,
        domain: backup.domain, sha256: backup.sha256, destinationFingerprint };
    }
    return { mode: "preview" as const, count: plan.count, repeatedCodes: plan.repeatedCodes,
      repeatedTokens: plan.repeatedTokens, additions: plan.additions.length, skipped: plan.skipped,
      domain: backup.domain, sha256: backup.sha256, destinationFingerprint,
      imported: 0, total: current.documents.length };
  });
