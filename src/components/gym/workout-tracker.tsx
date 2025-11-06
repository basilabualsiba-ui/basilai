import { useState, useEffect } from 'react';
import { useGym } from '@/contexts/GymContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Play, Square, Timer, Dumbbell, Plus, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SaveWorkoutTemplateDialog } from './save-workout-template-dialog';

export function WorkoutTracker() {
  const { 
    getTodayWorkout, 
    startWorkoutSession,
    startBlankWorkoutSession,
    completeWorkoutSession, 
    addExerciseSet,
    exerciseSets,
    workoutSessions,
    workoutPlans,
    workoutPlanDays,
    exercises: allExercises
  } = useGym();
  
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [isWorkoutDialogOpen, setIsWorkoutDialogOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [workoutExerciseDetails, setWorkoutExerciseDetails] = useState<Record<string, any>>({});
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [sessionExercises, setSessionExercises] = useState<any[]>([]);
  const [setData, setSetData] = useState({
    weight: '',
    reps: '',
    rest_seconds: '60'
  });

  const { toast } = useToast();

  const todayWorkout = getTodayWorkout();
  const activeSession = workoutSessions.find(s => s.id === currentSession);

  // Fetch workout exercise details when we have a today's workout
  useEffect(() => {
    const fetchWorkoutExerciseDetails = async () => {
      if (!todayWorkout || todayWorkout.exercises.length === 0) return;
      
      try {
        const exerciseIds = todayWorkout.exercises.map(ex => ex.id);
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
  }, [todayWorkout]);

  // Load session exercises when session changes
  useEffect(() => {
    const loadSessionExercises = async () => {
      if (!currentSession) {
        setSessionExercises([]);
        return;
      }

      const session = workoutSessions.find(s => s.id === currentSession);
      if (!session?.exercise_ids || session.exercise_ids.length === 0) {
        setSessionExercises([]);
        return;
      }

      // Filter exercises based on session's exercise_ids
      const exercises = allExercises.filter(ex => 
        session.exercise_ids?.includes(ex.id)
      );
      setSessionExercises(exercises);
    };

    loadSessionExercises();
  }, [currentSession, workoutSessions, allExercises]);

  // Check if there's an active session from today
  useEffect(() => {
    const todaySession = workoutSessions.find(session => {
      const today = new Date().toISOString().split('T')[0];
      return session.scheduled_date === today && 
             session.started_at && 
             !session.completed_at;
    });
    if (todaySession) {
      setCurrentSession(todaySession.id);
    }
  }, [workoutSessions]);

  const getActivePlanIdForToday = (): string | null => {
    const today = new Date();
    const todayDate = today.toISOString().split('T')[0];
    const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
    const activePlan = workoutPlans.find(plan => 
      plan.is_active && 
      plan.start_date <= todayDate && 
      (!plan.end_date || plan.end_date >= todayDate)
    );
    if (!activePlan) return null;
    const hasDay = workoutPlanDays.some(day => day.plan_id === activePlan.id && day.day_of_week === dayOfWeek);
    return hasDay ? activePlan.id : null;
  };

  const handleStartWorkout = async () => {
    if (!todayWorkout || todayWorkout.exercises.length === 0) {
      toast({
        title: "No workout scheduled",
        description: "Create a plan for today before starting.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const planId = getActivePlanIdForToday();
      if (!planId) {
        toast({
          title: "No workout plan",
          description: "No active plan found for today.",
          variant: "destructive",
        });
        return;
      }
      const sessionId = await startWorkoutSession(
        planId,
        today,
        todayWorkout.exercises.map(ex => ex.muscle_group),
        todayWorkout.exercises.map(ex => ex.id)
      );
      setCurrentSession(sessionId);
      setSessionExercises(todayWorkout.exercises);
      setIsWorkoutDialogOpen(true);
    } catch (error) {
      console.error('Failed to start workout:', error);
    }
  };

  const handleStartBlankWorkout = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const sessionId = await startBlankWorkoutSession(today);
      setCurrentSession(sessionId);
      setSessionExercises([]);
      setIsWorkoutDialogOpen(true);
    } catch (error) {
      console.error('Failed to start blank workout:', error);
    }
  };

  const handleCompleteWorkout = async () => {
    if (!currentSession) return;
    
    const session = workoutSessions.find(s => s.id === currentSession);
    const isBlankWorkout = !session?.plan_id;
    
    await completeWorkoutSession(currentSession);
    
    // Show save template dialog for blank workouts with exercises
    if (isBlankWorkout && sessionExercises.length > 0) {
      setIsSaveTemplateOpen(true);
    } else {
      setCurrentSession(null);
      setSessionExercises([]);
      setIsWorkoutDialogOpen(false);
    }
  };

  const handleSaveTemplateComplete = () => {
    setIsSaveTemplateOpen(false);
    setCurrentSession(null);
    setSessionExercises([]);
    setIsWorkoutDialogOpen(false);
  };

  const handleAddSet = async () => {
    if (!selectedExercise || !currentSession) return;

    // Count existing sets for this exercise in current session
    const existingSets = exerciseSets.filter(set => 
      set.session_id === currentSession && set.exercise_id === selectedExercise.id
    );

    // Use predefined values if available, otherwise use form input
    const exerciseDetails = workoutExerciseDetails[selectedExercise.id];
    const defaultWeight = exerciseDetails?.weight || 0;
    const defaultReps = exerciseDetails?.reps || 10;
    const defaultRest = exerciseDetails?.rest_seconds || 60;

    await addExerciseSet({
      session_id: currentSession,
      exercise_id: selectedExercise.id,
      set_number: existingSets.length + 1,
      weight: parseFloat(setData.weight) || defaultWeight,
      reps: parseInt(setData.reps) || defaultReps,
      rest_seconds: parseInt(setData.rest_seconds) || defaultRest
    });

    // Reset form
    setSetData({ weight: '', reps: '', rest_seconds: '' });
  };

  const getExerciseSets = (exerciseId: string) => {
    if (!currentSession) return [];
    return exerciseSets
      .filter(set => set.session_id === currentSession && set.exercise_id === exerciseId)
      .sort((a, b) => a.set_number - b.set_number);
  };

  const getLastPerformance = (exerciseId: string) => {
    const lastSets = exerciseSets
      .filter(set => set.exercise_id === exerciseId && set.session_id !== currentSession)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
    
    return lastSets;
  };

  const getTotalVolume = () => {
    if (!currentSession) return 0;
    return exerciseSets
      .filter(set => set.session_id === currentSession)
      .reduce((total, set) => total + ((set.weight || 0) * (set.reps || 0)), 0);
  };

  const getWorkoutDuration = () => {
    if (!activeSession?.started_at) return 0;
    const start = new Date(activeSession.started_at);
    const now = new Date();
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60));
  };

  if (!todayWorkout || todayWorkout.exercises.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Workout Tracker</h2>
          <p className="text-muted-foreground">Track your workout progress</p>
        </div>

        <Card>
          <CardContent className="text-center py-12">
            <Dumbbell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium text-foreground mb-2">No workout scheduled for today</h3>
            <p className="text-muted-foreground mb-4">
              Create a workout plan to see your scheduled workouts here
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Workout Tracker</h2>
          <p className="text-muted-foreground">Today's workout session</p>
        </div>
        
        <div className="flex gap-2">
          {!currentSession ? (
            <>
              {todayWorkout && todayWorkout.exercises.length > 0 && (
                <Button onClick={handleStartWorkout} className="flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  Start Today's Workout
                </Button>
              )}
              <Button 
                onClick={handleStartBlankWorkout} 
                variant="outline"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Start Blank Workout
              </Button>
            </>
          ) : (
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => setIsWorkoutDialogOpen(true)}
                className="flex items-center gap-2"
              >
                <Dumbbell className="h-4 w-4" />
                Continue Workout
              </Button>
              <Button 
                onClick={handleCompleteWorkout}
                className="flex items-center gap-2"
              >
                <Square className="h-4 w-4" />
                Finish Workout
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Today's Workout Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            Today's Workout - {format(new Date(), 'EEEE, MMMM d')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {Array.from(new Set([
              ...todayWorkout.exercises.map(ex => ex.muscle_group),
              ...todayWorkout.exercises.flatMap(ex => ex.side_muscle_groups || [])
            ])).map(muscle => (
              <Badge key={muscle} variant="outline">{muscle}</Badge>
            ))}
          </div>

          {currentSession && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-primary/5 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="text-lg font-bold">{getWorkoutDuration()}min</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Exercises</p>
                <p className="text-lg font-bold">{todayWorkout.exercises.length}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Volume</p>
                <p className="text-lg font-bold">{(getTotalVolume() / 1000).toFixed(1)}k</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Sets Done</p>
                <p className="text-lg font-bold">
                  {exerciseSets.filter(set => set.session_id === currentSession).length}
                </p>
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {todayWorkout.exercises.map(exercise => {
              const currentSets = getExerciseSets(exercise.id);
              const lastPerformance = getLastPerformance(exercise.id);

              return (
                <Card key={exercise.id} className="relative">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{exercise.name}</CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{exercise.muscle_group}</Badge>
                      {exercise.side_muscle_groups?.map(sideGroup => (
                        <Badge key={sideGroup} variant="secondary" className="text-xs">
                          {sideGroup}
                        </Badge>
                      ))}
                      {exercise.equipment && (
                        <Badge variant="secondary">{exercise.equipment}</Badge>
                      )}
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
                          <span>3 sets × 10 reps</span>
                        )}
                      </div>
                    </div>

                    {/* Current Session Sets */}
                    {currentSets.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium mb-2">Completed Sets</h4>
                        <div className="space-y-2">
                          {currentSets.map((set, index) => (
                            <div key={set.id} className="flex items-center justify-between text-sm bg-muted/50 p-2 rounded">
                              <span>Set {index + 1}</span>
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

                    {currentSession && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedExercise(exercise);
                          setIsWorkoutDialogOpen(true);
                        }}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Set
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Workout Dialog */}
      <Dialog open={isWorkoutDialogOpen} onOpenChange={setIsWorkoutDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedExercise ? `Add Set - ${selectedExercise.name}` : 'Active Workout'}
            </DialogTitle>
            <DialogDescription>
              {selectedExercise 
                ? 'Enter your set details'
                : `Workout Duration: ${getWorkoutDuration()} minutes`
              }
            </DialogDescription>
          </DialogHeader>
          
          {selectedExercise ? (
            <div className="space-y-4">
              {/* Show planned values */}
              <div className="p-3 bg-muted/30 rounded-md">
                <h4 className="text-sm font-medium mb-2">Planned for this exercise:</h4>
                <div className="text-sm text-muted-foreground">
                  {workoutExerciseDetails[selectedExercise.id] ? (
                    <span>
                      {workoutExerciseDetails[selectedExercise.id].sets} sets × {workoutExerciseDetails[selectedExercise.id].reps} reps 
                      {workoutExerciseDetails[selectedExercise.id].weight > 0 && ` @ ${workoutExerciseDetails[selectedExercise.id].weight}kg`}
                      • Rest: {workoutExerciseDetails[selectedExercise.id].rest_seconds}s
                    </span>
                  ) : (
                    <span>3 sets × 10 reps • Rest: 60s</span>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    value={setData.weight}
                    onChange={(e) => setSetData({ ...setData, weight: e.target.value })}
                    placeholder={workoutExerciseDetails[selectedExercise.id]?.weight?.toString() || "0"}
                  />
                </div>
                <div>
                  <Label htmlFor="reps">Reps</Label>
                  <Input
                    id="reps"
                    type="number"
                    value={setData.reps}
                    onChange={(e) => setSetData({ ...setData, reps: e.target.value })}
                    placeholder={workoutExerciseDetails[selectedExercise.id]?.reps?.toString() || "10"}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="rest">Rest Time (seconds)</Label>
                <Input
                  id="rest"
                  type="number"
                  value={setData.rest_seconds}
                  onChange={(e) => setSetData({ ...setData, rest_seconds: e.target.value })}
                  placeholder={workoutExerciseDetails[selectedExercise.id]?.rest_seconds?.toString() || "60"}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddSet} className="flex-1">
                  Add Set
                </Button>
                <Button variant="outline" onClick={() => setSelectedExercise(null)}>
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <Timer className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-lg font-medium">Workout in progress</p>
                <p className="text-sm text-muted-foreground">
                  Select an exercise to add sets
                </p>
              </div>
              <Button onClick={() => setIsWorkoutDialogOpen(false)} className="w-full">
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Save Workout Template Dialog */}
      <SaveWorkoutTemplateDialog
        open={isSaveTemplateOpen}
        onOpenChange={setIsSaveTemplateOpen}
        exercises={sessionExercises}
        onSave={handleSaveTemplateComplete}
      />
    </div>
  );
}