import { useState, useEffect } from 'react';
import { useGym } from '@/contexts/GymContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Repeat, Plus, X, Dumbbell, Edit2, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AlternativeGroup {
  exercises: any[];
}

export function AlternativesManager() {
  const {
    exercises,
    muscleGroups,
    exerciseAlternatives,
    addExerciseAlternative,
    removeExerciseAlternative,
    getExerciseAlternatives
  } = useGym();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('');
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const [editingGroup, setEditingGroup] = useState<AlternativeGroup | null>(null);

  // Get exercises for selected muscle group
  const filteredExercises = selectedMuscleGroup
    ? exercises.filter(ex => ex.muscle_group === selectedMuscleGroup)
    : [];

  // Build alternative groups from the exerciseAlternatives data
  const alternativeGroups: AlternativeGroup[] = [];
  const processedExercises = new Set<string>();

  exercises.forEach(exercise => {
    if (processedExercises.has(exercise.id)) return;

    const alternatives = getExerciseAlternatives(exercise.id);
    if (alternatives.length > 0) {
      const groupExercises = [exercise, ...alternatives];
      alternativeGroups.push({ exercises: groupExercises });
      
      // Mark all exercises in this group as processed
      groupExercises.forEach(ex => processedExercises.add(ex.id));
    }
  });

  const handleToggleExercise = (exerciseId: string) => {
    setSelectedExerciseIds(prev => 
      prev.includes(exerciseId)
        ? prev.filter(id => id !== exerciseId)
        : [...prev, exerciseId]
    );
  };

  const handleCreateGroup = async () => {
    if (selectedExerciseIds.length < 2) {
      toast({
        title: "Select at least 2 exercises",
        description: "You need at least 2 exercises to create an alternative group",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create bidirectional relationships between all exercises in the group
      for (let i = 0; i < selectedExerciseIds.length; i++) {
        for (let j = i + 1; j < selectedExerciseIds.length; j++) {
          await addExerciseAlternative(selectedExerciseIds[i], selectedExerciseIds[j]);
        }
      }

      setSelectedExerciseIds([]);
      setSelectedMuscleGroup('');
      setIsAddDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Alternative group created successfully",
      });
    } catch (error) {
      console.error('Error creating alternative group:', error);
    }
  };

  const handleEditGroup = (group: AlternativeGroup) => {
    const muscleGroup = group.exercises[0]?.muscle_group;
    setSelectedMuscleGroup(muscleGroup || '');
    setSelectedExerciseIds(group.exercises.map(ex => ex.id));
    setEditingGroup(group);
    setIsAddDialogOpen(true);
  };

  const handleUpdateGroup = async () => {
    if (!editingGroup || selectedExerciseIds.length < 2) {
      toast({
        title: "Select at least 2 exercises",
        description: "You need at least 2 exercises in a group",
        variant: "destructive",
      });
      return;
    }

    try {
      // Remove old relationships for exercises that were in the original group
      for (let i = 0; i < editingGroup.exercises.length; i++) {
        for (let j = i + 1; j < editingGroup.exercises.length; j++) {
          await removeExerciseAlternative(
            editingGroup.exercises[i].id,
            editingGroup.exercises[j].id
          );
        }
      }

      // Create new relationships
      for (let i = 0; i < selectedExerciseIds.length; i++) {
        for (let j = i + 1; j < selectedExerciseIds.length; j++) {
          await addExerciseAlternative(selectedExerciseIds[i], selectedExerciseIds[j]);
        }
      }

      setSelectedExerciseIds([]);
      setSelectedMuscleGroup('');
      setEditingGroup(null);
      setIsAddDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Alternative group updated successfully",
      });
    } catch (error) {
      console.error('Error updating alternative group:', error);
    }
  };

  const handleDeleteGroup = async (group: AlternativeGroup) => {
    try {
      // Remove all relationships in the group
      for (let i = 0; i < group.exercises.length; i++) {
        for (let j = i + 1; j < group.exercises.length; j++) {
          await removeExerciseAlternative(group.exercises[i].id, group.exercises[j].id);
        }
      }

      toast({
        title: "Success",
        description: "Alternative group deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting alternative group:', error);
    }
  };

  const resetDialog = () => {
    setSelectedMuscleGroup('');
    setSelectedExerciseIds([]);
    setEditingGroup(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mt-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Alternative Exercises</h2>
          <p className="text-muted-foreground">Manage alternative exercise groups for quick swaps during workouts</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) resetDialog();
        }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingGroup ? 'Edit Alternative Group' : 'Create Alternative Group'}
              </DialogTitle>
              <DialogDescription>
                Select exercises that can be used as alternatives to each other
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Step 1: Select Muscle Group */}
              <div>
                <Label className="text-base font-semibold mb-3 block">1. Select Muscle Group</Label>
                <Select value={selectedMuscleGroup} onValueChange={setSelectedMuscleGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a muscle group" />
                  </SelectTrigger>
                  <SelectContent>
                    {muscleGroups.map((group) => (
                      <SelectItem key={group.id} value={group.name}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Step 2: Select Exercises */}
              {selectedMuscleGroup && (
                <div>
                  <Label className="text-base font-semibold mb-3 block">
                    2. Select Exercises ({selectedExerciseIds.length} selected)
                  </Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select at least 2 exercises to create an alternative group
                  </p>
                  
                  <div className="space-y-2 max-h-[400px] overflow-y-auto border rounded-lg p-3">
                    {filteredExercises.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No exercises found for this muscle group
                      </div>
                    ) : (
                      filteredExercises.map((exercise) => (
                        <div
                          key={exercise.id}
                          className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50 ${
                            selectedExerciseIds.includes(exercise.id) 
                              ? 'bg-primary/5 border-primary' 
                              : 'border-border'
                          }`}
                          onClick={() => handleToggleExercise(exercise.id)}
                        >
                          <Checkbox
                            checked={selectedExerciseIds.includes(exercise.id)}
                            onCheckedChange={() => handleToggleExercise(exercise.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground">{exercise.name}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {exercise.equipment && (
                                <Badge variant="secondary" className="text-xs">
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
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {selectedMuscleGroup && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={editingGroup ? handleUpdateGroup : handleCreateGroup}
                    disabled={selectedExerciseIds.length < 2}
                    className="flex-1"
                  >
                    <Repeat className="h-4 w-4 mr-2" />
                    {editingGroup ? 'Update Group' : 'Create Group'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsAddDialogOpen(false);
                      resetDialog();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alternative Groups List */}
      {alternativeGroups.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Repeat className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium text-foreground mb-2">No alternative groups</h3>
            <p className="text-muted-foreground mb-4">
              Create groups of alternative exercises to quickly swap them during workouts
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {alternativeGroups.map((group, groupIndex) => (
            <Card key={groupIndex}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2 mb-2">
                      <Repeat className="h-5 w-5 text-primary" />
                      Alternative Group {groupIndex + 1}
                    </CardTitle>
                    <CardDescription>
                      <Badge variant="outline">{group.exercises[0]?.muscle_group}</Badge>
                      <span className="ml-2 text-xs">
                        {group.exercises.length} exercises
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditGroup(group)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteGroup(group)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {group.exercises.map((exercise, index) => (
                    <div
                      key={exercise.id}
                      className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                    >
                      <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{exercise.name}</p>
                        <div className="flex gap-2 mt-1">
                          {exercise.equipment && (
                            <Badge variant="secondary" className="text-xs">
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
