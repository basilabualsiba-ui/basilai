import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, Clock, Utensils, Plus, Check, ArrowLeft, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSchedule, ScheduleItem } from '@/contexts/ScheduleContext';
import { useFood, Meal } from '@/contexts/FoodContext';
import { useGym } from '@/contexts/GymContext';
import { AddActivityDialog } from '@/components/schedule/add-activity-dialog';
import { MealFoodsDialog } from '@/components/food/meal-foods-dialog';

const Schedule = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [isMealDialogOpen, setIsMealDialogOpen] = useState(false);
  const [mealConsumptions, setMealConsumptions] = useState<any[]>([]);
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
  const { mealPlans, getMealPlanMeals, meals, getMealConsumptions, markMealAsConsumed, unmarkMealAsConsumed, isMealConsumed, refreshData, removeMealFromPlan } = useFood();
  const { getTodayWorkout, getWorkoutForDate } = useGym();
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [isLoadingMeals, setIsLoadingMeals] = useState(false);

  // Memoize today's meal plans to prevent unnecessary recalculations
  const todayMealPlans = useMemo(() => 
    mealPlans.filter(plan => {
      const startDate = new Date(plan.start_date);
      const endDate = plan.end_date ? new Date(plan.end_date) : startDate;
      const currentDate = new Date(selectedDate);
      return currentDate >= startDate && currentDate <= endDate;
    }),
    [mealPlans, selectedDate]
  );

  // Memoize activities for the selected date
  const [dayActivities, setDayActivities] = useState<ScheduleItem[]>([]);
  
  useEffect(() => {
    const loadActivities = async () => {
      const activities = await getScheduleForDate(selectedDate);
      setDayActivities(activities);
    };
    loadActivities();
  }, [getScheduleForDate, selectedDate]);

  // Initial data load
  useEffect(() => {
    refreshData();
  }, []);

  // Optimized schedule loading with reduced dependencies
  useEffect(() => {
    loadTodaySchedule();
  }, [selectedDate, todayMealPlans.length, dayActivities.length]);

  const loadTodaySchedule = useCallback(async () => {
    if (isLoadingMeals) return; // Prevent concurrent loading
    
    console.log('Loading schedule for date:', selectedDate);
    // Use dayActivities which already contains gym and food items from ScheduleContext
    const allItems: ScheduleItem[] = [...dayActivities];

    // Sort by time
    allItems.sort((a, b) => {
      const timeA = a.time || a.startTime || '23:59';
      const timeB = b.time || b.startTime || '23:59';
      return timeA.localeCompare(timeB);
    });

    setScheduleItems(allItems);
  }, [selectedDate, dayActivities]);

  const handleToggleComplete = useCallback(async (item: ScheduleItem) => {
    if (item.type === 'activity' && item.id !== 'workout-today' && !item.id.startsWith('recurring-')) {
      // Optimistic update - update UI immediately
      setScheduleItems(prev => prev.map(si => 
        si.id === item.id ? { ...si, isCompleted: !si.isCompleted } : si
      ));
      
      try {
        // Use the new date-specific completion tracking
        await toggleActivityCompletion(item.id, selectedDate, !item.isCompleted);
        // Reload activities to refresh completion status
        const updatedActivities = await getScheduleForDate(selectedDate);
        setDayActivities(updatedActivities);
      } catch (error) {
        // Revert on error
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

  const handleMealConsumptionToggle = useCallback(async (item: ScheduleItem) => {
    if (item.type === 'meal' && item.id.startsWith('meal-')) {
      const mealPlanMealId = item.id.replace('meal-', '');
      
      // Optimistic update - update UI immediately
      setScheduleItems(prev => prev.map(si => 
        si.id === item.id ? { ...si, isCompleted: !si.isCompleted } : si
      ));
      
      try {
        if (item.isCompleted) {
          await unmarkMealAsConsumed(mealPlanMealId);
        } else {
          await markMealAsConsumed(mealPlanMealId);
        }
      } catch (error) {
        // Revert on error
        setScheduleItems(prev => prev.map(si => 
          si.id === item.id ? { ...si, isCompleted: item.isCompleted } : si
        ));
      }
    }
  }, [markMealAsConsumed, unmarkMealAsConsumed]);

  const handleMealClick = (meal: Meal) => {
    setSelectedMeal(meal);
    setIsMealDialogOpen(true);
  };

  const handleEditActivity = (item: ScheduleItem) => {
    // Find the actual activity from context to get full data
    const activity = dailyActivities.find(a => a.id === item.id);
    if (activity) {
      // Convert to the format expected by the dialog
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
        // Optimistic update - remove from UI immediately
        setScheduleItems(prev => prev.filter(si => si.id !== item.id));
        
        try {
          await deleteActivity(item.id);
        } catch (error) {
          // Revert on error
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

  const getActivityColor = (activityType?: string) => {
    switch (activityType) {
      case 'exercise': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'work': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'personal': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'appointment': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const today = new Date(selectedDate);
  const formattedDate = today.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
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
                <span className="hidden sm:inline">Add Activity</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </Card>
          ) : (
            <div className="space-y-3 sm:space-y-4">
                {scheduleItems.map((item, index) => {
                  const hasStartAndEndTime = item.startTime && item.endTime;
                  const isLastItem = index === scheduleItems.length - 1;
                  
                  return (
                    <div key={item.id} className="relative flex items-center gap-3 sm:gap-4">
                      {/* Time Circle with integrated timeline */}
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
                        
                        {/* Timeline logic: dots for start+end time, lines for start time only */}
                        {hasStartAndEndTime ? (
                          // Case 1: Has start and end time - show dots
                          <>
                            {Array.from({ length: 6 }).map((_, dotIndex) => (
                              <div
                                key={dotIndex}
                                className="w-2 h-2 rounded-full bg-primary/60 my-1"
                              />
                            ))}
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background border-2 border-primary/60 shadow-sm">
                              <div className="text-center">
                                <div className="text-sm font-semibold text-foreground">
                                  {item.endTime.split(':')[0]}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {item.endTime.split(':')[1]}
                                </div>
                              </div>
                            </div>
                            {!isLastItem && (
                              <div className="w-0.5 h-8 bg-gradient-to-b from-primary/30 to-primary/20 my-2" />
                            )}
                          </>
                        ) : (
                          // Case 2: Has only start time - show line
                          !isLastItem && (
                            <div className="w-0.5 h-12 bg-gradient-to-b from-primary/50 to-primary/30 my-2" />
                          )
                        )}
                      </div>
                      
                      {item.type === 'meal' ? (
                        // Meal card with exact meal planner styling
                        <Card 
                          className={`flex-1 min-w-0 hover:shadow-md transition-all duration-200 cursor-pointer ${
                            item.isCompleted 
                              ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 shadow-green-100 dark:shadow-green-900/20' 
                              : 'hover:shadow-lg'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMealConsumptionToggle(item);
                          }}
                        >
                          <CardHeader className="pb-2 md:pb-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <CardTitle className="text-base md:text-lg flex items-center gap-2">
                                  <Utensils className="h-4 w-4 md:h-5 md:w-5 text-primary flex-shrink-0" />
                                  <span className="truncate">{item.title}</span>
                                </CardTitle>
                                <p className="text-xs md:text-sm text-muted-foreground mt-1 truncate">
                                  From: meal plan - {formattedDate.split(',')[0]}
                                </p>
                              </div>
                              <div className="flex items-center justify-between sm:justify-end gap-2 flex-shrink-0">
                                <div className="flex flex-col sm:text-right">
                                  <Badge variant="outline" className="flex items-center gap-1 text-xs w-fit">
                                    <Clock className="h-3 w-3" />
                                    <span className="truncate">{item.time || 'No time'}</span>
                                  </Badge>
                                  <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
                                    meal
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  {(item as any).meal && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMealClick((item as any).meal);
                                      }}
                                      className="bg-muted/50 border-muted-foreground/20 text-muted-foreground hover:bg-muted hover:text-foreground h-8 w-8 p-0"
                                      title="View meal details"
                                    >
                                      <Utensils className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            {item.isCompleted && (
                              <div className="flex items-center gap-2 mb-2 md:mb-3 text-green-700 dark:text-green-400">
                                <Check className="h-4 w-4 flex-shrink-0" />
                                <span className="text-sm font-medium">Meal consumed</span>
                              </div>
                            )}
                            {(item as any).meal?.description && (
                              <p className={`text-sm mb-3 md:mb-4 ${item.isCompleted ? 'text-green-600 dark:text-green-300' : 'text-muted-foreground'}`}>
                                {(item as any).meal.description}
                              </p>
                            )}
                            <div className="grid grid-cols-4 gap-2 md:gap-4 text-xs md:text-sm">
                              <div className={`text-center p-2 md:p-3 rounded-lg ${
                                item.isCompleted ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted/50'
                              }`}>
                                <p className={`font-semibold text-sm md:text-base ${item.isCompleted ? 'text-green-700 dark:text-green-400' : 'text-primary'}`}>
                                  {(item as any).meal?.total_calories || 0}
                                </p>
                                <p className={`text-xs ${item.isCompleted ? 'text-green-600 dark:text-green-300' : 'text-muted-foreground'}`}>Cal</p>
                              </div>
                              <div className={`text-center p-2 md:p-3 rounded-lg ${
                                item.isCompleted ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted/50'
                              }`}>
                                <p className={`font-semibold text-sm md:text-base ${item.isCompleted ? 'text-green-700 dark:text-green-400' : 'text-primary'}`}>
                                  {(item as any).meal?.total_protein || 0}g
                                </p>
                                <p className={`text-xs ${item.isCompleted ? 'text-green-600 dark:text-green-300' : 'text-muted-foreground'}`}>Protein</p>
                              </div>
                              <div className={`text-center p-2 md:p-3 rounded-lg ${
                                item.isCompleted ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted/50'
                              }`}>
                                <p className={`font-semibold text-sm md:text-base ${item.isCompleted ? 'text-green-700 dark:text-green-400' : 'text-primary'}`}>
                                  {(item as any).meal?.total_carbs || 0}g
                                </p>
                                <p className={`text-xs ${item.isCompleted ? 'text-green-600 dark:text-green-300' : 'text-muted-foreground'}`}>Carbs</p>
                              </div>
                              <div className={`text-center p-2 md:p-3 rounded-lg ${
                                item.isCompleted ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted/50'
                              }`}>
                                <p className={`font-semibold text-sm md:text-base ${item.isCompleted ? 'text-green-700 dark:text-green-400' : 'text-primary'}`}>
                                  {(item as any).meal?.total_fat || 0}g
                                </p>
                                <p className={`text-xs ${item.isCompleted ? 'text-green-600 dark:text-green-300' : 'text-muted-foreground'}`}>Fat</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ) : (
                        // Activity card with consistent styling
                        <Card 
                          className={`flex-1 min-w-0 hover:shadow-md transition-all duration-200 cursor-pointer hover:shadow-lg ${
                            item.isCompleted 
                              ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 shadow-green-100 dark:shadow-green-900/20' 
                              : ''
                          }`}
                          onClick={() => {
                            if (item.activityType === 'exercise') {
                              handleExerciseClick(item);
                            } else if (item.type === 'activity' && item.id !== 'workout-today' && !item.id.startsWith('recurring-')) {
                              handleToggleComplete(item);
                            }
                          }}
                        >
                          <CardHeader className="pb-2 md:pb-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <CardTitle className="text-base md:text-lg flex items-center gap-2">
                                  <div className={`flex h-4 w-4 md:h-5 md:w-5 items-center justify-center rounded-full flex-shrink-0 ${
                                    item.isCompleted 
                                      ? 'bg-green-500 text-white' 
                                      : item.activityType === 'exercise'
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-primary text-primary-foreground'
                                  }`}>
                                    {item.isCompleted ? (
                                      <Check className="h-3 w-3" />
                                    ) : item.activityType === 'exercise' ? (
                                      <span className="text-xs">💪</span>
                                    ) : (
                                      <Clock className="h-2 w-2 md:h-3 md:w-3" />
                                    )}
                                  </div>
                                  <span className={`truncate ${
                                    item.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'
                                  }`}>
                                    {item.title}
                                  </span>
                                </CardTitle>
                                <div className="flex items-center gap-2 mt-1">
                                  {item.id.startsWith('recurring-') && (
                                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                                      Daily
                                    </Badge>
                                  )}
                                  {item.activityType && (
                                    <Badge variant="secondary" className={`text-xs ${getActivityColor(item.activityType)}`}>
                                      {item.activityType}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between sm:justify-end gap-2 flex-shrink-0">
                                <div className="flex flex-col sm:text-right">
                                  <Badge variant="outline" className="flex items-center gap-1 text-xs w-fit">
                                    <Clock className="h-3 w-3" />
                                    <span className="truncate">
                                      {item.time || item.startTime}
                                      {item.endTime && ` - ${item.endTime}`}
                                    </span>
                                  </Badge>
                                  <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
                                    activity
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  {item.type === 'activity' && item.id !== 'workout-today' && !item.id.startsWith('recurring-') && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditActivity(item);
                                        }}
                                        title="Edit activity"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteActivity(item);
                                        }}
                                        title="Delete activity"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            {item.isCompleted && (
                              <div className="flex items-center gap-2 mb-2 md:mb-3 text-green-700 dark:text-green-400">
                                <Check className="h-4 w-4 flex-shrink-0" />
                                <span className="text-sm font-medium">Activity completed</span>
                              </div>
                            )}
                            {item.description && (
                              <p className={`text-sm mb-3 md:mb-4 ${item.isCompleted ? 'text-green-600 dark:text-green-300' : 'text-muted-foreground'}`}>
                                {item.description}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  );
                })}
              </div>
          )}
        </div>

        <AddActivityDialog
          open={isAddDialogOpen}
          onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) setEditingActivity(null);
          }}
          onActivityAdded={() => {
            loadTodaySchedule();
            setEditingActivity(null);
          }}
          editActivity={editingActivity}
        />
        
        <MealFoodsDialog
          meal={selectedMeal}
          open={isMealDialogOpen}
          onOpenChange={setIsMealDialogOpen}
        />
      </div>
    </div>
  );
};

export default Schedule;