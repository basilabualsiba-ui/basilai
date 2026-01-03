import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  indicatorClassName?: string;
  showGlow?: boolean;
  animated?: boolean;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, indicatorClassName, showGlow = false, animated = true, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn(
        "h-full w-full flex-1 bg-primary transition-all duration-500 ease-out",
        showGlow && "shadow-[0_0_10px_hsl(var(--primary)/0.5)]",
        animated && "progress-animated",
        indicatorClassName
      )}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

// Gradient Progress variant
interface GradientProgressProps {
  value: number;
  max?: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const GradientProgress = React.forwardRef<HTMLDivElement, GradientProgressProps>(
  ({ value, max = 100, className, size = "md" }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    
    const sizes = {
      sm: "h-1",
      md: "h-2",
      lg: "h-3",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "w-full overflow-hidden rounded-full bg-secondary/50",
          sizes[size],
          className
        )}
      >
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r from-primary via-accent to-primary",
            "transition-all duration-700 ease-out",
            "shadow-[0_0_10px_hsl(var(--primary)/0.4)]"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  }
);
GradientProgress.displayName = "GradientProgress";

export { Progress, GradientProgress }
