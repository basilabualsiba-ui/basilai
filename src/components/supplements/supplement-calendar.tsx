import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Plus, Pill, Trash2 } from 'lucide-react';
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
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-semibold">{format(currentMonth, 'MMMM yyyy')}</h2>
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <Card className="p-3">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <div key={i} className="text-center text-xs text-muted-foreground font-medium py-1">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before month start */}
          {Array.from({ length: monthStart.getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          
          {daysInMonth.map(day => {
            const dayLogs = getDayLogs(day);
            const isSelected = isSameDay(day, selectedDate);
            const hasLogs = dayLogs.length > 0;
            
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "aspect-square rounded-lg flex flex-col items-center justify-center text-sm relative transition-colors",
                  isSelected && "bg-primary text-primary-foreground",
                  !isSelected && isToday(day) && "bg-accent",
                  !isSelected && !isToday(day) && "hover:bg-muted"
                )}
              >
                <span>{format(day, 'd')}</span>
                {hasLogs && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayLogs.slice(0, 3).map((_, i) => (
                      <div 
                        key={i} 
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          isSelected ? "bg-primary-foreground" : "bg-primary"
                        )} 
                      />
                    ))}
                    {dayLogs.length > 3 && (
                      <span className={cn(
                        "text-[8px]",
                        isSelected ? "text-primary-foreground" : "text-muted-foreground"
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
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{format(selectedDate, 'EEEE, MMMM d')}</h3>
          <Button size="sm" onClick={() => setShowLogDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Log
          </Button>
        </div>

        {logsForSelectedDate.length === 0 ? (
          <div className="text-center text-muted-foreground py-6">
            <Pill className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No supplements logged</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logsForSelectedDate.map(log => (
              <div 
                key={log.id} 
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <Pill className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{log.supplement?.name || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">
                      {log.doses_taken} {log.supplement?.dose_unit}(s)
                      {log.logged_time && ` • ${log.logged_time.slice(0, 5)}`}
                    </p>
                    {log.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{log.notes}</p>
                    )}
                  </div>
                </div>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="text-destructive hover:text-destructive"
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
