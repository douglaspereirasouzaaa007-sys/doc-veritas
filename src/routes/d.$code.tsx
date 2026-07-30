import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Printer, ShieldCheck, XCircle } from "lucide-react";
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
    <div className="py-2">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-primary">{value || "—"}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <h2 className="font-display text-lg font-semibold text-primary">{title}</h2>
      <dl className="mt-3 grid gap-x-8 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function DocumentPage() {
  const { document: doc } = Route.useLoaderData();
  const { code } = Route.useParams();

  if (!doc) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary-soft/50 px-4">
        <div className="max-w-md rounded-2xl bg-card p-8 text-center shadow-[var(--shadow-soft)]">
          <XCircle className="mx-auto h-12 w-12 text-destructive" />
          <h1 className="mt-4 font-display text-2xl font-semibold text-primary">
            Documento não encontrado
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Não localizamos nenhum documento com o código <strong>{code}</strong>. Confira se ele
            foi digitado corretamente.
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


  return (
    <div className="min-h-screen bg-primary-soft/40 pb-16">
      <header className="border-b border-border bg-card print:hidden">
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
          className={`rounded-2xl px-6 py-6 ${
            valid ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"
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
                  ? `${DOCUMENT_TYPE_LABEL[doc.type] ?? doc.type} ${
                      doc.type === "receita" || doc.type === "declaracao" ? "válida" : "válido"
                    }`
                  : `${DOCUMENT_TYPE_LABEL[doc.type] ?? doc.type} ${DOCUMENT_STATUS_LABEL[doc.status]}`}
              </p>

              <p className="mt-1 text-sm opacity-90">
                {valid
                  ? "Documento autêntico, emitido eletronicamente e verificado nesta data."
                  : "Este documento não pode mais ser considerado válido."}
              </p>
              <p className="mt-3 inline-flex rounded-full bg-primary-foreground/15 px-3 py-1 font-mono text-xs tracking-widest">
                {doc.code}
              </p>
            </div>
          </div>
        </div>


        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_260px]">
          <div className="space-y-6">
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
              <Row
                label="Conselho"
                value={
                  doc.professional_council
                    ? `${doc.professional_council} ${doc.professional_council_number ?? ""}`.trim()
                    : null
                }
              />
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

            <section className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-display text-lg font-semibold text-primary">
                Conteúdo do documento
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {doc.body_text || "Sem conteúdo textual informado."}
              </p>
            </section>

            {valid ? (
              <section className="rounded-xl border border-primary/20 bg-primary-soft/60 p-6">
                <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-primary">
                  <ShieldCheck className="h-5 w-5 text-brand-orange" />
                  Validade legal
                </h2>
                <ul className="mt-3 space-y-2 text-sm leading-relaxed text-foreground">
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
                    A autenticidade e a integridade deste{" "}
                    {(DOCUMENT_TYPE_LABEL[doc.type] ?? doc.type).toLowerCase()} podem ser conferidas
                    a qualquer momento pelo código de verificação ou pelo QR Code ao lado.
                  </li>
                  <li>
                    A responsabilidade técnica pelo conteúdo é do profissional emissor, identificado
                    por seu registro no conselho de classe.
                  </li>
                </ul>
              </section>
            ) : null}
          </div>


          <aside className="h-fit rounded-xl border border-border bg-card p-6 text-center">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Código de verificação
            </p>
            <p className="mt-1 font-mono text-lg font-semibold tracking-widest text-primary">
              {doc.code}
            </p>
            <img
              src={`/api/public/v1/qrcode/${doc.code}`}
              alt={`QR Code de verificação do documento ${doc.code}`}
              className="mx-auto mt-4 h-40 w-40"
              width={160}
              height={160}
            />
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Aponte a câmera para o QR Code ou acesse a página de verificação e informe o código
              acima.
            </p>
          </aside>
        </div>
      </main>
    </div>
  );
}
