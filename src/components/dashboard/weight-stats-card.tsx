import { BentoCard } from "./bento-grid";
import { Scale, TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BodyStat {
  id: string;
  weight: number;
  height?: number;
  recorded_at: string;
  notes?: string;
}

export function WeightStatsCard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<BodyStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .from('user_body_stats')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setStats(data || []);
    } catch (error) {
      console.error('Error loading body stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentWeight = stats[0]?.weight || 0;
  const previousWeight = stats[1]?.weight || currentWeight;
  const weightChange = currentWeight - previousWeight;
  const weekAgoWeight = stats.find((s, i) => i >= 3)?.weight || currentWeight;
  const weeklyChange = currentWeight - weekAgoWeight;

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-warning" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-success" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const formatChange = (change: number) => {
    if (change === 0) return "No change";
    const prefix = change > 0 ? "+" : "";
    return `${prefix}${change.toFixed(1)} kg`;
  };

  return (
    <BentoCard onClick={() => navigate('/weight-stats')}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
            <Scale className="h-5 w-5 text-accent" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Current Weight</p>
            <p className="text-xl font-bold text-foreground">
              {isLoading ? "..." : currentWeight > 0 ? `${currentWeight} kg` : "No data"}
            </p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>

      {currentWeight > 0 && (
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/50">
          <div className="flex items-center gap-2">
            {getTrendIcon(weightChange)}
            <div>
              <p className="text-xs text-muted-foreground">Last Change</p>
              <p className="text-xs font-medium text-foreground">{formatChange(weightChange)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getTrendIcon(weeklyChange)}
            <div>
              <p className="text-xs text-muted-foreground">Weekly</p>
              <p className="text-xs font-medium text-foreground">{formatChange(weeklyChange)}</p>
            </div>
          </div>
        </div>
      )}
    </BentoCard>
  );
}
