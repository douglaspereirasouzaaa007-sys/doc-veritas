import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

const columns = [
  { title: "Quem Somos", links: ["Blog"] },
  { title: "Médicos", links: ["Cadastre-se", "Login", "Suporte"] },
  { title: "Pacientes", links: ["Suporte"] },
  { title: "Farmácias", links: ["Suporte"] },
  {
    title: "Parceiros",
    links: [
      "Hospitais e Operadores de Saúde",
      "Empresas de Software",
      "Indústria farmacêutica",
      "Suporte",
    ],
  },
  { title: "Seja Memeder", links: ["Trabalhe conosco"] },
];

export function SiteFooter() {
  const [email, setEmail] = useState("");
  const [accepted, setAccepted] = useState(false);

  function subscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email.trim())) {
      toast.error("Informe um e-mail válido.");
      return;
    }
    if (!accepted) {
      toast.error("É necessário autorizar o uso dos seus dados.");
      return;
    }
    toast.success("Inscrição realizada! Em breve você receberá nossos conteúdos.");
    setEmail("");
    setAccepted(false);
  }

  return (
    <footer className="relative overflow-hidden bg-primary text-primary-foreground">
      <div className="pointer-events-none absolute -left-40 bottom-0 h-[520px] w-[520px] rounded-full border border-dashed border-primary-foreground/25" />
      <div className="pointer-events-none absolute -left-24 -bottom-40 h-[420px] w-[420px] rounded-full border border-dashed border-primary-foreground/20" />

      <div className="relative mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2">
          <h2 className="max-w-md font-display text-3xl italic leading-tight md:text-4xl">
            Venha conhecer uma nova, completa e inovadora jornada de saúde.
          </h2>

          <div>
            <h3 className="mb-5 text-center font-display text-xl font-semibold lg:text-left">
              Se inscreva em nossa newsletter
            </h3>
            <form onSubmit={subscribe} className="flex flex-col gap-3 sm:flex-row">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Seu melhor e-mail*"
                maxLength={255}
                className="h-12 flex-1 rounded-lg border-0 bg-background text-foreground placeholder:text-muted-foreground"
                aria-label="Seu melhor e-mail"
              />
              <Button
                type="submit"
                variant="orange"
                size="lg"
                className="h-12 rounded-lg px-6 font-semibold"
              >
                Quero me inscrever
              </Button>
            </form>
            <label className="mt-4 flex items-start gap-3 text-sm text-primary-foreground/90">
              <Checkbox
                checked={accepted}
                onCheckedChange={(v) => setAccepted(Boolean(v))}
                className="mt-0.5 border-primary-foreground/70 data-[state=checked]:bg-background data-[state=checked]:text-primary"
              />
              <span>
                Eu autorizo a Memed a usar meus dados para envio de conteúdos personalizados para
                mim.
              </span>
            </label>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="font-display text-sm font-bold">{col.title}</h4>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link}>
                    <Link
                      to="/verificar"
                      className="text-sm text-primary-foreground/85 transition-colors hover:text-primary-foreground"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-primary-foreground/20 pt-8 md:flex-row">
          <Logo variant="light" />
          <p className="text-xs text-primary-foreground/75">
            © {new Date().getFullYear()} Memed. Todos os direitos reservados.
          </p>
          <Link to="/painel" className="text-xs text-primary-foreground/75 hover:underline">
            Painel do proprietário
          </Link>
        </div>
      </div>
    </footer>
  );
}
