import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

interface SparklineProps {
  data: number[];
  className?: string;
  color?: "primary" | "success" | "destructive" | "warning" | "accent" | "gym" | "wallet" | "supplements" | "dreams" | "weight" | "agenda";
  showGradient?: boolean;
  height?: number;
}

const colorMap: Record<string, { stroke: string; fill: string }> = {
  primary: {
    stroke: "hsl(35, 100%, 55%)",
    fill: "hsl(35, 100%, 55%)",
  },
  success: {
    stroke: "hsl(142, 76%, 36%)",
    fill: "hsl(142, 76%, 36%)",
  },
  destructive: {
    stroke: "hsl(0, 75%, 55%)",
    fill: "hsl(0, 75%, 55%)",
  },
  warning: {
    stroke: "hsl(38, 92%, 50%)",
    fill: "hsl(38, 92%, 50%)",
  },
  accent: {
    stroke: "hsl(35, 85%, 60%)",
    fill: "hsl(35, 85%, 60%)",
  },
  gym: {
    stroke: "hsl(0, 72%, 51%)",
    fill: "hsl(0, 72%, 51%)",
  },
  wallet: {
    stroke: "hsl(142, 76%, 36%)",
    fill: "hsl(142, 76%, 36%)",
  },
  supplements: {
    stroke: "hsl(271, 81%, 56%)",
    fill: "hsl(271, 81%, 56%)",
  },
  dreams: {
    stroke: "hsl(330, 81%, 60%)",
    fill: "hsl(330, 81%, 60%)",
  },
  weight: {
    stroke: "hsl(217, 91%, 60%)",
    fill: "hsl(217, 91%, 60%)",
  },
  agenda: {
    stroke: "hsl(35, 100%, 55%)",
    fill: "hsl(35, 100%, 55%)",
  },
};

export function Sparkline({
  data,
  className,
  color = "primary",
  showGradient = true,
  height = 40,
}: SparklineProps) {
  const chartData = useMemo(
    () => data.map((value, index) => ({ value, index })),
    [data]
  );

  const colors = colorMap[color];
  const gradientId = `sparkline-gradient-${color}`;

  if (data.length < 2) {
    return null;
  }

  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.fill} stopOpacity={0.3} />
              <stop offset="100%" stopColor={colors.fill} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={colors.stroke}
            strokeWidth={2}
            fill={showGradient ? `url(#${gradientId})` : "transparent"}
            isAnimationActive={true}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
