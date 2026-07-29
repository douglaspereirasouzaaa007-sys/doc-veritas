import { useState } from "react";
import telemedicina from "@/assets/tab-telemedicina.jpg";
import farmacia from "@/assets/tab-farmacia.jpg";
import plataforma from "@/assets/tab-plataforma.jpg";

const tabs = [
  {
    id: "consultorio",
    label: (
      <>
        Consultório médico
        <br />
        ou na Telemedicina
      </>
    ),
    image: telemedicina,
    alt: "Médica sorrindo e acenando durante uma teleconsulta no notebook",
    text: (
      <>
        A <strong>Memed facilita</strong> a vida dos médicos, os ajudando a ter e a viver mais tempo
        de qualidade em cada consulta.
      </>
    ),
  },
  {
    id: "farmacia",
    label: (
      <>
        Farmácia e
        <br />
        laboratório
      </>
    ),
    image: farmacia,
    alt: "Farmacêutica com tablet em uma farmácia moderna",
    text: (
      <>
        Na farmácia, o paciente apresenta o <strong>QR Code da receita digital</strong> e retira o
        medicamento com segurança, sem papel e sem complicação.
      </>
    ),
  },
  {
    id: "plataforma",
    label: (
      <>
        Plataforma de
        <br />
        saúde
      </>
    ),
    image: plataforma,
    alt: "Médico sorrindo em corredor de hospital",
    text: (
      <>
        Integramos <strong>hospitais, clínicas e operadoras</strong> à prescrição digital,
        garantindo validade jurídica e rastreabilidade de ponta a ponta.
      </>
    ),
  },
];

export function WhereSection() {
  const [active, setActive] = useState(tabs[0].id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <section className="bg-background py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <h2 className="text-center font-display text-3xl font-medium text-primary md:text-4xl">
          Onde encontrar a Memed?
        </h2>

        <div className="mt-10 rounded-2xl bg-primary-soft p-4 md:p-6">
          <div className="grid gap-4 md:grid-cols-3">
            {tabs.map((tab) => {
              const isActive = tab.id === active;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActive(tab.id)}
                  className="flex items-center gap-4 rounded-xl p-2 text-left transition-colors hover:bg-background/60"
                  aria-pressed={isActive}
                >
                  <img
                    src={tab.image}
                    alt=""
                    loading="lazy"
                    className={`h-16 w-16 shrink-0 rounded-full object-cover transition-all ${
                      isActive
                        ? "ring-4 ring-brand-orange"
                        : "opacity-70 grayscale ring-2 ring-transparent"
                    }`}
                  />
                  <span
                    className={`font-display text-sm font-semibold leading-snug ${
                      isActive ? "text-brand-orange" : "text-muted-foreground"
                    }`}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-12 grid items-center gap-10 lg:grid-cols-2">
          <p className="order-2 font-display text-2xl leading-snug text-primary md:text-3xl lg:order-1">
            {current.text}
          </p>
          <img
            src={current.image}
            alt={current.alt}
            loading="lazy"
            width={1200}
            height={800}
            className="order-1 aspect-[3/2] w-full rounded-xl object-cover shadow-[var(--shadow-soft)] lg:order-2"
          />
        </div>
      </div>
    </section>
  );
}
