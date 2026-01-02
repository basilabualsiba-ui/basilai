import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, Plus, Clock, Check } from "lucide-react";
import { useSchedule, ScheduleItem } from "@/contexts/ScheduleContext";
import { AddActivityDialog } from "@/components/schedule/add-activity-dialog";
import { format, addMonths, subMonths } from "date-fns";
import { cn } from "@/lib/utils";

interface ExpandedAgendaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExpandedAgendaDialog({ open, onOpenChange }: ExpandedAgendaDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const { getScheduleForDate, toggleActivityCompletion } = useSchedule();

  useEffect(() => {
    if (open && selectedDate) {
      loadScheduleForDate(selectedDate);
    }
  }, [open, selectedDate]);

  const loadScheduleForDate = async (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const items = await getScheduleForDate(dateStr);
    setScheduleItems(items);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleToggleComplete = async (item: ScheduleItem) => {
    if (item.type === 'activity') {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      await toggleActivityCompletion(item.id, dateStr, !item.isCompleted);
      await loadScheduleForDate(selectedDate);
    }
  };

  const getItemColor = (type: string, activityType?: string) => {
    if (type === 'prayer') return 'bg-accent/20 text-accent';
    if (type === 'meal') return 'bg-warning/20 text-warning';
    if (activityType === 'exercise') return 'bg-success/20 text-success';
    return 'bg-primary/20 text-primary';
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Calendar & Schedule</span>
              <Button size="sm" onClick={() => setShowAddActivity(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Event
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Calendar */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-semibold">{format(currentMonth, 'MMMM yyyy')}</span>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                className="rounded-md border"
              />
            </div>

            {/* Schedule for Selected Date */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  {format(selectedDate, 'EEEE, MMMM d')}
                </h3>
                <span className="text-sm text-muted-foreground">
                  {scheduleItems.length} items
                </span>
              </div>

              <ScrollArea className="h-[350px] pr-4">
                {scheduleItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Clock className="h-12 w-12 mb-2 opacity-50" />
                    <p className="text-sm">No events scheduled</p>
                    <Button 
                      variant="link" 
                      size="sm"
                      onClick={() => setShowAddActivity(true)}
                    >
                      Add an event
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {scheduleItems.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "p-3 rounded-lg border transition-all",
                          item.isCompleted 
                            ? "bg-secondary/30 border-border/30" 
                            : "bg-card border-border hover:border-primary/30"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                              getItemColor(item.type, item.activityType)
                            )}>
                              {item.emoji || <Clock className="h-4 w-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "font-medium text-sm",
                                item.isCompleted && "line-through text-muted-foreground"
                              )}>
                                {item.title}
                              </p>
                              {item.startTime && (
                                <p className="text-xs text-muted-foreground">
                                  {item.startTime}
                                  {item.endTime && ` - ${item.endTime}`}
                                </p>
                              )}
                              {item.description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                  {item.description}
                                </p>
                              )}
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
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AddActivityDialog
        open={showAddActivity}
        onOpenChange={setShowAddActivity}
        onActivityAdded={() => {
          setShowAddActivity(false);
          loadScheduleForDate(selectedDate);
        }}
      />
    </>
  );
}
