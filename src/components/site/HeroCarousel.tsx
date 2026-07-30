import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroFamilia from "@/assets/hero-familia.jpg";

type Slide = {
  image: string;
  alt: string;
  title: React.ReactNode;
  text: React.ReactNode;
  cta: string;
};

// Imagens locais (copiadas para public/)
const HERO_PEDIATRA = "/hero-pediatra.png";
const HERO_IDOSO = "/hero-idoso.png";

const slides: Slide[] = [
  {
    image: HERO_PEDIATRA,
    alt: "Pediatra examinando um bebê no colo da mãe durante a consulta",
    title: (
      <>
        Saúde
        <br />é o que nos <span className="text-italic-peach">aproxima</span>
      </>
    ),
    text: (
      <>
        <strong>Conectamos</strong> médicos e pacientes,{" "}
        <strong>criando uma experiência encantadora</strong> que promova a efetiva adesão ao
        tratamento.
      </>
    ),
    cta: "Clique e prescreva",
  },
  {
    image: HERO_IDOSO,
    alt: "Médica sorrindo e segurando as mãos de um paciente idoso",
    title: (
      <>
        <span className="text-italic-peach">Aproximamos</span>
        <br />o médico da tecnologia
      </>
    ),
    text: (
      <>
        <strong>Conectamos</strong> os médicos com os principais parceiros do segmento da saúde, a
        qualquer momento e de qualquer lugar. Porque quando estamos conectados,{" "}
        <strong>transformamos a saúde</strong>.
      </>
    ),
    cta: "Saiba mais",
  },
  {
    image: heroFamilia,
    alt: "Família reunida à mesa da cozinha sorrindo durante a refeição",
    title: (
      <>
        Mais tempo para você <span className="text-italic-peach">cuidar da saúde</span>
      </>
    ),
    text: (
      <>
        Na medicina, quando <strong>ganhamos tempo, ganhamos possibilidades.</strong>
        <br />
        Do <strong>cuidado</strong> preventivo ao medicamento na hora certa, do exame marcado ao{" "}
        <strong>tratamento</strong> integral.
      </>
    ),
    cta: "Saiba mais",
  },
];

export function HeroCarousel() {
  const [index, setIndex] = useState(0);

  const next = useCallback(() => setIndex((i) => (i + 1) % slides.length), []);
  const prev = useCallback(() => setIndex((i) => (i - 1 + slides.length) % slides.length), []);

  useEffect(() => {
    const id = setInterval(next, 8000);
    return () => clearInterval(id);
  }, [next]);

  const slide = slides[index];

  return (
    <section className="relative isolate overflow-hidden bg-muted">
      {/* Mobile: imagem em cima, texto embaixo */}
      <div className="lg:hidden">
        <img
          src={slide.image}
          alt={slide.alt}
          className="h-64 w-full object-cover object-top"
          width={1152}
          height={640}
        />
        <div className="soft-surface px-6 py-10 text-center">
          <h1 className="font-display text-3xl font-medium leading-tight text-primary">
            {slide.title}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-foreground">
            {slide.text}
          </p>
          <Button asChild size="xl" className="mt-6 w-full max-w-xs font-semibold">
            <Link to="/verificar">{slide.cta}</Link>
          </Button>
          <div className="mt-6 flex items-center justify-center gap-6">
            <button onClick={prev} aria-label="Slide anterior">
              <ChevronLeft className="h-7 w-7 text-primary" />
            </button>
            <button onClick={next} aria-label="Próximo slide">
              <ChevronRight className="h-7 w-7 text-primary/50" />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop: imagem full-bleed com texto sobreposto */}
      <div className="relative hidden h-[640px] lg:block">
        {slides.map((s, i) => (
          <img
            key={s.alt}
            src={s.image}
            alt={s.alt}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
        <div className="hero-overlay absolute inset-0" />
        <div className="pointer-events-none absolute -right-40 top-1/2 h-[900px] w-[900px] -translate-y-1/2 rounded-full border border-dashed border-white/50" />
        <div className="pointer-events-none absolute right-10 top-1/2 h-[620px] w-[620px] -translate-y-1/2 rounded-full border border-dashed border-white/40" />

        <div className="relative mx-auto flex h-full max-w-7xl items-center px-8">
          <div className="max-w-xl">
            <h1 className="font-display text-6xl font-medium leading-[1.05] text-white">
              {slide.title}
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-white">{slide.text}</p>
            <Button asChild size="xl" className="mt-10 w-[300px] font-semibold">
              <Link to="/verificar">{slide.cta}</Link>
            </Button>
            <div className="mt-8 flex items-center gap-6">
              <button onClick={prev} aria-label="Slide anterior">
                <ChevronLeft className="h-8 w-8 text-white/70 transition-colors hover:text-white" />
              </button>
              <button onClick={next} aria-label="Próximo slide">
                <ChevronRight className="h-8 w-8 text-white transition-colors hover:text-white/70" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
