import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileText,
  Printer,
  ShieldCheck,
  Stethoscope,
  User,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { getPublicDocument } from "@/lib/public-documents.functions";
import { Logo } from "@/components/site/Logo";
import { PUBLIC_SITE_URL } from "@/lib/site-url";

import { Button } from "@/components/ui/button";
import {
  DOCUMENT_STATUS_LABEL,
  DOCUMENT_TYPE_LABEL,
  formatCPF,
  formatDateBR,
  formatDateTimeBR,
} from "@/lib/br";

export const Route = createFileRoute("/d/$code")({
  loader: ({ params }) => getPublicDocument({ data: { code: params.code } }),
  head: ({ params }) => ({
    meta: [
      { title: `Documento ${params.code} | Verificação Memed` },
      {
        name: "description",
        content: `Página oficial de verificação do documento ${params.code}: dados do paciente, do estabelecimento e do profissional emissor.`,
      },
      { property: "og:title", content: `Documento ${params.code} | Verificação Memed` },
      {
        property: "og:description",
        content: "Documento digital verificado com dados do paciente, estabelecimento e emissão.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: `${PUBLIC_SITE_URL}/d/${params.code}` },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${PUBLIC_SITE_URL}/d/${params.code}` }],
  }),

  component: DocumentPage,
});

function Row({
  label,
  value,
  full,
}: {
  label: string;
  value: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <dt className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-doc-muted">
        {label}
      </dt>
      <dd className="mt-1 text-[15px] font-medium leading-snug text-doc-ink">{value || "—"}</dd>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
  className = "",
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-doc-line bg-doc-surface shadow-[var(--shadow-doc)] ${className}`}
    >
      <h2 className="flex items-center gap-2 border-b border-doc-line bg-doc-accent-soft px-5 py-3 font-display text-[12px] font-semibold uppercase tracking-[0.1em] text-doc-accent-strong">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{title}</span>
      </h2>
      <dl className="grid gap-x-8 gap-y-4 px-5 py-5 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function DocumentPage() {
  const { document: doc } = Route.useLoaderData();
  const { code } = Route.useParams();

  if (!doc) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-doc-bg px-4">
        <div className="max-w-md rounded-2xl border border-doc-line bg-doc-surface p-8 text-center shadow-[var(--shadow-doc)]">
          <XCircle className="mx-auto h-12 w-12 text-doc-invalid" />
          <h1 className="mt-4 font-display text-2xl font-semibold text-doc-ink">
            Documento não encontrado
          </h1>
          <p className="mt-2 text-sm text-doc-muted">
            Não localizamos nenhum documento com o identificador <strong>{code}</strong>. Confira se
            o token ou o código de acesso foi digitado corretamente.
          </p>
          <Button asChild className="mt-6">
            <Link to="/verificar">Tentar outro código</Link>
          </Button>
        </div>
      </div>
    );
  }

  const valid = doc.status === "valido";
  const isAtestado = doc.type === "atestado";
  const feminine = doc.type === "receita" || doc.type === "declaracao";
  const typeLabel = DOCUMENT_TYPE_LABEL[doc.type] ?? doc.type;
  const council = (doc.professional_council || "CRM").trim();
  const crm =
    council.toUpperCase() === "CRM"
      ? (doc.professional_council_number ?? "")
      : `${council} ${doc.professional_council_number ?? ""}`.trim();

  return (
    <div className="min-h-screen bg-doc-bg pb-16 text-doc-ink">
      <header className="border-b border-doc-line bg-doc-surface print:hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-4">
          <Logo />
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Imprimir</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <div
          className={`overflow-hidden rounded-2xl border text-doc-on-dark shadow-[var(--shadow-doc)] ${
            valid ? "border-doc-valid bg-doc-valid" : "border-doc-invalid bg-doc-invalid"
          }`}
        >
          <div className="grid gap-5 px-5 py-6 sm:px-7 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="flex items-start gap-4">
              {valid ? (
                <CheckCircle2 className="h-9 w-9 shrink-0" />
              ) : (
                <AlertTriangle className="h-9 w-9 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-80">
                  Verificação de autenticidade
                </p>
                <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">
                  {valid
                    ? `${typeLabel} ${feminine ? "válida" : "válido"}`
                    : `${typeLabel} ${DOCUMENT_STATUS_LABEL[doc.status]}`}
                </h1>
                <p className="mt-1 text-sm opacity-90">
                  {valid
                    ? "Documento autêntico, emitido eletronicamente e verificado nesta data."
                    : "Este documento não pode mais ser considerado válido."}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 md:justify-end">
              <span className="inline-flex rounded-lg border border-doc-on-dark/30 bg-doc-on-dark/10 px-3 py-1.5 font-mono text-xs tracking-widest">
                Token {doc.token}
              </span>
              <span className="inline-flex rounded-lg border border-doc-on-dark/30 bg-doc-on-dark/10 px-3 py-1.5 font-mono text-xs tracking-widest">
                Código {doc.code}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-2">
              <Section title="Dados do paciente" icon={User}>
                <Row label="Nome completo" value={doc.patient_name} full />
                <Row label="CPF" value={formatCPF(doc.patient_cpf)} />
                <Row label="Data de nascimento" value={formatDateBR(doc.patient_birth_date)} />
              </Section>

              <Section title="Estabelecimento" icon={Building2}>
                <Row label="Nome" value={doc.establishment_name} full />
                <Row label="Endereço" value={doc.establishment_address} full />
                <Row label="Data de emissão" value={formatDateBR(doc.issued_at)} />
                <Row label="Horário de emissão" value={formatDateTimeBR(doc.issued_at)} />
              </Section>

              <Section title="Profissional emissor" icon={Stethoscope}>
                <Row label="Nome" value={doc.professional_name} full />
                <Row label="Especialidade" value={doc.professional_specialty} />
                <Row label="CRM" value={doc.professional_council_number ? crm : null} />
              </Section>

              {isAtestado ? (
                <Section title="Afastamento" icon={CalendarDays}>
                  <Row label="Início" value={formatDateBR(doc.leave_start_date)} />
                  <Row label="Término" value={formatDateBR(doc.leave_end_date)} />
                  <Row
                    label="Dias de afastamento"
                    value={doc.leave_days != null ? `${doc.leave_days} dia(s)` : null}
                  />
                  <Row label="CID" value={doc.cid} />
                </Section>
              ) : null}
            </div>

            <section className="overflow-hidden rounded-2xl border border-doc-line bg-doc-surface shadow-[var(--shadow-doc)]">
              <h2 className="flex items-center gap-2 border-b border-doc-line bg-doc-accent-soft px-5 py-3 font-display text-[12px] font-semibold uppercase tracking-[0.1em] text-doc-accent-strong">
                <FileText className="h-4 w-4" />
                Conteúdo do documento
              </h2>
              <div className="px-5 py-6 sm:px-8 sm:py-8">
                <p className="whitespace-pre-wrap text-[15px] leading-8 text-doc-ink sm:text-base">
                  {doc.body_text || "Sem conteúdo textual informado."}
                </p>
              </div>
            </section>

            {valid ? (
              <section className="rounded-2xl border border-doc-line bg-doc-accent-soft p-5 sm:p-6">
                <h2 className="flex items-center gap-2 font-display text-[12px] font-semibold uppercase tracking-[0.1em] text-doc-accent-strong">
                  <ShieldCheck className="h-4 w-4" />
                  Validade legal
                </h2>
                <ul className="mt-4 grid gap-3 text-sm leading-relaxed text-doc-ink sm:grid-cols-2">
                  <li>
                    Documento assinado eletronicamente com certificado digital padrão ICP-Brasil,
                    com a mesma validade jurídica de um documento em papel assinado de próprio
                    punho, nos termos da MP nº 2.200-2/2001 e da Lei nº 14.063/2020.
                  </li>
                  <li>
                    Válido em <strong>todo o território nacional</strong>, podendo ser apresentado a
                    empregadores, farmácias, operadoras de saúde, instituições de ensino e órgãos
                    públicos.
                  </li>
                  <li>
                    A autenticidade e a integridade {feminine ? "desta" : "deste"}{" "}
                    {typeLabel.toLowerCase()} podem ser conferidas a qualquer momento pelo token,
                    pelo código de verificação ou pelo QR Code.
                  </li>
                  <li>
                    A responsabilidade técnica pelo conteúdo é do profissional emissor, identificado
                    por seu registro no conselho de classe.
                  </li>
                </ul>
              </section>
            ) : null}
          </div>

          <aside className="h-fit rounded-2xl border border-doc-line bg-doc-surface p-6 text-center shadow-[var(--shadow-doc)] lg:sticky lg:top-6">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-doc-muted">
              Token do documento
            </p>
            <p className="mt-1 font-mono text-lg font-semibold tracking-widest text-doc-accent-strong">
              {doc.token}
            </p>
            <p className="mt-4 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-doc-muted">
              Código de acesso
            </p>
            <p className="mt-1 font-mono text-sm font-semibold tracking-widest text-doc-ink">
              {doc.code}
            </p>
            <img
              src={`/api/public/v1/qrcode/${doc.code}`}
              alt={`QR Code de verificação do documento ${doc.code}`}
              className="mx-auto mt-5 h-44 w-44 rounded-xl border border-doc-line bg-doc-surface p-2"
              width={176}
              height={176}
            />
            <p className="mt-4 text-xs leading-relaxed text-doc-muted">
              Aponte a câmera para o QR Code ou acesse a página de verificação e informe o token ou
              o código de acesso acima.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4 w-full print:hidden">
              <Link to="/verificar">Verificar outro documento</Link>
            </Button>
          </aside>
        </div>
      </main>
    </div>
  );
}

