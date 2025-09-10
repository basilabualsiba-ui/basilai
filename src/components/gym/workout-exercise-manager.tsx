import { useState } from 'react';
import { useGym } from '@/contexts/GymContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Dumbbell, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WorkoutExerciseManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentExercises: any[];
  onExercisesChange: (exercises: any[]) => void;
}

export function WorkoutExerciseManager({ 
  open, 
  onOpenChange, 
  currentExercises, 
  onExercisesChange 
}: WorkoutExerciseManagerProps) {
  const { exercises, muscleGroups } = useGym();
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const filteredExercises = exercises.filter(exercise => 
    exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exercise.muscle_group.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentExerciseIds = new Set(currentExercises.map(ex => ex.id));

  const handleAddExercise = (exercise: any) => {
    if (!currentExerciseIds.has(exercise.id)) {
      const updatedExercises = [...currentExercises, exercise];
      onExercisesChange(updatedExercises);
      toast({
        title: "Exercise Added",
        description: `${exercise.name} has been added to your workout`
      });
    }
  };

  const handleRemoveExercise = (exercise: any) => {
    const updatedExercises = currentExercises.filter(ex => ex.id !== exercise.id);
    onExercisesChange(updatedExercises);
    toast({
      title: "Exercise Removed",
      description: `${exercise.name} has been removed from your workout`
    });
  };

  const getMuscleGroupDetails = (muscleName: string) => {
    const muscleGroup = muscleGroups.find(mg => mg.name === muscleName);
    return {
      icon: '💪',
      color: muscleGroup?.color || '#ff7f00',
      photo_url: muscleGroup?.photo_url || null
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Workout Exercises</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 flex-1 overflow-hidden">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search exercises..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Current Exercises */}
          {currentExercises.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Current Exercises ({currentExercises.length})</h3>
              <div className="grid gap-2 max-h-32 overflow-y-auto">
                {currentExercises.map((exercise) => {
                  const details = getMuscleGroupDetails(exercise.muscle_group);
                  return (
                    <Card key={exercise.id} className="bg-primary/5 border-primary/20">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                            {exercise.photo_url ? (
                              <img 
                                src={exercise.photo_url} 
                                alt={exercise.name}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <Dumbbell className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm text-foreground truncate">{exercise.name}</h4>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{exercise.muscle_group}</Badge>
                            </div>
                          </div>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveExercise(exercise)}
                            className="flex-shrink-0 h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Available Exercises */}
          <div className="space-y-2 flex-1 overflow-hidden">
            <h3 className="text-sm font-medium text-muted-foreground">Available Exercises</h3>
            <div className="grid gap-2 max-h-80 overflow-y-auto">
              {filteredExercises.map((exercise) => {
                const details = getMuscleGroupDetails(exercise.muscle_group);
                const isAdded = currentExerciseIds.has(exercise.id);
                
                return (
                  <Card key={exercise.id} className={`cursor-pointer transition-all ${
                    isAdded ? 'bg-muted/50 opacity-50' : 'hover:bg-muted/50'
                  }`}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                          {exercise.photo_url ? (
                            <img 
                              src={exercise.photo_url} 
                              alt={exercise.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <Dumbbell className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm text-foreground truncate">{exercise.name}</h4>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{exercise.muscle_group}</Badge>
                            {exercise.equipment && (
                              <span className="text-xs text-muted-foreground">{exercise.equipment}</span>
                            )}
                          </div>
                        </div>
                        
                        <Button
                          size="sm"
                          variant={isAdded ? "ghost" : "default"}
                          onClick={() => isAdded ? handleRemoveExercise(exercise) : handleAddExercise(exercise)}
                          className="flex-shrink-0 h-8 w-8 p-0"
                          disabled={isAdded}
                        >
                          {isAdded ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}