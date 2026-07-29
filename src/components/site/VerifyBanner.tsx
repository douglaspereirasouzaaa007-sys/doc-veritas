import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { QrCode, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeCode, prettyCode } from "@/lib/documents.shared";

export function VerifyBanner() {
  const [code, setCode] = useState("");
  const navigate = useNavigate();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalizeCode(code);
    if (normalized.length < 4) return;
    navigate({ to: "/d/$code", params: { code: prettyCode(normalized) } });
  }

  return (
    <section className="border-y border-border bg-primary-soft/60">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-8 lg:flex-row lg:justify-between lg:px-8">
        <div className="flex items-center gap-3 text-center lg:text-left">
          <ShieldCheck className="hidden h-9 w-9 shrink-0 text-brand-orange sm:block" />
          <div>
            <h2 className="font-display text-xl font-semibold text-primary">
              Verifique a autenticidade de um documento
            </h2>
            <p className="text-sm text-muted-foreground">
              Digite o código impresso no atestado, receita ou laudo, ou aponte a câmera para o QR
              Code.
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="flex w-full max-w-md gap-3">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="XXXX-XXXX-XXXX"
            maxLength={20}
            aria-label="Código de verificação do documento"
            className="h-12 bg-background font-mono tracking-widest"
          />
          <Button type="submit" size="lg" className="h-12 gap-2 px-5">
            <QrCode className="h-4 w-4" />
            Verificar
          </Button>
        </form>
      </div>
    </section>
  );
}
