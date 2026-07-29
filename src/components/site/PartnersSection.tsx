const partners = [
  "Nexa+",
  "QUARK CLINIC",
  "smartclinic",
  "eleve",
  "TopMed",
  "Unimed Bauru",
  "amil",
  "Unimed Vale do Sinos/RS",
  "Mk SAÚDE",
];

export function PartnersSection() {
  return (
    <section className="overflow-hidden bg-background py-16">
      <div className="mx-auto max-w-7xl px-4 text-center lg:px-8">
        <h2 className="font-display text-3xl font-medium text-primary md:text-4xl">
          Nossos parceiros
        </h2>
        <p className="mt-3 text-base text-primary">
          <strong>Os melhores</strong> prontuários eletrônicos, hospitais e operadoras de saúde.
        </p>
      </div>

      <div className="relative mt-10">
        <div className="flex w-max animate-[marquee_38s_linear_infinite] items-center gap-16 px-8">
          {[...partners, ...partners].map((name, i) => (
            <span
              key={`${name}-${i}`}
              className="whitespace-nowrap font-display text-2xl font-bold text-muted-foreground/70"
            >
              {name}
            </span>
          ))}
        </div>
      </div>

      <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </section>
  );
}
