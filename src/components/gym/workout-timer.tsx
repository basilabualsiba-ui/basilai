import { useState, useEffect } from 'react';
import { useGym } from '@/contexts/GymContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { X, Clock, Settings, CheckCircle, Dumbbell, Pause, Play, Plus, Minus, RotateCcw, TrendingUp, RefreshCw, ChevronUp, ChevronDown } from 'lucide-react';
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
  const { getTodayWorkout, workoutSessions, exerciseSets, muscleGroups, exercises } = useGym();
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

  // Fetch workout exercise details when exercises change
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

  // Compute completed exercises from database
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

  // Fetch exercise PRs
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

  // Timer effect
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

  // Calculate muscle distribution
  const muscleDistribution = () => {
    const muscleScores: Record<string, { score: number; isMain: boolean }> = {};
    
    currentExercises.forEach(exercise => {
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
        sideMuscles.forEach((sideMuscle: string) => {
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
    
    // Separate into main and side based on isMain flag
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
    
    // Fetch the full exercise object
    const { exercises, getExerciseAlternatives } = useGym();
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

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="flex items-center justify-end mb-6">
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onReset}
            title="Reset workout"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsExerciseManagerOpen(true)}
            title="Manage exercises"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Timer Display */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-primary animate-pulse' : 'bg-muted-foreground'}`} />
          <span className="text-4xl font-mono font-bold text-foreground">
            {formatTime(timer)}
          </span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={toggleTimer}
          className="text-muted-foreground"
        >
          {isRunning ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
          {isRunning ? 'Pause' : 'Resume'}
        </Button>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-lg font-medium text-foreground">{totalExercises} Exercise{totalExercises !== 1 ? 's' : ''}</span>
        </div>
        
        <div className="mb-2">
          <Progress value={progressPercentage} className="h-2" />
        </div>
        
        <div className="text-sm text-muted-foreground text-center">
          {completedCount}/{totalExercises} exercises complete
        </div>
      </div>

      {/* Muscle Distribution Card */}
      {(mainMuscles.length > 0 || sideMuscles.length > 0) && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Target Muscles</h3>
            
            {/* Main Muscles */}
            {mainMuscles.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Main Muscles</p>
                <div className="flex flex-wrap gap-2">
                  {mainMuscles.map(({ muscle, percentage }) => {
                    const muscleGroup = muscleGroups.find(mg => mg.name === muscle);
                    const color = muscleGroup?.color || '#ff7f00';
                    const photo_url = muscleGroup?.photo_url;
                    
                    return (
                      <div 
                        key={muscle}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card"
                      >
                        <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
                          {photo_url ? (
                            <img src={photo_url} alt={muscle} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs" style={{ backgroundColor: color }}>
                              💪
                            </div>
                          )}
                        </div>
                        <span className="text-xs font-medium text-foreground capitalize">{muscle}</span>
                        <span className="text-xs font-semibold text-primary">{percentage}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Side Muscles */}
            {sideMuscles.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Side Muscles</p>
                <div className="flex flex-wrap gap-2">
                  {sideMuscles.map(({ muscle, percentage }) => {
                    const muscleGroup = muscleGroups.find(mg => mg.name === muscle);
                    const color = muscleGroup?.color || '#ff7f00';
                    const photo_url = muscleGroup?.photo_url;
                    
                    return (
                      <div 
                        key={muscle}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card"
                      >
                        <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
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
      <div className="space-y-3 mb-20">
        {currentExercises.map((exercise, index) => {
          const isCompleted = computedCompletedExercises.has(exercise.id);
          const exerciseSetCount = exerciseSets.filter(
            set => set.session_id === sessionId && set.exercise_id === exercise.id
          ).length;

          return (
            <Card 
              key={exercise.id} 
              className={`transition-all ${
                isCompleted ? 'bg-success/10 border-success/30' : 'bg-card border-border'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="relative cursor-pointer"
                    onClick={() => !isCompleted && onExerciseSelect(exercise, workoutExerciseDetails[exercise.id])}
                  >
                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                      {exercise.photo_url ? (
                        <img 
                          src={exercise.photo_url} 
                          alt={exercise.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Dumbbell className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg overflow-hidden border-2 border-white">
                      {(() => {
                        const muscleGroup = muscleGroups.find(mg => mg.name === exercise.muscle_group);
                        const color = muscleGroup?.color || '#ff7f00';
                        const photo_url = muscleGroup?.photo_url;
                        
                        return photo_url ? (
                          <img src={photo_url} alt={exercise.muscle_group} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs" style={{ backgroundColor: color }}>
                            💪
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  
                   <div 
                     className="flex-1 cursor-pointer"
                     onClick={() => !isCompleted && onExerciseSelect(exercise, workoutExerciseDetails[exercise.id])}
                   >
                     <h3 className={`font-medium ${isCompleted ? 'text-success' : 'text-foreground'}`}>
                       {exercise.name}
                     </h3>
                     <p className="text-sm text-muted-foreground">
                       {isCompleted ? `${exerciseSetCount} Sets Completed` : (() => {
                         const config = workoutExerciseDetails[exercise.id];
                         const sets = config?.sets || 3;
                         return `${sets} SETS • 12-10-8 REPS`;
                       })()}
                     </p>
                     {!isCompleted && exercisePRs[exercise.id] && (
                       <div className="flex items-center gap-1 mt-1">
                         <TrendingUp className="h-3 w-3 text-primary" />
                         <span className="text-xs text-primary font-medium">
                           PR: {exercisePRs[exercise.id].weight}kg × {exercisePRs[exercise.id].reps}
                         </span>
                       </div>
                     )}
                   </div>
                  
                  {isCompleted ? (
                    <CheckCircle className="h-6 w-6 text-success" />
                  ) : (
                    <div className="flex items-center gap-1">
                      <div className="flex flex-col gap-0.5">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-6 w-6"
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
                          className="h-6 w-6"
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
      <div className="sticky bottom-4 mt-6 p-4">
        <Button 
          onClick={handleCompleteWorkout}
          disabled={completedCount < totalExercises}
          className={`w-full h-14 font-semibold text-lg ${
            completedCount >= totalExercises 
              ? 'bg-success hover:bg-success/90 text-success-foreground' 
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