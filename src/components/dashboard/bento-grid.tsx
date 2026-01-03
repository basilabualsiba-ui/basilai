import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SkeletonCard } from "@/components/ui/skeleton";

interface BentoCardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "primary" | "accent";
  onClick?: () => void;
  loading?: boolean;
  glowOnHover?: boolean;
}

export function BentoCard({ 
  children, 
  className, 
  variant = "default", 
  onClick,
  loading = false,
  glowOnHover = true,
}: BentoCardProps) {
  const variants = {
    default: "bg-card border-border hover:border-primary/30",
    primary: "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 hover:border-primary/40",
    accent: "bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20 hover:border-accent/40",
  };

  if (loading) {
    return <SkeletonCard className={className} />;
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative rounded-2xl border p-4 sm:p-5 transition-all duration-300",
        "backdrop-blur-sm animate-fade-in",
        onClick && "cursor-pointer hover:scale-[1.02] active:scale-[0.98]",
        glowOnHover && "card-glow shine-effect",
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
      "grid gap-4 stagger-children",
      "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
      className
    )}>
      {children}
    </div>
  );
}
