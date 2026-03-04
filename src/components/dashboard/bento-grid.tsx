import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface BentoCardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "primary" | "accent";
  onClick?: () => void;
  loading?: boolean;
  glowOnHover?: boolean;
  loadingIcon?: LucideIcon;
  loadingGradient?: string;
  loadingLabel?: string;
}

export function BentoCard({ 
  children, 
  className, 
  variant = "default", 
  onClick,
  loading = false,
  glowOnHover = true,
  loadingIcon: LoadingIcon,
  loadingGradient,
  loadingLabel,
}: BentoCardProps) {
  const variants = {
    default: "bg-card border-border hover:border-primary/30",
    primary: "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 hover:border-primary/40",
    accent: "bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20 hover:border-accent/40",
  };

  if (loading && LoadingIcon) {
    return (
      <div
        className={cn(
          "relative rounded-2xl border p-4 sm:p-5 transition-all duration-300",
          "backdrop-blur-sm animate-fade-in",
          variants[variant],
          className
        )}
      >
        <div className="flex items-center gap-3 animate-pulse">
          <div className={cn("p-2.5 rounded-2xl shadow-lg", loadingGradient || "bg-gradient-to-br from-primary to-primary/80")}>
            <LoadingIcon className="h-5 w-5 text-white" />
          </div>
          <div className="space-y-2 flex-1">
            <div className="h-3 w-20 rounded-full bg-muted" />
            <div className="h-2.5 w-28 rounded-full bg-muted/60" />
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={cn("space-y-3 p-4 rounded-2xl border border-border bg-card animate-pulse", className)}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted" />
          <div className="space-y-2 flex-1">
            <div className="h-4 w-1/2 rounded bg-muted" />
            <div className="h-3 w-1/3 rounded bg-muted" />
          </div>
        </div>
      </div>
    );
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
