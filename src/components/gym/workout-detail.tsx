import { useState, useEffect } from 'react';
import { ArrowLeft, Target, Timer, Dumbbell, Users, Calendar, TrendingUp } from 'lucide-react';
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
    photo_url?: string;
    video_url?: string;
    side_muscle_groups?: string[];
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
  const [exercisePRs, setExercisePRs] = useState<Record<string, { weight: number; reps: number }>>({});
  const { toast } = useToast();
  const { exercises, muscleGroups } = useGym();

  useEffect(() => {
    fetchWorkoutDetails();
    fetchExercisePRs();
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

  const fetchExercisePRs = async () => {
    try {
      // Get all exercise IDs from the workout
      const { data: workoutExercises } = await supabase
        .from('workout_exercises')
        .select('exercise_id')
        .eq('workout_id', workoutId);

      if (!workoutExercises) return;

      const exerciseIds = workoutExercises.map(we => we.exercise_id);

      // Fetch PRs for each exercise
      const prs: Record<string, { weight: number; reps: number }> = {};
      
      for (const exerciseId of exerciseIds) {
        const { data: sets } = await supabase
          .from('exercise_sets')
          .select('weight, reps')
          .eq('exercise_id', exerciseId)
          .not('completed_at', 'is', null)
          .order('weight', { ascending: false })
          .limit(1);

        if (sets && sets.length > 0) {
          prs[exerciseId] = {
            weight: sets[0].weight || 0,
            reps: sets[0].reps || 0
          };
        }
      }

      setExercisePRs(prs);
    } catch (error) {
      console.error('Error fetching exercise PRs:', error);
    }
  };

  // Calculate muscle distribution with percentages
  const calculateMuscleDistribution = () => {
    const muscleScores: Record<string, { score: number; isMain: boolean }> = {};
    
    workoutExercises.forEach(we => {
      // Main muscle gets 75% weight
      if (!muscleScores[we.exercise.muscle_group]) {
        muscleScores[we.exercise.muscle_group] = { score: 0, isMain: true };
      }
      muscleScores[we.exercise.muscle_group].score += 0.75;
      
      // Side muscles get 25% weight (split among them)
      const sideMuscles = we.exercise.side_muscle_groups || [];
      if (sideMuscles.length > 0) {
        const sideWeight = 0.25 / sideMuscles.length;
        sideMuscles.forEach(sideMuscle => {
          if (!muscleScores[sideMuscle]) {
            muscleScores[sideMuscle] = { score: 0, isMain: false };
          }
          muscleScores[sideMuscle].score += sideWeight;
        });
      }
    });
    
    // Calculate total and convert to percentages
    const totalScore = Object.values(muscleScores).reduce((sum, { score }) => sum + score, 0);
    const musclePercentages = Object.entries(muscleScores).map(([muscle, { score, isMain }]) => ({
      muscle,
      percentage: Math.round((score / totalScore) * 100),
      isMain
    })).sort((a, b) => b.percentage - a.percentage);
    
    return musclePercentages;
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
    <div className="min-h-screen bg-background p-4">
      {/* Target Muscles Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-muted-foreground">Target Muscles</h2>
        </div>
        
        <div className="grid grid-cols-4 gap-4">
          {calculateMuscleDistribution().map(({ muscle, percentage, isMain }) => {
            const muscleGroup = muscleGroups.find(mg => mg.name === muscle);
            const color = muscleGroup?.color || '#ff7f00';
            const photo_url = muscleGroup?.photo_url;
            
            return <div key={muscle} className="text-center">
              <div className="w-16 h-16 rounded-lg overflow-hidden flex items-center justify-center mb-2 mx-auto border-2" style={{
                backgroundColor: `${color}20`,
                borderColor: color
              }}>
                {photo_url ? <img src={photo_url} alt={muscle} className="w-full h-full object-cover" /> : <span className="text-2xl">💪</span>}
              </div>
              <div className="text-xs text-foreground font-medium">{muscle}</div>
              <div className="text-xs font-semibold" style={{ color }}>
                {percentage}%
              </div>
              {!isMain && <div className="text-[10px] text-muted-foreground">Side</div>}
            </div>;
          })}
        </div>
      </div>

      {/* Exercises Section */}
      <div className="mb-20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-muted-foreground">{workoutExercises.length} Exercises</h2>
        </div>

        <div className="space-y-3">
          {workoutExercises.map((workoutExercise, index) => {
            const muscleGroup = muscleGroups.find(mg => mg.name === workoutExercise.exercise.muscle_group);
            const color = muscleGroup?.color || '#ff7f00';
            const photo_url = muscleGroup?.photo_url;
            
            return <Card 
              key={workoutExercise.id} 
              className="bg-card border-border cursor-pointer hover:border-primary/30 transition-colors" 
              onClick={() => handleExerciseClick(workoutExercise.exercise)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                      {workoutExercise.exercise.photo_url ? 
                        <img src={workoutExercise.exercise.photo_url} alt={workoutExercise.exercise.name} className="w-full h-full object-cover rounded-lg" /> : 
                        <Dumbbell className="h-6 w-6 text-muted-foreground" />
                      }
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg overflow-hidden border-2 border-white">
                      {photo_url ? 
                        <img src={photo_url} alt={workoutExercise.exercise.muscle_group} className="w-full h-full object-cover" /> : 
                        <div className="w-full h-full flex items-center justify-center text-xs" style={{
                          backgroundColor: color
                        }}>
                          💪
                        </div>
                      }
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">{workoutExercise.exercise.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {workoutExercise.sets} SETS • {workoutExercise.reps} REPS
                    </p>
                    {exercisePRs[workoutExercise.exercise_id] && (
                      <div className="flex items-center gap-1 mt-1">
                        <TrendingUp className="h-3 w-3 text-primary" />
                        <span className="text-xs text-primary font-medium">
                          PR: {exercisePRs[workoutExercise.exercise_id].weight}kg × {exercisePRs[workoutExercise.exercise_id].reps}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>;
          })}
        </div>
      </div>

      <ExerciseInfoDialog
        exercise={selectedExercise}
        open={showExerciseDialog}
        onOpenChange={setShowExerciseDialog}
      />
    </div>
  );
}