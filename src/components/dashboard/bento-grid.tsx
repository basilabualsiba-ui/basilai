import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BentoCardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "primary" | "accent";
  onClick?: () => void;
}

export function BentoCard({ children, className, variant = "default", onClick }: BentoCardProps) {
  const variants = {
    default: "bg-card border-border hover:border-primary/30",
    primary: "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 hover:border-primary/40",
    accent: "bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20 hover:border-accent/40",
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-2xl border p-4 sm:p-5 transition-all duration-300",
        "backdrop-blur-sm",
        onClick && "cursor-pointer hover:scale-[1.02] active:scale-[0.98]",
        variants[variant],
        className
      )}
    >
      {children}
    </div>
  );
}

interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div className={cn(
      "grid gap-4",
      "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
      className
    )}>
      {children}
    </div>
  );
}
