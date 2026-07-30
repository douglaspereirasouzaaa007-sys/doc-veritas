import { Link } from "@tanstack/react-router";

/**
 * Logo da Memed.
 * - variant="light" (header roxo / fundo escuro): logo branca, sem fundo extra.
 * - variant="primary" (fundo branco / claro): inverte as cores para mostrar
 *   o texto escuro sem fundo opaco.
 */
export function Logo({ variant = "light" }: { variant?: "primary" | "light" }) {
  return (
    <Link to="/" className="flex items-center" aria-label="Memed - página inicial">
      <img
        src="/memed-logo-white.png"
        alt="Memed"
        className="h-8 w-auto"
        style={variant === "primary" ? { filter: "invert(1)" } : undefined}
      />
    </Link>
  );
}
