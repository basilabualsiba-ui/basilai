import { useState } from 'react';
import { useGym } from '@/contexts/GymContext';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar as CalendarIcon, Settings } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { WorkoutFlow } from './workout-flow';
import { AutoPlanCreator } from './auto-plan-creator';
import { WorkoutPlanManager } from './workout-plan-manager';

export function WorkoutPlanner() {
  const { workoutPlans, workoutPlanDays, planWorkouts, workoutSessions } = useGym();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showWorkoutFlow, setShowWorkoutFlow] = useState(false);
  const [isToday, setIsToday] = useState(true);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setIsToday(isSameDay(date, new Date()));
      setShowWorkoutFlow(true);
    }
  };

  const handleBackFromWorkout = () => {
    setShowWorkoutFlow(false);
    setSelectedDate(new Date());
    setIsToday(true);
  };

  const hasWorkoutForDate = (date: Date) => {
    const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();
    const dateString = format(date, 'yyyy-MM-dd');
    
    const activePlans = workoutPlans.filter(plan => 
      plan.is_active && 
      plan.start_date <= dateString && 
      (!plan.end_date || plan.end_date >= dateString)
    );

    if (activePlans.length === 0) return false;

    // A date has a workout if ANY active plan has a day matching this dayOfWeek
    return activePlans.some(plan =>
      (planWorkouts?.some(pw => pw.plan_id === plan.id && pw.day_of_week === dayOfWeek)) ||
      workoutPlanDays.some(day => day.plan_id === plan.id && day.day_of_week === dayOfWeek)
    );
  };

  const hasCompletedWorkout = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return workoutSessions.some(session => 
      session.scheduled_date === dateString && session.completed_at !== null
    );
  };

  const hasMissedWorkout = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    // Only check past dates (not today or future)
    if (checkDate >= today) return false;
    
    const dateString = format(date, 'yyyy-MM-dd');
    const hasScheduled = hasWorkoutForDate(date);
    const hasCompleted = workoutSessions.some(session => 
      session.scheduled_date === dateString && session.completed_at !== null
    );
    
    // Missed if scheduled but not completed on a past date
    return hasScheduled && !hasCompleted;
  };

  if (showWorkoutFlow && selectedDate) {
    return (
      <WorkoutFlow 
        onBack={handleBackFromWorkout}
        selectedDate={selectedDate}
        isToday={isToday}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="calendar" className="w-full">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6 mt-6">
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-bold text-foreground">Workout Planner</h2>
            <p className="text-muted-foreground">Manage your workout plans and schedule</p>
          </div>
          <div className="flex items-center gap-2">
            <AutoPlanCreator />
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
                  Select Workout Date
                </CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  className="rounded-md border pointer-events-auto"
                  modifiers={{
                    completedWorkout: (date) => hasCompletedWorkout(date),
                    missedWorkout: (date) => hasMissedWorkout(date),
                    scheduledWorkout: (date) => hasWorkoutForDate(date) && !hasCompletedWorkout(date) && !hasMissedWorkout(date),
                  }}
                  modifiersStyles={{
                    completedWorkout: { 
                      backgroundColor: 'hsl(142 76% 36% / 0.15)',
                      border: '1px solid hsl(142 76% 36% / 0.4)',
                      color: 'hsl(142 76% 36%)',
                      fontWeight: '600'
                    },
                    missedWorkout: { 
                      backgroundColor: 'hsl(0 84% 60% / 0.15)',
                      border: '1px solid hsl(0 84% 60% / 0.4)',
                      color: 'hsl(0 84% 60%)',
                      fontWeight: '600'
                    },
                    scheduledWorkout: { 
                      backgroundColor: 'hsl(var(--primary) / 0.1)',
                      border: '1px solid hsl(var(--primary) / 0.3)'
                    },
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="manage">
          <WorkoutPlanManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}