import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

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
    <div className={cn("flex items-center gap-2 font-bold", sizeClasses[size], className)}>
      <div className="relative group">
        <div className={cn(
          "rounded-xl bg-gradient-to-br from-primary via-primary to-accent shadow-lg shadow-primary/25",
          containerSizes[size]
        )}>
          <Sparkles className={cn("text-primary-foreground", iconSizes[size])} />
        </div>
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-accent opacity-50 blur-md -z-10 group-hover:opacity-70 transition-opacity" />
      </div>
      <span className="whitespace-nowrap bg-gradient-to-r from-primary via-foreground to-primary bg-clip-text text-transparent">
        BASIL's AI
      </span>
    </div>
  );
};
