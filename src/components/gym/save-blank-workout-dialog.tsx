import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dumbbell, Sparkles, Save, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SaveBlankWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercises: any[];
  onSave: () => void;
  onSkip: () => void;
}

export function SaveBlankWorkoutDialog({
  open,
  onOpenChange,
  exercises,
  onSave,
  onSkip,
}: SaveBlankWorkoutDialogProps) {
  const [workoutName, setWorkoutName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Get unique muscle groups from exercises
  const muscleGroups = Array.from(
    new Set(exercises.map((ex) => ex.muscle_group))
  );

  // Generate AI suggested name based on muscles
  const generateSuggestedName = () => {
    if (muscleGroups.length === 0) return 'Custom Workout';
    
    if (muscleGroups.length === 1) {
      return `${capitalize(muscleGroups[0])} Workout`;
    }
    
    if (muscleGroups.length === 2) {
      return `${capitalize(muscleGroups[0])} & ${capitalize(muscleGroups[1])} Day`;
    }
    
    // For more muscles, pick the most common ones
    const muscleCounts: Record<string, number> = {};
    exercises.forEach(ex => {
      muscleCounts[ex.muscle_group] = (muscleCounts[ex.muscle_group] || 0) + 1;
    });
    
    const sortedMuscles = Object.entries(muscleCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([muscle]) => muscle);
    
    if (sortedMuscles.length >= 2) {
      return `${capitalize(sortedMuscles[0])} & ${capitalize(sortedMuscles[1])} Focus`;
    }
    
    return 'Full Body Workout';
  };

  const capitalize = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  // Set suggested name when dialog opens
  useEffect(() => {
    if (open && !workoutName) {
      setWorkoutName(generateSuggestedName());
    }
  }, [open, exercises]);

  const handleUseSuggestion = () => {
    setWorkoutName(generateSuggestedName());
  };

  const handleSaveWorkout = async () => {
    if (!workoutName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for your workout',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      // Create the workout
      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .insert({
          name: workoutName.trim(),
          muscle_groups: muscleGroups,
          description: `Custom workout with ${exercises.length} exercises`,
        })
        .select()
        .single();

      if (workoutError) throw workoutError;

      // Add exercises to the workout with default sets/reps
      const workoutExercises = exercises.map((ex, index) => ({
        workout_id: workout.id,
        exercise_id: ex.id,
        order_index: index + 1,
        sets: 3,
        reps: 12, // First set reps
        weight: null,
        rest_seconds: 90,
      }));

      const { error: exercisesError } = await supabase
        .from('workout_exercises')
        .insert(workoutExercises);

      if (exercisesError) throw exercisesError;

      toast({
        title: 'Workout saved!',
        description: `"${workoutName}" has been added to your workouts`,
      });

      onSave();
    } catch (error) {
      console.error('Error saving workout:', error);
      toast({
        title: 'Error',
        description: 'Failed to save workout. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5 text-primary" />
            Save as Workout?
          </DialogTitle>
          <DialogDescription>
            Would you like to save this workout for future use?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Workout Preview */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Dumbbell className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {exercises.length} exercises
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {muscleGroups.map((muscle) => (
                <Badge key={muscle} variant="secondary" className="text-xs">
                  {muscle}
                </Badge>
              ))}
            </div>
          </div>

          {/* Workout Name Input */}
          <div className="space-y-2">
            <Label htmlFor="workout-name">Workout Name</Label>
            <div className="flex gap-2">
              <Input
                id="workout-name"
                value={workoutName}
                onChange={(e) => setWorkoutName(e.target.value)}
                placeholder="Enter workout name"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleUseSuggestion}
                title="Use AI suggestion"
              >
                <Sparkles className="h-4 w-4 text-primary" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Click the sparkle icon for an AI-suggested name
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onSkip}
            className="w-full sm:w-auto"
          >
            <X className="h-4 w-4 mr-2" />
            Skip
          </Button>
          <Button
            onClick={handleSaveWorkout}
            disabled={isSaving}
            className="w-full sm:w-auto"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Workout'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
