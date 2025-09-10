import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const Logo = ({ className, size = "md" }: LogoProps) => {
  const sizeClasses = {
    sm: "text-2xl",
    md: "text-4xl",
    lg: "text-6xl"
  };

  return (
    <div className={cn("font-bold text-primary", sizeClasses[size], className)}>
      <span className="relative inline-block">
        INK
        <span className="absolute -bottom-1 left-0 w-full h-1 bg-gradient-primary rounded-full opacity-80"></span>
      </span>
    </div>
  );
};