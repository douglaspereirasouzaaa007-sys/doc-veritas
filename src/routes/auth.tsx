import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { signIn, getSession } from "@/lib/auth.functions";
import { Logo } from "@/components/site/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acesso ao painel | Memed" },
      { name: "description", content: "Entre no painel administrativo." },
      { property: "og:title", content: "Acesso ao painel | Memed" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const checkSession = useServerFn(getSession);
  const doSignIn = useServerFn(signIn);

  useEffect(() => {
    checkSession({}).then(({ loggedIn }) => {
      if (loggedIn) navigate({ to: "/painel" });
    });
  }, [navigate, checkSession]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await doSignIn({ data: { email, password } });
      navigate({ to: "/painel" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Credenciais inválidas.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-soft/50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-card p-8 shadow-[var(--shadow-soft)]">
        <Logo />
        <h1 className="mt-6 font-display text-2xl font-semibold text-primary">
          Painel do proprietário
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie documentos, estabelecimentos e chaves de API.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              type="password"
              autoComplete="current-password"
              required
              minLength={4}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Acesso restrito ao proprietário do sistema.
          </p>
        </form>
      </div>
    </div>
  );
}
