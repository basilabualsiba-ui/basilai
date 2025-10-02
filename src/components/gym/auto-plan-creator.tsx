import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Plus, Calendar as CalendarIcon, Target, Search, Clock } from 'lucide-react';
import { format, addDays, differenceInDays, startOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useGym } from '@/contexts/GymContext';

interface Workout {
  id: string;
  name: string;
  description: string | null;
  muscle_groups: string[];
}

const daysOfWeek = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' }
];

export function AutoPlanCreator() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [showConflictWarning, setShowConflictWarning] = useState(false);
  const [conflictDetails, setConflictDetails] = useState<string[]>([]);
  const [todayOnly, setTodayOnly] = useState(false);
  const { toast } = useToast();
  const { workoutPlans, workoutPlanDays, planWorkouts } = useGym();
  const [workoutSearchTerm, setWorkoutSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    selectedDays: [] as number[],
    selectedWorkout: '',
    startTime: '',
    endTime: ''
  });

  useEffect(() => {
    fetchWorkouts();
  }, []);

  const fetchWorkouts = async () => {
    try {
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .order('name');

      if (error) throw error;
      setWorkouts(data || []);
    } catch (error) {
      console.error('Error fetching workouts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch workouts",
        variant: "destructive",
      });
    }
  };

  // Filter workouts based on search term
  const filteredWorkouts = workouts.filter(workout =>
    workout.name.toLowerCase().includes(workoutSearchTerm.toLowerCase()) ||
    (workout.description && workout.description.toLowerCase().includes(workoutSearchTerm.toLowerCase())) ||
    workout.muscle_groups.some(mg => mg.toLowerCase().includes(workoutSearchTerm.toLowerCase()))
  );

  const getOccurrencesOfDay = (start: Date, end: Date, dayOfWeek: number): Date[] => {
    const dates: Date[] = [];
    const current = startOfDay(start);
    const endDay = startOfDay(end);
    
    while (current <= endDay) {
      const currentDay = current.getDay() === 0 ? 7 : current.getDay(); // Convert Sunday from 0 to 7
      if (currentDay === dayOfWeek) {
        dates.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  };

  const handleDayToggle = (dayValue: number) => {
    setFormData(prev => ({
      ...prev,
      selectedDays: prev.selectedDays.includes(dayValue) 
        ? prev.selectedDays.filter(day => day !== dayValue)
        : [...prev.selectedDays, dayValue]
    }));
  };

  const checkForConflicts = () => {
    if (!startDate || !endDate || formData.selectedDays.length === 0) return [];
    
    const conflicts: string[] = [];
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');
    
    // Check for existing active plans that overlap with selected days and date range
    const conflictingPlans = workoutPlans.filter(plan => 
      plan.is_active && 
      plan.start_date <= endDateStr && 
      (!plan.end_date || plan.end_date >= startDateStr)
    );
    
    formData.selectedDays.forEach(dayOfWeek => {
      const dayName = daysOfWeek.find(d => d.value === dayOfWeek)?.label;
      const conflictingPlan = conflictingPlans.find(plan =>
        (planWorkouts?.some(pw => pw.plan_id === plan.id && pw.day_of_week === dayOfWeek)) ||
        workoutPlanDays.some(day => day.plan_id === plan.id && day.day_of_week === dayOfWeek)
      );
      
      if (conflictingPlan) {
        conflicts.push(`${dayName}: conflicts with plan "${conflictingPlan.name}"`);
      }
    });
    
    return conflicts;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (todayOnly) {
      // Today only mode: only need name and workout
      if (!formData.name || !formData.selectedWorkout) {
        toast({
          title: "Validation Error",
          description: "Please fill in plan name and select a workout",
          variant: "destructive",
        });
        return;
      }
    } else {
      // Normal mode: need all fields
      if (!formData.name || formData.selectedDays.length === 0 || !formData.selectedWorkout || !startDate || !endDate) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields including days and workout",
          variant: "destructive",
        });
        return;
      }
    }

    if (!todayOnly && endDate && startDate && endDate < startDate) {
      toast({
        title: "Validation Error",
        description: "End date must be after start date",
        variant: "destructive",
      });
      return;
    }

    // Check for conflicts (only in normal mode)
    if (!todayOnly) {
      const conflicts = checkForConflicts();
      if (conflicts.length > 0) {
        setConflictDetails(conflicts);
        setShowConflictWarning(true);
        return;
      }
    }

    try {
      const selectedWorkout = workouts.find(w => w.id === formData.selectedWorkout);
      if (!selectedWorkout) return;

      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      const todayDayOfWeek = today.getDay() === 0 ? 7 : today.getDay();

      // Create the workout plan
      const { data: planData, error: planError } = await supabase
        .from('workout_plans')
        .insert({
          name: formData.name,
          description: todayOnly 
            ? 'One-time workout plan for today'
            : `Auto-generated plan for ${formData.selectedDays.map(d => daysOfWeek.find(day => day.value === d)?.label).join(', ')} workouts`,
          start_date: todayOnly ? todayStr : format(startDate!, 'yyyy-MM-dd'),
          end_date: todayOnly ? todayStr : format(endDate!, 'yyyy-MM-dd'),
          is_active: true
        })
        .select()
        .single();

      if (planError) throw planError;

      // Create workout_plan_days entries
      const planDayEntries = todayOnly 
        ? [{
            plan_id: planData.id,
            day_of_week: todayDayOfWeek,
            muscle_groups: selectedWorkout.muscle_groups,
            start_time: formData.startTime || null,
            end_time: formData.endTime || null
          }]
        : formData.selectedDays.map(dayOfWeek => ({
            plan_id: planData.id,
            day_of_week: dayOfWeek,
            muscle_groups: selectedWorkout.muscle_groups,
            start_time: formData.startTime || null,
            end_time: formData.endTime || null
          }));

      if (planDayEntries.length > 0) {
        const { error: dayError } = await supabase
          .from('workout_plan_days')
          .insert(planDayEntries);

        if (dayError) throw dayError;
      }

      // Create plan_workouts entries for tracking
      const totalOccurrences = todayOnly 
        ? 1
        : formData.selectedDays.reduce((total, dayOfWeek) => {
            return total + getOccurrencesOfDay(startDate!, endDate!, dayOfWeek).length;
          }, 0);

      const planWorkoutEntries = todayOnly
        ? [{
            plan_id: planData.id,
            workout_id: formData.selectedWorkout,
            day_of_week: todayDayOfWeek
          }]
        : formData.selectedDays.flatMap(dayOfWeek => 
            getOccurrencesOfDay(startDate!, endDate!, dayOfWeek).map(() => ({
              plan_id: planData.id,
              workout_id: formData.selectedWorkout,
              day_of_week: dayOfWeek
            }))
          );

      if (planWorkoutEntries.length > 0) {
        const { error: workoutError } = await supabase
          .from('plan_workouts')
          .insert(planWorkoutEntries);

        if (workoutError) throw workoutError;
      }

      toast({
        title: "Success",
        description: todayOnly 
          ? "Workout plan created for today"
          : `Plan created with ${totalOccurrences} sessions across ${formData.selectedDays.length} days`,
      });

      // Reset form and close dialog
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error creating auto plan:', error);
      toast({
        title: "Error",
        description: "Failed to create workout plan",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      selectedDays: [],
      selectedWorkout: '',
      startTime: '',
      endTime: ''
    });
    setStartDate(new Date());
    setEndDate(undefined);
    setWorkoutSearchTerm('');
    setShowConflictWarning(false);
    setConflictDetails([]);
    setTodayOnly(false);
  };

  const selectedDayOccurrences = startDate && endDate && formData.selectedDays.length > 0 ? 
    formData.selectedDays.reduce((total, dayOfWeek) => {
      return total + getOccurrencesOfDay(startDate, endDate, dayOfWeek).length;
    }, 0) : 0;

  return (
    <Dialog open={isDialogOpen} onOpenChange={(open) => {
      setIsDialogOpen(open);
      if (!open) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Workout Plan</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Workout Plan</DialogTitle>
          <DialogDescription>
            Create a plan that automatically schedules a workout for specific days across a date range
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="plan-name">Plan Name</Label>
            <Input
              id="plan-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Monday Chest Blaster"
              required
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="space-y-0.5">
              <Label htmlFor="today-only">Today Only</Label>
              <p className="text-sm text-muted-foreground">
                Create a one-time workout plan for today
              </p>
            </div>
            <Switch
              id="today-only"
              checked={todayOnly}
              onCheckedChange={setTodayOnly}
            />
          </div>

          {!todayOnly && (
            <div>
              <Label>Days of Week *</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {daysOfWeek.map((day) => (
                <div key={day.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`day-${day.value}`}
                    checked={formData.selectedDays.includes(day.value)}
                    onCheckedChange={() => handleDayToggle(day.value)}
                  />
                  <Label htmlFor={`day-${day.value}`} className="text-sm cursor-pointer">
                    {day.label}
                  </Label>
                </div>
              ))}
            </div>
              {formData.selectedDays.length === 0 && (
                <p className="text-sm text-destructive mt-1">Please select at least one day</p>
              )}
            </div>
          )}

          {!todayOnly && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : <span>Pick start date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
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
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : <span>Pick end date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => startDate ? date < startDate : false}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="start-time"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-time">End Time</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="end-time"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Select Workout *</Label>
            
            {/* Search input for workouts */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search workouts..."
                value={workoutSearchTerm}
                onChange={(e) => setWorkoutSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
              {workouts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No workouts available. Create some workouts first.
                </p>
              ) : filteredWorkouts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No workouts found matching your search.
                </p>
              ) : (
                filteredWorkouts.map((workout) => (
                  <div key={workout.id} className="flex items-start space-x-2">
                    <input
                      type="radio"
                      id={workout.id}
                      name="selectedWorkout"
                      checked={formData.selectedWorkout === workout.id}
                      onChange={() => setFormData(prev => ({ ...prev, selectedWorkout: workout.id }))}
                      className="mt-1"
                    />
                    <label
                      htmlFor={workout.id}
                      className="text-sm font-medium flex-1 cursor-pointer flex items-center gap-2"
                    >
                      <Target className="h-4 w-4 text-primary" />
                      <div className="flex-1">
                        <div className="font-medium">{workout.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {workout.muscle_groups.join(', ')}
                          {workout.description && ` • ${workout.description}`}
                        </div>
                      </div>
                    </label>
                  </div>
                ))
              )}
            </div>
            {!formData.selectedWorkout && (
              <p className="text-sm text-destructive mt-1">Please select a workout</p>
            )}
          </div>

          {!todayOnly && selectedDayOccurrences > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <CalendarIcon className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-sm text-muted-foreground">
                    This will create <span className="font-medium text-foreground">{selectedDayOccurrences}</span> workout plans
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.selectedDays.map(dayValue => 
                      daysOfWeek.find(d => d.value === dayValue)?.label
                    ).join(', ')} from{' '}
                    {startDate && format(startDate, 'MMM d')} to {endDate && format(endDate, 'MMM d, yyyy')}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {todayOnly && formData.selectedWorkout && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <CalendarIcon className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-sm text-muted-foreground">
                    This will create a workout plan for <span className="font-medium text-foreground">today</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(), 'EEEE, MMM d, yyyy')}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={todayOnly ? !formData.selectedWorkout : selectedDayOccurrences === 0}
            >
              Create a Plan
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
              The selected days conflict with existing workout plans. Please review the conflicts below:
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