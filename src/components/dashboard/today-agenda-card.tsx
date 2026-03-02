import { BentoCard } from "./bento-grid";
import { Moon } from "lucide-react";
import { usePrayerNotifications } from "@/contexts/PrayerContext";
import { useNavigate } from "react-router-dom";

export function TodayAgendaCard() {
  const navigate = useNavigate();
  const { getNextPrayerTime } = usePrayerNotifications();
  const nextPrayer = getNextPrayerTime();

  return (
    <BentoCard onClick={() => navigate('/islamic')} className="group">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 shadow-lg shadow-amber-500/25 group-hover:scale-110 transition-transform">
          <Moon className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Prayer</h3>
          {nextPrayer ? (
            <p className="text-xs text-muted-foreground">
              {nextPrayer.name} at {nextPrayer.time}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">All prayers done</p>
          )}
        </div>
      </div>
    </BentoCard>
  );
}
