import { useState, useEffect } from 'react';
import { useFood } from '@/contexts/FoodContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, ArrowLeft, Edit, Trash2, Calendar as CalendarIcon, Clock, Utensils, Check, Settings } from 'lucide-react';
import { AddMealPlanDialog } from './add-meal-plan-dialog';
import { EditMealPlanDialog } from './edit-meal-plan-dialog';
import { MealFoodsDialog } from './meal-foods-dialog';
import { MealPlanManager } from './meal-plan-manager';
import { MealPlan, MealPlanMeal } from '@/contexts/FoodContext';
import { format, isSameDay, isToday } from 'date-fns';
export function MealPlanner({
  showTodaysView = false,
  onBackFromToday
}: {
  showTodaysView?: boolean;
  onBackFromToday?: () => void;
}) {
  const {
    mealPlans,
    deleteMealPlan,
    getMealPlanMeals,
    removeMealFromPlan,
    getMealConsumptions,
    markMealAsConsumed,
    unmarkMealAsConsumed,
    isMealConsumed
  } = useFood();
  // Initialize with today's date if showTodaysView is true
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(showTodaysView ? new Date() : new Date());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MealPlan | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<MealPlan | null>(null);
  const [planMeals, setPlanMeals] = useState<MealPlanMeal[]>([]);
  const [view, setView] = useState<'calendar' | 'timeline' | 'plan-meals'>(showTodaysView ? 'timeline' : 'calendar');
  const [daysWithMeals, setDaysWithMeals] = useState<Date[]>([]);
  const [selectedMeal, setSelectedMeal] = useState<any>(null);
  const [showMealFoods, setShowMealFoods] = useState(false);
  const [mealConsumptions, setMealConsumptions] = useState<any[]>([]);

  // Get all meals for the selected date from all plans
  const getMealsForDate = async (date: Date) => {
    const dayOfWeek = date.getDay();
    const plansForDate = mealPlans.filter(plan => {
      const startDate = new Date(plan.start_date);
      const endDate = plan.end_date ? new Date(plan.end_date) : startDate;
      return date >= startDate && date <= endDate;
    });
    
    const allMeals: (MealPlanMeal & {
      planName: string;
    })[] = [];
    
    for (const plan of plansForDate) {
      try {
        const meals = await getMealPlanMeals(plan.id);
        // Filter meals by day of week
        const mealsForDay = meals.filter(meal => meal.day_of_week === dayOfWeek);
        allMeals.push(...mealsForDay.map(meal => ({
          ...meal,
          planName: plan.name
        })));
      } catch (error) {
        console.error('Error loading meals for plan:', plan.id, error);
      }
    }

    // Load consumption data for these meals
    if (allMeals.length > 0) {
      try {
        const consumptions = await getMealConsumptions(allMeals.map(m => m.id));
        setMealConsumptions(consumptions);
      } catch (error) {
        console.error('Error loading meal consumptions:', error);
        setMealConsumptions([]);
      }
    } else {
      setMealConsumptions([]);
    }

    // Sort by meal time
    return allMeals.sort((a, b) => {
      const timeA = a.meal_time || '00:00';
      const timeB = b.meal_time || '00:00';
      return timeA.localeCompare(timeB);
    });
  };
  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this meal plan?')) {
      try {
        await deleteMealPlan(id);
        if (selectedPlan?.id === id) {
          setView('timeline');
          setSelectedPlan(null);
        }
      } catch (error) {
        console.error('Error deleting meal plan:', error);
      }
    }
  };
  const handleDeleteMeal = async (mealPlanMealId: string) => {
    if (confirm('Are you sure you want to remove this meal from the plan?')) {
      try {
        // Find the meal plan this meal belongs to
        const mealPlanMeal = planMeals.find(pm => pm.id === mealPlanMealId);
        if (!mealPlanMeal) return;

        // Remove the meal from the plan
        await removeMealFromPlan(mealPlanMealId);

        // Check if this was the last meal in the plan
        const remainingMeals = planMeals.filter(pm => pm.id !== mealPlanMealId);
        if (remainingMeals.length === 0) {
          // If no meals left, delete the entire meal plan
          const planToDelete = selectedPlan || mealPlans.find(plan => remainingMeals.some(meal => meal.meal_plan_id === plan.id) || mealPlanMeal.meal_plan_id === plan.id);
          if (planToDelete) {
            await deleteMealPlan(planToDelete.id);
            // Navigate back to calendar view
            setView('calendar');
            setSelectedPlan(null);
            setPlanMeals([]);
          }
        } else {
          // Refresh the meals list
          if (selectedDate) {
            const meals = await getMealsForDate(selectedDate);
            setPlanMeals(meals);
          } else if (selectedPlan) {
            const meals = await getMealPlanMeals(selectedPlan.id);
            setPlanMeals(meals);
          }
        }
      } catch (error) {
        console.error('Error removing meal from plan:', error);
      }
    }
  };
  const handlePlanClick = async (plan: MealPlan) => {
    try {
      const meals = await getMealPlanMeals(plan.id);
      setPlanMeals(meals);
      setSelectedPlan(plan);
      setView('plan-meals');
    } catch (error) {
      console.error('Error loading plan meals:', error);
    }
  };
  const handleMealClick = (meal: any) => {
    setSelectedMeal(meal);
    setShowMealFoods(true);
  };
  const handleMealConsumptionToggle = async (mealPlanMealId: string) => {
    try {
      const isConsumed = isMealConsumed(mealPlanMealId, mealConsumptions);
      if (isConsumed) {
        await unmarkMealAsConsumed(mealPlanMealId);
      } else {
        await markMealAsConsumed(mealPlanMealId);
      }

      // Refresh consumption data
      if (selectedDate) {
        const meals = await getMealsForDate(selectedDate);
        setPlanMeals(meals);
      }
    } catch (error) {
      console.error('Error toggling meal consumption:', error);
    }
  };
  const getDaysWithPlans = async () => {
    const daysWithMeals = [];
    for (const plan of mealPlans) {
      try {
        const meals = await getMealPlanMeals(plan.id);
        if (meals.length > 0) {
          // Get all days in the plan's date range that have meals
          const startDate = new Date(plan.start_date);
          const endDate = plan.end_date ? new Date(plan.end_date) : startDate;
          const current = new Date(startDate);
          
          while (current <= endDate) {
            const dayOfWeek = current.getDay();
            // Check if there are meals for this day of week
            const hasMealsForDay = meals.some(meal => meal.day_of_week === dayOfWeek);
            if (hasMealsForDay) {
              daysWithMeals.push(new Date(current));
            }
            current.setDate(current.getDate() + 1);
          }
        }
      } catch (error) {
        console.error('Error checking meals for plan:', plan.id, error);
      }
    }
    return daysWithMeals;
  };

  // Load today's meals if showTodaysView is true
  useEffect(() => {
    if (showTodaysView && selectedDate) {
      const loadTodaysMeals = async () => {
        const meals = await getMealsForDate(selectedDate);
        setPlanMeals(meals);
      };
      loadTodaysMeals();
    }
  }, [showTodaysView]);

  // Update days with meals when meal plans change
  useEffect(() => {
    const updateDaysWithMeals = async () => {
      const days = await getDaysWithPlans();
      setDaysWithMeals(days);
    };
    updateDaysWithMeals();
  }, [mealPlans]);
  const renderCalendarView = () => (
    <div className="space-y-6">
      <Tabs defaultValue="calendar" className="w-full">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-bold text-foreground">Meal Planner</h2>
            <p className="text-muted-foreground">Manage your meal plans and schedule</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setIsAddDialogOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Meal Plan</span>
              <span className="sm:hidden">Add</span>
            </Button>
            <TabsList>
              <TabsTrigger value="calendar" className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Calendar
              </TabsTrigger>
              <TabsTrigger value="manage" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Manage Plans
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="calendar">
          <div className="flex justify-center">
            <Card className="w-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 justify-center">
                  <CalendarIcon className="h-5 w-5" />
                  Select Meal Date
                </CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Calendar 
                  mode="single" 
                  selected={selectedDate} 
                  onSelect={async date => {
                    // Don't do anything if user clicks on today's date
                    if (date && isToday(date)) {
                      return;
                    }
                    
                    setSelectedDate(date);
                    if (date) {
                      const meals = await getMealsForDate(date);
                      setPlanMeals(meals);
                      setView('timeline');
                    }
                  }}
                  className="rounded-md border" 
                  modifiers={{
                    hasPlans: daysWithMeals
                  }} 
                  modifiersStyles={{
                    hasPlans: {
                      backgroundColor: 'hsl(var(--primary) / 0.1)',
                      border: '1px solid hsl(var(--primary) / 0.3)'
                    }
                  }} 
                />
              </CardContent>
            </Card>
          </div>

          {/* Legend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Utensils className="h-5 w-5" />
                Calendar Legend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-4 h-4 rounded border" style={{
                  backgroundColor: 'hsl(var(--primary) / 0.1)',
                  border: '1px solid hsl(var(--primary) / 0.3)'
                }}></div>
                <span>Meal Plans Available</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage">
          <MealPlanManager />
        </TabsContent>
      </Tabs>
    </div>
  );
  const renderTimelineView = () => <div className="space-y-4 md:space-y-6">
      <div className="flex items-center gap-2 md:gap-4">
        
        <div className="min-w-0 flex-1">
          <h2 className="text-lg md:text-2xl font-bold text-foreground truncate">
            {showTodaysView ? "Today's Meals" : selectedDate ? format(selectedDate, 'EEEE, MMM d, yyyy') : 'Select a Date'}
          </h2>
          <p className="text-sm md:text-base text-muted-foreground">
            {planMeals.length} meal{planMeals.length !== 1 ? 's' : ''} scheduled
          </p>
        </div>
      </div>

      {planMeals.length > 0 ? <div className="space-y-3 sm:space-y-4">
          {planMeals.map((planMeal, index) => {
        const isConsumed = isMealConsumed(planMeal.id, mealConsumptions);
        const isLastItem = index === planMeals.length - 1;
        return <div key={planMeal.id} className="relative flex items-center gap-3 sm:gap-4">
                {/* Time Circle with integrated timeline */}
                <div className="relative z-10 flex flex-col items-center flex-shrink-0">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background border-2 border-primary shadow-sm">
                    <div className="text-center">
                      <div className="text-sm font-semibold text-foreground">
                        {planMeal.meal_time ? planMeal.meal_time.split(':')[0] : '00'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {planMeal.meal_time ? planMeal.meal_time.split(':')[1] : '00'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Timeline line - only show if not last item */}
                  {!isLastItem && <div className="w-0.5 h-12 bg-gradient-to-b from-primary/50 to-primary/30 my-2" />}
                </div>
                  
                  {/* Meal card */}
                  <Card className={`flex-1 min-w-0 hover:shadow-md transition-all duration-200 cursor-pointer ${isConsumed ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 shadow-green-100 dark:shadow-green-900/20' : 'hover:shadow-lg'}`} onClick={e => {
            e.stopPropagation();
            handleMealConsumptionToggle(planMeal.id);
          }}>
                    <CardHeader className="pb-2 md:pb-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base md:text-lg flex items-center gap-2">
                            <Utensils className="h-4 w-4 md:h-5 md:w-5 text-primary flex-shrink-0" />
                            <span className="truncate">{planMeal.meal?.name}</span>
                          </CardTitle>
                          <p className="text-xs md:text-sm text-muted-foreground mt-1 truncate">
                            From: {(planMeal as any).planName}
                          </p>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-2 flex-shrink-0">
                          <div className="flex flex-col sm:text-right">
                            <Badge variant="outline" className="flex items-center gap-1 text-xs w-fit">
                              <Clock className="h-3 w-3" />
                              <span className="truncate">{planMeal.meal_time || 'No time'}</span>
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
                              {planMeal.meal?.meal_type}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={e => {
                      e.stopPropagation();
                      handleMealClick(planMeal.meal);
                    }} className="text-muted-foreground hover:text-foreground h-8 w-8 p-0" title="View meal details">
                              <Utensils className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={e => {
                      e.stopPropagation();
                      handleDeleteMeal(planMeal.id);
                    }} className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {isConsumed && <div className="flex items-center gap-2 mb-2 md:mb-3 text-green-700 dark:text-green-400">
                          <Check className="h-4 w-4 flex-shrink-0" />
                          <span className="text-sm font-medium">Meal consumed</span>
                        </div>}
                      {planMeal.meal?.description && <p className={`text-sm mb-3 md:mb-4 ${isConsumed ? 'text-green-600 dark:text-green-300' : 'text-muted-foreground'}`}>
                          {planMeal.meal.description}
                        </p>}
                      <div className="grid grid-cols-4 gap-2 md:gap-4 text-xs md:text-sm">
                        <div className={`text-center p-2 md:p-3 rounded-lg ${isConsumed ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted/50'}`}>
                          <p className={`font-semibold text-sm md:text-base ${isConsumed ? 'text-green-700 dark:text-green-400' : 'text-primary'}`}>
                            {planMeal.meal?.total_calories || 0}
                          </p>
                          <p className={`text-xs ${isConsumed ? 'text-green-600 dark:text-green-300' : 'text-muted-foreground'}`}>Cal</p>
                        </div>
                        <div className={`text-center p-2 md:p-3 rounded-lg ${isConsumed ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted/50'}`}>
                          <p className={`font-semibold text-sm md:text-base ${isConsumed ? 'text-green-700 dark:text-green-400' : 'text-primary'}`}>
                            {planMeal.meal?.total_protein || 0}g
                          </p>
                          <p className={`text-xs ${isConsumed ? 'text-green-600 dark:text-green-300' : 'text-muted-foreground'}`}>Protein</p>
                        </div>
                        <div className={`text-center p-2 md:p-3 rounded-lg ${isConsumed ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted/50'}`}>
                          <p className={`font-semibold text-sm md:text-base ${isConsumed ? 'text-green-700 dark:text-green-400' : 'text-primary'}`}>
                            {planMeal.meal?.total_carbs || 0}g
                          </p>
                          <p className={`text-xs ${isConsumed ? 'text-green-600 dark:text-green-300' : 'text-muted-foreground'}`}>Carbs</p>
                        </div>
                        <div className={`text-center p-2 md:p-3 rounded-lg ${isConsumed ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted/50'}`}>
                          <p className={`font-semibold text-sm md:text-base ${isConsumed ? 'text-green-700 dark:text-green-400' : 'text-primary'}`}>
                            {planMeal.meal?.total_fat || 0}g
                          </p>
                          <p className={`text-xs ${isConsumed ? 'text-green-600 dark:text-green-300' : 'text-muted-foreground'}`}>Fat</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>;
      })}
        </div> : <Card className="p-6 md:p-8 text-center">
          <Clock className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 text-muted-foreground" />
          <h3 className="text-base md:text-lg font-semibold mb-2">No meals scheduled</h3>
          <p className="text-sm md:text-base text-muted-foreground mb-4">
            No meals are scheduled for {selectedDate ? format(selectedDate, 'MMM d') : 'this day'}
          </p>
          <Button onClick={() => setIsAddDialogOpen(true)} className="flex items-center gap-2" size="sm">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Meal Plan</span>
            <span className="sm:hidden">Add Plan</span>
          </Button>
        </Card>}
    </div>;
  const renderPlanMealsView = () => <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setView('timeline')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-foreground">{selectedPlan?.name}</h2>
          <p className="text-muted-foreground">
            {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : ''} • {planMeals.length} meal{planMeals.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {planMeals.length > 0 ? <div className="space-y-4">
          {planMeals.map(planMeal => <Card key={planMeal.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleMealClick(planMeal.meal)}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Utensils className="h-5 w-5 text-primary" />
                    {planMeal.meal?.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {planMeal.meal_time && <Badge variant="outline" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {planMeal.meal_time}
                      </Badge>}
                    <Button variant="ghost" size="icon" onClick={e => {
                e.stopPropagation();
                handleDeleteMeal(planMeal.id);
              }} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {planMeal.meal?.description && <p className="text-sm text-muted-foreground mb-4">{planMeal.meal.description}</p>}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="font-semibold text-primary">{planMeal.meal?.total_calories || 0}</p>
                    <p className="text-muted-foreground">Calories</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="font-semibold text-primary">{planMeal.meal?.total_protein || 0}g</p>
                    <p className="text-muted-foreground">Protein</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="font-semibold text-primary">{planMeal.meal?.total_carbs || 0}g</p>
                    <p className="text-muted-foreground">Carbs</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="font-semibold text-primary">{planMeal.meal?.total_fat || 0}g</p>
                    <p className="text-muted-foreground">Fat</p>
                  </div>
                </div>
              </CardContent>
            </Card>)}
        </div> : <Card className="p-8 text-center">
          <Utensils className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No meals in this plan</h3>
          <p className="text-muted-foreground">Add meals to this plan to see them here</p>
        </Card>}
    </div>;
  return <div className="space-y-6">
      {showTodaysView || view === 'timeline' ? renderTimelineView() : null}
      {!showTodaysView && view === 'calendar' ? renderCalendarView() : null}
      {!showTodaysView && view === 'plan-meals' ? renderPlanMealsView() : null}

      <AddMealPlanDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
      {editingPlan && <EditMealPlanDialog plan={editingPlan} open={!!editingPlan} onOpenChange={() => setEditingPlan(null)} />}
      <MealFoodsDialog meal={selectedMeal} open={showMealFoods} onOpenChange={setShowMealFoods} />
    </div>;
}