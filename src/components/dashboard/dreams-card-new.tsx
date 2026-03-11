import { useState, useEffect } from "react";
import { BentoCard } from "./bento-grid";
import { Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDreams } from "@/contexts/DreamsContext";

export function DreamsCardNew() {
  const navigate = useNavigate();
  const { dreams } = useDreams();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  const activeCount = dreams.filter(d => d.status === "in_progress").length;
  const completedCount = dreams.filter(d => d.status === "completed").length;

  const subtitle =
    activeCount > 0
      ? `${activeCount} dream${activeCount !== 1 ? "s" : ""} in progress`
      : completedCount > 0
      ? `${completedCount} dream${completedCount !== 1 ? "s" : ""} completed`
      : "Set your dreams & goals";

  return (
    <BentoCard
      onClick={() => navigate("/dreams")}
      loading={loading}
      className="group"
      loadingIcon={Target}
      loadingGradient="bg-gradient-to-br from-pink-500 to-rose-500 shadow-pink-500/25"
    >
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg shadow-pink-500/25 group-hover:scale-110 transition-transform">
          <Target className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Dreams</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    </BentoCard>
  );
}
