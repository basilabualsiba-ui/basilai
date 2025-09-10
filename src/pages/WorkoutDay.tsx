import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGym } from '@/contexts/GymContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Dumbbell, Clock, Play, Check, TrendingUp, Plus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { WorkoutMusicPlayer } from '@/components/gym/workout-music-player';

interface WorkoutWithExercises {
  id: string;
  name: string;
  description: string | null;
  muscle_groups: string[];
  exercises: {
    id: string;
    name: string;
    sets: number;
    reps: number;
    weight: number;
    rest_seconds: number;
  }[];
}

interface WorkoutSession {
  id: string;
  scheduled_date: string;
  muscle_groups: string[];
  plan_id: string;
  started_at: string | null;
  completed_at: string | null;
  total_duration_minutes: number | null;
  notes: string | null;
}

export default function WorkoutDay() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { workoutPlans, workoutPlanDays, exerciseSets, workoutSessions } = useGym();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayWorkouts, setDayWorkouts] = useState<WorkoutWithExercises[]>([]);
  const [workoutSession, setWorkoutSession] = useState<WorkoutSession | null>(null);
  const [workoutExerciseDetails, setWorkoutExerciseDetails] = useState<Record<string, any>>({});
  const { toast } = useToast();

  const isToday = selectedDate ? format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') : false;

  // Fetch workout exercise details when we have workouts
  useEffect(() => {
    const fetchWorkoutExerciseDetails = async () => {
      if (!dayWorkouts || dayWorkouts.length === 0) return;
      
      try {
        const exerciseIds = dayWorkouts.flatMap(workout => workout.exercises.map(ex => ex.id));
        if (exerciseIds.length === 0) return;

        const { data: workoutExercises, error } = await supabase
          .from('workout_exercises')
          .select('*')
          .in('exercise_id', exerciseIds);
        
        if (error) throw error;
        
        const detailsMap: Record<string, any> = {};
        workoutExercises?.forEach(we => {
          detailsMap[we.exercise_id] = we;
        });
        
        setWorkoutExerciseDetails(detailsMap);
      } catch (error) {
        console.error('Error fetching workout exercise details:', error);
      }
    };
    
    fetchWorkoutExerciseDetails();
  }, [dayWorkouts]);

  useEffect(() => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      try {
        const date = parseISO(dateParam);
        setSelectedDate(date);
        fetchWorkoutsForDate(date);
        fetchWorkoutSession(dateParam);
      } catch (error) {
        console.error('Invalid date parameter:', error);
        navigate('/gym');
      }
    } else {
      navigate('/gym');
    }
  }, [searchParams, navigate, workoutPlans, workoutPlanDays]);

  const fetchWorkoutSession = async (dateString: string) => {
    try {
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('scheduled_date', dateString)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setWorkoutSession(data || null);
    } catch (error) {
      console.error('Error fetching workout session:', error);
    }
  };

  const fetchWorkoutsForDate = async (date: Date) => {
    try {
      const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();
      const dateString = format(date, 'yyyy-MM-dd');
      
      // Find active plan for this date (prefer one that has a day matching this weekday)
      const activePlans = workoutPlans.filter(plan => 
        plan.is_active && 
        plan.start_date <= dateString && 
        (!plan.end_date || plan.end_date >= dateString)
      );

      const activePlan = activePlans.find(plan => 
        workoutPlanDays.some(day => day.plan_id === plan.id && day.day_of_week === dayOfWeek)
      ) || activePlans[0];

      if (!activePlan) {
        setDayWorkouts([]);
        return;
      }

      // Get planned muscle groups for this day
      const dayPlan = workoutPlanDays.find(day => 
        day.plan_id === activePlan.id && day.day_of_week === dayOfWeek
      );

      if (!dayPlan) {
        setDayWorkouts([]);
        return;
      }

      // Fetch workouts that match the muscle groups
      const { data: workouts, error: workoutsError } = await supabase
        .from('workouts')
        .select('*')
        .overlaps('muscle_groups', dayPlan.muscle_groups);

      if (workoutsError) throw workoutsError;

      if (!workouts?.length) {
        setDayWorkouts([]);
        return;
      }

      // Fetch exercises for each workout
      const workoutsWithExercises = await Promise.all(
        workouts.map(async (workout) => {
          const { data: workoutExercises, error: exercisesError } = await supabase
            .from('workout_exercises')
            .select('sets, reps, weight, rest_seconds, exercise_id')
            .eq('workout_id', workout.id)
            .order('order_index');

          if (exercisesError) {
            console.error('Error fetching exercises:', exercisesError);
            return {
              ...workout,
              exercises: []
            };
          }

          if (!workoutExercises?.length) {
            return {
              ...workout,
              exercises: []
            };
          }

          // Get exercise details
          const exerciseIds = workoutExercises.map(we => we.exercise_id);
          const { data: exerciseDetails, error: detailsError } = await supabase
            .from('exercises')
            .select('id, name')
            .in('id', exerciseIds);

          if (detailsError) {
            console.error('Error fetching exercise details:', detailsError);
            return {
              ...workout,
              exercises: []
            };
          }

          return {
            ...workout,
            exercises: workoutExercises.map(we => {
              const exerciseDetail = exerciseDetails?.find(ed => ed.id === we.exercise_id);
              return {
                id: we.exercise_id,
                name: exerciseDetail?.name || 'Unknown Exercise',
                sets: we.sets || 0,
                reps: we.reps || 0,
                weight: we.weight || 0,
                rest_seconds: we.rest_seconds || 0,
              };
            })
          };
        })
      );

      setDayWorkouts(workoutsWithExercises);
    } catch (error) {
      console.error('Error fetching workouts for date:', error);
      setDayWorkouts([]);
    }
  };

  const getExerciseSets = (exerciseId: string) => {
    if (!workoutSession) return [];
    return exerciseSets
      .filter(set => set.session_id === workoutSession.id && set.exercise_id === exerciseId)
      .sort((a, b) => a.set_number - b.set_number);
  };

  const getLastPerformance = (exerciseId: string) => {
    const lastSets = exerciseSets
      .filter(set => set.exercise_id === exerciseId && set.session_id !== workoutSession?.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
    
    return lastSets;
  };

  const getTotalVolume = () => {
    if (!workoutSession) return 0;
    return exerciseSets
      .filter(set => set.session_id === workoutSession.id)
      .reduce((total, set) => total + ((set.weight || 0) * (set.reps || 0)), 0);
  };

  const getWorkoutDuration = () => {
    if (!workoutSession?.started_at) return 0;
    const start = new Date(workoutSession.started_at);
    const now = workoutSession.completed_at ? new Date(workoutSession.completed_at) : new Date();
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60));
  };

  const startWorkoutSession = async () => {
    if (!selectedDate) return;

    try {
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      const dayOfWeek = selectedDate.getDay() === 0 ? 7 : selectedDate.getDay();
      
      const activePlans = workoutPlans.filter(plan => 
        plan.is_active && 
        plan.start_date <= dateString && 
        (!plan.end_date || plan.end_date >= dateString)
      );

      const activePlan = activePlans.find(plan => 
        workoutPlanDays.some(day => day.plan_id === plan.id && day.day_of_week === dayOfWeek)
      ) || activePlans[0];

      if (!activePlan) return;

      const dayPlan = workoutPlanDays.find(day => 
        day.plan_id === activePlan.id && day.day_of_week === dayOfWeek
      );

      if (!dayPlan) return;

      const { data, error } = await supabase
        .from('workout_sessions')
        .insert({
          scheduled_date: dateString,
          muscle_groups: dayPlan.muscle_groups,
          plan_id: activePlan.id,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setWorkoutSession(data);
      toast({
        title: "Workout Started!",
        description: "Your workout session has been started. Good luck!",
      });
    } catch (error) {
      console.error('Error starting workout session:', error);
      toast({
        title: "Error",
        description: "Failed to start workout session",
        variant: "destructive",
      });
    }
  };

  const completeWorkoutSession = async () => {
    if (!workoutSession) return;

    try {
      const startTime = workoutSession.started_at ? new Date(workoutSession.started_at) : new Date();
      const endTime = new Date();
      const durationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));

      const { error } = await supabase
        .from('workout_sessions')
        .update({
          completed_at: endTime.toISOString(),
          total_duration_minutes: durationMinutes,
        })
        .eq('id', workoutSession.id);

      if (error) throw error;

      setWorkoutSession({
        ...workoutSession,
        completed_at: endTime.toISOString(),
        total_duration_minutes: durationMinutes,
      });

      toast({
        title: "Workout Completed!",
        description: `Great job! You worked out for ${durationMinutes} minutes.`,
      });
    } catch (error) {
      console.error('Error completing workout session:', error);
      toast({
        title: "Error",
        description: "Failed to complete workout session",
        variant: "destructive",
      });
    }
  };

  if (!selectedDate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Dumbbell className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
          <h2 className="text-2xl font-bold mb-4">Loading workout data...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Music Player - Always at top */}
      <WorkoutMusicPlayer 
        isWorkoutActive={!!workoutSession && !workoutSession.completed_at}
        onWorkoutStart={() => {}}
        onWorkoutEnd={() => {}}
      />

      {/* Header */}
      <header className="sticky top-16 z-40 border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/gym")} className="hover:bg-muted">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-gradient-accent">
                <Dumbbell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  {format(selectedDate, 'EEEE, MMMM d')}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {format(selectedDate, 'yyyy')}
                </p>
              </div>
            </div>
          </div>
          
          {/* Session Controls - Only show for today's date */}
          {format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') && (
            <div className="flex items-center gap-2">
              {!workoutSession && dayWorkouts.length > 0 && (
                <Button onClick={startWorkoutSession} className="gap-2">
                  <Play className="h-4 w-4" />
                  Start Workout
                </Button>
              )}
              {workoutSession && !workoutSession.completed_at && (
                <Button onClick={completeWorkoutSession} className="gap-2">
                  <Check className="h-4 w-4" />
                  Complete Workout
                </Button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-6 space-y-6">
        {/* Session Status */}
        {workoutSession && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Workout Session</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      {workoutSession.completed_at ? (
                        <span className="text-green-600 font-medium">✓ Completed</span>
                      ) : workoutSession.started_at ? (
                        <span className="text-yellow-600 font-medium">⏳ In Progress</span>
                      ) : (
                        <span className="text-muted-foreground">📅 Scheduled</span>
                      )}
                    </span>
                    {workoutSession.total_duration_minutes && (
                      <span>Duration: {workoutSession.total_duration_minutes} minutes</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Workouts */}
        {dayWorkouts.length > 0 ? (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {isToday ? "Today's Workouts" : `Workouts for ${format(selectedDate, 'EEEE, MMMM d')}`}
                </h2>
                <p className="text-muted-foreground">
                  {isToday ? "Your scheduled workout session" : "View your planned workout"}
                </p>
              </div>
            </div>

            {dayWorkouts.map(workout => (
              <Card key={workout.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Dumbbell className="h-5 w-5" />
                        {workout.name}
                      </CardTitle>
                      {workout.description && (
                        <p className="text-muted-foreground mt-2">{workout.description}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-4">
                    {workout.muscle_groups.map(muscle => (
                      <Badge key={muscle} variant="outline">
                        {muscle}
                      </Badge>
                    ))}
                  </div>
                </CardHeader>

                <CardContent>
                  {/* Workout Stats - only for active sessions */}
                  {workoutSession && isToday && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-primary/5 rounded-lg">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Duration</p>
                        <p className="text-lg font-bold">{getWorkoutDuration()}min</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Exercises</p>
                        <p className="text-lg font-bold">{workout.exercises.length}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Total Volume</p>
                        <p className="text-lg font-bold">{(getTotalVolume() / 1000).toFixed(1)}k</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Sets Done</p>
                        <p className="text-lg font-bold">
                          {exerciseSets.filter(set => set.session_id === workoutSession.id).length}
                        </p>
                      </div>
                    </div>
                  )}

                  {workout.exercises.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {workout.exercises.map((exercise, index) => {
                        const currentSets = getExerciseSets(exercise.id);
                        const lastPerformance = getLastPerformance(exercise.id);

                        return (
                          <Card key={exercise.id} className="relative">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg">{exercise.name}</CardTitle>
                              <div className="flex gap-2">
                                <Badge variant="outline">Exercise {index + 1}</Badge>
                              </div>
                            </CardHeader>
                            <CardContent>
                              {/* Planned Sets Display */}
                              <div className="mb-4">
                                <h4 className="text-sm font-medium mb-2">Planned Sets</h4>
                                <div className="text-sm text-muted-foreground bg-muted/30 p-2 rounded">
                                  {workoutExerciseDetails[exercise.id] ? (
                                    <span>
                                      {workoutExerciseDetails[exercise.id].sets} sets × {workoutExerciseDetails[exercise.id].reps} reps 
                                      {workoutExerciseDetails[exercise.id].weight > 0 && ` @ ${workoutExerciseDetails[exercise.id].weight}kg`}
                                    </span>
                                  ) : (
                                    <span>{exercise.sets} sets × {exercise.reps} reps{exercise.weight > 0 && ` @ ${exercise.weight}kg`}</span>
                                  )}
                                </div>
                              </div>

                              {/* Current Session Sets - only show for today */}
                              {currentSets.length > 0 && isToday && (
                                <div className="mb-4">
                                  <h4 className="text-sm font-medium mb-2">Completed Sets</h4>
                                  <div className="space-y-2">
                                    {currentSets.map((set, setIndex) => (
                                      <div key={set.id} className="flex items-center justify-between text-sm bg-muted/50 p-2 rounded">
                                        <span>Set {setIndex + 1}</span>
                                        <span>{set.weight}kg × {set.reps} reps</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Last Performance */}
                              {lastPerformance.length > 0 && (
                                <div className="mb-4">
                                  <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                                    <TrendingUp className="h-3 w-3" />
                                    Last Performance
                                  </h4>
                                  <div className="text-sm text-muted-foreground">
                                    {lastPerformance[0].weight}kg × {lastPerformance[0].reps} reps
                                    <span className="ml-2">({lastPerformance.length} sets)</span>
                                  </div>
                                </div>
                              )}

                              {/* Rest Time */}
                              {exercise.rest_seconds > 0 && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                                  <Clock className="h-3 w-3" />
                                  Rest: {exercise.rest_seconds}s
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Dumbbell className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">No exercises defined for this workout</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Dumbbell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No Workouts Scheduled</h3>
              <p className="text-muted-foreground">
                No workouts are planned for this day. Check your workout plans or create a new one.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}