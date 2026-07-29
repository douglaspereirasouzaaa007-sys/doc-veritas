import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { saveDocument } from "@/lib/admin.functions";
import { DocumentForm, emptyDocument, type DocumentFormValues } from "@/components/painel/DocumentForm";

export const Route = createFileRoute("/painel/documentos/novo")({
  component: NovoDocumento,
});

function NovoDocumento() {
  const [values, setValues] = useState<DocumentFormValues>(emptyDocument);
  const navigate = useNavigate();
  const save = useServerFn(saveDocument);

  const mutation = useMutation({
    mutationFn: () => save({ data: { values: cleanup(values) } }),
    onSuccess: (res) => {
      toast.success(`Documento criado. Código ${res.code}`);
      navigate({ to: "/painel/documentos" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-primary">Novo documento</h1>
        <p className="text-sm text-muted-foreground">
          O código de verificação e o QR Code são gerados automaticamente.
        </p>
      </div>
      <DocumentForm
        value={values}
        onChange={setValues}
        onSubmit={() => mutation.mutate()}
        saving={mutation.isPending}
        submitLabel="Emitir documento"
      />
    </div>
  );
}

export function cleanup(values: DocumentFormValues): DocumentFormValues {
  const out = { ...values } as Record<string, unknown>;
  for (const key of Object.keys(out)) {
    if (out[key] === "") out[key] = null;
  }
  return out as DocumentFormValues;
}
