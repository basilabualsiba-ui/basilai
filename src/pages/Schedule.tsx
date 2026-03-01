import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, Clock, Plus, Check, ArrowLeft, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSchedule, ScheduleItem } from '@/contexts/ScheduleContext';
import { useGym } from '@/contexts/GymContext';
import { AddActivityDialog } from '@/components/schedule/add-activity-dialog';

const Schedule = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const { getScheduleForDate, toggleActivityCompletion, updateActivity, deleteActivity, dailyActivities } = useSchedule();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedDate = searchParams.get('date') || (() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();
  const { getTodayWorkout, getWorkoutForDate } = useGym();
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [isLoadingMeals, setIsLoadingMeals] = useState(false);

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
    if (item.type === 'activity' && item.id !== 'workout-today' && !item.id.startsWith('recurring-')) {
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
      navigate('/gym', { state: { activeTab: 'workout', selectedDate } });
    }
  };

  const handleEditActivity = (item: ScheduleItem) => {
    const activity = dailyActivities.find(a => a.id === item.id);
    if (activity) {
      const editActivity = {
        id: activity.id,
        title: activity.title,
        description: activity.description,
        activityType: activity.activity_type,
        startTime: activity.start_time,
        endTime: activity.end_time,
        days_of_week: activity.days_of_week
      };
      setEditingActivity(editActivity);
      setIsAddDialogOpen(true);
    }
  };

  const handleDeleteActivity = useCallback(async (item: ScheduleItem) => {
    if (item.type === 'activity' && item.id !== 'workout-today' && !item.id.startsWith('recurring-')) {
      if (confirm('Are you sure you want to delete this activity?')) {
        setScheduleItems(prev => prev.filter(si => si.id !== item.id));
        try {
          await deleteActivity(item.id);
        } catch (error) {
          await loadTodaySchedule();
        }
      }
    }
  }, [deleteActivity, loadTodaySchedule]);

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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-3 py-4 sm:p-6">
        <div className="space-y-4 sm:space-y-6">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-2xl font-bold text-foreground truncate">
                {formattedDate}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                {scheduleItems.length} activit{scheduleItems.length !== 1 ? 'ies' : 'y'} scheduled
              </p>
            </div>
            <Button 
              onClick={() => setIsAddDialogOpen(true)}
              className="flex items-center gap-2 h-8 sm:h-10 px-2 sm:px-4"
              size="sm"
            >
              <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Add Activity</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>

          {scheduleItems.length === 0 ? (
            <Card className="p-6 sm:p-8 text-center">
              <Calendar className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">No activities scheduled</h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-4">
                No activities are scheduled for today
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)} className="flex items-center gap-2" size="sm">
                <Plus className="h-4 w-4" />
                <span>Add Activity</span>
              </Button>
            </Card>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {scheduleItems.map((item, index) => {
                const hasStartAndEndTime = item.startTime && item.endTime;
                const isLastItem = index === scheduleItems.length - 1;
                
                return (
                  <div key={item.id} className="relative flex items-center gap-3 sm:gap-4">
                    <div className="relative z-10 flex flex-col items-center flex-shrink-0">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background border-2 border-primary shadow-sm">
                        <div className="text-center">
                          <div className="text-sm font-semibold text-foreground">
                            {(item.time || item.startTime || '00:00').split(':')[0]}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {(item.time || item.startTime || '00:00').split(':')[1]}
                          </div>
                        </div>
                      </div>
                      
                      {hasStartAndEndTime ? (
                        <>
                          {Array.from({ length: 6 }).map((_, dotIndex) => (
                            <div key={dotIndex} className="w-2 h-2 rounded-full bg-primary/60 my-1" />
                          ))}
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background border-2 border-primary/60 shadow-sm">
                            <div className="text-center">
                              <div className="text-sm font-semibold text-foreground">
                                {item.endTime!.split(':')[0]}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {item.endTime!.split(':')[1]}
                              </div>
                            </div>
                          </div>
                          {!isLastItem && (
                            <div className="w-0.5 h-8 bg-gradient-to-b from-primary/30 to-primary/20 my-2" />
                          )}
                        </>
                      ) : (
                        !isLastItem && (
                          <div className="w-0.5 h-12 bg-gradient-to-b from-primary/50 to-primary/30 my-2" />
                        )
                      )}
                    </div>
                    
                    <Card 
                      className={`flex-1 min-w-0 hover:shadow-md transition-all duration-200 ${
                        item.activityType === 'exercise' ? 'cursor-pointer' : ''
                      } ${item.isCompleted ? 'bg-muted/30' : ''}`}
                      onClick={() => {
                        if (item.activityType === 'exercise') handleExerciseClick(item);
                      }}
                    >
                      <CardHeader className="pb-2 md:pb-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <CardTitle className={`text-base md:text-lg flex items-center gap-2 ${
                              item.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'
                            }`}>
                              <span>{getActivityIcon(item.activityType)}</span>
                              <span className="truncate">{item.title}</span>
                            </CardTitle>
                            {item.activityType && (
                              <Badge variant="outline" className="mt-1">{item.activityType}</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {item.type === 'activity' && !item.id.startsWith('workout-') && !item.id.startsWith('recurring-') && (
                              <>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0"
                                  onClick={(e) => { e.stopPropagation(); handleEditActivity(item); }}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteActivity(item); }}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm"
                                  className={`h-8 w-8 p-0 ${item.isCompleted ? 'text-destructive' : 'text-muted-foreground'}`}
                                  onClick={(e) => { e.stopPropagation(); handleToggleComplete(item); }}>
                                  <Check className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      {item.description && (
                        <CardContent className="pt-0">
                          <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                        </CardContent>
                      )}
                    </Card>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AddActivityDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onActivityAdded={loadTodaySchedule}
        editActivity={editingActivity}
      />
    </div>
  );
};

export default Schedule;
