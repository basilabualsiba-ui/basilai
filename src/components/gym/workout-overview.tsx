import { useState } from 'react';
import { useGym } from '@/contexts/GymContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Dumbbell, Play, Target, CheckCircle2, Zap, Folder } from 'lucide-react';
import { format } from 'date-fns';
import { ExerciseInfoDialog } from './exercise-info-dialog';
import { WorkoutSelectionDialog } from './workout-selection-dialog';
interface WorkoutOverviewProps {
  onStartWorkout: () => void;
  onStartQuickWorkout: () => void;
  onStartFromTemplate: (workoutId: string, exercises: any[]) => void;
  onBack: () => void;
  selectedDate?: Date;
  isToday?: boolean;
}
export function WorkoutOverview({
  onStartWorkout,
  onStartQuickWorkout,
  onStartFromTemplate,
  onBack,
  selectedDate,
  isToday = true
}: WorkoutOverviewProps) {
  const {
    getTodayWorkout,
    getWorkoutForDate,
    muscleGroups
  } = useGym();
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showWorkoutSelection, setShowWorkoutSelection] = useState(false);
  const todayWorkout = selectedDate ? getWorkoutForDate(format(selectedDate, 'yyyy-MM-dd')) : getTodayWorkout();
  const isCompleted = todayWorkout?.session?.completed_at;
  console.log('WorkoutOverview - todayWorkout:', todayWorkout);
  console.log('WorkoutOverview - isCompleted:', isCompleted);
  const handleExerciseClick = (exercise: any) => {
    setSelectedExercise(exercise);
    setIsDialogOpen(true);
  };
  if (!todayWorkout || todayWorkout.exercises.length === 0) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Card className="text-center py-12">
          <CardContent className="space-y-6">
            <div>
              <Dumbbell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium text-foreground mb-2">No workout scheduled today</h3>
              <p className="text-muted-foreground">Choose how you want to start your workout</p>
            </div>

            <div className="grid gap-4 max-w-md mx-auto">
              <Button
                onClick={() => setShowWorkoutSelection(true)}
                size="lg"
                variant="outline"
                className="h-auto py-6 flex-col gap-2"
              >
                <Folder className="h-6 w-6" />
                <div>
                  <div className="font-semibold">Start From Saved Workout</div>
                  <div className="text-xs text-muted-foreground font-normal">
                    Pick a workout template
                  </div>
                </div>
              </Button>

              <Button
                onClick={onStartQuickWorkout}
                size="lg"
                className="h-auto py-6 flex-col gap-2"
              >
                <Zap className="h-6 w-6" />
                <div>
                  <div className="font-semibold">Start Quick Workout</div>
                  <div className="text-xs opacity-80 font-normal">
                    Add exercises as you go
                  </div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        <WorkoutSelectionDialog
          open={showWorkoutSelection}
          onOpenChange={setShowWorkoutSelection}
          onSelectWorkout={onStartFromTemplate}
        />
      </div>
    );
  }
  const targetMuscles = Array.from(new Set(todayWorkout.exercises.map(ex => ex.muscle_group)));

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
      {/* Header */}
      

      {/* Target Muscles Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-muted-foreground">Target Muscles</h2>
        </div>
        
        <div className="grid grid-cols-4 gap-4">
          {targetMuscles.map(muscle => {
          const details = getMuscleGroupDetails(muscle);
          return <div key={muscle} className="text-center">
                <div className="w-16 h-16 rounded-lg overflow-hidden flex items-center justify-center mb-2 mx-auto border-2" style={{
              backgroundColor: `${details.color}20`,
              borderColor: details.color
            }}>
                  {details.photo_url ? <img src={details.photo_url} alt={muscle} className="w-full h-full object-cover" /> : <span className="text-2xl">{details.icon}</span>}
                </div>
                <div className="text-xs text-foreground font-medium">{muscle}</div>
                <div className="text-xs text-muted-foreground">100%</div>
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
                      <p className="text-sm text-muted-foreground">
                        3 SETS • 10 REPS
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>;
        })}
        </div>
      </div>

      {/* Start Workout Button */}
      <div className="fixed bottom-20 md:bottom-4 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/80 to-transparent z-50">
        {isCompleted ? <div className="w-full h-14 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center justify-center shadow-lg">
            <CheckCircle2 className="h-5 w-5 mr-2 text-green-500" />
            <span className="text-green-500 font-semibold text-lg">Workout Completed</span>
          </div> : isToday ? <Button onClick={onStartWorkout} className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg shadow-lg">
            <Play className="h-5 w-5 mr-2" />
            Start Workout
          </Button> : <div className="w-full h-14 bg-muted/20 border border-muted/40 rounded-lg flex items-center justify-center shadow-lg">
            <span className="text-muted-foreground font-medium text-lg">
              {selectedDate ? `Workout for ${selectedDate.toDateString()}` : 'Historical Workout View'}
            </span>
          </div>}
      </div>

      {/* Exercise Info Dialog */}
      <ExerciseInfoDialog exercise={selectedExercise} open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>;
}