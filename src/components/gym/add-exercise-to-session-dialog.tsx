import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { useGym } from "@/contexts/GymContext";
import { Search, Plus, Info } from "lucide-react";

interface AddExerciseToSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddExercise: (exercise: any) => void;
}

export const AddExerciseToSessionDialog = ({ 
  open, 
  onOpenChange, 
  onAddExercise 
}: AddExerciseToSessionDialogProps) => {
  const { exercises, muscleGroups } = useGym();
  const [searchTerm, setSearchTerm] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('all');
  const [equipmentFilter, setEquipmentFilter] = useState('all');

  const uniqueEquipment = Array.from(
    new Set(exercises.map(ex => ex.equipment).filter(Boolean))
  ).sort();

  const filteredExercises = exercises.filter(exercise => {
    const matchesSearch = exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exercise.muscle_group.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMuscle = muscleFilter === 'all' || 
      exercise.muscle_group === muscleFilter ||
      exercise.side_muscle_groups?.includes(muscleFilter);
    const matchesEquipment = equipmentFilter === 'all' || exercise.equipment === equipmentFilter;
    
    return matchesSearch && matchesMuscle && matchesEquipment;
  });

  const handleAddExercise = (exercise: any) => {
    onAddExercise(exercise);
  };

  const getMuscleGroupDetails = (muscleName: string) => {
    const muscleGroup = muscleGroups.find(mg => mg.name === muscleName);
    return {
      color: muscleGroup?.color || '#ff7f00',
      photo_url: muscleGroup?.photo_url
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Exercise to Workout</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search and Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search exercises..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Select value={muscleFilter} onValueChange={setMuscleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by muscle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Muscles</SelectItem>
                  {muscleGroups.map(mg => (
                    <SelectItem key={mg.id} value={mg.name}>
                      {mg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={equipmentFilter} onValueChange={setEquipmentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by equipment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Equipment</SelectItem>
                  {uniqueEquipment.map(eq => (
                    <SelectItem key={eq} value={eq as string}>
                      {eq}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Exercise List */}
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-2 pb-4">
              {filteredExercises.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No exercises found
                </div>
              ) : (
                filteredExercises.map(exercise => {
                  const muscleDetails = getMuscleGroupDetails(exercise.muscle_group);
                  
                  return (
                    <div
                      key={exercise.id}
                      className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                          {muscleDetails.photo_url ? (
                            <img 
                              src={muscleDetails.photo_url} 
                              alt={exercise.muscle_group}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div 
                              className="w-full h-full flex items-center justify-center text-lg"
                              style={{ backgroundColor: muscleDetails.color }}
                            >
                              💪
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{exercise.name}</h4>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {exercise.muscle_group}
                            </Badge>
                            {exercise.equipment && (
                              <Badge variant="secondary" className="text-xs">
                                {exercise.equipment}
                              </Badge>
                            )}
                            {exercise.side_muscle_groups?.slice(0, 2).map(sm => (
                              <Badge key={sm} variant="secondary" className="text-xs">
                                {sm}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleAddExercise(exercise)}
                        className="ml-2"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};