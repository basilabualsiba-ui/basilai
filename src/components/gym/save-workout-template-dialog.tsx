import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SaveWorkoutTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  exercises: any[];
  onSaveComplete: () => void;
}

export function SaveWorkoutTemplateDialog({
  open,
  onOpenChange,
  sessionId,
  exercises,
  onSaveComplete
}: SaveWorkoutTemplateDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a workout name",
        variant: "destructive"
      });
      return;
    }

    try {
      setSaving(true);

      // Get unique muscle groups from exercises
      const muscleGroups = Array.from(
        new Set(exercises.map(ex => ex.muscle_group))
      );

      // Create the workout template
      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          muscle_groups: muscleGroups
        })
        .select()
        .single();

      if (workoutError) throw workoutError;

      // Get exercise sets from the session
      const { data: sets, error: setsError } = await supabase
        .from('exercise_sets')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at');

      if (setsError) throw setsError;

      // Calculate average values for each exercise
      const exerciseData = exercises.map((exercise, index) => {
        const exerciseSets = sets?.filter(s => s.exercise_id === exercise.id) || [];
        
        const avgWeight = exerciseSets.length > 0
          ? Math.round(exerciseSets.reduce((sum, s) => sum + (s.weight || 0), 0) / exerciseSets.length)
          : 0;
        
        const avgReps = exerciseSets.length > 0
          ? Math.round(exerciseSets.reduce((sum, s) => sum + (s.reps || 0), 0) / exerciseSets.length)
          : 10;
        
        const avgRest = exerciseSets.length > 0
          ? Math.round(exerciseSets.reduce((sum, s) => sum + (s.rest_seconds || 60), 0) / exerciseSets.length)
          : 60;

        return {
          workout_id: workout.id,
          exercise_id: exercise.id,
          order_index: index + 1,
          sets: exerciseSets.length || 3,
          reps: avgReps,
          weight: avgWeight,
          rest_seconds: avgRest
        };
      });

      // Save workout exercises
      const { error: exercisesError } = await supabase
        .from('workout_exercises')
        .insert(exerciseData);

      if (exercisesError) throw exercisesError;

      toast({
        title: "Success",
        description: "Workout saved as template"
      });

      onSaveComplete();
      onOpenChange(false);
      setName('');
      setDescription('');
    } catch (error) {
      console.error('Error saving workout template:', error);
      toast({
        title: "Error",
        description: "Failed to save workout template",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    onSaveComplete();
    onOpenChange(false);
    setName('');
    setDescription('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Workout as Template?</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Save this workout to reuse it later. You can start future workouts from this template.
          </p>

          <div className="space-y-2">
            <Label htmlFor="workout-name">Workout Name</Label>
            <Input
              id="workout-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Upper Body Day"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="workout-description">Description (Optional)</Label>
            <Textarea
              id="workout-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes about this workout..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleSkip} disabled={saving}>
            Skip
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
