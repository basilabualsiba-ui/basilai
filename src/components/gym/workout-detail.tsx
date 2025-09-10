import { useState, useEffect } from 'react';
import { ArrowLeft, Target, Timer, Dumbbell, Users, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useGym } from '@/contexts/GymContext';
import { ExerciseInfoDialog } from './exercise-info-dialog';

interface WorkoutDetailProps {
  workoutId: string;
  onBack: () => void;
}

interface WorkoutExercise {
  id: string;
  exercise_id: string;
  order_index: number;
  sets: number;
  reps: number;
  weight: number;
  rest_seconds: number;
  exercise: {
    id: string;
    name: string;
    muscle_group: string;
    equipment?: string;
    difficulty_level?: string;
    instructions?: string;
  };
}

interface WorkoutDetails {
  id: string;
  name: string;
  description?: string;
  muscle_groups: string[];
  created_at: string;
}

export function WorkoutDetail({ workoutId, onBack }: WorkoutDetailProps) {
  const [workout, setWorkout] = useState<WorkoutDetails | null>(null);
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [showExerciseDialog, setShowExerciseDialog] = useState(false);
  const { toast } = useToast();
  const { exercises } = useGym();

  useEffect(() => {
    fetchWorkoutDetails();
  }, [workoutId]);

  const fetchWorkoutDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch workout details
      const { data: workoutData, error: workoutError } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', workoutId)
        .single();

      if (workoutError) throw workoutError;
      setWorkout(workoutData);

      // Fetch workout exercises with exercise details
      const { data: exercisesData, error: exercisesError } = await supabase
        .from('workout_exercises')
        .select('*')
        .eq('workout_id', workoutId)
        .order('order_index');

      if (exercisesError) throw exercisesError;

      // Map exercises with their details
      const exercisesWithDetails = exercisesData?.map(we => ({
        ...we,
        exercise: exercises.find(ex => ex.id === we.exercise_id) || {
          id: we.exercise_id,
          name: 'Unknown Exercise',
          muscle_group: 'Unknown',
        }
      })) || [];

      setWorkoutExercises(exercisesWithDetails);
    } catch (error) {
      console.error('Error fetching workout details:', error);
      toast({
        title: "Error",
        description: "Failed to load workout details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTotalEstimatedTime = () => {
    let totalTime = 0;
    
    workoutExercises.forEach((we, index) => {
      // Each set takes approximately 40 seconds
      const exerciseTime = we.sets * 40;
      
      // Rest time between sets within the same exercise (sets - 1)
      const restBetweenSets = Math.max(0, we.sets - 1) * (we.rest_seconds || 60);
      
      totalTime += exerciseTime + restBetweenSets;
      
      // Rest time between exercises (use the rest time of current exercise)
      if (index < workoutExercises.length - 1) {
        totalTime += (we.rest_seconds || 60);
      }
    });
    
    return Math.round(totalTime / 60);
  };

  const getUniqueEquipment = () => {
    const equipment = workoutExercises
      .map(we => we.exercise.equipment)
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index);
    return equipment;
  };

  const handleExerciseClick = (exercise: any) => {
    setSelectedExercise(exercise);
    setShowExerciseDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Target className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading workout details...</p>
        </div>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="text-center py-12">
        <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Workout not found</h3>
        <Button onClick={onBack}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{workout.name}</h1>
          <p className="text-muted-foreground">Workout details and exercises</p>
        </div>
      </div>

      {/* Workout Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Workout Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {workout.description && (
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-muted-foreground">{workout.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <Dumbbell className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-sm text-muted-foreground">Exercises</p>
              <p className="text-lg font-bold">{workoutExercises.length}</p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <Timer className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-sm text-muted-foreground">Est. Time</p>
              <p className="text-lg font-bold">{getTotalEstimatedTime()}min</p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-sm text-muted-foreground">Muscle Groups</p>
              <p className="text-lg font-bold">{workout.muscle_groups.length}</p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <Calendar className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="text-lg font-bold">{new Date(workout.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Target Muscle Groups</h4>
            <div className="flex flex-wrap gap-2">
              {workout.muscle_groups.map((muscle) => (
                <Badge key={muscle} variant="secondary">
                  {muscle}
                </Badge>
              ))}
            </div>
          </div>

          {getUniqueEquipment().length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Equipment Needed</h4>
              <div className="flex flex-wrap gap-2">
                {getUniqueEquipment().map((equipment) => (
                  <Badge key={equipment} variant="outline">
                    {equipment}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exercises List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            Exercises ({workoutExercises.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {workoutExercises.length === 0 ? (
            <div className="text-center py-8">
              <Dumbbell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No exercises added</h3>
              <p className="text-muted-foreground">This workout doesn't have any exercises yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {workoutExercises.map((workoutExercise, index) => (
                 <div 
                   key={workoutExercise.id} 
                   className="border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                   onClick={() => handleExerciseClick(workoutExercise.exercise)}
                 >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-semibold">{workoutExercise.exercise.name}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {workoutExercise.exercise.muscle_group}
                          </Badge>
                          {workoutExercise.exercise.equipment && (
                            <Badge variant="outline" className="text-xs">
                              {workoutExercise.exercise.equipment}
                            </Badge>
                          )}
                          {workoutExercise.exercise.difficulty_level && (
                            <Badge variant="outline" className="text-xs">
                              {workoutExercise.exercise.difficulty_level}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 mb-3">
                    <div className="text-center p-3 bg-muted/30 rounded">
                      <p className="text-sm text-muted-foreground">Sets</p>
                      <p className="text-lg font-bold">{workoutExercise.sets}</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded">
                      <p className="text-sm text-muted-foreground">Reps</p>
                      <p className="text-lg font-bold">{workoutExercise.reps}</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded">
                      <p className="text-sm text-muted-foreground">Weight</p>
                      <p className="text-lg font-bold">{workoutExercise.weight}kg</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded">
                      <p className="text-sm text-muted-foreground">Rest</p>
                      <p className="text-lg font-bold">{workoutExercise.rest_seconds}s</p>
                    </div>
                  </div>

                  {workoutExercise.exercise.instructions && (
                    <div className="bg-muted/20 p-3 rounded">
                      <p className="text-sm font-medium mb-1">Instructions</p>
                      <p className="text-sm text-muted-foreground">
                        {workoutExercise.exercise.instructions}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ExerciseInfoDialog
        exercise={selectedExercise}
        open={showExerciseDialog}
        onOpenChange={setShowExerciseDialog}
      />
    </div>
  );
}