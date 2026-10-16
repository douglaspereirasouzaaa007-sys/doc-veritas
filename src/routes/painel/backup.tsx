import { useState, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Upload, AlertTriangle, Archive, CheckCircle2 } from "lucide-react";
import { getBackupStatus, processBackupImport } from "@/lib/backup.functions";
import { MAX_BACKUP_BYTES } from "@/lib/backup.shared";
import { PUBLIC_SITE_URL } from "@/lib/site-url";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/painel/backup")({ component: BackupPage });
type Preview = Awaited<ReturnType<typeof processBackupImport>>;

function BackupPage() {
  const getStatus = useServerFn(getBackupStatus);
  const processImport = useServerFn(processBackupImport);
  const qc = useQueryClient();
  const status = useQuery({ queryKey: ["backup-status"], queryFn: () => getStatus({}) });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function download(prepared = false) {
    setDownloading(true); setError("");
    try {
      const response = await fetch(`/api/owner/backup${prepared ? "?prepared=1" : ""}`, { cache: "no-store" });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Falha no download. Tente novamente.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = prepared ? "backup-memed-4099-documentos.zip" : `backup-memed-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.append(a); a.click(); a.remove();
      // Keep the object URL alive long enough for Safari's download handoff.
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) { setError(e instanceof Error ? e.message : "Falha no download."); }
    finally { setDownloading(false); }
  }

  async function upload(action: "preview" | "import") {
    if (!file) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      const form = new FormData();
      form.set("file", file); form.set("action", action);
      if (action === "import" && preview && confirmed) {
        form.set("sha256", preview.sha256);
        form.set("destinationFingerprint", preview.destinationFingerprint);
        form.set("confirmed", "yes");
      }
      const result = await processImport({ data: form });
      setPreview(result);
      if (result.mode === "import") {
        setSuccess(`${result.imported} documento(s) importado(s); ${result.skipped} já idêntico(s). Total na base: ${result.total}.`);
        setPreview(null); setFile(null); setConfirmed(false);
        if (input.current) input.current.value = "";
        await Promise.all(["backup-status", "documents", "stats"].map((key) =>
          qc.invalidateQueries({ queryKey: [key] })));
      }
    } catch (e) { setPreview(null); setConfirmed(false); setError(e instanceof Error ? e.message : "Não foi possível importar. Nenhum dado foi apagado."); }
    finally { setBusy(false); }
  }

  return <div className="space-y-6">
    <div>
      <h1 className="font-display text-3xl font-semibold text-primary">Backup e importação</h1>
      <p className="mt-2 text-sm text-muted-foreground">Guarde seus documentos e QR Codes ou restaure um backup sem apagar os registros existentes.</p>
    </div>
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
      <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 shrink-0" />Confira em qual ambiente está</p>
      <p className="mt-2">No Preview, as operações usam a base de desenvolvimento. No site publicado, usam a base conectada à publicação. Importar no Preview não garante a cópia para produção.</p>
      <p className="mt-2">Antes de transferir o domínio, abra o painel no endereço publicado e confira a quantidade e os documentos.</p>
    </div>
    {error && <div role="alert" className="rounded-lg border border-destructive bg-red-50 p-4 text-sm text-destructive">{error}</div>}
    {success && <div role="status" className="flex items-start gap-2 rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-900"><CheckCircle2 className="h-5 w-5 shrink-0" />{success}</div>}
    <section className="space-y-4 rounded-xl border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-primary"><Archive className="h-5 w-5" />Documentos desta base</h2>
      {status.isPending ? <p role="status">Conferindo base...</p> : status.isError ?
        <div role="alert"><p>Não foi possível consultar a base.</p><Button variant="outline" onClick={() => status.refetch()}>Tentar novamente</Button></div> :
        <><p className="text-3xl font-semibold text-primary">{status.data.count.toLocaleString("pt-BR")} <span className="text-base font-normal">documentos</span></p>
          {(status.data.repeatedCodes > 0 || status.data.repeatedTokens > 0) && <p className="text-sm text-amber-800">Há identificadores repetidos: {status.data.repeatedCodes} ocorrência(s) adicional(is) de código e {status.data.repeatedTokens} de token. O backup preserva todos; a importação não corrige essa ambiguidade.</p>}</>}
      <Button disabled={downloading || !status.data || status.data.count === 0} onClick={() => download()} className="gap-2">
        <Download className="h-4 w-4" />{downloading ? "Preparando download..." : "Baixar backup atualizado (ZIP)"}
      </Button>
      {downloading && <p role="status" className="text-sm text-muted-foreground">Gerando documentos e imagens. Para milhares de QR Codes, isso pode levar alguns instantes. Aguarde nesta página.</p>}
      <p className="text-sm text-muted-foreground">Inclui JSON, CSV e QR Codes PNG/SVG. Não inclui senhas, chaves de API, histórico de verificações nem o cadastro de estabelecimentos. O ZIP contém dados pessoais e médicos e não é criptografado.</p>
      {status.data?.preparedAvailable && <div className="rounded-lg border border-border bg-muted p-4">
        <p className="mb-3 text-sm">Backup de produção já preparado com 4.099 documentos, independente da contagem desta base de Preview.</p>
        <Button variant="outline" disabled={downloading} onClick={() => download(true)} className="gap-2"><Download className="h-4 w-4" />Baixar os 4.099 documentos preparados</Button>
      </div>}
    </section>
    <section className="space-y-4 rounded-xl border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-primary"><Upload className="h-5 w-5" />Importar backup ZIP</h2>
      <p className="text-sm text-muted-foreground">Aceita o ZIP preparado neste projeto e os backups gerados aqui, até 40 MB. Primeiro confira o arquivo; só depois confirme a gravação.</p>
      <label className="block text-sm font-medium" htmlFor="backup-file">Arquivo de backup</label>
      <input ref={input} id="backup-file" type="file" accept=".zip,application/zip" disabled={busy}
        className="block w-full rounded-lg border border-border p-3 text-sm"
        onChange={(e) => {
          const selected = e.target.files?.[0] ?? null;
          setPreview(null); setConfirmed(false); setSuccess(""); setError("");
          if (selected && selected.size > MAX_BACKUP_BYTES) { setError("Selecione um ZIP de até 40 MB."); setFile(null); }
          else setFile(selected);
        }} />
      <Button variant="outline" disabled={!file || busy || downloading} onClick={() => upload("preview")}>
        {busy ? "Processando..." : "Conferir arquivo sem importar"}
      </Button>
      {preview && <div className="space-y-3 rounded-lg border border-border bg-muted p-4 text-sm">
        <p><strong>{preview.count.toLocaleString("pt-BR")} documentos no ZIP.</strong> {preview.additions} serão adicionados; {preview.skipped} já são idênticos e não serão duplicados.</p>
        <p>Domínio dos QR Codes: <strong className="break-all">{preview.domain || "Não informado"}</strong></p>
        {preview.domain.replace(/\/$/, "") !== PUBLIC_SITE_URL.replace(/\/$/, "") &&
          <p className="text-amber-800">O domínio do backup difere da configuração desta instância. A importação não transfere nem configura o domínio.</p>}
        {(preview.repeatedCodes > 0 || preview.repeatedTokens > 0) && <p className="font-medium text-amber-800">Atenção: o arquivo já tem códigos ou tokens repetidos. Eles serão preservados. Um mesmo endereço pode corresponder a mais de um documento; isso exige análise separada.</p>}
        <label className="flex items-start gap-3">
          <input type="checkbox" checked={confirmed} disabled={busy} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1" />
          <span>Conferi a base de destino e aceito preservar os identificadores existentes, inclusive repetições sinalizadas. Sei que senhas e chaves de API não serão restauradas.</span>
        </label>
        <Button disabled={!confirmed || busy || preview.additions === 0} onClick={() => upload("import")}>
          {busy ? "Importando..." : `Confirmar importação de ${preview.additions} documentos`}
        </Button>
      </div>}
      <p className="text-sm text-muted-foreground">Não apaga nem substitui documentos. Conflitos com IDs, códigos ou tokens já usados por outros documentos no destino bloqueiam a importação. Os QR Codes voltam a ser gerados pelos mesmos links após a restauração; os arquivos de imagem do ZIP não precisam ser armazenados no servidor.</p>
    </section>
  </div>;
}
