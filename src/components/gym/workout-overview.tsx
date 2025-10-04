import { useState } from 'react';
import { useGym } from '@/contexts/GymContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Dumbbell, Play, Target, CheckCircle2, Timer, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ExerciseInfoDialog } from './exercise-info-dialog';
interface WorkoutOverviewProps {
  onStartWorkout: () => void;
  onBack: () => void;
  selectedDate?: Date;
  isToday?: boolean;
}
export function WorkoutOverview({
  onStartWorkout,
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
  const todayWorkout = selectedDate ? getWorkoutForDate(format(selectedDate, 'yyyy-MM-dd')) : getTodayWorkout();
  const isCompleted = todayWorkout?.session?.completed_at;
  console.log('WorkoutOverview - todayWorkout:', todayWorkout);
  console.log('WorkoutOverview - isCompleted:', isCompleted);
  const handleExerciseClick = (exercise: any) => {
    setSelectedExercise(exercise);
    setIsDialogOpen(true);
  };
  if (!todayWorkout || todayWorkout.exercises.length === 0) {
    return <div className="min-h-screen bg-background p-4">
        
        
        <Card className="text-center py-12">
          <CardContent>
            <Dumbbell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium text-foreground mb-2">No workout scheduled</h3>
            <p className="text-muted-foreground">Create a workout plan to get started</p>
          </CardContent>
        </Card>
      </div>;
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
      
      // Side muscles get 25% weight (split among them)
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
  return <div className="space-y-6">
      {/* Workout Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Workout Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <Dumbbell className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-sm text-muted-foreground">Exercises</p>
              <p className="text-lg font-bold">{todayWorkout.exercises.length}</p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <Timer className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-sm text-muted-foreground">Est. Time</p>
              <p className="text-lg font-bold">
                {Math.round((todayWorkout.exercises.length * 3 * 40 + todayWorkout.exercises.length * 2 * 60) / 60)}min
              </p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-sm text-muted-foreground">Muscle Groups</p>
              <p className="text-lg font-bold">{muscleDistribution.length}</p>
            </div>
          </div>

          {/* Target Muscles */}
          <div>
            <h4 className="font-medium mb-3">Target Muscle Groups</h4>
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
        </CardContent>
      </Card>

      {/* Exercises List Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            Exercises ({todayWorkout.exercises.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {todayWorkout.exercises.map((exercise, index) => {
              const details = getMuscleGroupDetails(exercise.muscle_group);
              return <div 
                key={exercise.id} 
                className="border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleExerciseClick(exercise)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-semibold">{exercise.name}</h4>
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="text-xs">
                          {exercise.muscle_group}
                        </Badge>
                        {exercise.side_muscle_groups && exercise.side_muscle_groups.length > 0 && (
                          <>
                            {exercise.side_muscle_groups.map(sideMuscle => (
                              <Badge key={sideMuscle} variant="outline" className="text-xs">
                                {sideMuscle} <span className="text-muted-foreground ml-1">(Side)</span>
                              </Badge>
                            ))}
                          </>
                        )}
                        {exercise.equipment && (
                          <Badge variant="outline" className="text-xs">
                            {exercise.equipment}
                          </Badge>
                        )}
                        {exercise.difficulty_level && (
                          <Badge variant="outline" className="text-xs">
                            {exercise.difficulty_level}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-muted/30 rounded">
                    <p className="text-sm text-muted-foreground">Sets</p>
                    <p className="text-lg font-bold">3</p>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded">
                    <p className="text-sm text-muted-foreground">Reps</p>
                    <p className="text-lg font-bold">12-10-8</p>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded">
                    <p className="text-sm text-muted-foreground">Rest</p>
                    <p className="text-lg font-bold">60s</p>
                  </div>
                </div>

                {exercise.instructions && (
                  <div className="bg-muted/20 p-3 rounded mt-3">
                    <p className="text-sm font-medium mb-1">Instructions</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {exercise.instructions}
                    </p>
                  </div>
                )}
              </div>;
            })}
          </div>
        </CardContent>
      </Card>

      {/* Start Workout Button */}
      <div className="fixed bottom-20 md:bottom-4 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/80 to-transparent z-50">
        {isCompleted ? <div className="w-full h-14 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center justify-center shadow-lg">
            <CheckCircle2 className="h-5 w-5 mr-2 text-green-500" />
            <span className="text-green-500 font-semibold text-lg">Workout Completed</span>
          </div> : <Button onClick={onStartWorkout} className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg shadow-lg">
            <Play className="h-5 w-5 mr-2" />
            {isToday ? 'Start Workout' : 'Log Workout'}
          </Button>}
      </div>

      {/* Exercise Info Dialog */}
      <ExerciseInfoDialog exercise={selectedExercise} open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>;
}