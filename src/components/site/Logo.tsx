import { Link } from "@tanstack/react-router";

/**
 * Logo da Memed.
 * - variant="light" (padrão no header roxo): logo branca sem fundo extra.
 * - variant="primary": logo branca com fundo roxo — para fundo claro (cards brancos, etc.).
 */
export function Logo({ variant = "light" }: { variant?: "primary" | "light" }) {
  return (
    <Link to="/" className="flex items-center" aria-label="Memed - página inicial">
      {variant === "primary" ? (
        <span className="inline-flex items-center rounded-lg bg-primary px-3 py-1.5">
          <img src="/memed-logo-white.png" alt="Memed" className="h-7 w-auto" />
        </span>
      ) : (
        <img src="/memed-logo-white.png" alt="Memed" className="h-7 w-auto" />
      )}
    </Link>
  );
}
