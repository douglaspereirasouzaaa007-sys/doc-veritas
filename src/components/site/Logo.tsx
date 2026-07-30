import { Link } from "@tanstack/react-router";

/**
 * Logo da Memed.
 * - variant="light" (padrão, header roxo / fundo escuro): logo branca diretamente.
 * - variant="primary" (fundo claro/branco): logo branca sobre retângulo roxo.
 */
export function Logo({ variant = "light" }: { variant?: "primary" | "light" }) {
  return (
    <Link to="/" className="flex items-center" aria-label="Memed - página inicial">
      {variant === "primary" ? (
        <div className="flex items-center justify-center rounded-xl bg-primary px-4 py-2">
          <img src="/memed-logo-white.png" alt="Memed" className="h-7 w-auto" />
        </div>
      ) : (
        <img src="/memed-logo-white.png" alt="Memed" className="h-7 w-auto" />
      )}
    </Link>
  );
}
