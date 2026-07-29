import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { HeroCarousel } from "@/components/site/HeroCarousel";
import { WhereSection } from "@/components/site/WhereSection";
import { PartnershipsSection } from "@/components/site/PartnershipsSection";
import { StatsSection } from "@/components/site/StatsSection";
import { PartnersSection } from "@/components/site/PartnersSection";
import { VerifyBanner } from "@/components/site/VerifyBanner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Memed | Verificação de receitas, atestados e laudos digitais" },
      {
        name: "description",
        content:
          "Plataforma que conecta médicos, pacientes e farmácias: emissão, QR Code e verificação online de receitas, atestados e laudos com validade e rastreabilidade.",
      },
      { property: "og:title", content: "Memed | Saúde é o que nos aproxima" },
      {
        property: "og:description",
        content:
          "Emita e verifique receitas, atestados e laudos digitais com QR Code, páginas profissionais e API completa para integração.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <HeroCarousel />
        <VerifyBanner />
        <WhereSection />
        <PartnershipsSection />
        <StatsSection />
        <PartnersSection />
      </main>
      <SiteFooter />
    </div>
  );
}
