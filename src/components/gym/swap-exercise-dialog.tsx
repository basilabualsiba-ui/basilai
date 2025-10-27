import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Repeat, Dumbbell } from 'lucide-react';
import { useGym } from '@/contexts/GymContext';
import { toast } from '@/hooks/use-toast';

interface SwapExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentExercise: any;
  onSwap: (newExerciseId: string) => void;
}

export function SwapExerciseDialog({
  open,
  onOpenChange,
  currentExercise,
  onSwap
}: SwapExerciseDialogProps) {
  const { getExerciseAlternatives } = useGym();
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

  const alternatives = currentExercise ? getExerciseAlternatives(currentExercise.id) : [];

  const handleSwap = () => {
    if (!selectedExercise) {
      toast({
        title: "No exercise selected",
        description: "Please select an alternative exercise",
        variant: "destructive",
      });
      return;
    }

    onSwap(selectedExercise);
    onOpenChange(false);
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'advanced':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            Swap Exercise
          </DialogTitle>
          <DialogDescription>
            Select an alternative exercise to replace <strong>{currentExercise?.name}</strong>
          </DialogDescription>
        </DialogHeader>

        {alternatives.length === 0 ? (
          <div className="text-center py-12">
            <Dumbbell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium text-foreground mb-2">No alternatives available</h3>
            <p className="text-muted-foreground">
              Add alternative exercises in the Exercise Library to swap during workouts
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {alternatives.map((exercise) => (
              <Card
                key={exercise.id}
                className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                  selectedExercise === exercise.id ? 'ring-2 ring-primary bg-primary/5' : ''
                }`}
                onClick={() => setSelectedExercise(exercise.id)}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-2">{exercise.name}</h3>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <Badge variant="outline">{exercise.muscle_group}</Badge>
                      {exercise.side_muscle_groups?.map((sideGroup) => (
                        <Badge key={sideGroup} variant="secondary" className="text-xs">
                          {sideGroup}
                        </Badge>
                      ))}
                      {exercise.equipment && (
                        <Badge variant="secondary">{exercise.equipment}</Badge>
                      )}
                      {exercise.difficulty_level && (
                        <Badge className={getDifficultyColor(exercise.difficulty_level)}>
                          {exercise.difficulty_level}
                        </Badge>
                      )}
                    </div>
                    {exercise.instructions && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {exercise.instructions}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSwap}
                disabled={!selectedExercise}
                className="flex-1"
              >
                <Repeat className="h-4 w-4 mr-2" />
                Swap Exercise
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
