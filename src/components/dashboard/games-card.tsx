import { useEffect, useState } from "react";
import { BentoCard } from "./bento-grid";
import { Gamepad2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function GamesCard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 550);
    return () => clearTimeout(t);
  }, []);

  return (
    <BentoCard
      onClick={() => navigate("/games")}
      loading={loading}
      className="group"
      loadingIcon={Gamepad2}
      loadingGradient="bg-gradient-to-br from-primary to-accent shadow-primary/25"
      loadingLabel="Loading Games"
    >
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/25 group-hover:scale-110 transition-transform">
          <Gamepad2 className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Games</h3>
          <p className="text-xs text-muted-foreground">Track your played games</p>
        </div>
      </div>
    </BentoCard>
  );
}
