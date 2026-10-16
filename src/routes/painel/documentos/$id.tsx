import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getDocument, saveDocument } from "@/lib/admin.functions";
import {
  DocumentForm,
  emptyDocument,
  type DocumentFormValues,
} from "@/components/painel/DocumentForm";
import { cleanup } from "./novo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/painel/documentos/$id")({
  component: EditarDocumento,
});

function EditarDocumento() {
  const { id } = Route.useParams();
  const fetchDoc = useServerFn(getDocument);
  const save = useServerFn(saveDocument);
  const [values, setValues] = useState<DocumentFormValues>(emptyDocument);

  const { data, isLoading } = useQuery({
    queryKey: ["document", id],
    queryFn: () => fetchDoc({ data: { id } }),
  });

  useEffect(() => {
    if (!data?.document) return;
    const d = data.document as Record<string, unknown>;
    const next = { ...emptyDocument } as Record<string, unknown>;
    for (const key of Object.keys(next)) {
      if (key in d) next[key] = d[key] ?? (typeof next[key] === "number" ? null : "");
    }
    setValues(next as DocumentFormValues);
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => save({ data: { id, values: cleanup(values) } }),
    onSuccess: () => toast.success("Documento atualizado."),
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando documento...</p>;
  if (!data?.document) return <p className="text-sm text-muted-foreground">Documento não encontrado.</p>;

  const { code, token } = data.document as { code: string; token: string };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-primary">Editar documento</h1>
          <p className="font-mono text-sm text-muted-foreground">
            Token <span className="font-semibold text-primary">{token}</span> • Código de acesso{" "}
            <span className="font-semibold text-primary">{code}</span>
          </p>
        </div>
        <Button asChild variant="outline">
          <a href={`/d/${id}`} target="_blank" rel="noreferrer">
            Ver página pública
          </a>
        </Button>
      </div>
      <DocumentForm
        value={values}
        onChange={setValues}
        onSubmit={() => mutation.mutate()}
        saving={mutation.isPending}
        submitLabel="Salvar alterações"
      />
    </div>
  );
}
