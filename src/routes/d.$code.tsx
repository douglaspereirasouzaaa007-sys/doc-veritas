import { useEffect, useState, useCallback } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  Lock,
  Printer,
  QrCode,
  ShieldCheck,
  Stethoscope,
  User,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { getPublicDocument } from "@/lib/public-documents.functions";
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

// ── Splash de verificação ─────────────────────────────────────────────────────

function SplashScreen({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState(0);

  const steps = [
    "Consultando base de dados…",
    "Verificando assinatura digital…",
    "Confirmando autenticidade…",
  ];

  useEffect(() => {
    const start = Date.now();
    const duration = 2800;
    let raf: number;

    function tick() {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setProgress(pct);
      setStep(Math.floor((pct / 100) * steps.length));
      if (pct < 100) {
        raf = requestAnimationFrame(tick);
      } else {
        onDone();
      }
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#4F46E5] to-[#3730a3]">
      <div className="flex flex-col items-center gap-8 px-8 text-center">
        {/* Shield pulsante */}
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-white/15" />
          <div className="absolute inset-[-12px] animate-pulse rounded-full bg-white/5" />
          <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur">
            <ShieldCheck className="h-14 w-14 text-white" strokeWidth={1.5} />
          </div>
        </div>

        <div>
          <img src="/memed-logo-white.png" alt="Memed" className="mx-auto mb-3 h-7 w-auto" />
          <p className="text-lg font-semibold text-white">Sistema de Verificação</p>
          <p className="mt-1.5 text-sm text-white/60">
            {steps[Math.min(step, steps.length - 1)]}
          </p>
        </div>

        {/* Barra */}
        <div className="w-64 space-y-2">
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-white transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-right text-xs text-white/40">{Math.round(progress)}%</p>
        </div>

        {/* Passos */}
        <div className="flex gap-5">
          {steps.map((s, i) => (
            <div
              key={s}
              className={`flex items-center gap-1.5 transition-opacity ${
                i <= step ? "opacity-100" : "opacity-30"
              }`}
            >
              <div
                className={`h-1.5 w-1.5 rounded-full ${i < step ? "bg-emerald-400" : "bg-white/50"}`}
              />
            </div>
          ))}
        </div>

        <p className="text-xs text-white/40">
          <Lock className="mr-1 inline h-3 w-3" />
          Conexão segura · ICP-Brasil
        </p>
      </div>
    </div>
  );
}

// ── Componentes internos ──────────────────────────────────────────────────────

function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-doc-muted">
        {label}
      </p>
      <p
        className={`mt-0.5 text-[14.5px] font-medium leading-snug text-doc-ink ${mono ? "font-mono tracking-wider" : ""}`}
      >
        {value || "—"}
      </p>
    </div>
  );
}

function InfoCard({
  title,
  icon: Icon,
  color = "indigo",
  children,
}: {
  title: string;
  icon: LucideIcon;
  color?: "indigo" | "emerald" | "slate" | "violet";
  children: React.ReactNode;
}) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    slate: "bg-slate-50 text-slate-600 border-slate-200",
    violet: "bg-violet-50 text-violet-700 border-violet-100",
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-doc-line bg-doc-surface shadow-sm">
      <div className={`flex items-center gap-2.5 border-b border-doc-line px-5 py-3 ${colors[color]}`}>
        <Icon className="h-4 w-4 shrink-0" />
        <h3 className="text-[11px] font-bold uppercase tracking-[0.12em]">{title}</h3>
      </div>
      <dl className="grid gap-x-6 gap-y-4 px-5 py-5 sm:grid-cols-2">{children}</dl>
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────

function DocumentPage() {
  const { document: doc } = Route.useLoaderData();
  const { code } = Route.useParams();

  const [showSplash, setShowSplash] = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => { setShowSplash(true); }, []);

  const handleSplashDone = useCallback(() => {
    setShowSplash(false);
    setSplashDone(true);
  }, []);

  // ── Documento não encontrado ──────────────────────────────────────────────
  if (!doc) {
    return (
      <>
        {showSplash && !splashDone && <SplashScreen onDone={handleSplashDone} />}
        <div className="flex min-h-screen flex-col items-center justify-center bg-doc-bg px-4">
          <div className="w-full max-w-md text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
              <XCircle className="h-10 w-10 text-red-500" />
            </div>
            <h1 className="font-display text-2xl font-bold text-doc-ink">
              Documento não encontrado
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-doc-muted">
              Não localizamos nenhum documento com o identificador{" "}
              <code className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-sm font-medium text-slate-700">
                {code}
              </code>
              . Verifique se o token ou o código de acesso foi digitado corretamente.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild variant="outline">
                <Link to="/verificar">Tentar outro código</Link>
              </Button>
              <Button asChild>
                <Link to="/">Ir ao início</Link>
              </Button>
            </div>
            <p className="mt-10 text-xs text-doc-muted">
              Se precisar de ajuda, entre em contato com o profissional ou estabelecimento emissor.
            </p>
          </div>
        </div>
      </>
    );
  }

  const valid = doc.status === "valido";
  const revoked = doc.status === "revogado";
  const isAtestado = doc.type === "atestado";
  const feminine = doc.type === "receita" || doc.type === "declaracao";
  const typeLabel = DOCUMENT_TYPE_LABEL[doc.type] ?? doc.type;
  const council = (doc.professional_council || "CRM").trim();
  const councilNum = doc.professional_council_number
    ? council.toUpperCase() === "CRM"
      ? doc.professional_council_number
      : `${council} ${doc.professional_council_number}`.trim()
    : null;

  const qrUrl = `${PUBLIC_SITE_URL}/d/${doc.code}`;

  return (
    <>
      {showSplash && !splashDone && <SplashScreen onDone={handleSplashDone} />}

      <div
        className={`min-h-screen bg-doc-bg transition-opacity duration-500 ${
          showSplash && !splashDone ? "opacity-0" : "opacity-100"
        }`}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-40 border-b border-doc-line bg-white/95 backdrop-blur print:static print:border-0 print:shadow-none">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 gap-4">
            <Link to="/" aria-label="Memed">
              <img src="/memed-logo-white.png" alt="Memed" className="hidden h-6 w-auto [filter:invert(1)_sepia(1)_saturate(100)_hue-rotate(220deg)] sm:block" />
              <img src="/memed-logo-white.png" alt="Memed" className="h-5 w-auto sm:hidden [filter:invert(1)_sepia(1)_saturate(100)_hue-rotate(220deg)]" />
            </Link>
            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-doc-muted sm:block">Documento verificado em</span>
              <span className="hidden rounded-md bg-doc-bg px-2 py-1 font-mono text-xs font-medium text-doc-ink sm:block">
                {new Date().toLocaleDateString("pt-BR")}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="gap-1.5 print:hidden"
              >
                <Printer className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Imprimir</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 pb-20 sm:py-8">

          {/* ── Banner de status ──────────────────────────────────────────── */}
          {valid ? (
            <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/20">
              <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
                    <BadgeCheck className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-200">
                      Autenticidade confirmada
                    </p>
                    <h1 className="font-display text-xl font-bold sm:text-2xl">
                      {typeLabel} {feminine ? "válida" : "válido"}
                    </h1>
                    <p className="mt-0.5 text-sm text-emerald-100">
                      Documento autêntico, emitido eletronicamente e verificado nesta data.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end sm:gap-1.5">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 font-mono text-xs font-semibold tracking-widest">
                    <FileText className="h-3 w-3 shrink-0" />
                    {doc.token}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 font-mono text-xs tracking-widest">
                    <QrCode className="h-3 w-3 shrink-0" />
                    {doc.code}
                  </span>
                </div>
              </div>
              {/* Barra de segurança */}
              <div className="flex items-center gap-3 border-t border-white/15 bg-black/10 px-6 py-2.5 sm:px-8">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                <p className="text-[11px] text-emerald-200">
                  Documento verificado com criptografia ICP-Brasil · Validade jurídica garantida pela Lei nº 14.063/2020
                </p>
              </div>
            </div>
          ) : (
            <div className={`overflow-hidden rounded-2xl text-white shadow-lg ${
              revoked
                ? "bg-gradient-to-r from-red-600 to-rose-600 shadow-red-900/20"
                : "bg-gradient-to-r from-amber-600 to-orange-600 shadow-amber-900/20"
            }`}>
              <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
                    <AlertTriangle className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/70">
                      Atenção
                    </p>
                    <h1 className="font-display text-xl font-bold sm:text-2xl">
                      {typeLabel} {DOCUMENT_STATUS_LABEL[doc.status]}
                    </h1>
                    <p className="mt-0.5 text-sm text-white/80">
                      Este documento não pode mais ser considerado válido para fins legais.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 font-mono text-xs font-semibold tracking-widest">
                    <FileText className="h-3 w-3" />
                    {doc.token}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 font-mono text-xs tracking-widest">
                    <QrCode className="h-3 w-3" />
                    {doc.code}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── Grid principal ───────────────────────────────────────────── */}
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">

            {/* Coluna principal */}
            <div className="space-y-5">

              {/* Dados do paciente */}
              <InfoCard title="Dados do paciente" icon={User} color="indigo">
                <Field label="Nome completo" value={doc.patient_name} />
                <Field label="CPF" value={formatCPF(doc.patient_cpf)} mono />
                <Field label="Data de nascimento" value={formatDateBR(doc.patient_birth_date)} />
              </InfoCard>

              {/* Estabelecimento */}
              <InfoCard title="Estabelecimento" icon={Building2} color="violet">
                <Field label="Nome" value={doc.establishment_name} />
                <Field label="Endereço" value={doc.establishment_address} />
                <Field label="Data de emissão" value={formatDateBR(doc.issued_at)} />
                <Field label="Horário" value={formatDateTimeBR(doc.issued_at)} />
              </InfoCard>

              {/* Profissional */}
              <InfoCard title="Profissional responsável" icon={Stethoscope} color="indigo">
                <Field label="Nome" value={doc.professional_name} />
                <Field label="Especialidade" value={doc.professional_specialty} />
                <Field label={council.toUpperCase()} value={councilNum} mono />
              </InfoCard>

              {/* Afastamento — só para atestados */}
              {isAtestado && (
                <InfoCard title="Afastamento médico" icon={CalendarDays} color="emerald">
                  <Field label="Data de início" value={formatDateBR(doc.leave_start_date)} />
                  <Field label="Data de término" value={formatDateBR(doc.leave_end_date)} />
                  <Field
                    label="Total de dias"
                    value={doc.leave_days != null ? `${doc.leave_days} dia${doc.leave_days !== 1 ? "s" : ""}` : null}
                  />
                  <Field label="CID-10" value={doc.cid} mono />
                </InfoCard>
              )}

              {/* Conteúdo do documento */}
              <div className="overflow-hidden rounded-2xl border border-doc-line bg-doc-surface shadow-sm">
                <div className="flex items-center gap-2.5 border-b border-doc-line bg-slate-50 px-5 py-3 text-slate-600">
                  <ClipboardList className="h-4 w-4 shrink-0" />
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.12em]">
                    Conteúdo do documento
                  </h3>
                </div>
                <div className="px-6 py-6 sm:px-8 sm:py-7">
                  {doc.body_text ? (
                    <p className="whitespace-pre-wrap text-[15px] leading-8 text-doc-ink">
                      {doc.body_text}
                    </p>
                  ) : (
                    <p className="italic text-sm text-doc-muted">
                      Nenhum conteúdo textual informado para este documento.
                    </p>
                  )}
                </div>
              </div>

              {/* Validade legal */}
              {valid && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 sm:p-6">
                  <div className="mb-4 flex items-center gap-2 text-indigo-700">
                    <ShieldCheck className="h-4 w-4" />
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.12em]">
                      Validade jurídica
                    </h3>
                  </div>
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {[
                      `Documento assinado eletronicamente com certificado digital padrão ICP-Brasil, com a mesma validade jurídica de um documento em papel assinado de próprio punho, nos termos da MP nº 2.200-2/2001 e da Lei nº 14.063/2020.`,
                      `Válido em todo o território nacional, podendo ser apresentado a empregadores, farmácias, operadoras de saúde, instituições de ensino e órgãos públicos.`,
                      `A autenticidade ${feminine ? "desta" : "deste"} ${typeLabel.toLowerCase()} pode ser conferida a qualquer momento pelo token, pelo código de verificação ou pelo QR Code.`,
                      `A responsabilidade técnica pelo conteúdo é do profissional emissor, identificado por seu registro no conselho de classe.`,
                    ].map((text) => (
                      <li key={text} className="flex gap-2.5 text-sm leading-relaxed text-indigo-900/80">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                        <span>{text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* ── Sidebar QR ──────────────────────────────────────────────── */}
            <aside className="space-y-4 lg:sticky lg:top-[72px]">

              {/* Card QR Code */}
              <div className="overflow-hidden rounded-2xl border border-doc-line bg-doc-surface shadow-sm">
                {/* Header do card */}
                <div className="bg-gradient-to-r from-[#4F46E5] to-[#6D28D9] px-5 py-4 text-center">
                  <img src="/memed-logo-white.png" alt="Memed" className="mx-auto mb-1 h-5 w-auto" />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
                    Verificação digital
                  </p>
                </div>

                <div className="p-5 text-center">
                  {/* Status badge */}
                  <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                    valid
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                  }`}>
                    {valid ? (
                      <BadgeCheck className="h-3.5 w-3.5" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5" />
                    )}
                    {valid ? "Documento válido" : DOCUMENT_STATUS_LABEL[doc.status]}
                  </div>

                  {/* QR Code */}
                  <div className="relative mx-auto mt-5 w-fit">
                    <div className="rounded-2xl border-2 border-doc-line bg-white p-3 shadow-inner">
                      <img
                        src={`/api/public/v1/qrcode/${doc.code}?size=240`}
                        alt={`QR Code do documento ${doc.code}`}
                        className="h-52 w-52"
                        width={208}
                        height={208}
                      />
                    </div>
                    {/* Lock badge */}
                    <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1 rounded-full border border-doc-line bg-white px-2.5 py-0.5 text-[10px] font-semibold text-doc-muted shadow-sm">
                        <Lock className="h-2.5 w-2.5" />
                        Seguro
                      </span>
                    </div>
                  </div>

                  <p className="mt-6 text-xs leading-relaxed text-doc-muted">
                    Aponte a câmera do celular para verificar este documento
                  </p>

                  {/* Token e código */}
                  <div className="mt-5 space-y-2">
                    <div className="rounded-xl bg-doc-bg px-4 py-3">
                      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-doc-muted">
                        Token
                      </p>
                      <p className="mt-0.5 font-mono text-base font-bold tracking-[0.2em] text-doc-accent-strong">
                        {doc.token}
                      </p>
                    </div>
                    <div className="rounded-xl bg-doc-bg px-4 py-3">
                      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-doc-muted">
                        Código de acesso
                      </p>
                      <p className="mt-0.5 font-mono text-sm font-semibold tracking-[0.15em] text-doc-ink">
                        {doc.code}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-doc-line p-4">
                  <Button asChild variant="outline" size="sm" className="w-full print:hidden">
                    <Link to="/verificar">Verificar outro documento</Link>
                  </Button>
                </div>
              </div>

              {/* Card de informações de segurança */}
              <div className="rounded-2xl border border-doc-line bg-doc-surface p-5 shadow-sm">
                <h4 className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-doc-muted">
                  Segurança &amp; autenticidade
                </h4>
                <ul className="space-y-2.5">
                  {[
                    { icon: ShieldCheck, text: "Criptografia ICP-Brasil", sub: "Padrão governamental" },
                    { icon: BadgeCheck, text: "Assinatura digital", sub: "CFM / CRM verificado" },
                    { icon: Lock, text: "Conexão segura", sub: "HTTPS com TLS 1.3" },
                    { icon: FileText, text: "Registro imutável", sub: "Hash criptográfico" },
                  ].map(({ icon: Icon, text, sub }) => (
                    <li key={text} className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                        <Icon className="h-3.5 w-3.5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-doc-ink">{text}</p>
                        <p className="text-[10px] text-doc-muted">{sub}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* URL de verificação */}
              <div className="rounded-2xl border border-doc-line bg-doc-surface p-4 shadow-sm">
                <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-doc-muted">
                  URL de verificação
                </p>
                <p className="break-all font-mono text-[10px] text-doc-muted">{qrUrl}</p>
              </div>
            </aside>
          </div>
        </main>

        {/* ── Rodapé ─────────────────────────────────────────────────────────── */}
        <footer className="border-t border-doc-line bg-doc-surface print:hidden">
          <div className="mx-auto max-w-6xl px-4 py-6">
            <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
              <Link to="/">
                <img
                  src="/memed-logo-white.png"
                  alt="Memed"
                  className="h-5 w-auto [filter:invert(1)_sepia(1)_saturate(100)_hue-rotate(220deg)]"
                />
              </Link>
              <p className="text-xs text-doc-muted">
                © {new Date().getFullYear()} Memed · Sistema de verificação de documentos médicos digitais · Todos os direitos reservados
              </p>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs font-medium text-emerald-600">Verificação segura</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
