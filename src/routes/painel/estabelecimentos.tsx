import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { deleteEstablishment, listEstablishments, saveEstablishment } from "@/lib/admin.functions";
import { formatCNPJ, formatPhoneBR } from "@/lib/br";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/painel/estabelecimentos")({
  component: Estabelecimentos,
});

const empty = {
  name: "",
  cnpj: "",
  address_street: "",
  address_number: "",
  address_complement: "",
  address_district: "",
  address_city: "",
  address_state: "",
  address_zip: "",
  phone: "",
};

function Estabelecimentos() {
  const [form, setForm] = useState(empty);
  const qc = useQueryClient();
  const fetchList = useServerFn(listEstablishments);
  const save = useServerFn(saveEstablishment);
  const remove = useServerFn(deleteEstablishment);

  const { data } = useQuery({ queryKey: ["establishments"], queryFn: () => fetchList({}) });

  const saveMutation = useMutation({
    mutationFn: () => save({ data: { values: form } }),
    onSuccess: () => {
      toast.success("Estabelecimento salvo.");
      setForm(empty);
      qc.invalidateQueries({ queryKey: ["establishments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Estabelecimento removido.");
      qc.invalidateQueries({ queryKey: ["establishments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const field = (key: keyof typeof empty, label: string, span = "") => (
    <div className={`space-y-1.5 ${span}`}>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <Input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-primary">Estabelecimentos</h1>
        <p className="text-sm text-muted-foreground">
          Clínicas e hospitais exibidos nas páginas públicas dos documentos.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          saveMutation.mutate();
        }}
        className="rounded-xl border border-border bg-card p-6"
      >
        <h2 className="font-display text-lg font-semibold text-primary">Cadastrar novo</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {field("name", "Nome", "lg:col-span-2")}
          {field("cnpj", "CNPJ")}
          {field("phone", "Telefone")}
          {field("address_street", "Logradouro", "lg:col-span-2")}
          {field("address_number", "Número")}
          {field("address_complement", "Complemento")}
          {field("address_district", "Bairro")}
          {field("address_city", "Cidade")}
          {field("address_state", "UF")}
          {field("address_zip", "CEP")}
        </div>
        <Button type="submit" className="mt-6" disabled={saveMutation.isPending}>
          Salvar estabelecimento
        </Button>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        {(data?.rows ?? []).map((row) => (
          <div key={row.id} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold text-primary">{row.name}</h3>
                <p className="text-xs text-muted-foreground">CNPJ {formatCNPJ(row.cnpj)}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (confirm("Remover este estabelecimento?")) removeMutation.mutate(row.id);
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <p className="mt-3 text-sm text-foreground">
              {[
                [row.address_street, row.address_number].filter(Boolean).join(", "),
                row.address_district,
                [row.address_city, row.address_state].filter(Boolean).join(" - "),
                row.address_zip ? `CEP ${row.address_zip}` : null,
              ]
                .filter(Boolean)
                .join(" • ") || "Endereço não informado"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{formatPhoneBR(row.phone)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
