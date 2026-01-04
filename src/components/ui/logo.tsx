import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const Logo = ({ className, size = "md" }: LogoProps) => {
  const sizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-3xl"
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-7 w-7"
  };

  return (
    <div className={cn("flex items-center gap-2 font-bold", sizeClasses[size], className)}>
      <div className="relative">
        <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary via-primary to-accent shadow-lg shadow-primary/25 animate-pulse-glow">
          <Sparkles className={cn("text-primary-foreground", iconSizes[size])} />
        </div>
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary to-accent opacity-50 blur-md -z-10" />
      </div>
      <span className="relative">
        <span className="bg-gradient-to-r from-primary via-foreground to-primary bg-clip-text text-transparent bg-[length:200%_100%] animate-shimmer">
          BASIL's AI
        </span>
      </span>
    </div>
  );
};
