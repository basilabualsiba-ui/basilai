import { BentoCard } from "./bento-grid";
import { Dumbbell, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function GymCard() {
  const navigate = useNavigate();

  return (
    <BentoCard onClick={() => navigate('/gym')}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
          <Dumbbell className="h-5 w-5 text-accent" />
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>

      <h3 className="font-semibold text-foreground mb-1">Gym</h3>
      <p className="text-xs text-muted-foreground">Track workouts & progress</p>
    </BentoCard>
  );
}
