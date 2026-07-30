import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
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

function Verificar() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const raw = code.trim();
    if (!isDocumentToken(raw) && normalizeCode(raw).length !== 12) {
      setError("Informe o token (ex.: ATE-161) ou o código de acesso de 12 caracteres.");
      return;
    }
    setError(null);
    navigate({ to: "/d/$code", params: { code: normalizeLookup(raw).value } });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 bg-primary-soft/50 py-16">
        <div className="mx-auto max-w-xl px-4">
          <div className="rounded-2xl bg-card p-8 shadow-[var(--shadow-soft)]">
            <ShieldCheck className="h-10 w-10 text-brand-orange" />
            <h1 className="mt-4 font-display text-3xl font-medium text-primary">
              Verificar documento
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Informe o token do documento (ex.: ATE-161, REC-22144, LAU-16105) ou o código de acesso impresso no rodapé do atestado, receita ou laudo.
            </p>

            <form onSubmit={submit} className="mt-8 space-y-4">
              <Input
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ATE-161 ou XXXX-XXXX-XXXX"
                maxLength={20}
                aria-label="Token ou código de acesso"
                className="h-14 text-center font-mono text-lg tracking-[0.3em]"
              />
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button type="submit" size="xl" className="w-full font-semibold">
                Verificar autenticidade
              </Button>
            </form>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
