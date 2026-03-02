import { BentoCard } from "./bento-grid";
import { Dumbbell } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function GymCard() {
  const navigate = useNavigate();

  return (
    <BentoCard onClick={() => navigate('/gym')} className="group">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/25 group-hover:scale-110 transition-transform">
          <Dumbbell className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Gym</h3>
          <p className="text-xs text-muted-foreground">Track workouts & progress</p>
        </div>
      </div>
    </BentoCard>
  );
}
