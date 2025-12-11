import { useState, useEffect } from 'react';
import { useGym } from '@/contexts/GymContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Dumbbell, Play, Target, CheckCircle2, TrendingUp, Plus, List, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ExerciseInfoDialog } from './exercise-info-dialog';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
interface WorkoutOverviewProps {
  onStartWorkout: () => void;
  onBack: () => void;
  selectedDate?: Date;
  isToday?: boolean;
  onStartBlankWorkout?: () => void;
  onSelectWorkout?: (workoutId: string) => void;
}
export function WorkoutOverview({
  onStartWorkout,
  onBack,
  selectedDate,
  isToday = true,
  onStartBlankWorkout,
  onSelectWorkout
}: WorkoutOverviewProps) {
  const {
    getTodayWorkout,
    getWorkoutForDate,
    muscleGroups,
    workouts,
    updateSessionTrainer
  } = useGym();
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [exercisePRs, setExercisePRs] = useState<Record<string, { weight: number; reps: number }>>({});
  const [sessionSets, setSessionSets] = useState<Record<string, Array<{ weight: number; reps: number; set_number: number }>>>({});
  const [isWorkoutSelectOpen, setIsWorkoutSelectOpen] = useState(false);
  const todayWorkout = selectedDate ? getWorkoutForDate(format(selectedDate, 'yyyy-MM-dd')) : getTodayWorkout();
  const isCompleted = todayWorkout?.session?.completed_at;
  console.log('WorkoutOverview - todayWorkout:', todayWorkout);
  console.log('WorkoutOverview - isCompleted:', isCompleted);

  useEffect(() => {
    const fetchExerciseData = async () => {
      if (!todayWorkout || todayWorkout.exercises.length === 0) return;

      try {
        const exerciseIds = todayWorkout.exercises.map(ex => ex.id);
        const prs: Record<string, { weight: number; reps: number }> = {};

        // Fetch PRs for each exercise
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

        // If workout is completed, fetch the actual sets from this session
        if (isCompleted && todayWorkout.session) {
          const { data: completedSets } = await supabase
            .from('exercise_sets')
            .select('exercise_id, weight, reps, set_number')
            .eq('session_id', todayWorkout.session.id)
            .not('completed_at', 'is', null)
            .order('set_number', { ascending: true });

          if (completedSets) {
            const setsGrouped: Record<string, Array<{ weight: number; reps: number; set_number: number }>> = {};
            completedSets.forEach(set => {
              if (!setsGrouped[set.exercise_id]) {
                setsGrouped[set.exercise_id] = [];
              }
              setsGrouped[set.exercise_id].push({
                weight: set.weight || 0,
                reps: set.reps || 0,
                set_number: set.set_number
              });
            });
            setSessionSets(setsGrouped);
          }
        }
      } catch (error) {
        console.error('Error fetching exercise data:', error);
      }
    };

    fetchExerciseData();
  }, [todayWorkout?.exercises, isCompleted, todayWorkout?.session?.id]);
  const handleExerciseClick = (exercise: any) => {
    setSelectedExercise(exercise);
    setIsDialogOpen(true);
  };
  const handleWorkoutSelect = (workoutId: string) => {
    setIsWorkoutSelectOpen(false);
    if (onSelectWorkout) {
      onSelectWorkout(workoutId);
    }
  };

  if (!todayWorkout || todayWorkout.exercises.length === 0) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Card className="text-center py-12">
          <CardContent className="space-y-6">
            <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-lg font-medium text-foreground mb-2">No workout scheduled</h3>
              <p className="text-muted-foreground">Choose how you'd like to start</p>
            </div>
            
            <div className="flex flex-col gap-3 max-w-md mx-auto">
              <Button 
                onClick={onStartBlankWorkout} 
                variant="default" 
                className="w-full h-12"
              >
                <Plus className="h-5 w-5 mr-2" />
                Start Blank Workout
              </Button>
              
              <Button 
                onClick={() => setIsWorkoutSelectOpen(true)} 
                variant="outline" 
                className="w-full h-12"
              >
                <List className="h-5 w-5 mr-2" />
                Select from Saved Workouts
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Workout Selection Dialog */}
        <Dialog open={isWorkoutSelectOpen} onOpenChange={setIsWorkoutSelectOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Select a Workout</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {workouts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No saved workouts. Create one first!
                </p>
              ) : (
                workouts.map((workout) => (
                  <Card 
                    key={workout.id}
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleWorkoutSelect(workout.id)}
                  >
                    <CardContent className="p-4">
                      <h4 className="font-medium text-foreground">{workout.name}</h4>
                      {workout.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {workout.description}
                        </p>
                      )}
                      {workout.muscle_groups && workout.muscle_groups.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {workout.muscle_groups.map((muscle: string) => (
                            <Badge key={muscle} variant="secondary" className="text-xs">
                              {muscle}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
  // Calculate muscle distribution with percentages
  const calculateMuscleDistribution = () => {
    const muscleScores: Record<string, { score: number; isMain: boolean }> = {};
    
    todayWorkout.exercises.forEach(exercise => {
      // Main muscle gets 75% weight
      if (!muscleScores[exercise.muscle_group]) {
        muscleScores[exercise.muscle_group] = { score: 0, isMain: true };
      }
      muscleScores[exercise.muscle_group].score += 0.75;
      muscleScores[exercise.muscle_group].isMain = true; // Mark as main muscle
      
      // Side muscles get 25% weight (split among them)
      const sideMuscles = exercise.side_muscle_groups || [];
      if (sideMuscles.length > 0) {
        const sideWeight = 0.25 / sideMuscles.length;
        sideMuscles.forEach(sideMuscle => {
          if (!muscleScores[sideMuscle]) {
            muscleScores[sideMuscle] = { score: 0, isMain: false };
          }
          muscleScores[sideMuscle].score += sideWeight;
          // Keep isMain as false only if it was never a main muscle
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
  
  const muscleDistribution = calculateMuscleDistribution();

  // Get muscle group icons and colors
  const getMuscleGroupDetails = (muscleName: string) => {
    const muscleGroup = muscleGroups.find(mg => mg.name === muscleName);
    return {
      icon: '💪',
      color: muscleGroup?.color || '#ff7f00',
      photo_url: muscleGroup?.photo_url || null
    };
  };
  return <div className="min-h-screen bg-background p-4">
      {/* Target Muscles Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-muted-foreground">Target Muscles</h2>
        </div>
        
        <div className="grid grid-cols-4 gap-4">
          {muscleDistribution.map(({ muscle, percentage, isMain }) => {
          const details = getMuscleGroupDetails(muscle);
          return <div key={muscle} className="text-center">
                <div className="w-16 h-16 rounded-lg overflow-hidden flex items-center justify-center mb-2 mx-auto border-2" style={{
              backgroundColor: `${details.color}20`,
              borderColor: details.color
            }}>
                  {details.photo_url ? <img src={details.photo_url} alt={muscle} className="w-full h-full object-cover" /> : <span className="text-2xl">{details.icon}</span>}
                </div>
                <div className="text-xs text-foreground font-medium">{muscle}</div>
                <div className="text-xs font-semibold" style={{ color: details.color }}>
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
          <h2 className="text-lg font-medium text-muted-foreground">{todayWorkout.exercises.length} Exercises</h2>
        </div>

        <div className="space-y-3">
          {todayWorkout.exercises.map((exercise, index) => {
          const details = getMuscleGroupDetails(exercise.muscle_group);
          return <Card key={exercise.id} className="bg-card border-border cursor-pointer hover:border-primary/30 transition-colors" onClick={() => handleExerciseClick(exercise)}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                        {exercise.photo_url ? <img src={exercise.photo_url} alt={exercise.name} className="w-full h-full object-cover rounded-lg" /> : <Dumbbell className="h-6 w-6 text-muted-foreground" />}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg overflow-hidden border-2 border-white">
                        {details.photo_url ? <img src={details.photo_url} alt={exercise.muscle_group} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs" style={{
                      backgroundColor: details.color
                    }}>
                            {details.icon}
                          </div>}
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">{exercise.name}</h3>
                      {isCompleted && sessionSets[exercise.id] ? (
                        <div className="space-y-1 mt-1">
                          {sessionSets[exercise.id].map((set, idx) => (
                            <p key={idx} className="text-sm text-muted-foreground">
                              Set {set.set_number}: {set.weight}kg × {set.reps} reps
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          3 SETS • 12-10-8 REPS
                        </p>
                      )}
                      {!isCompleted && exercisePRs[exercise.id] && (
                        <div className="flex items-center gap-1 mt-1">
                          <TrendingUp className="h-3 w-3 text-primary" />
                          <span className="text-xs text-primary font-medium">
                            PR: {exercisePRs[exercise.id].weight}kg × {exercisePRs[exercise.id].reps}
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

      {/* Start Workout Button */}
      <div className="fixed bottom-20 md:bottom-4 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/80 to-transparent z-50">
        {isCompleted ? (
          <div className="space-y-2">
            {/* Trainer Toggle for completed workout */}
            <div className="flex items-center justify-center gap-3 p-3 bg-card rounded-lg border border-border">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">With Trainer</span>
              <Switch
                checked={todayWorkout.session?.with_trainer || false}
                onCheckedChange={(checked) => {
                  if (todayWorkout.session) {
                    updateSessionTrainer(todayWorkout.session.id, checked);
                  }
                }}
              />
            </div>
            <div className="w-full h-14 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center justify-center shadow-lg">
              <CheckCircle2 className="h-5 w-5 mr-2 text-green-500" />
              <span className="text-green-500 font-semibold text-lg">Workout Completed</span>
            </div>
          </div>
        ) : (
          <Button onClick={onStartWorkout} className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg shadow-lg">
            <Play className="h-5 w-5 mr-2" />
            {isToday ? 'Start Workout' : 'Log Workout'}
          </Button>
        )}
      </div>

      {/* Exercise Info Dialog */}
      <ExerciseInfoDialog exercise={selectedExercise} open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>;
}