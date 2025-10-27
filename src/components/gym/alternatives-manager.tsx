import { useState } from 'react';
import { useGym } from '@/contexts/GymContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Repeat, Plus, X, Dumbbell } from 'lucide-react';

export function AlternativesManager() {
  const {
    exercises,
    exerciseAlternatives,
    addExerciseAlternative,
    removeExerciseAlternative,
    getExerciseAlternatives
  } = useGym();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('');
  const [selectedAlternativeId, setSelectedAlternativeId] = useState<string>('');

  const handleAddAlternative = async () => {
    if (!selectedExerciseId || !selectedAlternativeId) return;
    if (selectedExerciseId === selectedAlternativeId) return;

    await addExerciseAlternative(selectedExerciseId, selectedAlternativeId);
    setSelectedExerciseId('');
    setSelectedAlternativeId('');
    setIsAddDialogOpen(false);
  };

  // Group exercises with their alternatives
  const exercisesWithAlternatives = exercises.map(exercise => ({
    exercise,
    alternatives: getExerciseAlternatives(exercise.id)
  })).filter(item => item.alternatives.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mt-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Alternative Exercises</h2>
          <p className="text-muted-foreground">Manage alternative exercises for quick swaps during workouts</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Alternative
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Alternative Exercise</DialogTitle>
              <DialogDescription>
                Link two exercises as alternatives to each other
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Exercise</label>
                <Select value={selectedExerciseId} onValueChange={setSelectedExerciseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select exercise" />
                  </SelectTrigger>
                  <SelectContent>
                    {exercises.map((exercise) => (
                      <SelectItem key={exercise.id} value={exercise.id}>
                        {exercise.name} ({exercise.muscle_group})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Alternative Exercise</label>
                <Select 
                  value={selectedAlternativeId} 
                  onValueChange={setSelectedAlternativeId}
                  disabled={!selectedExerciseId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select alternative" />
                  </SelectTrigger>
                  <SelectContent>
                    {exercises
                      .filter(ex => ex.id !== selectedExerciseId)
                      .map((exercise) => (
                        <SelectItem key={exercise.id} value={exercise.id}>
                          {exercise.name} ({exercise.muscle_group})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleAddAlternative}
                  disabled={!selectedExerciseId || !selectedAlternativeId}
                  className="flex-1"
                >
                  Add Alternative
                </Button>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {exercisesWithAlternatives.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Repeat className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium text-foreground mb-2">No alternatives configured</h3>
            <p className="text-muted-foreground mb-4">
              Add alternative exercises to quickly swap them during workouts
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {exercisesWithAlternatives.map(({ exercise, alternatives }) => (
            <Card key={exercise.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Dumbbell className="h-5 w-5 text-primary" />
                      {exercise.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      <Badge variant="outline">{exercise.muscle_group}</Badge>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground mb-3">Alternatives:</p>
                  {alternatives.map((alt) => (
                    <div
                      key={alt.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{alt.name}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">{alt.muscle_group}</Badge>
                          {alt.equipment && (
                            <Badge variant="secondary" className="text-xs">{alt.equipment}</Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeExerciseAlternative(exercise.id, alt.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
