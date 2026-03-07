import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const Logo = ({ className, size = "md" }: LogoProps) => {
  const sizeClasses = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-2xl"
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6"
  };

  const containerSizes = {
    sm: "p-1.5",
    md: "p-2",
    lg: "p-2.5"
  };

  return (
    <div className={cn("flex items-center font-bold", sizeClasses[size], className)}>
      <span
        className="whitespace-nowrap font-extrabold tracking-wide"
        style={{
          background: "linear-gradient(to right, #10b981, #ef4444, #ec4899, #8b5cf6, #06b6d4, #eab308, #3b82f6, #f97316, #10b981)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        Basilix
      </span>
    </div>
  );
};
