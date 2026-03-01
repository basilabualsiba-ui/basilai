import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, Plus, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSchedule, ScheduleItem } from '@/contexts/ScheduleContext';
import { useGym } from '@/contexts/GymContext';
import { AddActivityDialog } from './add-activity-dialog';

export const DailySchedulePanel = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { getScheduleForDate, toggleActivityCompletion } = useSchedule();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedDate = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const { getWorkoutForDate } = useGym();
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);

  const [dayActivities, setDayActivities] = useState<ScheduleItem[]>([]);
  
  useEffect(() => {
    const loadActivities = async () => {
      const activities = await getScheduleForDate(selectedDate);
      setDayActivities(activities);
    };
    loadActivities();
  }, [getScheduleForDate, selectedDate]);

  useEffect(() => {
    loadTodaySchedule();
  }, [selectedDate, dayActivities.length]);

  const loadTodaySchedule = useCallback(async () => {
    const allItems: ScheduleItem[] = [...dayActivities];
    allItems.sort((a, b) => {
      const timeA = a.time || a.startTime || '23:59';
      const timeB = b.time || b.startTime || '23:59';
      return timeA.localeCompare(timeB);
    });
    setScheduleItems(allItems);
  }, [selectedDate, dayActivities]);

  const handleToggleComplete = useCallback(async (item: ScheduleItem) => {
    if (item.type === 'activity' && !item.id.startsWith('workout-') && !item.id.startsWith('recurring-')) {
      setScheduleItems(prev => prev.map(si => 
        si.id === item.id ? { ...si, isCompleted: !si.isCompleted } : si
      ));
      try {
        await toggleActivityCompletion(item.id, selectedDate, !item.isCompleted);
        const updatedActivities = await getScheduleForDate(selectedDate);
        setDayActivities(updatedActivities);
      } catch (error) {
        setScheduleItems(prev => prev.map(si => 
          si.id === item.id ? { ...si, isCompleted: item.isCompleted } : si
        ));
      }
    }
  }, [toggleActivityCompletion, selectedDate, getScheduleForDate]);

  const handleExerciseClick = (item: ScheduleItem) => {
    if (item.activityType === 'exercise') {
      navigate('/gym?action=start');
    }
  };

  const getActivityIcon = (activityType?: string) => {
    switch (activityType) {
      case 'exercise': return '💪';
      case 'work': return '💼';
      case 'personal': return '👤';
      case 'appointment': return '📅';
      default: return '📋';
    }
  };

  const today = new Date(selectedDate);
  const formattedDate = today.toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  return (
    <Card 
      className="w-full max-w-sm h-[400px] mx-auto cursor-pointer hover:bg-card/80 transition-colors flex flex-col"
      onClick={() => navigate('/schedule')}
    >
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Today's Schedule
          </CardTitle>
          <Button 
            variant="ghost" size="sm"
            onClick={(e) => { e.stopPropagation(); setIsAddDialogOpen(true); }}
            className="h-7 w-7 sm:h-8 sm:w-8 p-0"
          >
            <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground truncate">{formattedDate}</p>
      </CardHeader>
      
      <CardContent className="pt-0 flex-1 overflow-hidden flex flex-col">
        {scheduleItems.length === 0 ? (
          <div className="text-center py-4 sm:py-6 text-muted-foreground flex-1 flex flex-col items-center justify-center">
            <Calendar className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs sm:text-sm px-2">No activities scheduled for today</p>
            <Button variant="ghost" size="sm" className="mt-2 text-xs"
              onClick={(e) => { e.stopPropagation(); setIsAddDialogOpen(true); }}>
              Add an activity
            </Button>
          </div>
        ) : (
          <div className="relative flex-1 overflow-y-auto">
            <div className="absolute left-4 sm:left-6 top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary/30 via-primary/50 to-primary/30"></div>
            <div className="space-y-3 sm:space-y-4 pb-2">
              {scheduleItems.map((item) => (
                <div key={item.id} className="relative flex items-start gap-3 sm:gap-4">
                  <div className={`relative z-10 flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full border-2 flex-shrink-0 ${
                    item.isCompleted 
                      ? 'bg-muted/50 border-muted-foreground/30' 
                      : item.activityType === 'exercise'
                      ? 'bg-primary/10 border-primary/30'
                      : 'bg-secondary border-border'
                  }`}>
                    {item.isCompleted ? (
                      <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
                    ) : (
                      <span className="text-[10px] sm:text-xs">{getActivityIcon(item.activityType)}</span>
                    )}
                  </div>
                  
                  <Card 
                    className={`flex-1 min-w-0 ${item.activityType === 'exercise' ? 'cursor-pointer' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (item.activityType === 'exercise') handleExerciseClick(item);
                    }}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className={`text-sm ${item.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {item.title}
                        </CardTitle>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            {item.time || item.startTime}
                          </Badge>
                          {item.type === 'activity' && !item.id.startsWith('workout-') && !item.id.startsWith('recurring-') && (
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                              onClick={(e) => { e.stopPropagation(); handleToggleComplete(item); }}>
                              {item.isCompleted ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <AddActivityDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} onActivityAdded={loadTodaySchedule} />
    </Card>
  );
};
