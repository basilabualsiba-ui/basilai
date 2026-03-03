import { useState, useEffect } from "react";
import { BentoCard } from "./bento-grid";
import { Pill } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function SupplementsCard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <BentoCard onClick={() => navigate('/supplements')} loading={loading} className="group">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-500/25 group-hover:scale-110 transition-transform">
          <Pill className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Supplements</h3>
          <p className="text-xs text-muted-foreground">Track daily intake</p>
        </div>
      </div>
    </BentoCard>
  );
}
