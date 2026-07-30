import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const partnerLinks = [
  { label: "Médicos", to: "/parceiros/medicos" },
  { label: "Pacientes", to: "/parceiros/pacientes" },
  { label: "Farmácias", to: "/parceiros/farmacias" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-primary shadow-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
        {/* Logo branca */}
        <Link to="/" aria-label="Memed - página inicial">
          <img
            src="/memed-logo-white.png"
            alt="Memed"
            className="h-7 w-auto"
          />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          <Link
            to="/verificar"
            className="text-sm font-medium text-white/90 transition-colors hover:text-white"
          >
            Dúvidas sobre a receita Memed
          </Link>
          <div className="group relative">
            <button className="flex items-center gap-1.5 text-sm font-medium text-white/90">
              Parceiros
              <ChevronDown className="h-4 w-4 text-white/70 transition-transform group-hover:rotate-180" />
            </button>
            <div className="invisible absolute left-0 top-full w-56 translate-y-1 rounded-xl border border-white/10 bg-white p-2 opacity-0 shadow-lg transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
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
          <Button
            asChild
            size="lg"
            className="rounded-lg bg-white px-6 text-sm font-semibold text-primary hover:bg-white/90"
          >
            <Link to="/verificar">Clique e prescreva</Link>
          </Button>
        </nav>

        <button
          className="lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Abrir menu"
          aria-expanded={open}
        >
          {open ? (
            <X className="h-6 w-6 text-white" />
          ) : (
            <Menu className="h-6 w-6 text-white" />
          )}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-primary px-4 py-4 lg:hidden">
          <div className="flex flex-col gap-3">
            <Link to="/verificar" className="py-2 text-sm font-medium text-white/90">
              Dúvidas sobre a receita Memed
            </Link>
            {partnerLinks.map((item) => (
              <Link key={item.to} to="/verificar" className="py-2 text-sm text-white/80">
                {item.label}
              </Link>
            ))}
            <Button asChild className="mt-2 w-full bg-white text-primary hover:bg-white/90">
              <Link to="/verificar">Clique e prescreva</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
