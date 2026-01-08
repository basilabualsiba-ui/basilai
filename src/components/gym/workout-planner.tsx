import { useState } from 'react';
import { useGym } from '@/contexts/GymContext';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Settings, Dumbbell, CheckCircle, XCircle, Target } from 'lucide-react';
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

  // Stats
  const activePlansCount = workoutPlans.filter(plan => plan.is_active).length;
  const completedThisMonth = workoutSessions.filter(s => {
    const date = new Date(s.scheduled_date);
    const now = new Date();
    return date.getMonth() === now.getMonth() && 
           date.getFullYear() === now.getFullYear() && 
           s.completed_at;
  }).length;

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
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mt-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gym/10 flex items-center justify-center">
              <Target className="h-5 w-5 text-gym" />
            </div>
            Workout Planner
          </h2>
          <p className="text-muted-foreground mt-1">Manage your workout plans and schedule</p>
        </div>
        <AutoPlanCreator />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="border-gym/20 bg-gradient-to-br from-gym/5 to-transparent">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gym/10 flex items-center justify-center">
              <Dumbbell className="h-5 w-5 text-gym" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gym">{activePlansCount}</p>
              <p className="text-xs text-muted-foreground">Active Plans</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-success/20 bg-gradient-to-br from-success/5 to-transparent">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-success">{completedThisMonth}</p>
              <p className="text-xs text-muted-foreground">This Month</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-muted/20 bg-gradient-to-br from-muted/5 to-transparent col-span-2 sm:col-span-1">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted/20 flex items-center justify-center">
              <CalendarIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{workoutPlans.length}</p>
              <p className="text-xs text-muted-foreground">Total Plans</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="w-full sm:w-auto bg-gym/5 border border-gym/20">
          <TabsTrigger 
            value="calendar" 
            className="flex-1 sm:flex-initial flex items-center gap-2 data-[state=active]:bg-gym data-[state=active]:text-gym-foreground"
          >
            <CalendarIcon className="h-4 w-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger 
            value="manage" 
            className="flex-1 sm:flex-initial flex items-center gap-2 data-[state=active]:bg-gym data-[state=active]:text-gym-foreground"
          >
            <Settings className="h-4 w-4" />
            Manage Plans
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-6">
          <div className="flex justify-center">
            <Card className="w-fit border-gym/20 bg-gradient-to-br from-background via-background to-gym/5">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 justify-center text-gym">
                  <CalendarIcon className="h-5 w-5" />
                  Select Workout Date
                </CardTitle>
                {/* Legend */}
                <div className="flex flex-wrap justify-center gap-3 pt-3 border-t border-gym/10 mt-3">
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="w-3 h-3 rounded-full bg-success/30 border border-success/50" />
                    <span className="text-muted-foreground">Completed</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="w-3 h-3 rounded-full bg-destructive/30 border border-destructive/50" />
                    <span className="text-muted-foreground">Missed</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="w-3 h-3 rounded-full bg-gym/20 border border-gym/40" />
                    <span className="text-muted-foreground">Scheduled</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex justify-center pt-2">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  className="rounded-xl border-0 pointer-events-auto"
                  modifiers={{
                    completedWorkout: (date) => hasCompletedWorkout(date),
                    missedWorkout: (date) => hasMissedWorkout(date),
                    scheduledWorkout: (date) => hasWorkoutForDate(date) && !hasCompletedWorkout(date) && !hasMissedWorkout(date),
                  }}
                  modifiersStyles={{
                    completedWorkout: { 
                      backgroundColor: 'hsl(142 76% 36% / 0.15)',
                      border: '2px solid hsl(142 76% 36% / 0.5)',
                      color: 'hsl(142 76% 36%)',
                      fontWeight: '700',
                      borderRadius: '8px'
                    },
                    missedWorkout: { 
                      backgroundColor: 'hsl(0 84% 60% / 0.15)',
                      border: '2px solid hsl(0 84% 60% / 0.5)',
                      color: 'hsl(0 84% 60%)',
                      fontWeight: '700',
                      borderRadius: '8px'
                    },
                    scheduledWorkout: { 
                      backgroundColor: 'hsl(var(--gym) / 0.15)',
                      border: '2px solid hsl(var(--gym) / 0.4)',
                      color: 'hsl(var(--gym))',
                      fontWeight: '600',
                      borderRadius: '8px'
                    },
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="manage" className="mt-6">
          <WorkoutPlanManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
