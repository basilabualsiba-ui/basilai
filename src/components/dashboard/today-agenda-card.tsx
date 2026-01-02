import { useState } from "react";
import { BentoCard } from "./bento-grid";
import { Clock, Moon, ChevronRight, ChevronDown, ChevronUp, Plus, Check } from "lucide-react";
import { usePrayerNotifications } from "@/contexts/PrayerContext";
import { useSchedule, ScheduleItem } from "@/contexts/ScheduleContext";
import { Button } from "@/components/ui/button";
import { AddActivityDialog } from "@/components/schedule/add-activity-dialog";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

export function TodayAgendaCard() {
  const { getNextPrayerTime } = usePrayerNotifications();
  const { getTodaySchedule, toggleActivityCompletion } = useSchedule();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAddActivity, setShowAddActivity] = useState(false);
  
  const nextPrayer = getNextPrayerTime();
  const todaySchedule = getTodaySchedule();
  
  // Get current time
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5);
  
  // Get upcoming items (not completed and time > now)
  const upcomingItems = todaySchedule
    .filter(item => !item.isCompleted && item.startTime && item.startTime > currentTime)
    .slice(0, isExpanded ? 10 : 1);
  
  // All items for expanded view
  const allItems = todaySchedule;

  const getItemColor = (type: string, activityType?: string) => {
    if (type === 'prayer') return 'bg-accent/20 text-accent';
    if (type === 'meal') return 'bg-warning/20 text-warning';
    if (activityType === 'exercise') return 'bg-success/20 text-success';
    return 'bg-primary/20 text-primary';
  };

  const handleToggleComplete = async (item: ScheduleItem) => {
    if (item.type === 'activity') {
      const dateStr = new Date().toISOString().split('T')[0];
      await toggleActivityCompletion(item.id, dateStr, !item.isCompleted);
    }
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAddActivity(true);
  };

  // Get the next upcoming item for minimized view
  const nextUpcomingItem = upcomingItems[0];

  return (
    <>
      <BentoCard className="lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Today's Agenda</h3>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={handleAddClick}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {!isExpanded ? (
          // Minimized view - show only next item
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

            {/* Next Activity */}
            {nextUpcomingItem && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/30">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center",
                    getItemColor(nextUpcomingItem.type, nextUpcomingItem.activityType)
                  )}>
                    {nextUpcomingItem.emoji || <Clock className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{nextUpcomingItem.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {nextUpcomingItem.startTime}{nextUpcomingItem.endTime && ` - ${nextUpcomingItem.endTime}`}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            )}

            {!nextUpcomingItem && !nextPrayer && (
              <div className="text-center py-4 text-muted-foreground">
                <p className="text-sm">No upcoming events</p>
              </div>
            )}

            {/* Show count of remaining items */}
            {allItems.length > 1 && (
              <button 
                onClick={() => setIsExpanded(true)}
                className="w-full text-center text-xs text-muted-foreground hover:text-primary transition-colors py-2"
              >
                +{allItems.length - 1} more items today
              </button>
            )}
          </div>
        ) : (
          // Expanded view - show all items
          <ScrollArea className="h-[300px] pr-2">
            <div className="space-y-2">
              {/* Next Prayer at top */}
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

              {/* All schedule items */}
              {allItems.map((item) => (
                <div 
                  key={item.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border transition-all",
                    item.isCompleted 
                      ? "bg-secondary/20 border-border/20" 
                      : "bg-secondary/30 border-border/30"
                  )}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center",
                      getItemColor(item.type, item.activityType)
                    )}>
                      {item.emoji || <Clock className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium",
                        item.isCompleted ? "line-through text-muted-foreground" : "text-foreground"
                      )}>
                        {item.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.startTime}{item.endTime && ` - ${item.endTime}`}
                      </p>
                    </div>
                  </div>

                  {item.type === 'activity' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => handleToggleComplete(item)}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                        item.isCompleted 
                          ? "bg-success border-success" 
                          : "border-muted-foreground"
                      )}>
                        {item.isCompleted && (
                          <Check className="h-3 w-3 text-success-foreground" />
                        )}
                      </div>
                    </Button>
                  )}
                </div>
              ))}

              {allItems.length === 0 && !nextPrayer && (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No events scheduled</p>
                  <Button 
                    variant="link" 
                    size="sm"
                    onClick={handleAddClick}
                  >
                    Add an event
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </BentoCard>

      <AddActivityDialog
        open={showAddActivity}
        onOpenChange={setShowAddActivity}
        onActivityAdded={() => {
          setShowAddActivity(false);
        }}
      />
    </>
  );
}
