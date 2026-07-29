import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";

const partnerLinks = [
  { label: "Médicos", to: "/parceiros/medicos" },
  { label: "Pacientes", to: "/parceiros/pacientes" },
  { label: "Farmácias", to: "/parceiros/farmacias" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
        <Logo />

        <nav className="hidden items-center gap-8 lg:flex">
          <Link
            to="/verificar"
            className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            Dúvidas sobre a receita Memed
          </Link>
          <div className="group relative">
            <button className="flex items-center gap-1.5 text-sm font-medium text-primary">
              Parceiros
              <ChevronDown className="h-4 w-4 text-brand-orange transition-transform group-hover:rotate-180" />
            </button>
            <div className="invisible absolute left-0 top-full w-56 translate-y-1 rounded-xl border border-border bg-popover p-2 opacity-0 shadow-lg transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
              {partnerLinks.map((item) => (
                <Link
                  key={item.to}
                  to="/verificar"
                  className="block rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <Button asChild size="lg" className="rounded-lg px-6 text-sm font-semibold">
            <Link to="/verificar">Clique e prescreva</Link>
          </Button>
        </nav>

        <button
          className="lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Abrir menu"
          aria-expanded={open}
        >
          {open ? <X className="h-6 w-6 text-primary" /> : <Menu className="h-6 w-6 text-primary" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background px-4 py-4 lg:hidden">
          <div className="flex flex-col gap-3">
            <Link to="/verificar" className="py-2 text-sm font-medium text-primary">
              Dúvidas sobre a receita Memed
            </Link>
            {partnerLinks.map((item) => (
              <Link key={item.to} to="/verificar" className="py-2 text-sm text-foreground">
                {item.label}
              </Link>
            ))}
            <Button asChild className="mt-2 w-full">
              <Link to="/verificar">Clique e prescreva</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
