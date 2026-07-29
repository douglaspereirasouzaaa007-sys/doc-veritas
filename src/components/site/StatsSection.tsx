import { Play } from "lucide-react";
import { Logo } from "./Logo";

const stats = [
  { value: "+262", unit: "mil", label: <strong>Médicos Cadastrados</strong> },
  {
    value: "+2",
    unit: "milhões",
    label: (
      <>
        De pacientes se <strong>beneficiam</strong> de <strong>nossa tecnologia</strong> por ano
      </>
    ),
  },
  {
    value: "4,7",
    unit: "milhões",
    label: (
      <>
        De <strong>prescrições emitidas</strong> por mês
      </>
    ),
  },
  {
    value: "+350",
    unit: "parceiros",
    label: (
      <>
        E 15 operadoras de saúde estão integrados em <strong>nossa plataforma</strong>
      </>
    ),
  },
  {
    value: "+80",
    unit: "mil",
    label: (
      <>
        Farmácias de <strong>todo Brasil aceitam e utilizam</strong> a Memed
      </>
    ),
  },
];

const testimonials = [
  {
    title: (
      <>
        Paciente que apresentou a receita digital{" "}
        <strong>direto na farmácia utilizando a Memed</strong>
      </>
    ),
    quote:
      '"Foi super prático! Só mostrei o QR Code da minha receita digital Memed na farmácia e consegui comprar o medicamento sem precisar de papel. O processo foi rápido e sem complicação."',
    initials: "AC",
  },
  {
    title: (
      <>
        Luciana Bernucci
        <br />
        <strong>Business Strategy Director da CM Tecnologia</strong>
      </>
    ),
    quote:
      '"A parceria com a Memed é muito importante para a CM e para o setor de saúde: juntos conseguimos catalisar e acelerar a transformação digital do setor, em especial em instituições hospitalares e operadoras de saúde, reduzindo custos e adicionando mais inteligência para milhares de médicos e pacientes todos os meses."',
    initials: "LB",
  },
];

export function StatsSection() {
  return (
    <section className="bg-peach-soft/40 py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <h2 className="text-center font-display text-3xl font-medium text-primary md:text-[2.6rem]">
          Quem somos e o que já fizemos
        </h2>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {stats.map((stat) => (
            <div
              key={stat.value + stat.unit}
              className="rounded-2xl bg-peach-soft px-5 py-7 text-center"
            >
              <p className="font-display text-4xl font-bold text-brand-orange">{stat.value}</p>
              <p className="font-display text-xl text-brand-orange">{stat.unit}</p>
              <p className="mt-3 text-sm leading-snug text-primary">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 grid gap-10 lg:grid-cols-2">
          <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl bg-primary">
            <div className="text-center text-primary-foreground">
              <div className="flex justify-center opacity-90">
                <Logo variant="light" />
              </div>
              <p className="mt-4 font-display text-3xl">Saúde é o que nos</p>
              <p className="font-display text-3xl italic text-peach">aproxima</p>
            </div>
            <button
              className="absolute inset-0 flex items-center justify-center"
              aria-label="Assistir vídeo institucional"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary-foreground/90 transition-transform hover:scale-110">
                <Play className="h-6 w-6 fill-current text-primary-foreground" />
              </span>
            </button>
          </div>

          <div className="space-y-10">
            {testimonials.map((item) => (
              <div key={item.initials} className="flex gap-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary font-display text-lg font-semibold text-primary-foreground">
                  {item.initials}
                </div>
                <div>
                  <p className="text-sm leading-snug text-primary">{item.title}</p>
                  <div className="my-3 h-0.5 w-16 bg-brand-orange" />
                  <p className="text-sm leading-relaxed text-primary">{item.quote}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
