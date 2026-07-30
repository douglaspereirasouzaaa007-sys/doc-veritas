import { Link } from "@tanstack/react-router";

export function Logo({ variant = "primary" }: { variant?: "primary" | "light" }) {
  return (
    <Link to="/" className="flex items-center" aria-label="Memed - página inicial">
      <img
        src="/memed-logo.png"
        alt="Memed"
        className={`h-8 w-auto rounded-md ${variant === "light" ? "brightness-200" : ""}`}
      />
    </Link>
  );
}
