import { useState } from 'react';
import { useFood } from '@/contexts/FoodContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, isAfter, isBefore, isSameDay, startOfDay } from 'date-fns';
import { CalendarIcon, Plus, X, Calendar as CalendarDays, Utensils, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddMealPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const daysOfWeek = [
  { id: 0, name: 'Sunday', short: 'Sun' },
  { id: 1, name: 'Monday', short: 'Mon' },
  { id: 2, name: 'Tuesday', short: 'Tue' },
  { id: 3, name: 'Wednesday', short: 'Wed' },
  { id: 4, name: 'Thursday', short: 'Thu' },
  { id: 5, name: 'Friday', short: 'Fri' },
  { id: 6, name: 'Saturday', short: 'Sat' },
];

export function AddMealPlanDialog({ open, onOpenChange }: AddMealPlanDialogProps) {
  const { addMealPlan, addMealToPlan, meals } = useFood();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state - cleaned up after removing description field
  const [formData, setFormData] = useState({
    name: '',
    start_date: new Date(),
    end_date: new Date(),
    selectedDays: [] as number[],
    selectedMeals: [] as string[],
  });

  const [mealSearchTerm, setMealSearchTerm] = useState('');

  // Filter meals based on search term
  const filteredMeals = meals.filter(meal =>
    meal.name.toLowerCase().includes(mealSearchTerm.toLowerCase()) ||
    (meal.description && meal.description.toLowerCase().includes(mealSearchTerm.toLowerCase()))
  );

  const handleDayToggle = (dayValue: number) => {
    setFormData(prev => ({
      ...prev,
      selectedDays: prev.selectedDays.includes(dayValue) 
        ? prev.selectedDays.filter(day => day !== dayValue)
        : [...prev.selectedDays, dayValue]
    }));
  };

  // Add the same function from gym plan
  const getOccurrencesOfDay = (start: Date, end: Date, dayOfWeek: number): Date[] => {
    const dates: Date[] = [];
    const current = startOfDay(start);
    const endDay = startOfDay(end);
    
    while (current <= endDay) {
      const currentDay = current.getDay();
      if (currentDay === dayOfWeek) {
        dates.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  };

  // Function to get all dates in range for every day option
  const getAllDatesInRange = (start: Date, end: Date): Date[] => {
    const dates: Date[] = [];
    const current = startOfDay(start);
    const endDay = startOfDay(end);
    
    while (current <= endDay) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  };

  const selectedDayOccurrences = formData.start_date && formData.end_date && formData.selectedDays.length > 0 ? 
    formData.selectedDays.reduce((total, dayOfWeek) => {
      return total + getOccurrencesOfDay(formData.start_date, formData.end_date, dayOfWeek).length;
    }, 0) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || formData.selectedDays.length === 0 || formData.selectedMeals.length === 0) return;

    setIsLoading(true);
    try {
      // Create one unified meal plan (like workout plans)
      const planData = {
        name: formData.name,
        start_date: format(formData.start_date, 'yyyy-MM-dd'),
        end_date: format(formData.end_date, 'yyyy-MM-dd'),
        is_active: true,
      };

      await addMealPlan(planData);
      
      // Get the created meal plan ID
      const { data: createdPlan } = await supabase
        .from('meal_plans')
        .select('id')
        .eq('name', planData.name)
        .eq('start_date', planData.start_date)
        .eq('end_date', planData.end_date)
        .maybeSingle();

      if (createdPlan) {
        // Add meals for each selected day
        for (const dayOfWeek of formData.selectedDays) {
          for (let i = 0; i < formData.selectedMeals.length; i++) {
            const mealId = formData.selectedMeals[i];
            const meal = meals.find(m => m.id === mealId);
            
            await supabase
              .from('meal_plan_meals')
              .insert([{
                meal_plan_id: createdPlan.id,
                meal_id: mealId,
                meal_time: meal?.default_time,
                meal_order: i + 1,
                day_of_week: dayOfWeek
              }]);
          }
        }
      }
      
      toast({
        title: "Meal plan created",
        description: `Created meal plan "${formData.name}" for ${formData.selectedDays.length} days with ${formData.selectedMeals.length} meals each`,
      });
      
      // Reset form
      setFormData({
        name: '',
        start_date: new Date(),
        end_date: new Date(),
        selectedDays: [],
        selectedMeals: [],
      });
      setMealSearchTerm('');
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding meal plan:', error);
      toast({
        title: "Error",
        description: "Failed to create meal plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={(openState) => {
      if (!openState) {
        // Reset search term when dialog closes
        setMealSearchTerm('');
      }
      onOpenChange(openState);
    }}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Meal Plan</DialogTitle>
          <DialogDescription>
            Create a new meal plan to schedule your meals throughout the week.
          </DialogDescription>
        </DialogHeader>
        
        <div className="overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Plan Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Monday Meal Plan"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.start_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.start_date ? format(formData.start_date, "PPP") : <span>Pick start date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.start_date}
                      onSelect={(date) => date && setFormData(prev => ({ ...prev, start_date: date }))}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.end_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.end_date ? format(formData.end_date, "PPP") : <span>Pick end date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.end_date}
                      onSelect={(date) => date && setFormData(prev => ({ ...prev, end_date: date }))}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Days of Week Selection */}
            <div className="space-y-2">
              <Label>Days of Week *</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {daysOfWeek.map((day) => (
                  <div key={day.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`day-${day.id}`}
                      checked={formData.selectedDays.includes(day.id)}
                      onCheckedChange={() => handleDayToggle(day.id)}
                    />
                    <Label htmlFor={`day-${day.id}`} className="text-sm cursor-pointer">
                      {day.name}
                    </Label>
                  </div>
                ))}
              </div>
              {formData.selectedDays.length === 0 && (
                <p className="text-sm text-destructive mt-1">Please select at least one day</p>
              )}
            </div>

            {/* Meal Selection */}
            <div className="space-y-2">
              <Label>Select Meals *</Label>
              
              {/* Search input for meals */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search meals..."
                  value={mealSearchTerm}
                  onChange={(e) => setMealSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                {meals.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No meals available. Create some meals first.
                  </p>
                ) : filteredMeals.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No meals found matching your search.
                  </p>
                ) : (
                  filteredMeals.map((meal) => (
                    <div key={meal.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={meal.id}
                        checked={formData.selectedMeals.includes(meal.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData(prev => ({
                              ...prev,
                              selectedMeals: [...prev.selectedMeals, meal.id]
                            }));
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              selectedMeals: prev.selectedMeals.filter(id => id !== meal.id)
                            }));
                          }
                        }}
                      />
                      <label
                        htmlFor={meal.id}
                        className="text-sm font-medium flex-1 cursor-pointer flex items-center gap-2"
                      >
                        <Utensils className="h-4 w-4 text-primary" />
                        <div className="flex-1">
                          <div className="font-medium">{meal.name}</div>
                          {meal.default_time && (
                            <div className="text-xs text-muted-foreground">
                              Default time: {meal.default_time}
                            </div>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {meal.total_calories || 0} cal
                        </Badge>
                      </label>
                    </div>
                  ))
                )}
              </div>
              {formData.selectedMeals.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.selectedMeals.map((mealId) => {
                    const meal = meals.find(m => m.id === mealId);
                    return meal ? (
                      <Badge key={mealId} variant="outline" className="text-xs">
                        {meal.name}
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            selectedMeals: prev.selectedMeals.filter(id => id !== mealId)
                          }))}
                          className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
            </div>

            {/* Show occurrence count updated for meal plans */}
            {selectedDayOccurrences > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <CalendarDays className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="text-sm text-muted-foreground">
                      This will create <span className="font-medium text-foreground">1</span> meal plan
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      With meals for {formData.selectedDays.map(dayId => 
                        daysOfWeek.find(d => d.id === dayId)?.name
                      ).join(', ')} from {format(formData.start_date, 'MMM d')} to {format(formData.end_date, 'MMM d, yyyy')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

          </form>
        </div>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading || !formData.name.trim() || formData.selectedDays.length === 0 || formData.selectedMeals.length === 0}
            onClick={handleSubmit}
          >
            {isLoading ? 'Creating...' : 'Create Plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}