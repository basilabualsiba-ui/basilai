import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface DashboardCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  value?: string;
  trend?: string;
  className?: string;
  onClick?: () => void;
}

export const DashboardCard = ({ 
  title, 
  description, 
  icon: Icon, 
  value, 
  trend, 
  className,
  onClick 
}: DashboardCardProps) => {
  return (
    <Card 
      className={cn(
        "group relative overflow-hidden bg-gradient-secondary border-border/50 shadow-card transition-all duration-300 hover:shadow-primary hover:scale-[1.02] cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-gradient-accent opacity-0 group-hover:opacity-20 transition-all duration-500" />
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      
      <CardContent>
        <div className="text-2xl font-bold text-foreground mb-1">{value || "—"}</div>
        <p className="text-xs text-muted-foreground mb-2">{description}</p>
        {trend && (
          <div className="text-xs text-accent font-medium">{trend}</div>
        )}
      </CardContent>
    </Card>
  );
};