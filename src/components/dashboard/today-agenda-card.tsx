import { BentoCard } from "./bento-grid";
import { Clock, Moon } from "lucide-react";
import { usePrayerNotifications } from "@/contexts/PrayerContext";

export function TodayAgendaCard() {
  const { prayerTimes, getNextPrayerTime } = usePrayerNotifications();
  const nextPrayer = getNextPrayerTime();

  return (
    <BentoCard className="lg:col-span-2">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Today's Agenda</h3>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Moon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Next Prayer</p>
              <p className="text-xs text-muted-foreground">
                {nextPrayer ? `${nextPrayer.name} at ${nextPrayer.time}` : 'No prayer times loaded'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </BentoCard>
  );
}
