import { useState, useEffect } from 'react';
import { useGym } from '@/contexts/GymContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Clock, Settings, CheckCircle, Dumbbell, Pause, Play, RotateCcw, TrendingUp, RefreshCw, ChevronUp, ChevronDown, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { WorkoutExerciseManager } from './workout-exercise-manager';
import { SwapExerciseDialog } from './swap-exercise-dialog';
import { supabase } from '@/integrations/supabase/client';

interface WorkoutTimerProps {
  sessionId: string;
  onExerciseSelect: (exercise: any, workoutConfig?: any) => void;
  onComplete: () => void;
  onCancel: () => void;
  onReset: () => void;
  completedExercises: Set<string>;
  currentExercises: any[];
  onExercisesChange: (exercises: any[]) => void;
}

export function WorkoutTimer({ 
  sessionId, 
  onExerciseSelect, 
  onComplete, 
  onCancel,
  onReset,
  completedExercises,
  currentExercises,
  onExercisesChange
}: WorkoutTimerProps) {
  const { getTodayWorkout, workoutSessions, exerciseSets, muscleGroups, exercises, updateSessionTrainer } = useGym();
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [isExerciseManagerOpen, setIsExerciseManagerOpen] = useState(false);
  const [isSwapDialogOpen, setIsSwapDialogOpen] = useState(false);
  const [exerciseToSwap, setExerciseToSwap] = useState<any>(null);
  const [workoutExerciseDetails, setWorkoutExerciseDetails] = useState<Record<string, any>>({});
  const [exercisePRs, setExercisePRs] = useState<Record<string, { weight: number; reps: number }>>({});
  const [computedCompletedExercises, setComputedCompletedExercises] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  
  const todayWorkout = getTodayWorkout();
  const session = workoutSessions.find(s => s.id === sessionId);

  useEffect(() => {
    const fetchWorkoutExerciseDetails = async () => {
      if (!currentExercises || currentExercises.length === 0) return;
      
      try {
        const exerciseIds = currentExercises.map(ex => ex.id);
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
  }, [currentExercises]);

  useEffect(() => {
    const computeCompletedExercises = () => {
      const completed = new Set<string>();
      
      currentExercises.forEach(exercise => {
        const exerciseHasSets = exerciseSets.some(
          set => set.session_id === sessionId && 
                 set.exercise_id === exercise.id && 
                 set.completed_at !== null
        );
        
        if (exerciseHasSets) {
          completed.add(exercise.id);
        }
      });
      
      setComputedCompletedExercises(completed);
    };
    
    computeCompletedExercises();
  }, [currentExercises, exerciseSets, sessionId]);

  useEffect(() => {
    const fetchExercisePRs = async () => {
      if (!currentExercises || currentExercises.length === 0) return;

      try {
        const exerciseIds = currentExercises.map(ex => ex.id);
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

    fetchExercisePRs();
  }, [currentExercises]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && session?.started_at) {
      const startTime = new Date(session.started_at).getTime();
      
      interval = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        setTimer(elapsed);
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [isRunning, session?.started_at]);

  if (!todayWorkout || !session) {
    return <div>Loading...</div>;
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const totalExercises = currentExercises.length;
  const completedCount = computedCompletedExercises.size;
  const progressPercentage = totalExercises > 0 ? (completedCount / totalExercises) * 100 : 0;

  const muscleDistribution = () => {
    const muscleScores: Record<string, { score: number; isMain: boolean }> = {};
    
    currentExercises.forEach(exercise => {
      if (!muscleScores[exercise.muscle_group]) {
        muscleScores[exercise.muscle_group] = { score: 0, isMain: true };
      }
      muscleScores[exercise.muscle_group].score += 0.75;
      muscleScores[exercise.muscle_group].isMain = true;
      
      const sideMuscles = exercise.side_muscle_groups || [];
      if (sideMuscles.length > 0) {
        const sideWeight = 0.25 / sideMuscles.length;
        sideMuscles.forEach((sideMuscle: string) => {
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
    
    const mainMuscles = musclePercentages.filter(m => m.isMain);
    const sideMuscles = musclePercentages.filter(m => !m.isMain);
    
    return { main: mainMuscles, side: sideMuscles };
  };
  
  const { main: mainMuscles, side: sideMuscles } = muscleDistribution();

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const handleCompleteWorkout = () => {
    if (completedCount < totalExercises) {
      toast({
        title: "Workout incomplete",
        description: `You have ${totalExercises - completedCount} exercises remaining.`,
        variant: "destructive"
      });
      return;
    }
    onComplete();
  };

  const handleSwapExercise = (newExerciseId: string) => {
    if (!exerciseToSwap) return;
    
    const newExercise = exercises.find(ex => ex.id === newExerciseId);
    
    if (!newExercise) {
      toast({
        title: "Error",
        description: "Could not find the selected exercise",
        variant: "destructive",
      });
      return;
    }
    
    const updatedExercises = currentExercises.map(ex => 
      ex.id === exerciseToSwap.id ? newExercise : ex
    );
    
    onExercisesChange(updatedExercises);
    setIsSwapDialogOpen(false);
    setExerciseToSwap(null);
    
    toast({
      title: "Exercise swapped",
      description: `${exerciseToSwap.name} replaced with ${newExercise.name}`,
    });
  };

  const handleMoveExercise = (exerciseId: string, direction: 'up' | 'down') => {
    const currentIndex = currentExercises.findIndex(ex => ex.id === exerciseId);
    if (currentIndex === -1) return;
    
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === currentExercises.length - 1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const updatedExercises = [...currentExercises];
    const [movedExercise] = updatedExercises.splice(currentIndex, 1);
    updatedExercises.splice(newIndex, 0, movedExercise);
    
    onExercisesChange(updatedExercises);
  };

  const handleTrainerToggle = async (checked: boolean) => {
    await updateSessionTrainer(sessionId, checked);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Trainer</span>
          <Switch
            checked={session?.with_trainer || false}
            onCheckedChange={handleTrainerToggle}
            className="data-[state=checked]:bg-gym"
          />
        </div>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onReset}
            title="Reset workout"
            className="hover:bg-gym/10 hover:text-gym transition-colors"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsExerciseManagerOpen(true)}
            title="Manage exercises"
            className="hover:bg-gym/10 hover:text-gym transition-colors"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Timer Display */}
      <div className="text-center mb-8 animate-fade-in" style={{ animationDelay: '0.05s' }}>
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className={`w-3 h-3 rounded-full transition-all duration-300 ${isRunning ? 'bg-gym animate-pulse shadow-lg shadow-gym/50' : 'bg-muted-foreground'}`} />
          <span className="text-5xl font-mono font-bold text-foreground tracking-tight">
            {formatTime(timer)}
          </span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={toggleTimer}
          className="text-muted-foreground hover:text-gym hover:bg-gym/10 transition-colors"
        >
          {isRunning ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
          {isRunning ? 'Pause' : 'Resume'}
        </Button>
      </div>

      {/* Progress */}
      <div className="mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-lg font-semibold text-foreground">{totalExercises} Exercise{totalExercises !== 1 ? 's' : ''}</span>
          <span className="text-sm font-medium text-gym">{Math.round(progressPercentage)}%</span>
        </div>
        
        <div className="mb-2">
          <Progress value={progressPercentage} className="h-2 bg-muted [&>div]:bg-gym" />
        </div>
        
        <div className="text-sm text-muted-foreground text-center">
          {completedCount}/{totalExercises} exercises complete
        </div>
      </div>

      {/* Muscle Distribution Card */}
      {(mainMuscles.length > 0 || sideMuscles.length > 0) && (
        <Card className="mb-6 border-gym/20 bg-gradient-to-br from-gym/5 to-transparent animate-fade-in" style={{ animationDelay: '0.15s' }}>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gym" />
              Target Muscles
            </h3>
            
            {/* Main Muscles */}
            {mainMuscles.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Main</p>
                <div className="flex flex-wrap gap-2">
                  {mainMuscles.map(({ muscle, percentage }, index) => {
                    const muscleGroup = muscleGroups.find(mg => mg.name === muscle);
                    const color = muscleGroup?.color || '#ff7f00';
                    const photo_url = muscleGroup?.photo_url;
                    
                    return (
                      <div 
                        key={muscle}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl border bg-card transition-all duration-300 hover:scale-105 animate-scale-in"
                        style={{ 
                          borderColor: `${color}40`,
                          animationDelay: `${0.2 + index * 0.05}s`
                        }}
                      >
                        <div className="w-6 h-6 rounded-lg overflow-hidden flex-shrink-0">
                          {photo_url ? (
                            <img src={photo_url} alt={muscle} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs" style={{ backgroundColor: color }}>
                              💪
                            </div>
                          )}
                        </div>
                        <span className="text-xs font-medium text-foreground capitalize">{muscle}</span>
                        <span className="text-xs font-bold" style={{ color }}>{percentage}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Side Muscles */}
            {sideMuscles.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Side</p>
                <div className="flex flex-wrap gap-2">
                  {sideMuscles.map(({ muscle, percentage }, index) => {
                    const muscleGroup = muscleGroups.find(mg => mg.name === muscle);
                    const color = muscleGroup?.color || '#ff7f00';
                    const photo_url = muscleGroup?.photo_url;
                    
                    return (
                      <div 
                        key={muscle}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card/50 transition-all duration-300 hover:scale-105 animate-scale-in"
                        style={{ animationDelay: `${0.3 + index * 0.05}s` }}
                      >
                        <div className="w-5 h-5 rounded-md overflow-hidden flex-shrink-0 opacity-80">
                          {photo_url ? (
                            <img src={photo_url} alt={muscle} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs" style={{ backgroundColor: color }}>
                              💪
                            </div>
                          )}
                        </div>
                        <span className="text-xs font-medium text-muted-foreground capitalize">{muscle}</span>
                        <span className="text-xs font-semibold text-muted-foreground">{percentage}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Exercise List */}
      <div className="space-y-3 mb-24">
        {currentExercises.map((exercise, index) => {
          const isCompleted = computedCompletedExercises.has(exercise.id);
          const exerciseSetCount = exerciseSets.filter(
            set => set.session_id === sessionId && set.exercise_id === exercise.id
          ).length;
          const muscleGroup = muscleGroups.find(mg => mg.name === exercise.muscle_group);
          const color = muscleGroup?.color || '#ff7f00';

          return (
            <Card 
              key={exercise.id} 
              className={`transition-all duration-300 animate-fade-in hover:scale-[1.01] ${
                isCompleted 
                  ? 'bg-green-500/10 border-green-500/30 hover:border-green-500/50' 
                  : 'bg-card border-border hover:border-gym/50 hover:shadow-lg hover:shadow-gym/10'
              }`}
              style={{ animationDelay: `${0.2 + index * 0.05}s` }}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="relative cursor-pointer group"
                    onClick={() => !isCompleted && onExerciseSelect(exercise, workoutExerciseDetails[exercise.id])}
                  >
                    <div className="w-14 h-14 bg-muted rounded-xl flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-105">
                      {exercise.photo_url ? (
                        <img 
                          src={exercise.photo_url} 
                          alt={exercise.name}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        <Dumbbell className="h-7 w-7 text-muted-foreground" />
                      )}
                    </div>
                    <div 
                      className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg overflow-hidden border-2 border-background shadow-sm"
                      style={{ backgroundColor: `${color}30` }}
                    >
                      {muscleGroup?.photo_url ? (
                        <img src={muscleGroup.photo_url} alt={exercise.muscle_group} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs" style={{ backgroundColor: color }}>
                          💪
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => !isCompleted && onExerciseSelect(exercise, workoutExerciseDetails[exercise.id])}
                  >
                    <h3 className={`font-semibold transition-colors ${isCompleted ? 'text-green-600' : 'text-foreground'}`}>
                      {exercise.name}
                    </h3>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      {isCompleted ? `${exerciseSetCount} Sets Completed` : (() => {
                        const config = workoutExerciseDetails[exercise.id];
                        const sets = config?.sets || 3;
                        return `${sets} Sets • 12-10-8 Reps`;
                      })()}
                    </p>
                    {!isCompleted && exercisePRs[exercise.id] && (
                      <div className="flex items-center gap-1 mt-1">
                        <TrendingUp className="h-3 w-3 text-gym" />
                        <span className="text-xs text-gym font-medium">
                          PR: {exercisePRs[exercise.id].weight}kg × {exercisePRs[exercise.id].reps}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {isCompleted ? (
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  ) : (
                    <div className="flex items-center gap-1">
                      <div className="flex flex-col gap-0.5">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-6 w-6 hover:bg-gym/10 hover:text-gym"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveExercise(exercise.id, 'up');
                          }}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-6 w-6 hover:bg-gym/10 hover:text-gym"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveExercise(exercise.id, 'down');
                          }}
                          disabled={index === currentExercises.length - 1}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="hover:bg-gym/10 hover:text-gym"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExerciseToSwap(exercise);
                          setIsSwapDialogOpen(true);
                        }}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Complete Workout Button */}
      <div className="fixed bottom-20 md:bottom-4 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/95 to-transparent z-50">
        <Button 
          onClick={handleCompleteWorkout}
          disabled={completedCount < totalExercises}
          className={`w-full h-14 font-semibold text-lg rounded-xl transition-all duration-300 hover:scale-[1.02] ${
            completedCount >= totalExercises 
              ? 'bg-green-500 hover:bg-green-600 text-white shadow-xl shadow-green-500/25' 
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
        >
          {completedCount >= totalExercises ? 'Complete Workout' : `${totalExercises - completedCount} exercises remaining`}
        </Button>
      </div>

      {/* Exercise Manager Dialog */}
      <WorkoutExerciseManager
        open={isExerciseManagerOpen}
        onOpenChange={setIsExerciseManagerOpen}
        currentExercises={currentExercises}
        onExercisesChange={onExercisesChange}
      />

      {/* Swap Exercise Dialog */}
      <SwapExerciseDialog
        open={isSwapDialogOpen}
        onOpenChange={setIsSwapDialogOpen}
        currentExercise={exerciseToSwap}
        onSwap={handleSwapExercise}
      />
    </div>
  );
}
