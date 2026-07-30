import { Link } from "@tanstack/react-router";
import logoAsset from "@/assets/memed-logo.png.asset.json";

export function Logo({ variant = "primary" }: { variant?: "primary" | "light" }) {
  return (
    <Link to="/" className="flex items-center" aria-label="Memed - página inicial">
      <img
        src={logoAsset.url}
        alt="Memed"
        className={`h-7 w-auto ${variant === "light" ? "brightness-0 invert" : ""}`}
      />
    </Link>
  );
}
