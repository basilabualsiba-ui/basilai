import { useState, useEffect, useMemo } from 'react';
import { useGym } from '@/contexts/GymContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dumbbell, Play, CheckCircle2, TrendingUp, Plus, List, Users, Sparkles } from 'lucide-react';
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

  useEffect(() => {
    const fetchExerciseData = async () => {
      if (!todayWorkout || todayWorkout.exercises.length === 0) return;

      try {
        const exerciseIds = todayWorkout.exercises.map(ex => ex.id);
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

  // No workout scheduled - show empty state with options
  if (!todayWorkout || todayWorkout.exercises.length === 0) {
    return (
      <div className="min-h-screen bg-background p-4 flex flex-col">
        {/* Empty State Card */}
        <Card className="border-gym/30 bg-gradient-to-br from-gym/5 to-transparent animate-fade-in">
          <CardContent className="p-8 text-center space-y-6">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-gym/30 blur-2xl rounded-full animate-pulse" />
              <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gym/20 flex items-center justify-center">
                <Dumbbell className="h-10 w-10 text-gym" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">No workout scheduled</h2>
              <p className="text-muted-foreground">Choose how you'd like to start</p>
            </div>
            
            <div className="space-y-3 pt-2">
              <Button 
                onClick={onStartBlankWorkout} 
                className="w-full h-14 bg-gym hover:bg-gym/90 text-white font-semibold shadow-lg shadow-gym/25 hover:shadow-gym/40 transition-all duration-300 hover:scale-[1.02] group"
              >
                <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                Start Blank Workout
                <Sparkles className="h-4 w-4 ml-2 opacity-60" />
              </Button>
              
              <Button 
                onClick={() => setIsWorkoutSelectOpen(true)} 
                variant="outline" 
                className="w-full h-14 border-gym/30 hover:border-gym hover:bg-gym/10 transition-all duration-300 hover:scale-[1.02] group"
              >
                <List className="h-5 w-5 mr-2 text-gym group-hover:scale-110 transition-transform duration-300" />
                Select from Saved Workouts
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Workout Selection Dialog */}
        <Dialog open={isWorkoutSelectOpen} onOpenChange={setIsWorkoutSelectOpen}>
          <DialogContent className="max-w-md border-gym/30 bg-gradient-to-br from-background to-gym/5">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <List className="h-5 w-5 text-gym" />
                Select a Workout
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {workouts.length === 0 ? (
                <div className="text-center py-8 animate-fade-in">
                  <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">
                    No saved workouts. Create one first!
                  </p>
                </div>
              ) : (
                workouts.map((workout, index) => (
                  <Card 
                    key={workout.id}
                    className="cursor-pointer border-transparent hover:border-gym/50 hover:bg-gym/10 transition-all duration-300 hover:scale-[1.01] animate-fade-in"
                    style={{ animationDelay: `${index * 0.05}s` }}
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
                            <Badge key={muscle} variant="secondary" className="text-xs bg-gym/10 text-gym border-gym/20">
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
      if (!muscleScores[exercise.muscle_group]) {
        muscleScores[exercise.muscle_group] = { score: 0, isMain: true };
      }
      muscleScores[exercise.muscle_group].score += 0.75;
      muscleScores[exercise.muscle_group].isMain = true;
      
      const sideMuscles = exercise.side_muscle_groups || [];
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
    
    const totalScore = Object.values(muscleScores).reduce((sum, { score }) => sum + score, 0);
    const musclePercentages = Object.entries(muscleScores).map(([muscle, { score, isMain }]) => ({
      muscle,
      percentage: Math.round((score / totalScore) * 100),
      isMain
    })).sort((a, b) => b.percentage - a.percentage);
    
    return musclePercentages;
  };
  
  const muscleDistribution = calculateMuscleDistribution();

  const getMuscleGroupDetails = (muscleName: string) => {
    const muscleGroup = muscleGroups.find(mg => mg.name === muscleName);
    return {
      icon: '💪',
      color: muscleGroup?.color || '#ff7f00',
      photo_url: muscleGroup?.photo_url || null
    };
  };

  const workoutName = useMemo(() => {
    if (todayWorkout?.session?.notes) {
      const match = todayWorkout.session.notes.match(/Workout: (.+)/);
      if (match) return match[1];
    }
    const sessionMuscles = todayWorkout?.session?.muscle_groups;
    if (sessionMuscles && sessionMuscles.length > 0 && workouts.length > 0) {
      const matchingWorkout = workouts.find(w => 
        w.muscle_groups?.length === sessionMuscles.length &&
        w.muscle_groups?.every((m: string) => sessionMuscles.includes(m))
      );
      if (matchingWorkout) return matchingWorkout.name;
    }
    return null;
  }, [todayWorkout, workouts]);

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Workout Name Header */}
      <div className="mb-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">{workoutName || 'Today\'s Workout'}</h1>
        <p className="text-sm text-gym font-medium mt-1">
          {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Today'}
        </p>
      </div>

      {/* Target Muscles Section - Grid Layout */}
      <div className="mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <h2 className="text-sm font-medium text-muted-foreground mb-4">Target Muscles</h2>
        
        <div className="grid grid-cols-4 gap-3">
          {muscleDistribution.map(({ muscle, percentage, isMain }, index) => {
            const details = getMuscleGroupDetails(muscle);
            return (
              <div 
                key={muscle} 
                className="text-center animate-scale-in"
                style={{ animationDelay: `${0.15 + index * 0.05}s` }}
              >
                <div 
                  className="w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center mb-2 mx-auto border-2 transition-all duration-300 hover:scale-110 hover:shadow-lg" 
                  style={{
                    backgroundColor: `${details.color}15`,
                    borderColor: details.color,
                    boxShadow: `0 4px 12px ${details.color}20`
                  }}
                >
                  {details.photo_url ? (
                    <img src={details.photo_url} alt={muscle} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">{details.icon}</span>
                  )}
                </div>
                <div className="text-xs text-foreground font-medium truncate">{muscle}</div>
                <div className="text-xs font-bold" style={{ color: details.color }}>
                  {percentage}%
                </div>
                {!isMain && (
                  <div className="text-[10px] text-muted-foreground">Side</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Exercises Section */}
      <div className="mb-32">
        <div className="flex items-center justify-between mb-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-sm font-medium text-muted-foreground">
            {todayWorkout.exercises.length} Exercises
          </h2>
        </div>

        <div className="space-y-3">
          {todayWorkout.exercises.map((exercise, index) => {
            const details = getMuscleGroupDetails(exercise.muscle_group);
            return (
              <Card 
                key={exercise.id} 
                className="bg-card border-border cursor-pointer hover:border-gym/50 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg hover:shadow-gym/10 animate-fade-in" 
                style={{ animationDelay: `${0.25 + index * 0.05}s` }}
                onClick={() => handleExerciseClick(exercise)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-14 h-14 bg-muted rounded-xl flex items-center justify-center overflow-hidden">
                        {exercise.photo_url ? (
                          <img src={exercise.photo_url} alt={exercise.name} className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          <Dumbbell className="h-7 w-7 text-muted-foreground" />
                        )}
                      </div>
                      <div 
                        className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg overflow-hidden border-2 border-background shadow-sm"
                        style={{ backgroundColor: `${details.color}30` }}
                      >
                        {details.photo_url ? (
                          <img src={details.photo_url} alt={exercise.muscle_group} className="w-full h-full object-cover" />
                        ) : (
                          <div 
                            className="w-full h-full flex items-center justify-center text-xs" 
                            style={{ backgroundColor: details.color }}
                          >
                            {details.icon}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{exercise.name}</h3>
                      {isCompleted && sessionSets[exercise.id] ? (
                        <div className="space-y-0.5 mt-1">
                          {sessionSets[exercise.id].map((set, idx) => (
                            <p key={idx} className="text-xs text-muted-foreground">
                              Set {set.set_number}: {set.weight}kg × {set.reps} reps
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
                          3 Sets • 12-10-8 Reps
                        </p>
                      )}
                      {!isCompleted && exercisePRs[exercise.id] && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <TrendingUp className="h-3 w-3 text-gym" />
                          <span className="text-xs text-gym font-medium">
                            PR: {exercisePRs[exercise.id].weight}kg × {exercisePRs[exercise.id].reps}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Start Workout Button */}
      <div className="fixed bottom-20 md:bottom-4 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/95 to-transparent z-50">
        {isCompleted ? (
          <div className="space-y-2 animate-fade-in">
            <div className="flex items-center justify-center gap-3 p-3 bg-card rounded-xl border border-border shadow-sm">
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
            <div className="w-full h-14 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center shadow-lg">
              <CheckCircle2 className="h-5 w-5 mr-2 text-green-500" />
              <span className="text-green-500 font-semibold text-lg">Workout Completed</span>
            </div>
          </div>
        ) : (
          <Button 
            onClick={onStartWorkout} 
            className="w-full h-14 bg-gym hover:bg-gym/90 text-white font-semibold text-lg shadow-xl shadow-gym/25 hover:shadow-gym/40 transition-all duration-300 hover:scale-[1.02] rounded-xl animate-fade-in"
          >
            <Play className="h-5 w-5 mr-2" />
            {isToday ? 'Start Workout' : 'Log Workout'}
          </Button>
        )}
      </div>

      {/* Workout Selection Dialog */}
      <Dialog open={isWorkoutSelectOpen} onOpenChange={setIsWorkoutSelectOpen}>
        <DialogContent className="max-w-md border-gym/30 bg-gradient-to-br from-background to-gym/5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <List className="h-5 w-5 text-gym" />
              Select a Workout
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {workouts.length === 0 ? (
              <div className="text-center py-8 animate-fade-in">
                <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">
                  No saved workouts. Create one first!
                </p>
              </div>
            ) : (
              workouts.map((workout, index) => (
                <Card 
                  key={workout.id}
                  className="cursor-pointer border-transparent hover:border-gym/50 hover:bg-gym/10 transition-all duration-300 hover:scale-[1.01] animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
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
                          <Badge key={muscle} variant="secondary" className="text-xs bg-gym/10 text-gym border-gym/20">
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

      {/* Exercise Info Dialog */}
      <ExerciseInfoDialog exercise={selectedExercise} open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  );
}
