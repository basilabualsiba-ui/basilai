import { useState, useEffect } from 'react';
import { Plus, Target, Edit2, Trash2, Search, ArrowLeft, ArrowRight, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ExerciseInfoDialog } from './exercise-info-dialog';
import { WorkoutDetail } from './workout-detail';
import { useGym } from '@/contexts/GymContext';

interface Workout {
  id: string;
  name: string;
  description: string | null;
  muscle_groups: string[];
  created_at: string;
}

interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
  side_muscle_groups?: string[];
  equipment?: string;
  difficulty_level?: string;
  instructions?: string;
  video_url?: string;
  photo_url?: string;
  created_at: string;
  updated_at: string;
}

function WorkoutMuscleDistribution({ workoutId }: { workoutId: string }) {
  const { muscleGroups } = useGym();
  const [exercises, setExercises] = useState<Exercise[]>([]);

  useEffect(() => {
    const fetchWorkoutExercises = async () => {
      try {
        const { data: workoutExercises, error: weError } = await supabase
          .from('workout_exercises')
          .select('exercise_id')
          .eq('workout_id', workoutId);

        if (weError) throw weError;

        if (workoutExercises && workoutExercises.length > 0) {
          const exerciseIds = workoutExercises.map(we => we.exercise_id);
          const { data: exercisesData, error: exError } = await supabase
            .from('exercises')
            .select('*')
            .in('id', exerciseIds);

          if (exError) throw exError;
          setExercises(exercisesData || []);
        }
      } catch (error) {
        console.error('Error fetching workout exercises:', error);
      }
    };

    fetchWorkoutExercises();
  }, [workoutId]);

  const muscleDistribution = () => {
    const muscleScores: Record<string, { score: number; isMain: boolean }> = {};
    
    exercises.forEach(exercise => {
      // Main muscle gets 75% weight
      if (!muscleScores[exercise.muscle_group]) {
        muscleScores[exercise.muscle_group] = { score: 0, isMain: true };
      }
      muscleScores[exercise.muscle_group].score += 0.75;
      muscleScores[exercise.muscle_group].isMain = true; // Mark as main muscle
      
      // Side muscles get 25% weight (split among them)
      const sideMuscles = exercise.side_muscle_groups || [];
      if (sideMuscles.length > 0) {
        const sideWeight = 0.25 / sideMuscles.length;
        sideMuscles.forEach((sideMuscle: string) => {
          if (!muscleScores[sideMuscle]) {
            muscleScores[sideMuscle] = { score: 0, isMain: false };
          }
          muscleScores[sideMuscle].score += sideWeight;
          // Keep isMain as false only if it was never a main muscle
        });
      }
    });
    
    // Calculate total and convert to percentages
    const totalScore = Object.values(muscleScores).reduce((sum, { score }) => sum + score, 0);
    const musclePercentages = Object.entries(muscleScores).map(([muscle, { score, isMain }]) => ({
      muscle,
      percentage: Math.round((score / totalScore) * 100),
      isMain
    })).sort((a, b) => b.percentage - a.percentage);
    
    // Separate into main and side based on isMain flag
    const mainMuscles = musclePercentages.filter(m => m.isMain);
    const sideMuscles = musclePercentages.filter(m => !m.isMain);
    
    return { main: mainMuscles, side: sideMuscles };
  };

  const { main: mainMuscles, side: sideMuscles } = muscleDistribution();

  if (exercises.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No exercises added yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {mainMuscles.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Main Muscles</p>
          <div className="flex flex-wrap gap-2">
            {mainMuscles.map(({ muscle, percentage }) => {
              const muscleGroup = muscleGroups.find(mg => mg.name === muscle);
              const color = muscleGroup?.color || '#ff7f00';
              const photo_url = muscleGroup?.photo_url;
              
              return (
                <div 
                  key={muscle}
                  className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-border bg-card"
                >
                  <div className="w-4 h-4 rounded-full overflow-hidden flex-shrink-0">
                    {photo_url ? (
                      <img src={photo_url} alt={muscle} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs" style={{ backgroundColor: color }}>
                        💪
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-medium text-foreground capitalize">{muscle}</span>
                  <span className="text-xs font-semibold text-primary">{percentage}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {sideMuscles.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Side Muscles</p>
          <div className="flex flex-wrap gap-2">
            {sideMuscles.map(({ muscle, percentage }) => {
              const muscleGroup = muscleGroups.find(mg => mg.name === muscle);
              const color = muscleGroup?.color || '#ff7f00';
              const photo_url = muscleGroup?.photo_url;
              
              return (
                <div 
                  key={muscle}
                  className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-border bg-card"
                >
                  <div className="w-4 h-4 rounded-full overflow-hidden flex-shrink-0">
                    {photo_url ? (
                      <img src={photo_url} alt={muscle} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs" style={{ backgroundColor: color }}>
                        💪
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-medium text-muted-foreground capitalize">{muscle}</span>
                  <span className="text-xs font-semibold text-muted-foreground">{percentage}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


export function WorkoutsList() {
  const { muscleGroups, exercises: gymExercises } = useGym();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [isExerciseInfoOpen, setIsExerciseInfoOpen] = useState(false);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    selectedMuscles: [] as string[],
    selectedExercises: [] as string[]
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchWorkouts();
  }, []);

  const fetchWorkouts = async () => {
    try {
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkouts(data || []);
    } catch (error) {
      console.error('Error fetching workouts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch workouts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredExercises = gymExercises.filter(exercise => {
    const matchesMuscle = formData.selectedMuscles.some(muscle => 
      exercise.muscle_group.toLowerCase().includes(muscle.toLowerCase())
    );
    const matchesSearch = exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exercise.muscle_group.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesMuscle && matchesSearch;
  });

  const handleMuscleToggle = (muscle: string) => {
    setFormData(prev => ({
      ...prev,
      selectedMuscles: prev.selectedMuscles.includes(muscle)
        ? prev.selectedMuscles.filter(m => m !== muscle)
        : [...prev.selectedMuscles, muscle],
      selectedExercises: [] // Reset exercises when muscles change
    }));
  };

  const handleExerciseToggle = (exerciseId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedExercises: prev.selectedExercises.includes(exerciseId)
        ? prev.selectedExercises.filter(id => id !== exerciseId)
        : [...prev.selectedExercises, exerciseId]
    }));
  };

  const handleNext = () => {
    if (formData.name.trim() === '' || formData.selectedMuscles.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in workout name and select at least one muscle group",
        variant: "destructive",
      });
      return;
    }
    setCurrentStep(2);
  };

  const handleBack = () => {
    setCurrentStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.selectedExercises.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one exercise for the workout",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingWorkout) {
        // Update existing workout
        const { error } = await supabase
          .from('workouts')
          .update({
            name: formData.name,
            description: formData.description || null,
            muscle_groups: formData.selectedMuscles,
          })
          .eq('id', editingWorkout.id);

        if (error) throw error;

        // Update workout exercises
        if (formData.selectedExercises.length > 0) {
          // Delete existing workout exercises
          await supabase
            .from('workout_exercises')
            .delete()
            .eq('workout_id', editingWorkout.id);

          // Insert new workout exercises with default values
          const workoutExercises = formData.selectedExercises.map((exerciseId, index) => ({
            workout_id: editingWorkout.id,
            exercise_id: exerciseId,
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
        }

        toast({
          title: "Success",
          description: "Workout updated successfully",
        });
      } else {
        // Create new workout
        const { data: workoutData, error } = await supabase
          .from('workouts')
          .insert({
            name: formData.name,
            description: formData.description || null,
            muscle_groups: formData.selectedMuscles,
          })
          .select()
          .single();

        if (error) throw error;

        // Add exercises to workout with default values
        if (formData.selectedExercises.length > 0) {
          const workoutExercises = formData.selectedExercises.map((exerciseId, index) => ({
            workout_id: workoutData.id,
            exercise_id: exerciseId,
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
        }

        toast({
          title: "Success",
          description: "Workout created successfully",
        });
      }

      fetchWorkouts();
      resetForm();
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving workout:', error);
      toast({
        title: "Error",
        description: "Failed to save workout",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async (workout: Workout) => {
    setEditingWorkout(workout);
    
    // Fetch existing workout exercises
    try {
      const { data: workoutExercises, error } = await supabase
        .from('workout_exercises')
        .select('exercise_id')
        .eq('workout_id', workout.id);
      
      if (error) throw error;
      
      const selectedExerciseIds = workoutExercises?.map(we => we.exercise_id) || [];
      
      setFormData({
        name: workout.name,
        description: workout.description || '',
        selectedMuscles: workout.muscle_groups,
        selectedExercises: selectedExerciseIds
      });
    } catch (error) {
      console.error('Error fetching workout exercises:', error);
      setFormData({
        name: workout.name,
        description: workout.description || '',
        selectedMuscles: workout.muscle_groups,
        selectedExercises: []
      });
    }
    
    setCurrentStep(1);
    setDialogOpen(true);
  };

  const handleDelete = async (workoutId: string) => {
    try {
      // Delete workout exercises first
      await supabase
        .from('workout_exercises')
        .delete()
        .eq('workout_id', workoutId);

      // Delete workout
      const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('id', workoutId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Workout deleted successfully",
      });
      fetchWorkouts();
    } catch (error) {
      console.error('Error deleting workout:', error);
      toast({
        title: "Error",
        description: "Failed to delete workout",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      selectedMuscles: [],
      selectedExercises: []
    });
    setEditingWorkout(null);
    setCurrentStep(1);
    setSearchTerm('');
  };

  const handleExerciseInfoClick = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setIsExerciseInfoOpen(true);
  };

  // Show workout detail view if a workout is selected
  if (selectedWorkoutId) {
    return (
      <WorkoutDetail 
        workoutId={selectedWorkoutId} 
        onBack={() => setSelectedWorkoutId(null)} 
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Target className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading workouts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mt-6">
        <div>
          <h1 className="text-2xl font-bold">Workouts</h1>
          <p className="text-sm text-muted-foreground">Create and manage your workout routines</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2 mt-4 bg-gym hover:bg-gym/90 text-white">
              <Plus className="h-4 w-4" />
              Add Workout
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border-gym/30 bg-gradient-to-br from-background via-background to-gym/5">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gym/20">
                  <Target className="h-4 w-4 text-gym" />
                </div>
                {editingWorkout ? 'Edit Workout' : 'Create New Workout'}
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  Step {currentStep} of 2
                </span>
              </DialogTitle>
            </DialogHeader>
            
            {currentStep === 1 && (
              <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="space-y-6">
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="name">Workout Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter workout name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter workout description"
                    />
                  </div>
                </div>

                <div>
                  <Label>Select Muscle Groups</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {muscleGroups.map((muscleGroup) => (
                      <div key={muscleGroup.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={muscleGroup.id}
                          checked={formData.selectedMuscles.includes(muscleGroup.name)}
                          onCheckedChange={() => handleMuscleToggle(muscleGroup.name)}
                        />
                        <Label htmlFor={muscleGroup.id} className="text-sm flex items-center gap-1">
                          <div className="w-4 h-4 rounded overflow-hidden flex items-center justify-center flex-shrink-0">
                            {muscleGroup.photo_url ? (
                              <img 
                                src={muscleGroup.photo_url} 
                                alt={muscleGroup.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>💪</span>
                            )}
                          </div>
                          {muscleGroup.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={!formData.name.trim() || formData.selectedMuscles.length === 0}
                    className="bg-gym hover:bg-gym/90 text-white"
                  >
                    Next: Select Exercises
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </form>
            )}

            {currentStep === 2 && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-medium">{formData.name}</span>
                    <span>•</span>
                    <span>{formData.selectedMuscles.join(', ')}</span>
                  </div>
                  
                  <div>
                    <Label htmlFor="search">Search Exercises</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="search"
                        type="text"
                        placeholder="Search exercises by name or muscle group..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                     <div>
                      <Label>Select Exercises ({formData.selectedExercises.length} selected)</Label>
                      <div className="grid gap-2 max-h-60 overflow-y-auto mt-2 border rounded-md p-2">
                        {filteredExercises.map((exercise) => (
                          <div key={exercise.id} className="space-y-2">
                            <div className="flex items-center space-x-2 p-2 border rounded hover:bg-muted/50">
                              <Checkbox
                                id={exercise.id}
                                checked={formData.selectedExercises.includes(exercise.id)}
                                onCheckedChange={() => handleExerciseToggle(exercise.id)}
                              />
                              <div className="flex-1 cursor-pointer" onClick={() => handleExerciseInfoClick(exercise)}>
                                <Label htmlFor={exercise.id} className="font-medium cursor-pointer">
                                  {exercise.name}
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  {exercise.muscle_group} • {exercise.difficulty_level}
                                  {exercise.equipment && ` • ${exercise.equipment}`}
                                </p>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleExerciseInfoClick(exercise)}
                                className="h-8 w-8 p-0"
                              >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        ))}
                        {filteredExercises.length === 0 && (
                          <p className="text-center text-muted-foreground py-4">
                            {searchTerm ? 'No exercises found matching your search' : 'No exercises found for selected muscle groups'}
                          </p>
                        )}
                      </div>
                    </div>
                </div>

                <div className="flex justify-between gap-2">
                  <Button type="button" variant="outline" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      disabled={formData.selectedExercises.length === 0}
                      className="bg-gym hover:bg-gym/90 text-white"
                    >
                      {editingWorkout ? 'Update Workout' : 'Create Workout'}
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {workouts.map((workout) => (
          <Card key={workout.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{workout.name}</CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedWorkoutId(workout.id)}
                    className="h-8 w-8"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(workout)}
                    className="h-8 w-8"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(workout.id)}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {workout.description && (
                <p className="text-sm text-muted-foreground">{workout.description}</p>
              )}
            </CardHeader>
            <CardContent>
              <WorkoutMuscleDistribution workoutId={workout.id} />
            </CardContent>
          </Card>
        ))}

        {workouts.length === 0 && (
          <div className="col-span-full">
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Target className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No workouts yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first workout routine to get started
                </p>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Workout
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Exercise Info Dialog */}
      <ExerciseInfoDialog 
        exercise={selectedExercise}
        open={isExerciseInfoOpen}
        onOpenChange={setIsExerciseInfoOpen}
      />
    </div>
  );
}