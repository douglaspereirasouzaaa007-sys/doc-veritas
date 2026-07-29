import { useEffect, useState } from "react";
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { FileText, Home, KeyRound, Building2, LogOut, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/site/Logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/painel")({
  component: PainelLayout,
});

const nav: { to: string; label: string; icon: typeof Home; exact?: boolean }[] = [
  { to: "/painel", label: "Visão geral", icon: Home, exact: true },
  { to: "/painel/documentos", label: "Documentos", icon: FileText },
  { to: "/painel/estabelecimentos", label: "Estabelecimentos", icon: Building2 },
  { to: "/painel/api", label: "API e chaves", icon: KeyRound },
  { to: "/painel/verificacoes", label: "Verificações", icon: ShieldCheck },
];


function PainelLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/auth" });
      else setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/auth" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted text-sm text-muted-foreground">
        Carregando painel...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-muted">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card p-5 lg:flex">
        <Logo />
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {nav.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-primary"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Button
          variant="ghost"
          className="justify-start gap-3 text-muted-foreground"
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/auth" });
          }}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </aside>

      <div className="flex-1">
        <div className="flex items-center gap-2 overflow-x-auto border-b border-border bg-card px-4 py-3 lg:hidden">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent"
            >
              {item.label}
            </Link>
          ))}
        </div>
        <main className="mx-auto max-w-6xl p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
