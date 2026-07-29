import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listVerifications } from "@/lib/admin.functions";
import { formatDateTimeBR } from "@/lib/br";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/painel/verificacoes")({
  component: Verificacoes,
});

function Verificacoes() {
  const fetchList = useServerFn(listVerifications);
  const { data, isLoading } = useQuery({
    queryKey: ["verifications"],
    queryFn: () => fetchList({}),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-primary">Verificações</h1>
        <p className="text-sm text-muted-foreground">
          Últimas 100 consultas públicas de códigos de documentos.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Código consultado</th>
              <th className="px-4 py-3">Resultado</th>
              <th className="px-4 py-3">Data e horário</th>
            </tr>
          </thead>
          <tbody>
            {isLoading || (data?.rows.length ?? 0) === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">
                  {isLoading ? "Carregando..." : "Nenhuma verificação registrada."}
                </td>
              </tr>
            ) : (
              data?.rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-primary">{row.code}</td>
                  <td className="px-4 py-3">
                    <Badge variant={row.found ? "default" : "destructive"}>
                      {row.found ? "Encontrado" : "Não encontrado"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDateTimeBR(row.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
