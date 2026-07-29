import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileText, ShieldCheck, Building2, KeyRound, Ban, CheckCircle2 } from "lucide-react";
import { getStats } from "@/lib/admin.functions";
import { DOCUMENT_TYPE_LABEL, formatNumberBR } from "@/lib/br";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/painel/")({
  component: PainelHome,
});

function PainelHome() {
  const fetchStats = useServerFn(getStats);
  const { data, isLoading } = useQuery({ queryKey: ["stats"], queryFn: () => fetchStats({}) });

  const cards = [
    { label: "Documentos emitidos", value: data?.documents ?? 0, icon: FileText },
    { label: "Documentos válidos", value: data?.valid ?? 0, icon: CheckCircle2 },
    { label: "Revogados", value: data?.revoked ?? 0, icon: Ban },
    { label: "Verificações públicas", value: data?.verifications ?? 0, icon: ShieldCheck },
    { label: "Estabelecimentos", value: data?.establishments ?? 0, icon: Building2 },
    { label: "Chaves de API ativas", value: data?.apiKeys ?? 0, icon: KeyRound },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-primary">Visão geral</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe a emissão e a verificação dos documentos digitais.
          </p>
        </div>
        <Button asChild size="lg">
          <Link to="/painel/documentos/novo">Novo documento</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-5">
            <card.icon className="h-5 w-5 text-brand-orange" />
            <p className="mt-3 font-display text-3xl font-semibold text-primary">
              {isLoading ? "—" : formatNumberBR(card.value)}
            </p>
            <p className="text-sm text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold text-primary">Documentos por tipo</h2>
        <div className="mt-4 space-y-3">
          {Object.entries(data?.byType ?? {}).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum documento emitido ainda.</p>
          ) : (
            Object.entries(data?.byType ?? {}).map(([type, count]) => {
              const total = data?.documents || 1;
              return (
                <div key={type}>
                  <div className="flex justify-between text-sm text-primary">
                    <span>{DOCUMENT_TYPE_LABEL[type] ?? type}</span>
                    <span className="font-medium">{formatNumberBR(count)}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${Math.round((count / total) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
