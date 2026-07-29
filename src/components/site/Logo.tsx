import { Link } from "@tanstack/react-router";

export function Logo({ variant = "primary" }: { variant?: "primary" | "light" }) {
  const color = variant === "light" ? "text-primary-foreground" : "text-primary";
  return (
    <Link to="/" className={`flex items-center gap-1 ${color}`} aria-label="Memed - página inicial">
      <svg viewBox="0 0 40 28" className="h-6 w-8" fill="none" aria-hidden="true">
        <path
          d="M2 26V11.5C2 6.25 5.8 2 10.9 2c3.6 0 6.6 2.1 8.1 5.2C20.5 4.1 23.5 2 27.1 2 32.2 2 36 6.25 36 11.5V26"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
      <span className="font-display text-2xl font-semibold tracking-tight">emed</span>
    </Link>
  );
}
