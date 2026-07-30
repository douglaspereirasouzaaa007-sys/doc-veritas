import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, FileText, Printer, ShieldCheck, XCircle } from "lucide-react";
import { getPublicDocument } from "@/lib/public-documents.functions";
import { Logo } from "@/components/site/Logo";
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
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DocumentPage,
});

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-2.5">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-doc-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-doc-ink">{value || "—"}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border border-doc-line bg-doc-surface">
      <h2 className="border-b border-doc-line bg-doc-accent-soft px-6 py-3 font-display text-sm font-semibold uppercase tracking-[0.08em] text-doc-accent">
        {title}
      </h2>
      <dl className="grid gap-x-10 px-6 py-3 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function DocumentPage() {
  const { document: doc } = Route.useLoaderData();
  const { code } = Route.useParams();

  if (!doc) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-doc-bg px-4">
        <div className="max-w-md rounded-lg border border-doc-line bg-doc-surface p-8 text-center shadow-[var(--shadow-doc)]">
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
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Logo />
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div
          className={`rounded-lg border px-6 py-6 text-doc-on-dark ${
            valid ? "border-doc-valid bg-doc-valid" : "border-doc-invalid bg-doc-invalid"
          }`}
        >
          <div className="flex items-start gap-4">
            {valid ? (
              <CheckCircle2 className="h-9 w-9 shrink-0" />
            ) : (
              <AlertTriangle className="h-9 w-9 shrink-0" />
            )}
            <div>
              <p className="font-display text-2xl font-semibold">
                {valid
                  ? `${typeLabel} ${feminine ? "válida" : "válido"}`
                  : `${typeLabel} ${DOCUMENT_STATUS_LABEL[doc.status]}`}
              </p>
              <p className="mt-1 text-sm opacity-90">
                {valid
                  ? "Documento autêntico, emitido eletronicamente e verificado nesta data."
                  : "Este documento não pode mais ser considerado válido."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex rounded border border-doc-on-dark/30 bg-doc-on-dark/10 px-3 py-1 font-mono text-xs tracking-widest">
                  Token {doc.token}
                </span>
                <span className="inline-flex rounded border border-doc-on-dark/30 bg-doc-on-dark/10 px-3 py-1 font-mono text-xs tracking-widest">
                  Código {doc.code}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_260px]">
          <div className="space-y-5">
            <Section title="Dados do paciente">
              <Row label="Nome completo" value={doc.patient_name} />
              <Row label="CPF" value={formatCPF(doc.patient_cpf)} />
              <Row label="Data de nascimento" value={formatDateBR(doc.patient_birth_date)} />
            </Section>

            <Section title="Estabelecimento">
              <Row label="Nome" value={doc.establishment_name} />
              <Row label="Endereço" value={doc.establishment_address} />
              <Row label="Data de emissão" value={formatDateBR(doc.issued_at)} />
              <Row label="Horário de emissão" value={formatDateTimeBR(doc.issued_at)} />
            </Section>

            <Section title="Profissional emissor">
              <Row label="Nome" value={doc.professional_name} />
              <Row label="Especialidade" value={doc.professional_specialty} />
              <Row label="CRM" value={doc.professional_council_number ? crm : null} />
            </Section>

            {isAtestado ? (
              <Section title="Afastamento">
                <Row label="Início" value={formatDateBR(doc.leave_start_date)} />
                <Row label="Término" value={formatDateBR(doc.leave_end_date)} />
                <Row
                  label="Dias de afastamento"
                  value={doc.leave_days != null ? `${doc.leave_days} dia(s)` : null}
                />
                <Row label="CID" value={doc.cid} />
              </Section>
            ) : null}

            <section className="overflow-hidden rounded-lg border border-doc-line bg-doc-surface">
              <h2 className="flex items-center gap-2 border-b border-doc-line bg-doc-accent-soft px-6 py-3 font-display text-sm font-semibold uppercase tracking-[0.08em] text-doc-accent">
                <FileText className="h-4 w-4" />
                Conteúdo do documento
              </h2>
              <div className="px-6 py-5">
                <p className="whitespace-pre-wrap text-[15px] leading-7 text-doc-ink">
                  {doc.body_text || "Sem conteúdo textual informado."}
                </p>
              </div>
            </section>

            {valid ? (
              <section className="rounded-lg border border-doc-line bg-doc-accent-soft p-6">
                <h2 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-[0.08em] text-doc-accent">
                  <ShieldCheck className="h-4 w-4" />
                  Validade legal
                </h2>
                <ul className="mt-3 space-y-2 text-sm leading-relaxed text-doc-ink">
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
                    pelo código de verificação ou pelo QR Code ao lado.
                  </li>
                  <li>
                    A responsabilidade técnica pelo conteúdo é do profissional emissor, identificado
                    por seu registro no conselho de classe.
                  </li>
                </ul>
              </section>
            ) : null}
          </div>

          <aside className="h-fit rounded-lg border border-doc-line bg-doc-surface p-6 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-doc-muted">
              Token do documento
            </p>
            <p className="mt-1 font-mono text-lg font-semibold tracking-widest text-doc-ink">
              {doc.token}
            </p>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-doc-muted">
              Código de acesso
            </p>
            <p className="mt-1 font-mono text-sm font-semibold tracking-widest text-doc-ink">
              {doc.code}
            </p>
            <img
              src={`/api/public/v1/qrcode/${doc.code}`}
              alt={`QR Code de verificação do documento ${doc.code}`}
              className="mx-auto mt-4 h-40 w-40 rounded border border-doc-line p-1"
              width={160}
              height={160}
            />
            <p className="mt-4 text-xs leading-relaxed text-doc-muted">
              Aponte a câmera para o QR Code ou acesse a página de verificação e informe o token ou
              o código de acesso acima.
            </p>
          </aside>
        </div>
      </main>
    </div>
  );
}
