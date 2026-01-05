import { cn } from "@/lib/utils";

interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: "primary" | "success" | "destructive" | "warning" | "accent" | "gym" | "wallet" | "supplements" | "dreams" | "weight" | "agenda";
  showValue?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const colorMap: Record<string, string> = {
  primary: "stroke-primary",
  success: "stroke-success",
  destructive: "stroke-destructive",
  warning: "stroke-warning",
  accent: "stroke-accent",
  gym: "stroke-gym",
  wallet: "stroke-wallet",
  supplements: "stroke-supplements",
  dreams: "stroke-dreams",
  weight: "stroke-weight",
  agenda: "stroke-agenda",
};

const bgColorMap: Record<string, string> = {
  primary: "stroke-primary/20",
  success: "stroke-success/20",
  destructive: "stroke-destructive/20",
  warning: "stroke-warning/20",
  accent: "stroke-accent/20",
  gym: "stroke-gym/20",
  wallet: "stroke-wallet/20",
  supplements: "stroke-supplements/20",
  dreams: "stroke-dreams/20",
  weight: "stroke-weight/20",
  agenda: "stroke-agenda/20",
};

export function CircularProgress({
  value,
  max = 100,
  size = 48,
  strokeWidth = 4,
  color = "primary",
  showValue = false,
  className,
  children,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={bgColorMap[color]}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={cn(colorMap[color], "transition-all duration-500 ease-out")}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      {(showValue || children) && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children || (
            <span className="text-xs font-semibold text-foreground">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}
