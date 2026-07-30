import { Link } from "@tanstack/react-router";

export function Logo({ variant = "primary" }: { variant?: "primary" | "light" }) {
  const textColor = variant === "light" ? "text-white" : "text-primary";
  const dotColor = variant === "light" ? "bg-white" : "bg-brand-orange";

  return (
    <Link to="/" className="flex items-center gap-2" aria-label="Memed - página inicial">
      {/* Ícone M estilizado */}
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect width="32" height="32" rx="8" fill={variant === "light" ? "white" : "#4F46E5"} />
        <path
          d="M7 22V10l4.5 7.5L16 10l4.5 7.5L25 10v12"
          stroke={variant === "light" ? "#4F46E5" : "white"}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="25" cy="22" r="2" fill="#F97316" />
      </svg>

      <span
        className={`font-display text-xl font-bold tracking-tight ${textColor}`}
        style={{ fontFamily: "system-ui, sans-serif" }}
      >
        Memed
      </span>

      {/* Ponto laranja decorativo — apenas desktop */}
      <span
        className={`hidden h-1.5 w-1.5 rounded-full lg:block ${dotColor}`}
        aria-hidden="true"
      />
    </Link>
  );
}
