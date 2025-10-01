import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dumbbell, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useGym } from '@/contexts/GymContext';

interface WorkoutSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectWorkout: (workoutId: string, exercises: any[]) => void;
}

export function WorkoutSelectionDialog({
  open,
  onOpenChange,
  onSelectWorkout
}: WorkoutSelectionDialogProps) {
  const { exercises: allExercises } = useGym();
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchWorkouts();
    }
  }, [open]);

  const fetchWorkouts = async () => {
    try {
      setLoading(true);
      const { data: workoutsData, error: workoutsError } = await supabase
        .from('workouts')
        .select('*')
        .order('created_at', { ascending: false });

      if (workoutsError) throw workoutsError;

      // Fetch exercises for each workout
      const workoutsWithExercises = await Promise.all(
        (workoutsData || []).map(async (workout) => {
          const { data: workoutExercises } = await supabase
            .from('workout_exercises')
            .select('*, exercises(*)')
            .eq('workout_id', workout.id)
            .order('order_index');

          return {
            ...workout,
            exercises: workoutExercises?.map(we => ({
              ...we.exercises,
              sets: we.sets,
              reps: we.reps,
              weight: we.weight,
              rest_seconds: we.rest_seconds
            })) || []
          };
        })
      );

      setWorkouts(workoutsWithExercises);
    } catch (error) {
      console.error('Error fetching workouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectWorkout = (workout: any) => {
    onSelectWorkout(workout.id, workout.exercises);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select a Saved Workout</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Target className="h-12 w-12 animate-pulse text-primary" />
          </div>
        ) : workouts.length === 0 ? (
          <div className="text-center py-12">
            <Dumbbell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No saved workouts found</p>
            <p className="text-sm text-muted-foreground mt-2">
              Create workout templates in the Workouts section
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {workouts.map((workout) => (
              <Card
                key={workout.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => handleSelectWorkout(workout)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{workout.name}</h3>
                      {workout.description && (
                        <p className="text-sm text-muted-foreground">
                          {workout.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {workout.muscle_groups?.map((muscle: string) => (
                      <Badge key={muscle} variant="secondary">
                        {muscle}
                      </Badge>
                    ))}
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {workout.exercises.length} exercises
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
