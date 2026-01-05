import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, Pill, Trash2, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { useSupplement } from '@/contexts/SupplementContext';
import { LogSupplementDialog } from './log-supplement-dialog';
import { cn } from '@/lib/utils';

export function SupplementCalendar() {
  const { supplementLogs, supplements, deleteLog } = useSupplement();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showLogDialog, setShowLogDialog] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const logsForSelectedDate = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return supplementLogs
      .filter(log => log.logged_date === dateStr)
      .map(log => ({
        ...log,
        supplement: supplements.find(s => s.id === log.supplement_id)
      }));
  }, [selectedDate, supplementLogs, supplements]);

  const getDayLogs = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return supplementLogs.filter(log => log.logged_date === dateStr);
  };

  const handleDeleteLog = async (logId: string) => {
    if (confirm('Delete this log?')) {
      await deleteLog(logId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="rounded-xl hover:bg-purple-500/10 hover:text-purple-600 h-9 w-9"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-bold">{format(currentMonth, 'MMMM yyyy')}</h2>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="rounded-xl hover:bg-purple-500/10 hover:text-purple-600 h-9 w-9"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <Card className="p-3 border border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <div key={i} className="text-center text-xs text-muted-foreground font-semibold py-2">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: monthStart.getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          
          {daysInMonth.map(day => {
            const dayLogs = getDayLogs(day);
            const isSelected = isSameDay(day, selectedDate);
            const hasLogs = dayLogs.length > 0;
            const isTodayDate = isToday(day);
            
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "aspect-square rounded-xl flex flex-col items-center justify-center text-sm relative transition-all duration-200",
                  isSelected && "bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/30",
                  !isSelected && isTodayDate && "bg-purple-500/15 text-purple-600 font-semibold",
                  !isSelected && !isTodayDate && "hover:bg-purple-500/10"
                )}
              >
                <span className="font-medium">{format(day, 'd')}</span>
                {hasLogs && (
                  <div className="flex gap-0.5 mt-0.5 absolute bottom-1">
                    {dayLogs.slice(0, 3).map((_, i) => (
                      <div 
                        key={i} 
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          isSelected ? "bg-white/80" : "bg-purple-500"
                        )} 
                      />
                    ))}
                    {dayLogs.length > 3 && (
                      <span className={cn(
                        "text-[8px] font-bold",
                        isSelected ? "text-white/80" : "text-purple-500"
                      )}>+{dayLogs.length - 3}</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Selected Date Details */}
      <Card className="p-4 border border-border/40 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/15">
              <CalendarIcon className="h-4 w-4 text-purple-600" />
            </div>
            <h3 className="font-semibold">{format(selectedDate, 'EEEE, MMMM d')}</h3>
          </div>
          <Button 
            size="sm" 
            onClick={() => setShowLogDialog(true)}
            className="rounded-xl bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 shadow-lg shadow-purple-500/30 h-8"
          >
            <Plus className="h-4 w-4 mr-1" />
            Log
          </Button>
        </div>

        {logsForSelectedDate.length === 0 ? (
          <div className="text-center py-8">
            <div className="p-4 rounded-2xl bg-purple-500/10 inline-block mb-3">
              <Pill className="h-8 w-8 text-purple-500/50" />
            </div>
            <p className="text-sm text-muted-foreground">No supplements logged</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logsForSelectedDate.map(log => (
              <div 
                key={log.id} 
                className="group flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-violet-500/5 border border-purple-500/20 hover:border-purple-500/40 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-purple-500/15">
                    <CheckCircle2 className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{log.supplement?.name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.doses_taken} {log.supplement?.dose_unit}(s)
                      {log.logged_time && ` • ${log.logged_time.slice(0, 5)}`}
                    </p>
                    {log.notes && (
                      <p className="text-xs text-muted-foreground/70 mt-0.5">{log.notes}</p>
                    )}
                  </div>
                </div>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all h-8 w-8"
                  onClick={() => handleDeleteLog(log.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <LogSupplementDialog 
        open={showLogDialog} 
        onOpenChange={setShowLogDialog}
        selectedDate={format(selectedDate, 'yyyy-MM-dd')}
      />
    </div>
  );
}
