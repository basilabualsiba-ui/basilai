import { useGym } from '@/contexts/GymContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Clock, Dumbbell, Target, TrendingUp, Share2 } from 'lucide-react';
import { format } from 'date-fns';

interface WorkoutSummaryProps {
  sessionId: string;
  onFinish: () => void;
}

export function WorkoutSummary({ sessionId, onFinish }: WorkoutSummaryProps) {
  const { workoutSessions, exerciseSets, getTodayWorkout } = useGym();
  
  const session = workoutSessions.find(s => s.id === sessionId);
  const todayWorkout = getTodayWorkout();
  const sessionSets = exerciseSets.filter(set => set.session_id === sessionId);

  if (!session || !todayWorkout) {
    return <div>Loading...</div>;
  }

  // Calculate stats
  const totalTime = session.total_duration_minutes || 0;
  const totalSets = sessionSets.length;
  const totalReps = sessionSets.reduce((sum, set) => sum + (set.reps || 0), 0);
  const totalWeight = sessionSets.reduce((sum, set) => sum + ((set.weight || 0) * (set.reps || 0)), 0);
  const exercisesCompleted = new Set(sessionSets.map(set => set.exercise_id)).size;

  // Personal records or achievements
  const achievements = [
    'Completed all exercises',
    'New personal best volume',
    'Consistent rest periods'
  ];

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Success Header */}
      <div className="text-center mb-8 pt-8">
        <div className="w-20 h-20 bg-gradient-to-br from-success to-success/80 rounded-full flex items-center justify-center mb-4 mx-auto animate-bounce">
          <Trophy className="h-10 w-10 text-success-foreground" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Workout Complete!</h1>
        <p className="text-muted-foreground">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="bg-card border-border">
          <CardContent className="p-6 text-center">
            <Clock className="h-8 w-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">{formatTime(totalTime)}</div>
            <div className="text-sm text-muted-foreground">Total Time</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6 text-center">
            <Target className="h-8 w-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">{totalReps}</div>
            <div className="text-sm text-muted-foreground">Total Reps</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6 text-center">
            <Dumbbell className="h-8 w-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">{Math.round(totalWeight / 1000)}k</div>
            <div className="text-sm text-muted-foreground">Weight Lifted</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6 text-center">
            <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">{totalSets}</div>
            <div className="text-sm text-muted-foreground">Total Sets</div>
          </CardContent>
        </Card>
      </div>

      {/* Exercise Breakdown */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Target className="h-5 w-5" />
            Exercise Breakdown
          </h3>
          <div className="space-y-3">
            {todayWorkout.exercises.map(exercise => {
              const exerciseSets = sessionSets.filter(set => set.exercise_id === exercise.id);
              const exerciseReps = exerciseSets.reduce((sum, set) => sum + (set.reps || 0), 0);
              const maxWeight = Math.max(...exerciseSets.map(set => set.weight || 0));
              
              // Calculate all muscle groups worked (main + side)
              const allMuscleGroups = [exercise.muscle_group, ...(exercise.side_muscle_groups || [])];
              
              return (
                <div key={exercise.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-foreground">{exercise.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {exerciseSets.length} sets • {exerciseReps} reps
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge variant="outline" className="text-xs">{exercise.muscle_group}</Badge>
                      {exercise.side_muscle_groups?.map(sideGroup => (
                        <Badge key={sideGroup} variant="secondary" className="text-xs">
                          {sideGroup}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Badge variant="outline">{maxWeight}kg</Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card className="mb-20">
        <CardContent className="p-4">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Achievements
          </h3>
          <div className="space-y-2">
            {achievements.map((achievement, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-2 h-2 bg-success rounded-full" />
                <span className="text-foreground">{achievement}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="sticky bottom-4 mt-6 p-4">
        <div className="flex gap-3 mb-4">
          <Button variant="outline" className="flex-1">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" className="flex-1">
            <TrendingUp className="h-4 w-4 mr-2" />
            View Progress
          </Button>
        </div>
        <Button 
          onClick={onFinish}
          className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg"
        >
          Done
        </Button>
      </div>
    </div>
  );
}