import { useState, useEffect } from 'react';
import { useFood, MealPlan, MealPlanMeal } from '@/contexts/FoodContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Calendar, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface MealSchedulePlannerProps {
  plan: MealPlan;
}

export function MealSchedulePlanner({ plan }: MealSchedulePlannerProps) {
  const { meals, getMealPlanMeals, addMealToPlan, removeMealFromPlan } = useFood();
  const [planMeals, setPlanMeals] = useState<MealPlanMeal[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedMealId, setSelectedMealId] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('1');
  const [scheduledTime, setScheduledTime] = useState<string>('08:00');
  const [mealOrder, setMealOrder] = useState<string>('1');
  const [isLoading, setIsLoading] = useState(false);

  const daysOfWeek = [
    { value: '1', label: 'Monday' },
    { value: '2', label: 'Tuesday' },
    { value: '3', label: 'Wednesday' },
    { value: '4', label: 'Thursday' },
    { value: '5', label: 'Friday' },
    { value: '6', label: 'Saturday' },
    { value: '0', label: 'Sunday' },
  ];

  useEffect(() => {
    loadPlanMeals();
  }, [plan.id]);

  const loadPlanMeals = async () => {
    try {
      const meals = await getMealPlanMeals(plan.id);
      setPlanMeals(meals);
    } catch (error) {
      console.error('Error loading plan meals:', error);
    }
  };

  const handleAddMeal = async () => {
    if (!selectedMealId || !selectedDay) return;

    setIsLoading(true);
    try {
      await addMealToPlan(
        plan.id,
        selectedMealId,
        scheduledTime
      );
      await loadPlanMeals();
      setSelectedMealId('');
      setSelectedDay('1');
      setScheduledTime('08:00');
      setMealOrder('1');
      setIsAddDialogOpen(false);
      toast({
        title: "Meal scheduled",
        description: "Meal has been added to your plan schedule.",
      });
    } catch (error) {
      console.error('Error adding meal to plan:', error);
      toast({
        title: "Error",
        description: "Failed to add meal to plan.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMeal = async (mealPlanMealId: string) => {
    if (!confirm('Remove this meal from the schedule?')) return;

    try {
      await removeMealFromPlan(mealPlanMealId);
      await loadPlanMeals();
      toast({
        title: "Meal removed",
        description: "Meal has been removed from the schedule.",
      });
    } catch (error) {
      console.error('Error removing meal from plan:', error);
      toast({
        title: "Error",
        description: "Failed to remove meal from plan.",
        variant: "destructive",
      });
    }
  };

  const getDayName = (dayOfWeek: number) => {
    return daysOfWeek.find(d => parseInt(d.value) === dayOfWeek)?.label || 'Unknown';
  };

  const groupedMeals = planMeals.reduce((groups, planMeal) => {
    const day = (planMeal as any).day_of_week;
    if (!groups[day]) groups[day] = [];
    groups[day].push(planMeal);
    return groups;
  }, {} as Record<number, MealPlanMeal[]>);

  // Sort meals within each day by scheduled time and meal order
  Object.keys(groupedMeals).forEach(day => {
    groupedMeals[parseInt(day)].sort((a, b) => {
      if (a.scheduled_time && b.scheduled_time) {
        return a.scheduled_time.localeCompare(b.scheduled_time);
      }
      return (a.meal_order || 0) - (b.meal_order || 0);
    });
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          {plan.name} - Schedule
        </h3>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Schedule Meal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule Meal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="meal">Meal</Label>
                <Select value={selectedMealId} onValueChange={setSelectedMealId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a meal" />
                  </SelectTrigger>
                  <SelectContent>
                    {meals.map((meal) => (
                      <SelectItem key={meal.id} value={meal.id}>
                        {meal.name} ({meal.meal_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="day">Day of Week</Label>
                <Select value={selectedDay} onValueChange={setSelectedDay}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {daysOfWeek.map((day) => (
                      <SelectItem key={day.value} value={day.value}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="order">Meal Order</Label>
                  <Select value={mealOrder} onValueChange={setMealOrder}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1st meal</SelectItem>
                      <SelectItem value="2">2nd meal</SelectItem>
                      <SelectItem value="3">3rd meal</SelectItem>
                      <SelectItem value="4">4th meal</SelectItem>
                      <SelectItem value="5">5th meal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddMeal} disabled={isLoading || !selectedMealId}>
                  {isLoading ? 'Scheduling...' : 'Schedule Meal'}
                </Button>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Weekly Schedule */}
      <div className="grid gap-4">
        {daysOfWeek.map((day) => {
          const dayMeals = groupedMeals[parseInt(day.value)] || [];
          return (
            <Card key={day.value}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{day.label}</CardTitle>
              </CardHeader>
              <CardContent>
                 {dayMeals.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No meals scheduled</p>
                ) : (
                  <div className="relative">
                    {/* Timeline Line */}
                    <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border"></div>
                    
                    {/* Timeline Items */}
                    <div className="space-y-0">
                      {dayMeals.map((planMeal) => (
                        <div key={planMeal.id} className="relative flex items-start gap-6 min-h-[120px]">
                          {/* Time Circle */}
                          <div className="relative z-10 flex flex-col items-center flex-shrink-0">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background border-2 border-border shadow-sm">
                              <div className="text-center">
                                <div className="text-sm font-semibold text-foreground">
                                  {planMeal.scheduled_time ? planMeal.scheduled_time.split(':')[0] : '00'}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {planMeal.scheduled_time ? planMeal.scheduled_time.split(':')[1] : '00'}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Meal Content */}
                          <div className="flex items-start">
                            <Card className="flex-1 min-w-0 hover:shadow-md transition-all duration-200">
                              <CardHeader className="pb-2 md:pb-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <CardTitle className="text-base md:text-lg flex items-center gap-2">
                                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white">
                                        🍽️
                                      </div>
                                      <span className="truncate">{planMeal.meal?.name}</span>
                                    </CardTitle>
                                    <div className="flex gap-2 mt-1">
                                      <Badge variant="secondary">
                                        {planMeal.meal?.meal_type}
                                      </Badge>
                                      <Badge variant="outline">
                                        Meal {planMeal.meal_order}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between sm:justify-end gap-2 flex-shrink-0">
                                    <div className="flex flex-col sm:text-right">
                                      <Badge variant="outline" className="flex items-center gap-1 text-xs w-fit">
                                        <Clock className="h-3 w-3" />
                                        <span className="truncate">{planMeal.scheduled_time || 'No time'}</span>
                                      </Badge>
                                      <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
                                        meal
                                      </p>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveMeal(planMeal.id)}
                                      className="text-destructive hover:text-destructive h-8 w-8 p-0"
                                      title="Remove meal"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="pt-0">
                                {planMeal.meal && (
                                  <div className="grid grid-cols-4 gap-2 md:gap-4 text-xs md:text-sm">
                                    <div className="text-center p-2 md:p-3 rounded-lg bg-muted/50">
                                      <p className="font-semibold text-sm md:text-base text-primary">
                                        {planMeal.meal?.total_calories || 0}
                                      </p>
                                      <p className="text-xs text-muted-foreground">Cal</p>
                                    </div>
                                    <div className="text-center p-2 md:p-3 rounded-lg bg-muted/50">
                                      <p className="font-semibold text-sm md:text-base text-primary">
                                        {planMeal.meal?.total_protein || 0}g
                                      </p>
                                      <p className="text-xs text-muted-foreground">Protein</p>
                                    </div>
                                    <div className="text-center p-2 md:p-3 rounded-lg bg-muted/50">
                                      <p className="font-semibold text-sm md:text-base text-primary">
                                        {planMeal.meal?.total_carbs || 0}g
                                      </p>
                                      <p className="text-xs text-muted-foreground">Carbs</p>
                                    </div>
                                    <div className="text-center p-2 md:p-3 rounded-lg bg-muted/50">
                                      <p className="font-semibold text-sm md:text-base text-primary">
                                        {planMeal.meal?.total_fat || 0}g
                                      </p>
                                      <p className="text-xs text-muted-foreground">Fat</p>
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}