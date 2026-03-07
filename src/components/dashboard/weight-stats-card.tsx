import { useState, useEffect } from "react";
import { BentoCard } from "./bento-grid";
import { PersonStanding } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedNumber } from "@/components/ui/animated-number";

interface BodyStat {
  id: string;
  weight: number;
  recorded_at: string;
}

export function WeightStatsCard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<BodyStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('user_body_stats')
          .select('id, weight, recorded_at')
          .order('recorded_at', { ascending: false })
          .limit(10);
        setStats(data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const currentWeight = stats[0]?.weight || 0;

  return (
    <BentoCard onClick={() => navigate('/weight-stats')} loading={isLoading} className="group" loadingIcon={PersonStanding} loadingGradient="bg-gradient-to-br from-blue-500 to-cyan-600 shadow-blue-500/25">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-weight/20 flex items-center justify-center group-hover:scale-110 transition-transform">
          <PersonStanding className="h-5 w-5 text-weight" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Weight</p>
          <p className="text-xl font-bold text-foreground">
            {currentWeight > 0 ? (
              <><AnimatedNumber value={currentWeight} formatValue={(v) => v.toFixed(1)} /> kg</>
            ) : "No data"}
          </p>
        </div>
      </div>

    </BentoCard>
  );
}
