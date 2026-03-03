import { useState, useEffect } from "react";
import { BentoCard } from "./bento-grid";
import { Moon } from "lucide-react";
import { usePrayerNotifications } from "@/contexts/PrayerContext";
import { useNavigate } from "react-router-dom";

export function TodayAgendaCard() {
  const navigate = useNavigate();
  const { getNextPrayerTime } = usePrayerNotifications();
  const nextPrayer = getNextPrayerTime();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <BentoCard onClick={() => navigate('/islamic')} loading={loading} className="group">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 shadow-lg shadow-amber-500/25 group-hover:scale-110 transition-transform">
          <Moon className="h-5 w-5 text-amber-100" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-amber-500 dark:text-amber-400">Prayer</h3>
          {nextPrayer ? (
            <p className="text-xs text-amber-600/70 dark:text-amber-400/70">
              {nextPrayer.name} at {nextPrayer.time}
            </p>
          ) : (
            <p className="text-xs text-amber-600/70 dark:text-amber-400/70">All prayers done</p>
          )}
        </div>
      </div>
    </BentoCard>
  );
}
