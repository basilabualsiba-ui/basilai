import { useState, useEffect } from "react";
import { BentoCard } from "./bento-grid";
import { Tv } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function TVCard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <BentoCard onClick={() => navigate('/tv-tracker')} loading={loading} className="group" loadingIcon={Tv} loadingGradient="bg-gradient-to-br from-cyan-500 to-blue-600 shadow-cyan-500/25">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/25 group-hover:scale-110 transition-transform">
          <Tv className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">TV & Series</h3>
          <p className="text-xs text-muted-foreground">Movies & shows tracker</p>
        </div>
      </div>
    </BentoCard>
  );
}
