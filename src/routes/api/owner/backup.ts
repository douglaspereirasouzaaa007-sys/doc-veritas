import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/owner/backup")({
  server: { handlers: {
    GET: async ({ request }) => {
      const { getSessionFromHeaders } = await import("@/lib/auth.server");
      if (!(await getSessionFromHeaders())) {
        return Response.json({ error: "Faça login no painel do dono para baixar o backup." },
          { status: 401, headers: { "Cache-Control": "no-store" } });
      }
      try {
        let bytes: Uint8Array;
        let filename: string;
        if (new URL(request.url).searchParams.get("prepared") === "1") {
          const { readFile } = await import("node:fs/promises");
          try { bytes = await readFile("generated-artifacts/backup-memed-4099-documentos.zip"); }
          catch { return Response.json({ error: "O arquivo preparado está disponível apenas no projeto original. Use o backup atualizado nesta instância." }, { status: 404, headers: { "Cache-Control": "no-store" } }); }
          filename = "backup-memed-4099-documentos.zip";
        } else {
          const { readStore } = await import("@/lib/store.server");
          const { createBackupZip } = await import("@/lib/backup.server");
          const { PUBLIC_SITE_URL } = await import("@/lib/site-url");
          bytes = await createBackupZip((await readStore()).documents, PUBLIC_SITE_URL);
          filename = `backup-memed-${new Date().toISOString().slice(0, 10)}.zip`;
        }
        return new Response(new Uint8Array(bytes), { headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        } });
      } catch {
        return Response.json({ error: "Não foi possível gerar o backup. Nenhum dado foi alterado. Tente novamente ou solicite uma exportação assistida." }, { status: 500, headers: { "Cache-Control": "no-store" } });
      }
    },
  } },
});
