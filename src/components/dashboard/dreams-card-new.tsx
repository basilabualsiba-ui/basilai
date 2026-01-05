import { useState } from "react";
import { BentoCard } from "./bento-grid";
import { Target, Sparkles, Plus, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDreams } from "@/contexts/DreamsContext";
import { GradientProgress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { AddDreamDialog } from "@/components/dreams/add-dream-dialog";
import { cn } from "@/lib/utils";

export function DreamsCardNew() {
  const navigate = useNavigate();
  const { dreams } = useDreams();
  const [showAddDream, setShowAddDream] = useState(false);

  const activeDreams = dreams.filter(d => d.status === 'in_progress');
  const completedDreams = dreams.filter(d => d.status === 'completed');

  const topDream = activeDreams
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
    })[0];

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAddDream(true);
  };

  return (
    <>
      <BentoCard onClick={() => navigate('/dreams')} className="group">
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-dreams/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Target className="h-5 w-5 text-dreams" />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-dreams hover:bg-dreams/10"
            onClick={handleAddClick}
          >
            <Plus className="h-4 w-4" />
          </Button>
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
                <Sparkles className="h-3 w-3 text-dreams animate-pulse-soft" />
                <span className="text-xs text-foreground truncate">{topDream.title}</span>
              </div>
              <GradientProgress value={topDream.progress_percentage || 0} size="sm" className="bg-dreams/20" />
              <span className="text-xs text-muted-foreground">
                {topDream.progress_percentage || 0}% complete
              </span>
            </div>
          )}

          {completedDreams.length > 0 && (
            <div className={cn(
              "flex items-center gap-2 text-xs text-dreams pt-2 border-t border-border/50"
            )}>
              <Trophy className="h-3 w-3" />
              <span>{completedDreams.length} dreams achieved</span>
            </div>
          )}
        </div>
      </BentoCard>

      <AddDreamDialog 
        open={showAddDream} 
        onOpenChange={setShowAddDream} 
      />
    </>
  );
}
