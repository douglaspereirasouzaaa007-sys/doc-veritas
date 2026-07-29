import { Link } from "@tanstack/react-router";
import telemedicina from "@/assets/tab-telemedicina.jpg";
import farmacia from "@/assets/tab-farmacia.jpg";
import plataforma from "@/assets/tab-plataforma.jpg";
import familia from "@/assets/hero-familia.jpg";
import heroIdoso from "@/assets/hero-idoso.png.asset.json";
import heroPediatra from "@/assets/hero-pediatra.png.asset.json";

const cards = [
  {
    title: "Médicos",
    image: plataforma,
    text: "Simplificamos a rotina do médico e tornamos o médico muito mais próximo do paciente por meio da receita digital, promovendo uma prática médica que valoriza e encanta os pacientes.",
    link: "Saiba mais",
  },
  {
    title: "Pacientes",
    image: familia,
    text: "Aproximamos os pacientes dos médicos - desde o cuidado preventivo, até o tratamento integral. Do exame marcado, ao medicamento na hora certa.",
    link: "Saiba mais",
  },
  {
    title: "Farmácias",
    image: farmacia,
    text: "Aproximamos as farmácias da digitalização, garantindo segurança e tecnologia inovadora para aumentar o tráfego e vendas digitais ampliando o acesso à saúde para todos. Conectamos de maneira ética e legal as soluções da Memed.",
    link: "Quero ser parceiro Memed",
  },
  {
    title: "Empresas de Software",
    image: telemedicina,
    text: "Aproximamos o ecossistema da saúde gerando valor para as instituições, médicos e pacientes em todo Brasil. Extraímos inteligência dos dados e conectamos sistemas por meio de uma API completa.",
    link: "Quero integrar",
  },
  {
    title: "Indústria Farmacêutica",
    image: heroPediatra.url,
    text: "Aproximamos a Indústria Farmacêutica de médicos e pacientes de forma ética e segura através da tecnologia. Apoiamos na digitalização da jornada e na adesão ao tratamento.",
    link: "Saiba mais",
  },
  {
    title: "Seguradoras, Planos e Operadoras de saúde",
    image: heroIdoso.url,
    text: "Aproximamos hospitais, clínicas e laboratórios da tecnologia. Trabalhamos para digitalizar cada dia mais o ato da prescrição, tornando esse processo mais fácil, seguro e rastreável.",
    link: "Saiba mais",
  },
];

export function PartnershipsSection() {
  return (
    <section className="soft-surface py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <h2 className="text-center font-display text-3xl font-medium text-primary md:text-[2.6rem]">
          Parcerias que mudam vidas e transformam a saúde
        </h2>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <article
              key={card.title}
              className="flex flex-col overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-1"
            >
              <div className="relative h-40">
                <img
                  src={card.image}
                  alt={card.title}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
                <h3 className="absolute bottom-4 left-5 max-w-[70%] font-display text-xl font-semibold text-white">
                  {card.title}
                </h3>
              </div>
              <div className="flex flex-1 flex-col justify-between gap-6 p-6">
                <p className="text-sm leading-relaxed text-primary">{card.text}</p>
                <Link
                  to="/verificar"
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  {card.link}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
