import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, Clock, Utensils, Plus, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useSchedule, ScheduleItem } from '@/contexts/ScheduleContext';
import { useFood, Meal } from '@/contexts/FoodContext';
import { useGym } from '@/contexts/GymContext';
import { AddActivityDialog } from './add-activity-dialog';
import { MealFoodsDialog } from '@/components/food/meal-foods-dialog';

export const DailySchedulePanel = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [isMealDialogOpen, setIsMealDialogOpen] = useState(false);
  const { getScheduleForDate, toggleActivityCompletion, updateActivity } = useSchedule();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedDate = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const { mealPlans, getMealPlanMeals, meals, getMealConsumptions, markMealAsConsumed, unmarkMealAsConsumed, isMealConsumed } = useFood();
  const { getTodayWorkout, getWorkoutForDate } = useGym();
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [isLoadingMeals, setIsLoadingMeals] = useState(false);
  
  // Memoize today's meal plans to prevent unnecessary recalculations
  const todayMealPlans = useMemo(() => {
    const currentDate = new Date(selectedDate);
    const dayOfWeek = currentDate.getDay();
    
    return mealPlans.filter(plan => {
      const startDate = new Date(plan.start_date);
      const endDate = plan.end_date ? new Date(plan.end_date) : startDate;
      return currentDate >= startDate && currentDate <= endDate;
    });
  }, [mealPlans, selectedDate]);

  // Memoize activities for the selected date
  const [dayActivities, setDayActivities] = useState<ScheduleItem[]>([]);
  
  useEffect(() => {
    const loadActivities = async () => {
      const activities = await getScheduleForDate(selectedDate);
      setDayActivities(activities);
    };
    loadActivities();
  }, [getScheduleForDate, selectedDate]);

  // Optimized schedule loading with reduced dependencies
  useEffect(() => {
    loadTodaySchedule();
  }, [selectedDate, todayMealPlans.length, dayActivities.length]);

  const loadTodaySchedule = useCallback(async () => {
    if (isLoadingMeals) return; // Prevent concurrent loading
    
    const workoutForDate = getWorkoutForDate(selectedDate);
    const allItems: ScheduleItem[] = [...dayActivities];

    // Load meal plans efficiently if they exist
    if (todayMealPlans.length > 0) {
      setIsLoadingMeals(true);
      try {
        // Process all meal plans in parallel
        const currentDate = new Date(selectedDate);
        const dayOfWeek = currentDate.getDay();
        
        const mealItemsPromises = todayMealPlans.map(async (todayMealPlan) => {
          const [mealPlanMeals, consumptions] = await Promise.all([
            getMealPlanMeals(todayMealPlan.id),
            getMealPlanMeals(todayMealPlan.id).then(meals => 
              getMealConsumptions(meals.map(mpm => mpm.id))
            )
          ]);
          
          // Filter meals for the current day of week
          const mealsForToday = mealPlanMeals.filter(mpm => mpm.day_of_week === dayOfWeek);
          
          return mealsForToday.map(mpm => ({
            id: `meal-${mpm.id}`,
            title: mpm.meal?.name || 'Meal',
            description: mpm.meal?.description,
            type: 'meal' as const,
            time: mpm.meal_time || mpm.scheduled_time || mpm.meal?.default_time || '12:00',
            isCompleted: isMealConsumed(mpm.id, consumptions)
          }));
        });

        const mealItemsArrays = await Promise.all(mealItemsPromises);
        const mealItems = mealItemsArrays.flat();
        allItems.push(...mealItems);
      } catch (error) {
        console.error('Error loading meal plan:', error);
      } finally {
        setIsLoadingMeals(false);
      }
    }

    // Add workout if scheduled for this date
    if (workoutForDate.exercises.length > 0) {
      allItems.push({
        id: 'workout-scheduled',
        title: 'Workout Session',
        description: `${workoutForDate.exercises.length} exercises planned`,
        type: 'activity' as const,
        startTime: workoutForDate.times?.start,
        endTime: workoutForDate.times?.end,
        isCompleted: workoutForDate.session?.completed_at ? true : false,
        activityType: 'exercise'
      });
    }

    // Sort by time
    allItems.sort((a, b) => {
      const timeA = a.time || a.startTime || '23:59';
      const timeB = b.time || b.startTime || '23:59';
      return timeA.localeCompare(timeB);
    });

    setScheduleItems(allItems);
  }, [selectedDate, todayMealPlans, dayActivities, getWorkoutForDate, getMealPlanMeals, getMealConsumptions, isMealConsumed, isLoadingMeals]);

  const handleToggleComplete = useCallback(async (item: ScheduleItem) => {
    if (item.type === 'activity' && !item.id.startsWith('workout-') && !item.id.startsWith('recurring-')) {
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
      navigate(`/workout-day?date=${selectedDate}`);
    }
  };

  const handleMealClick = useCallback(async (item: ScheduleItem) => {
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
            variant="ghost" 
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setIsAddDialogOpen(true);
            }}
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
            <Button 
              variant="ghost" 
              size="sm" 
              className="mt-2 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                setIsAddDialogOpen(true);
              }}
            >
              Add an activity
            </Button>
          </div>
        ) : (
          <div className="relative flex-1 overflow-y-auto">
            {/* Timeline Line */}
            <div className="absolute left-4 sm:left-6 top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary/30 via-primary/50 to-primary/30"></div>
            
            {/* Timeline Items */}
            <div className="space-y-3 sm:space-y-4 pb-2">
              {scheduleItems.map((item, index) => (
                <div key={item.id} className="relative flex items-start gap-3 sm:gap-4">
                  {/* Timeline Dot */}
                  <div className={`relative z-10 flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full border-2 flex-shrink-0 ${
                    item.isCompleted 
                      ? 'bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-600' 
                      : item.type === 'meal'
                      ? 'bg-orange-100 border-orange-300 dark:bg-orange-900/30 dark:border-orange-600'
                      : item.activityType === 'exercise'
                      ? 'bg-blue-100 border-blue-300 dark:bg-blue-900/30 dark:border-blue-600'
                      : 'bg-purple-100 border-purple-300 dark:bg-purple-900/30 dark:border-purple-600'
                  }`}>
                    {item.type === 'meal' ? (
                      <Utensils className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-orange-600 dark:text-orange-400" />
                    ) : item.isCompleted ? (
                      <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-green-600 dark:text-green-400" />
                    ) : (
                      <span className="text-[10px] sm:text-xs">
                        {getActivityIcon(item.activityType)}
                      </span>
                    )}
                  </div>
                  
                   {/* Timeline Content */}
                   <Card 
                     className={`flex-1 min-w-0 hover:shadow-md transition-all duration-200 ${
                       item.activityType === 'exercise' ? 'cursor-pointer' : ''
                     }`}
                     onClick={(e) => {
                       e.stopPropagation();
                       if (item.activityType === 'exercise') {
                         handleExerciseClick(item);
                       }
                     }}
                   >
                     <CardHeader className="pb-2 md:pb-3">
                       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                         <div className="min-w-0 flex-1">
                           <CardTitle className={`text-base md:text-lg flex items-center gap-2 ${
                             item.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'
                           }`}>
                             <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white">
                               {item.type === 'meal' ? '🍽️' : getActivityIcon(item.activityType)}
                             </div>
                             <span className="truncate">{item.title}</span>
                           </CardTitle>
                           <div className="flex gap-2 mt-1">
                             {item.id.startsWith('recurring-') && (
                               <Badge variant="secondary">Daily</Badge>
                             )}
                             {item.activityType && (
                               <Badge variant="outline">{item.activityType}</Badge>
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
                               {item.type}
                             </p>
                           </div>
                           {/* Action Buttons */}
                           {item.type === 'meal' && (
                             <Button
                               variant="ghost"
                               size="sm"
                               className={`h-8 w-8 p-0 ${
                                 item.isCompleted 
                                   ? 'text-destructive hover:text-destructive' 
                                   : 'text-muted-foreground hover:text-primary'
                               }`}
                               onClick={(e) => {
                                 e.stopPropagation();
                                 handleMealClick(item);
                               }}
                               title={item.isCompleted ? "Mark as not consumed" : "Mark as consumed"}
                             >
                               {item.isCompleted ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                             </Button>
                           )}
                           {item.type === 'activity' && !item.id.startsWith('workout-') && !item.id.startsWith('recurring-') && (
                             <Button
                               variant="ghost"
                               size="sm"
                               className={`h-8 w-8 p-0 ${
                                 item.isCompleted 
                                   ? 'text-destructive hover:text-destructive' 
                                   : 'text-muted-foreground hover:text-primary'
                               }`}
                               onClick={(e) => {
                                 e.stopPropagation();
                                 handleToggleComplete(item);
                               }}
                               title={item.isCompleted ? "Mark as incomplete" : "Mark as complete"}
                             >
                               {item.isCompleted ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                             </Button>
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
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <AddActivityDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onActivityAdded={loadTodaySchedule}
      />
      
      <MealFoodsDialog
        meal={selectedMeal}
        open={isMealDialogOpen}
        onOpenChange={setIsMealDialogOpen}
      />
    </Card>
  );
};