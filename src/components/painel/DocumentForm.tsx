import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listEstablishments } from "@/lib/admin.functions";
import { DOCUMENT_TYPES, DOCUMENT_STATUSES, type DocumentInput } from "@/lib/documents.shared";
import { DOCUMENT_STATUS_LABEL, DOCUMENT_TYPE_LABEL, calcLeaveDays } from "@/lib/br";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type DocumentFormValues = DocumentInput;

export const emptyDocument: DocumentFormValues = {
  type: "atestado",
  status: "valido",
  establishment_id: null,
  establishment_name: "",
  establishment_address: "",
  patient_name: "",
  patient_birth_date: "",
  patient_cpf: "",
  professional_name: "",
  professional_council: "CRM",
  professional_council_number: "",
  professional_specialty: "",
  body_text: "",
  cid: "",
  leave_start_date: "",
  leave_end_date: "",
  leave_days: null,
  issued_at: null,
};

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function DocumentForm({
  value,
  onChange,
  onSubmit,
  saving,
  submitLabel,
}: {
  value: DocumentFormValues;
  onChange: (v: DocumentFormValues) => void;
  onSubmit: () => void;
  saving?: boolean;
  submitLabel: string;
}) {
  const fetchEstablishments = useServerFn(listEstablishments);
  const { data: establishments } = useQuery({
    queryKey: ["establishments"],
    queryFn: () => fetchEstablishments({}),
  });

  const [autoDays, setAutoDays] = useState(true);
  const set = <K extends keyof DocumentFormValues>(key: K, v: DocumentFormValues[K]) =>
    onChange({ ...value, [key]: v });

  useEffect(() => {
    if (!autoDays || value.type !== "atestado") return;
    const days = calcLeaveDays(value.leave_start_date, value.leave_end_date);
    if (days !== value.leave_days) onChange({ ...value, leave_days: days });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.leave_start_date, value.leave_end_date, value.type, autoDays]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-6"
    >
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold text-primary">Documento</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Tipo">
            <Select
              value={value.type}
              onValueChange={(v) => set("type", v as DocumentFormValues["type"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {DOCUMENT_TYPE_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select
              value={value.status ?? "valido"}
              onValueChange={(v) => set("status", v as DocumentFormValues["status"])}
            >
              <SelectTrigger>
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
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold text-primary">Paciente</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Nome completo" className="sm:col-span-3">
            <Input
              required
              value={value.patient_name}
              onChange={(e) => set("patient_name", e.target.value)}
            />
          </Field>
          <Field label="CPF">
            <Input
              value={value.patient_cpf ?? ""}
              placeholder="000.000.000-00"
              onChange={(e) => set("patient_cpf", e.target.value)}
            />
          </Field>
          <Field label="Data de nascimento">
            <Input
              type="date"
              value={value.patient_birth_date ?? ""}
              onChange={(e) => set("patient_birth_date", e.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold text-primary">Estabelecimento</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Selecionar cadastrado" className="sm:col-span-2">
            <Select
              value={value.establishment_id ?? "manual"}
              onValueChange={(id) => {
                if (id === "manual") return onChange({ ...value, establishment_id: null });
                const est = establishments?.rows.find((r) => r.id === id);
                onChange({
                  ...value,
                  establishment_id: id,
                  establishment_name: est?.name ?? "",
                  establishment_address: est
                    ? [
                        [est.address_street, est.address_number].filter(Boolean).join(", "),
                        est.address_district,
                        [est.address_city, est.address_state].filter(Boolean).join(" - "),
                        est.address_zip ? `CEP ${est.address_zip}` : null,
                      ]
                        .filter(Boolean)
                        .join(" • ")
                    : "",
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Preencher manualmente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Preencher manualmente</SelectItem>
                {establishments?.rows.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Nome do estabelecimento">
            <Input
              value={value.establishment_name ?? ""}
              onChange={(e) => set("establishment_name", e.target.value)}
            />
          </Field>
          <Field label="Endereço completo">
            <Input
              value={value.establishment_address ?? ""}
              onChange={(e) => set("establishment_address", e.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold text-primary">Profissional</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Nome" className="lg:col-span-2">
            <Input
              value={value.professional_name ?? ""}
              onChange={(e) => set("professional_name", e.target.value)}
            />
          </Field>
          <Field label="Conselho">
            <Input
              value={value.professional_council ?? ""}
              placeholder="CRM"
              onChange={(e) => set("professional_council", e.target.value)}
            />
          </Field>
          <Field label="Número / UF">
            <Input
              value={value.professional_council_number ?? ""}
              placeholder="123456/SP"
              onChange={(e) => set("professional_council_number", e.target.value)}
            />
          </Field>
          <Field label="Especialidade" className="lg:col-span-2">
            <Input
              value={value.professional_specialty ?? ""}
              onChange={(e) => set("professional_specialty", e.target.value)}
            />
          </Field>
        </div>
      </section>

      {value.type === "atestado" ? (
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold text-primary">Afastamento</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-4">
            <Field label="Início">
              <Input
                type="date"
                value={value.leave_start_date ?? ""}
                onChange={(e) => set("leave_start_date", e.target.value)}
              />
            </Field>
            <Field label="Término">
              <Input
                type="date"
                value={value.leave_end_date ?? ""}
                onChange={(e) => set("leave_end_date", e.target.value)}
              />
            </Field>
            <Field label="Dias de afastamento">
              <Input
                type="number"
                min={0}
                value={value.leave_days ?? ""}
                onChange={(e) => {
                  setAutoDays(false);
                  set("leave_days", e.target.value === "" ? null : Number(e.target.value));
                }}
              />
            </Field>
            <Field label="CID">
              <Input value={value.cid ?? ""} onChange={(e) => set("cid", e.target.value)} />
            </Field>
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold text-primary">Texto do documento</h2>
        <Textarea
          rows={8}
          className="mt-4"
          value={value.body_text ?? ""}
          onChange={(e) => set("body_text", e.target.value)}
          placeholder="Conteúdo que será exibido na página pública de verificação."
        />
      </section>

      <Button type="submit" size="lg" disabled={saving}>
        {saving ? "Salvando..." : submitLabel}
      </Button>
    </form>
  );
}
