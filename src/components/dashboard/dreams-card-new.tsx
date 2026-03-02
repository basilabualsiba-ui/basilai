import { BentoCard } from "./bento-grid";
import { Target } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function DreamsCardNew() {
  const navigate = useNavigate();

  return (
    <BentoCard onClick={() => navigate('/dreams')} className="group">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg shadow-pink-500/25 group-hover:scale-110 transition-transform">
          <Target className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Dreams</h3>
          <p className="text-xs text-muted-foreground">Goals & aspirations</p>
        </div>
      </div>
    </BentoCard>
  );
}
