import { useState, useEffect } from 'react';
import { useFood, MealPlan } from '@/contexts/FoodContext';
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
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditMealPlanDialogProps {
  plan: MealPlan;
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

export function EditMealPlanDialog({ plan, open, onOpenChange }: EditMealPlanDialogProps) {
  const { updateMealPlan, getMealPlanMeals } = useFood();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  
  const [formData, setFormData] = useState({
    name: plan.name,
    description: plan.description || '',
    start_date: new Date(plan.start_date),
    end_date: plan.end_date ? new Date(plan.end_date) : null,
    is_active: plan.is_active ?? true,
  });

  useEffect(() => {
    setFormData({
      name: plan.name,
      description: plan.description || '',
      start_date: new Date(plan.start_date),
      end_date: plan.end_date ? new Date(plan.end_date) : null,
      is_active: plan.is_active ?? true,
    });
    
    // Load existing days for this plan
    const loadExistingDays = async () => {
      try {
        const meals = await getMealPlanMeals(plan.id);
        const uniqueDays = [...new Set(meals.map(meal => meal.day_of_week))];
        setSelectedDays(uniqueDays.filter(day => day !== null && day !== undefined));
      } catch (error) {
        console.error('Error loading plan days:', error);
      }
    };
    
    if (open) {
      loadExistingDays();
    }
  }, [plan, open, getMealPlanMeals]);

  const handleDayToggle = (dayValue: number) => {
    setSelectedDays(prev => 
      prev.includes(dayValue) 
        ? prev.filter(day => day !== dayValue)
        : [...prev, dayValue]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || selectedDays.length === 0) return;

    setIsLoading(true);
    try {
      // Update meal plan basic info
      await updateMealPlan(plan.id, {
        name: formData.name,
        description: formData.description,
        start_date: formData.start_date.toISOString().split('T')[0],
        end_date: formData.end_date ? formData.end_date.toISOString().split('T')[0] : null,
        is_active: formData.is_active,
      });
      
      // Get current meal plan meals
      const currentMeals = await getMealPlanMeals(plan.id);
      const currentDays = [...new Set(currentMeals.map(meal => meal.day_of_week))];
      
      // Days to remove (in current but not in selected)
      const daysToRemove = currentDays.filter(day => !selectedDays.includes(day));
      
      // Days to add (in selected but not in current)
      const daysToAdd = selectedDays.filter(day => !currentDays.includes(day));
      
      // Remove meals for days that are no longer selected
      for (const dayToRemove of daysToRemove) {
        const mealsToRemove = currentMeals.filter(meal => meal.day_of_week === dayToRemove);
        for (const meal of mealsToRemove) {
          await supabase
            .from('meal_plan_meals')
            .delete()
            .eq('id', meal.id);
        }
      }
      
      // For days to add, we'll copy meals from the first existing day
      if (daysToAdd.length > 0 && currentMeals.length > 0) {
        const templateMeals = currentMeals.filter(meal => meal.day_of_week === currentDays[0]);
        
        for (const dayToAdd of daysToAdd) {
          for (const templateMeal of templateMeals) {
            await supabase
              .from('meal_plan_meals')
              .insert([{
                meal_plan_id: plan.id,
                meal_id: templateMeal.meal_id,
                meal_time: templateMeal.meal_time,
                meal_order: templateMeal.meal_order,
                day_of_week: dayToAdd
              }]);
          }
        }
      }
      
      toast({
        title: "Meal plan updated",
        description: `${formData.name} has been updated with ${selectedDays.length} active days.`,
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating meal plan:', error);
      toast({
        title: "Error",
        description: "Failed to update meal plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Meal Plan</DialogTitle>
          <DialogDescription>
            Update your meal plan information.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Plan Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Weekly Meal Plan"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description..."
              rows={2}
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
                    {formData.start_date ? format(formData.start_date, "PPP") : <span>Pick a date</span>}
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
              <Label>End Date (Optional)</Label>
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
                    {formData.end_date ? format(formData.end_date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.end_date}
                    onSelect={(date) => setFormData(prev => ({ ...prev, end_date: date }))}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
            />
            <Label htmlFor="is_active">Active plan</Label>
          </div>

          {/* Days of Week Selection */}
          <div className="space-y-2">
            <Label>Active Days *</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {daysOfWeek.map((day) => (
                <div key={day.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`day-${day.id}`}
                    checked={selectedDays.includes(day.id)}
                    onCheckedChange={() => handleDayToggle(day.id)}
                  />
                  <Label htmlFor={`day-${day.id}`} className="text-sm cursor-pointer">
                    {day.name}
                  </Label>
                </div>
              ))}
            </div>
            {selectedDays.length === 0 && (
              <p className="text-sm text-destructive mt-1">Please select at least one day</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.name.trim() || selectedDays.length === 0}>
              {isLoading ? 'Updating...' : 'Update Plan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}