import { BentoCard } from "./bento-grid";
import { Dumbbell, ArrowRight, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function GymCard() {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate('/gym');
  };

  const handleStartWorkout = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Navigate to gym page with workout start intent
    navigate('/gym?action=start');
  };

  return (
    <BentoCard onClick={handleCardClick}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
          <Dumbbell className="h-5 w-5 text-accent" />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-accent"
            onClick={handleStartWorkout}
          >
            <Play className="h-4 w-4" />
          </Button>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      <h3 className="font-semibold text-foreground mb-1">Gym</h3>
      <p className="text-xs text-muted-foreground">Track workouts & progress</p>
    </BentoCard>
  );
}
