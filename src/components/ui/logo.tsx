import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const Logo = ({ className, size = "md" }: LogoProps) => {
  const fontSizes = {
    sm: "1.25rem",
    md: "1.6rem",
    lg: "2.2rem",
  };

  const letterSpacings = {
    sm: "0.08em",
    md: "0.12em",
    lg: "0.15em",
  };

  return (
    <div className={cn("flex items-center", className)}>
      <div className="relative">
        {/* Glow layer behind text */}
        <span
          aria-hidden="true"
          className="absolute inset-0 font-black select-none blur-[10px] opacity-60"
          style={{
            fontSize: fontSizes[size],
            letterSpacing: letterSpacings[size],
            background: "linear-gradient(to right, #10b981, #ef4444, #ec4899, #8b5cf6, #06b6d4, #eab308, #3b82f6, #f97316)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          BASILIX
        </span>

        {/* Main text */}
        <span
          className="relative font-black whitespace-nowrap"
          style={{
            fontSize: fontSizes[size],
            letterSpacing: letterSpacings[size],
            background: "linear-gradient(to right, #10b981, #ef4444, #ec4899, #8b5cf6, #06b6d4, #eab308, #3b82f6, #f97316)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          BASILIX
        </span>
      </div>
    </div>
  );
};
