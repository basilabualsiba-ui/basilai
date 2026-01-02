import { useState } from "react";
import { BentoCard } from "./bento-grid";
import { Clock, Moon, ChevronRight, Maximize2 } from "lucide-react";
import { usePrayerNotifications } from "@/contexts/PrayerContext";
import { useSchedule, ScheduleItem } from "@/contexts/ScheduleContext";
import { Button } from "@/components/ui/button";
import { ExpandedAgendaDialog } from "./expanded-agenda-dialog";
import { cn } from "@/lib/utils";

export function TodayAgendaCard() {
  const { getNextPrayerTime } = usePrayerNotifications();
  const { getTodaySchedule } = useSchedule();
  const [showExpanded, setShowExpanded] = useState(false);
  
  const nextPrayer = getNextPrayerTime();
  const todaySchedule = getTodaySchedule();
  
  // Get next 3 upcoming items
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5);
  const upcomingItems = todaySchedule
    .filter(item => !item.isCompleted && item.startTime && item.startTime > currentTime)
    .slice(0, 3);

  const getItemColor = (type: string, activityType?: string) => {
    if (type === 'prayer') return 'bg-accent/20 text-accent';
    if (type === 'meal') return 'bg-warning/20 text-warning';
    if (activityType === 'exercise') return 'bg-success/20 text-success';
    return 'bg-primary/20 text-primary';
  };

  return (
    <>
      <BentoCard className="lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Today's Agenda</h3>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => setShowExpanded(true)}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          {/* Next Prayer */}
          {nextPrayer && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent/20 flex items-center justify-center">
                  <Moon className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Next Prayer</p>
                  <p className="text-xs text-muted-foreground">
                    {nextPrayer.name} at {nextPrayer.time}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Upcoming Items */}
          {upcomingItems.map((item) => (
            <div 
              key={item.id}
              className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/30"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center",
                  getItemColor(item.type, item.activityType)
                )}>
                  {item.emoji || <Clock className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.startTime}{item.endTime && ` - ${item.endTime}`}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          ))}

          {upcomingItems.length === 0 && !nextPrayer && (
            <div className="text-center py-4 text-muted-foreground">
              <p className="text-sm">No upcoming events</p>
            </div>
          )}
        </div>
      </BentoCard>

      <ExpandedAgendaDialog 
        open={showExpanded} 
        onOpenChange={setShowExpanded} 
      />
    </>
  );
}
