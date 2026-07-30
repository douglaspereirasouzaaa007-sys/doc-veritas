import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { signIn, getSession, register, getOwnerStatus } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acesso ao painel | Memed" },
      { name: "description", content: "Entre no painel administrativo." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"loading" | "login" | "register">("loading");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const checkSession = useServerFn(getSession);
  const checkOwner = useServerFn(getOwnerStatus);
  const doSignIn = useServerFn(signIn);
  const doRegister = useServerFn(register);

  useEffect(() => {
    checkSession({}).then(({ loggedIn }) => {
      if (loggedIn) { navigate({ to: "/painel" }); return; }
      checkOwner({}).then(({ registered }) => {
        setMode(registered ? "login" : "register");
      });
    });
  }, [navigate, checkSession, checkOwner]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "register") {
        await doRegister({ data: { email, password } });
        toast.success("Cadastro realizado! Bem-vindo ao painel.");
      } else {
        await doSignIn({ data: { email, password } });
      }
      navigate({ to: "/painel" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao processar.");
      setLoading(false);
    }
  }

  if (mode === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent" />
      </div>
    );
  }

  const isRegister = mode === "register";

  return (
    <div className="flex min-h-screen flex-col bg-primary">
      {/* Topo com logo */}
      <div className="flex items-center px-6 py-5">
        <img src="/memed-logo-white.png" alt="Memed" className="h-8 w-auto" />
      </div>

      {/* Card central */}
      <div className="flex flex-1 items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
          <div className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2">
            <img src="/memed-logo-white.png" alt="Memed" className="h-8 w-auto" />
          </div>

          <h1 className="mt-6 font-display text-2xl font-semibold text-primary">
            {isRegister ? "Criar conta do proprietário" : "Painel do proprietário"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isRegister
              ? "Configure o acesso único ao painel. Após o cadastro, novos registros ficam bloqueados."
              : "Gerencie documentos, estabelecimentos e chaves de API."}
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
                placeholder="seu@email.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                autoComplete={isRegister ? "new-password" : "current-password"}
                required
                minLength={isRegister ? 6 : 1}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isRegister ? "Mínimo 6 caracteres" : "••••••••"}
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading
                ? isRegister ? "Cadastrando..." : "Entrando..."
                : isRegister ? "Criar conta e entrar" : "Entrar"}
            </Button>
            {isRegister && (
              <p className="text-center text-xs text-muted-foreground">
                🔒 Cadastro único — após confirmar, novos registros são bloqueados.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
