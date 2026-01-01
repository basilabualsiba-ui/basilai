import { BentoCard } from "./bento-grid";
import { Target, ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDreams } from "@/contexts/DreamsContext";
import { Progress } from "@/components/ui/progress";

export function DreamsCardNew() {
  const navigate = useNavigate();
  const { dreams } = useDreams();

  const activeDreams = dreams.filter(d => d.status === 'in_progress');
  const completedDreams = dreams.filter(d => d.status === 'completed');
  
  // Average progress of active dreams
  const avgProgress = activeDreams.length > 0
    ? Math.round(activeDreams.reduce((sum, d) => sum + (d.progress_percentage || 0), 0) / activeDreams.length)
    : 0;

  // Top priority dream
  const topDream = activeDreams
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
    })[0];

  return (
    <BentoCard variant="accent" onClick={() => navigate('/dreams')}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
          <Target className="h-5 w-5 text-accent" />
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>

      <h3 className="font-semibold text-foreground mb-1">Dreams</h3>
      
      <div className="space-y-3 mt-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Active</span>
          <span className="text-sm font-bold text-foreground">{activeDreams.length} goals</span>
        </div>

        {topDream && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3 w-3 text-primary" />
              <span className="text-xs text-foreground truncate">{topDream.title}</span>
            </div>
            <Progress value={topDream.progress_percentage || 0} className="h-1.5" />
            <span className="text-xs text-muted-foreground">
              {topDream.progress_percentage || 0}% complete
            </span>
          </div>
        )}

        {completedDreams.length > 0 && (
          <p className="text-xs text-success pt-2 border-t border-border/50">
            {completedDreams.length} dreams achieved
          </p>
        )}
      </div>
    </BentoCard>
  );
}
