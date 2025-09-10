import { useState, useEffect } from 'react';
import { useGym } from '@/contexts/GymContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const daysOfWeek = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' }
];

interface EditWorkoutPlanDialogProps {
  plan: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditWorkoutPlanDialog({ plan, open, onOpenChange }: EditWorkoutPlanDialogProps) {
  const { updateWorkoutPlan, workoutPlans, workoutPlanDays, planWorkouts } = useGym();
  const { toast } = useToast();
  const [showConflictWarning, setShowConflictWarning] = useState(false);
  const [conflictDetails, setConflictDetails] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: new Date(),
    end_date: null as Date | null,
    start_time: '',
    end_time: '',
    is_active: true,
    apply_to_future: true,
    selected_days: [] as number[]
  });

  useEffect(() => {
    if (plan) {
      // Get current plan days
      const currentPlanDays = workoutPlanDays
        .filter(day => day.plan_id === plan.id)
        .map(day => day.day_of_week);
      
      const currentPlanWorkouts = planWorkouts
        .filter(pw => pw.plan_id === plan.id)
        .map(pw => pw.day_of_week);
      
      const allCurrentDays = [...new Set([...currentPlanDays, ...currentPlanWorkouts])];
      
      setFormData({
        name: plan.name || '',
        description: plan.description || '',
        start_date: new Date(plan.start_date),
        end_date: plan.end_date ? new Date(plan.end_date) : null,
        start_time: '',
        end_time: '',
        is_active: plan.is_active,
        apply_to_future: true,
        selected_days: allCurrentDays
      });
    }
  }, [plan, workoutPlanDays, planWorkouts]);

  const checkForConflicts = () => {
    if (!plan) return [];
    
    const conflicts: string[] = [];
    const startDateStr = format(formData.start_date, 'yyyy-MM-dd');
    const endDateStr = formData.end_date ? format(formData.end_date, 'yyyy-MM-dd') : null;
    
    // Get current plan's days
    const currentPlanDays = workoutPlanDays
      .filter(day => day.plan_id === plan.id)
      .map(day => day.day_of_week);
    
    const currentPlanWorkouts = planWorkouts
      .filter(pw => pw.plan_id === plan.id)
      .map(pw => pw.day_of_week);
    
    const allCurrentDays = formData.selected_days;
    
    // Check for conflicts with other active plans
    const conflictingPlans = workoutPlans.filter(p => 
      p.id !== plan.id && // Exclude current plan
      p.is_active && 
      p.start_date <= (endDateStr || '9999-12-31') && 
      (!p.end_date || p.end_date >= startDateStr)
    );
    
    allCurrentDays.forEach(dayOfWeek => {
      const dayNames = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const dayName = dayNames[dayOfWeek];
      
      const conflictingPlan = conflictingPlans.find(p =>
        (planWorkouts?.some(pw => pw.plan_id === p.id && pw.day_of_week === dayOfWeek)) ||
        workoutPlanDays.some(day => day.plan_id === p.id && day.day_of_week === dayOfWeek)
      );
      
      if (conflictingPlan) {
        conflicts.push(`${dayName}: conflicts with plan "${conflictingPlan.name}"`);
      }
    });
    
    return conflicts;
  };

  const handleDayToggle = (dayValue: number) => {
    setFormData(prev => ({
      ...prev,
      selected_days: prev.selected_days.includes(dayValue) 
        ? prev.selected_days.filter(day => day !== dayValue)
        : [...prev.selected_days, dayValue]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Plan name is required",
        variant: "destructive",
      });
      return;
    }

    if (formData.selected_days.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one day",
        variant: "destructive",
      });
      return;
    }

    if (formData.end_date && formData.end_date < formData.start_date) {
      toast({
        title: "Validation Error",
        description: "End date must be after start date",
        variant: "destructive",
      });
      return;
    }

    // Check for conflicts
    const conflicts = checkForConflicts();
    if (conflicts.length > 0) {
      setConflictDetails(conflicts);
      setShowConflictWarning(true);
      return;
    }

    try {
      // First update the workout plan
      await updateWorkoutPlan(plan.id, {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        start_date: format(formData.start_date, 'yyyy-MM-dd'),
        end_date: formData.end_date ? format(formData.end_date, 'yyyy-MM-dd') : null,
        is_active: formData.is_active
      }, formData.apply_to_future);

      // Update workout plan days
      // First, delete existing days for this plan
      await supabase
        .from('workout_plan_days')
        .delete()
        .eq('plan_id', plan.id);

      // Delete existing plan workouts
      await supabase
        .from('plan_workouts')
        .delete()
        .eq('plan_id', plan.id);

      // Create new workout_plan_days entries
      if (formData.selected_days.length > 0) {
        const planDayEntries = formData.selected_days.map(dayOfWeek => ({
          plan_id: plan.id,
          day_of_week: dayOfWeek,
          muscle_groups: [], // You might want to preserve or update muscle groups
          start_time: formData.start_time || null,
          end_time: formData.end_time || null
        }));

        const { error: dayError } = await supabase
          .from('workout_plan_days')
          .insert(planDayEntries);

        if (dayError) {
          throw dayError;
        }
      }

      toast({
        title: "Success",
        description: "Workout plan updated successfully",
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error updating workout plan:', error);
      toast({
        title: "Error",
        description: "Failed to update workout plan",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Workout Plan</DialogTitle>
          <DialogDescription>
            Update your workout plan details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="plan-name">Plan Name *</Label>
            <Input
              id="plan-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Monday Chest Workout"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description of your workout plan"
              rows={3}
            />
          </div>

          <div>
            <Label>Days of Week *</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {daysOfWeek.map((day) => (
                <div key={day.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`day-${day.value}`}
                    checked={formData.selected_days.includes(day.value)}
                    onCheckedChange={() => handleDayToggle(day.value)}
                  />
                  <Label htmlFor={`day-${day.value}`} className="text-sm cursor-pointer">
                    {day.label}
                  </Label>
                </div>
              ))}
            </div>
            {formData.selected_days.length === 0 && (
              <p className="text-sm text-destructive mt-1">Please select at least one day</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
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
                    onSelect={(date) => date && setFormData({ ...formData, start_date: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>End Date</Label>
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
                    {formData.end_date ? format(formData.end_date, "PPP") : <span>No end date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.end_date}
                    onSelect={(date) => setFormData({ ...formData, end_date: date })}
                    disabled={(date) => date < formData.start_date}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Start Time (Optional)</Label>
              <Input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                placeholder="Leave empty to use schedule time"
              />
            </div>

            <div>
              <Label>End Time (Optional)</Label>
              <Input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                placeholder="Leave empty to use schedule time"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Active Plan</Label>
              <p className="text-sm text-muted-foreground">
                Active plans will show up in your workout calendar
              </p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Apply Changes to Future Days</Label>
              <p className="text-sm text-muted-foreground">
                Update workout sessions and plans from today forward
              </p>
            </div>
            <Switch
              checked={formData.apply_to_future}
              onCheckedChange={(checked) => setFormData({ ...formData, apply_to_future: checked })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Update Plan
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* Conflict Warning Dialog */}
      <Dialog open={showConflictWarning} onOpenChange={setShowConflictWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Workout Schedule Conflict</DialogTitle>
            <DialogDescription>
              The date changes conflict with existing workout plans. Please review the conflicts below:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {conflictDetails.map((conflict, index) => (
              <div key={index} className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive font-medium">{conflict}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowConflictWarning(false)}>
              Go Back & Edit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}