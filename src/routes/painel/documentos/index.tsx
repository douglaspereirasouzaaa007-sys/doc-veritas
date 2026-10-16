import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { deleteDocument, listDocuments, setDocumentStatus } from "@/lib/admin.functions";
import { DOCUMENT_TYPES, DOCUMENT_STATUSES } from "@/lib/documents.shared";
import { DOCUMENT_STATUS_LABEL, DOCUMENT_TYPE_LABEL, formatCPF, formatDateTimeBR } from "@/lib/br";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/painel/documentos/")({
  component: DocumentosPage,
});

function DocumentosPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("todos");
  const [status, setStatus] = useState("todos");
  const [page, setPage] = useState(1);

  const qc = useQueryClient();
  const fetchList = useServerFn(listDocuments);
  const remove = useServerFn(deleteDocument);
  const changeStatus = useServerFn(setDocumentStatus);

  const { data, isLoading } = useQuery({
    queryKey: ["documents", search, type, status, page],
    queryFn: () => fetchList({ data: { search, type, status, page, pageSize: 20 } }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Documento excluído.");
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMutation = useMutation({
    mutationFn: (vars: { id: string; status: (typeof DOCUMENT_STATUSES)[number] }) =>
      changeStatus({ data: vars }),
    onSuccess: () => {
      toast.success("Status atualizado.");
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / 20));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-primary">Documentos</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.total} documento(s) emitido(s)` : "Carregando..."}
          </p>
        </div>
        <Button asChild size="lg">
          <Link to="/painel/documentos/novo">Novo documento</Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Buscar por paciente, token, código ou CPF"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          className="max-w-xs bg-card"
        />
        <Select
          value={type}
          onValueChange={(v) => {
            setPage(1);
            setType(v);
          }}
        >
          <SelectTrigger className="w-48 bg-card">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {DOCUMENT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {DOCUMENT_TYPE_LABEL[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status}
          onValueChange={(v) => {
            setPage(1);
            setStatus(v);
          }}
        >
          <SelectTrigger className="w-44 bg-card">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {DOCUMENT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {DOCUMENT_STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Token</th>
              <th className="px-4 py-3">Código de acesso</th>
              <th className="px-4 py-3">Paciente</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Emissão</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  Carregando...
                </td>
              </tr>
            ) : (data?.rows.length ?? 0) === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  Nenhum documento encontrado.
                </td>
              </tr>
            ) : (
              data?.rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">
                    {row.token}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.code}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-primary">{row.patient_name}</p>
                    <p className="text-xs text-muted-foreground">{formatCPF(row.patient_cpf)}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {DOCUMENT_TYPE_LABEL[row.type] ?? row.type}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDateTimeBR(row.issued_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      value={row.status}
                      onValueChange={(v) =>
                        statusMutation.mutate({
                          id: row.id,
                          status: v as (typeof DOCUMENT_STATUSES)[number],
                        })
                      }
                    >
                      <SelectTrigger className="h-8 w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {DOCUMENT_STATUS_LABEL[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button asChild variant="ghost" size="icon" title="Ver página pública">
                        <a href={`/d/${row.id}`} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button asChild variant="ghost" size="icon" title="Editar">
                        <Link to="/painel/documentos/$id" params={{ id: row.id }}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Excluir"
                        onClick={() => {
                          if (confirm("Excluir este documento definitivamente?"))
                            removeMutation.mutate(row.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <Badge variant="secondary">
            Página {page} de {totalPages}
          </Badge>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
