import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useGym } from "@/contexts/GymContext";
import { Save, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SaveWorkoutTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercises: any[];
  onSave: () => void;
}

export const SaveWorkoutTemplateDialog = ({ 
  open, 
  onOpenChange, 
  exercises,
  onSave 
}: SaveWorkoutTemplateDialogProps) => {
  const { workouts } = useGym();
  const [saveType, setSaveType] = useState<'new' | 'existing'>('new');
  const [selectedWorkoutId, setSelectedWorkoutId] = useState('');
  const [workoutName, setWorkoutName] = useState('');
  const [workoutDescription, setWorkoutDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (saveType === 'new' && !workoutName.trim()) {
      toast.error('Please enter a workout name');
      return;
    }
    
    if (saveType === 'existing' && !selectedWorkoutId) {
      toast.error('Please select a workout');
      return;
    }

    if (exercises.length === 0) {
      toast.error('No exercises to save');
      return;
    }

    try {
      setIsSaving(true);

      if (saveType === 'new') {
        // Create new workout
        const muscleGroups = Array.from(
          new Set(exercises.map(ex => ex.muscle_group))
        );

        const { data: newWorkout, error: workoutError } = await supabase
          .from('workouts')
          .insert({
            name: workoutName,
            description: workoutDescription || null,
            muscle_groups: muscleGroups
          })
          .select()
          .single();

        if (workoutError) throw workoutError;

        // Add exercises to workout
        const workoutExercises = exercises.map((exercise, index) => ({
          workout_id: newWorkout.id,
          exercise_id: exercise.id,
          order_index: index + 1,
          sets: 3,
          reps: 10,
          weight: 0,
          rest_seconds: 60
        }));

        const { error: exerciseError } = await supabase
          .from('workout_exercises')
          .insert(workoutExercises);

        if (exerciseError) throw exerciseError;

        toast.success('Workout saved as new template!');
      } else {
        // Add to existing workout
        // Delete existing exercises from this workout
        await supabase
          .from('workout_exercises')
          .delete()
          .eq('workout_id', selectedWorkoutId);

        // Add new exercises
        const workoutExercises = exercises.map((exercise, index) => ({
          workout_id: selectedWorkoutId,
          exercise_id: exercise.id,
          order_index: index + 1,
          sets: 3,
          reps: 10,
          weight: 0,
          rest_seconds: 60
        }));

        const { error: exerciseError } = await supabase
          .from('workout_exercises')
          .insert(workoutExercises);

        if (exerciseError) throw exerciseError;

        // Update muscle groups
        const muscleGroups = Array.from(
          new Set(exercises.map(ex => ex.muscle_group))
        );

        await supabase
          .from('workouts')
          .update({ muscle_groups: muscleGroups })
          .eq('id', selectedWorkoutId);

        toast.success('Workout template updated!');
      }

      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving workout:', error);
      toast.error('Failed to save workout template');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Save Workout Template</DialogTitle>
          <DialogDescription>
            Save this workout with {exercises.length} exercises as a template for future use
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Save as</Label>
            <Select value={saveType} onValueChange={(value: 'new' | 'existing') => setSaveType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New Workout Template</SelectItem>
                <SelectItem value="existing">Update Existing Workout</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {saveType === 'new' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Workout Name *</Label>
                <Input
                  id="name"
                  value={workoutName}
                  onChange={(e) => setWorkoutName(e.target.value)}
                  placeholder="e.g., Upper Body Blast"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={workoutDescription}
                  onChange={(e) => setWorkoutDescription(e.target.value)}
                  placeholder="Optional description..."
                  rows={3}
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label>Select Workout</Label>
              <Select value={selectedWorkoutId} onValueChange={setSelectedWorkoutId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a workout..." />
                </SelectTrigger>
                <SelectContent>
                  {workouts.map(workout => (
                    <SelectItem key={workout.id} value={workout.id}>
                      {workout.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isSaving}
            >
              Skip
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Template
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};