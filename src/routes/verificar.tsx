import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  FileText,
  FlaskConical,
  QrCode,
  Search,
  ShieldCheck,
  Stethoscope,
  ClipboardList,
  Lock,
  ArrowRight,
} from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isDocumentToken, normalizeCode, normalizeLookup } from "@/lib/documents.shared";

export const Route = createFileRoute("/verificar")({
  head: () => ({
    meta: [
      { title: "Verificar documento | Memed" },
      {
        name: "description",
        content:
          "Confira a autenticidade de atestados, receitas e laudos digitais informando o código de verificação impresso no documento.",
      },
      { property: "og:title", content: "Verificar documento | Memed" },
      {
        property: "og:description",
        content: "Valide atestados, receitas e laudos digitais pelo código ou QR Code.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Verificar,
});

const DOC_TYPES = [
  {
    icon: FileText,
    label: "Atestado médico",
    prefix: "ATE",
    desc: "Atestados de afastamento com CID e datas",
    color: "indigo",
  },
  {
    icon: ClipboardList,
    label: "Receita médica",
    prefix: "REC",
    desc: "Prescrições de medicamentos e tratamentos",
    color: "violet",
  },
  {
    icon: Stethoscope,
    label: "Laudo médico",
    prefix: "LAU",
    desc: "Laudos clínicos e pareceres profissionais",
    color: "blue",
  },
  {
    icon: FlaskConical,
    label: "Pedido de exame",
    prefix: "EXA",
    desc: "Solicitações de exames laboratoriais",
    color: "teal",
  },
] as const;

const HOW_STEPS = [
  {
    n: "01",
    title: "Localize o código",
    desc: "Encontre o token (ex.: ATE-161) ou o código de acesso de 6 dígitos impresso ou enviado com o documento.",
    icon: QrCode,
  },
  {
    n: "02",
    title: "Digite ou escaneie",
    desc: "Insira o código no campo abaixo ou aponte a câmera do celular para o QR Code do documento.",
    icon: Search,
  },
  {
    n: "03",
    title: "Veja a confirmação",
    desc: "O sistema valida a autenticidade em segundos e exibe todos os dados do documento e do profissional.",
    icon: BadgeCheck,
  },
] as const;

function Verificar() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const raw = code.trim();
    if (!raw) {
      setError("Digite o token ou o código de acesso.");
      return;
    }
    if (!isDocumentToken(raw) && normalizeCode(raw).length < 6) {
      setError(
        "Informe o token (ex.: ATE-161) ou o código de acesso de 6 dígitos numéricos.",
      );
      return;
    }
    setError(null);
    navigate({ to: "/d/$code", params: { code: normalizeLookup(raw).value } });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#4338CA] via-[#4F46E5] to-[#6D28D9] py-16 sm:py-20">
        {/* Efeito de fundo */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-indigo-400/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/90 backdrop-blur">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            Sistema de verificação seguro · ICP-Brasil
          </div>

          <h1 className="font-display text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            Verifique a autenticidade<br className="hidden sm:block" /> do seu documento médico
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-indigo-200 sm:text-lg">
            Atestados, receitas, laudos e exames emitidos pela Memed têm verificação digital gratuita,
            instantânea e com validade jurídica.
          </p>

          {/* Formulário de busca */}
          <form
            onSubmit={submit}
            className="mx-auto mt-10 w-full max-w-lg"
          >
            <div className="overflow-hidden rounded-2xl bg-white shadow-2xl shadow-indigo-900/30">
              <div className="px-6 pt-6 pb-2">
                <label className="mb-2 block text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  Token ou código de acesso
                </label>
                <Input
                  autoFocus
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setError(null);
                  }}
                  placeholder="ATE-161 · REC-220 · 847291"
                  maxLength={20}
                  aria-label="Token ou código de acesso"
                  className="h-14 border-0 bg-slate-50 text-center font-mono text-xl font-semibold tracking-[0.25em] text-slate-800 focus-visible:ring-1 focus-visible:ring-indigo-400 placeholder:text-slate-300 placeholder:tracking-normal placeholder:font-sans placeholder:text-base placeholder:font-normal"
                />
                {error && (
                  <p className="mt-2 text-left text-sm font-medium text-red-500">{error}</p>
                )}
              </div>
              <div className="px-6 pb-6 pt-3">
                <Button
                  type="submit"
                  size="lg"
                  className="h-12 w-full gap-2 bg-[#4F46E5] text-base font-bold hover:bg-[#4338CA]"
                >
                  <Search className="h-4 w-4" />
                  Verificar autenticidade
                </Button>
              </div>
            </div>
            <p className="mt-4 text-center text-xs text-indigo-300">
              <Lock className="mr-1 inline h-3 w-3" />
              Consulta gratuita · Sem cadastro · Resultado instantâneo
            </p>
          </form>
        </div>
      </section>

      {/* ── Tipos de documento ────────────────────────────────────────────── */}
      <section className="bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4">
          <div className="mb-8 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-600">
              Documentos suportados
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold text-slate-800 sm:text-3xl">
              O que você pode verificar
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DOC_TYPES.map(({ icon: Icon, label, prefix, desc }) => (
              <div
                key={prefix}
                className="group flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-5 transition-all hover:border-indigo-200 hover:bg-indigo-50/50 hover:shadow-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 group-hover:bg-indigo-200 transition-colors">
                  <Icon className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{label}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{desc}</p>
                </div>
                <p className="mt-auto font-mono text-xs font-semibold text-indigo-400">
                  Token: {prefix}-XXXXX
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Como funciona ─────────────────────────────────────────────────── */}
      <section className="bg-slate-50 py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4">
          <div className="mb-10 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-600">
              Passo a passo
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold text-slate-800 sm:text-3xl">
              Como funciona a verificação
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {HOW_STEPS.map(({ n, title, desc, icon: Icon }, i) => (
              <div key={n} className="relative flex flex-col gap-4">
                {/* Linha conectora */}
                {i < HOW_STEPS.length - 1 && (
                  <div className="absolute left-[calc(50%+40px)] top-5 hidden h-px w-[calc(100%-80px)] border-t-2 border-dashed border-indigo-200 md:block" />
                )}
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-200">
                    <Icon className="h-6 w-6 text-white" />
                    <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-black text-indigo-600 shadow">
                      {n.slice(1)}
                    </span>
                  </div>
                  <h3 className="font-display text-lg font-bold text-slate-800">{title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Segurança ─────────────────────────────────────────────────────── */}
      <section className="bg-white py-12 sm:py-14">
        <div className="mx-auto max-w-5xl px-4">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-[#4338CA] to-[#6D28D9] px-8 py-10 md:px-12">
            <div className="grid gap-8 md:grid-cols-2 md:items-center">
              <div className="text-white">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white/90">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  Segurança garantida
                </div>
                <h2 className="font-display text-2xl font-bold sm:text-3xl">
                  Verificação com<br />validade jurídica
                </h2>
                <p className="mt-3 text-indigo-200 text-sm leading-relaxed sm:text-base">
                  Todos os documentos Memed são assinados com certificado digital padrão ICP-Brasil,
                  garantindo a mesma validade jurídica de um documento em papel.
                </p>
                <Button
                  asChild
                  className="mt-6 gap-2 bg-white text-indigo-700 hover:bg-indigo-50 font-semibold"
                >
                  <Link to="/verificar">
                    Verificar meu documento
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { icon: ShieldCheck, title: "ICP-Brasil", desc: "Padrão de segurança do governo federal" },
                  { icon: Lock, title: "TLS 1.3", desc: "Conexão 100% criptografada" },
                  { icon: BadgeCheck, title: "CFM / CRM", desc: "Profissional verificado" },
                  { icon: FileText, title: "Hash imutável", desc: "Registro inalterável do documento" },
                ].map(({ icon: Icon, title, desc }) => (
                  <div
                    key={title}
                    className="flex items-start gap-3 rounded-xl bg-white/10 p-4 backdrop-blur"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{title}</p>
                      <p className="mt-0.5 text-[11px] text-indigo-200">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
