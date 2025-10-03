import { useState } from 'react';
import { useGym } from '@/contexts/GymContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Target, Dumbbell, TrendingUp, Settings } from 'lucide-react';
import { MuscleGroupsManager } from './muscle-groups-manager';
import { ExerciseInfoDialog } from './exercise-info-dialog';

// Import muscle group images as fallbacks
import chestImg from '@/assets/muscles/chest.png';
import backImg from '@/assets/muscles/back.png';
import bicepsImg from '@/assets/muscles/biceps.png';
import tricepsImg from '@/assets/muscles/triceps.png';
import shouldersImg from '@/assets/muscles/shoulders.png';
import absImg from '@/assets/muscles/abs.png';
import quadricepsImg from '@/assets/muscles/quadriceps.png';
import hamstringsImg from '@/assets/muscles/hamstrings.png';
import glutesImg from '@/assets/muscles/glutes.png';
import calvesImg from '@/assets/muscles/calves.png';
import forearmsImg from '@/assets/muscles/forearms.png';
import trapeziusImg from '@/assets/muscles/trapezius.png';
import neckImg from '@/assets/muscles/neck.png';
import adductorsImg from '@/assets/muscles/adductors.png';
import abductorsImg from '@/assets/muscles/abductors.png';
import lowerBackImg from '@/assets/muscles/lower-back.png';

// Fallback muscle group image mapping
const fallbackMuscleGroupImages: Record<string, string> = {
  'Chest': chestImg,
  'Back': backImg,
  'Biceps': bicepsImg,
  'Triceps': tricepsImg,
  'Shoulders': shouldersImg,
  'Abs': absImg,
  'Quadriceps': quadricepsImg,
  'Hamstrings': hamstringsImg,
  'Glutes': glutesImg,
  'Calves': calvesImg,
  'Forearms': forearmsImg,
  'Trapezius': trapeziusImg,
  'Neck': neckImg,
  'Adductors': adductorsImg,
  'Abductors': abductorsImg,
  'Lower Back': lowerBackImg,
};

// Function to get muscle group image URL
const getMuscleGroupImage = (muscleGroup: any) => {
  // Use uploaded photo first, then fallback to default images
  if (muscleGroup.photo_url) {
    return muscleGroup.photo_url;
  }
  return fallbackMuscleGroupImages[muscleGroup.name];
};

export function MuscleGroups() {
  const { muscleGroups, exercises, getExercisesByMuscleGroup, exerciseSets, workoutSessions } = useGym();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [showManager, setShowManager] = useState(false);
  const [activeTab, setActiveTab] = useState('groups');
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (showManager) {
    return <MuscleGroupsManager />;
  }

  // Get muscle group names for filtering
  const muscleGroupNames = muscleGroups.map(mg => mg.name).sort();

  // Filter exercises based on search term and selected muscle (including side muscles)
  const filteredExercises = selectedMuscle 
    ? exercises.filter(ex => {
        const isMainMuscle = ex.muscle_group === selectedMuscle;
        const isSideMuscle = ex.side_muscle_groups?.includes(selectedMuscle);
        const matchesSearch = ex.name.toLowerCase().includes(searchTerm.toLowerCase());
        return (isMainMuscle || isSideMuscle) && matchesSearch;
      })
    : exercises.filter(ex => 
        ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ex.muscle_group.toLowerCase().includes(searchTerm.toLowerCase())
      );

  // Calculate muscle group stats
  const getMuscleGroupStats = (muscleGroupName: string) => {
    const muscleExercises = getExercisesByMuscleGroup(muscleGroupName);
    const totalExercises = muscleExercises.length;
    
    // Get sets for this muscle group in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentSets = exerciseSets.filter(set => {
      const exercise = exercises.find(ex => ex.id === set.exercise_id);
      return exercise?.muscle_group === muscleGroupName && 
             new Date(set.created_at) >= thirtyDaysAgo;
    });

    const totalVolume = recentSets.reduce((sum, set) => {
      return sum + ((set.weight || 0) * (set.reps || 0));
    }, 0);

    return {
      totalExercises,
      recentSets: recentSets.length,
      totalVolume
    };
  };
  
  const handleExerciseClick = (exercise: any) => {
    setSelectedExercise(exercise);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mt-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Muscle Groups</h2>
          <p className="text-muted-foreground">Organize exercises by target muscle groups</p>
        </div>
        <Button variant="outline" onClick={() => setShowManager(true)} className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Manage Groups
        </Button>
      </div>

      <div className="w-full">

        <div className="space-y-6 mt-6">

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search exercises or muscle groups..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Muscle Groups Grid */}
      {!selectedMuscle && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {muscleGroups.map((muscleGroup) => {
            const stats = getMuscleGroupStats(muscleGroup.name);
            return (
              <Card 
                key={muscleGroup.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedMuscle(muscleGroup.name)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted">
                      {getMuscleGroupImage(muscleGroup) ? (
                        <img 
                          src={getMuscleGroupImage(muscleGroup)} 
                          alt={muscleGroup.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div 
                          className="w-full h-full flex items-center justify-center text-white text-2xl font-bold"
                          style={{ backgroundColor: muscleGroup.color }}
                        >
                          💪
                        </div>
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{muscleGroup.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {stats.totalExercises} exercises
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Recent Sets</p>
                      <p className="font-semibold text-foreground">{stats.recentSets}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Volume (30d)</p>
                      <p className="font-semibold text-foreground">
                        {stats.totalVolume > 0 ? `${(stats.totalVolume / 1000).toFixed(1)}k` : '0'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                    <Target className="h-3 w-3" />
                    Click to view exercises
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Selected Muscle Group Exercises */}
      {selectedMuscle && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => setSelectedMuscle(null)}>
              ← Back to Muscle Groups
            </Button>
            <div className="flex items-center gap-2">
              {(() => {
                const muscleGroup = muscleGroups.find(mg => mg.name === selectedMuscle);
                const imageUrl = muscleGroup ? getMuscleGroupImage(muscleGroup) : null;
                return imageUrl ? (
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted">
                    <img 
                      src={imageUrl} 
                      alt={selectedMuscle}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : muscleGroup ? (
                  <div 
                    className="text-2xl w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: muscleGroup.color }}
                  >
                    💪
                  </div>
                ) : (
                  <div className="text-2xl">💪</div>
                );
              })()}
              <h3 className="text-xl font-bold text-foreground">{selectedMuscle} Exercises</h3>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredExercises.map((exercise) => {
              // Get recent performance for this exercise
              const exerciseSetsRecent = exerciseSets
                .filter(set => set.exercise_id === exercise.id)
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 5);

              const lastWeight = exerciseSetsRecent[0]?.weight || 0;
              const lastReps = exerciseSetsRecent[0]?.reps || 0;
              const totalSets = exerciseSetsRecent.length;

              const isMainMuscle = exercise.muscle_group === selectedMuscle;
              const isSideMuscle = exercise.side_muscle_groups?.includes(selectedMuscle);

              return (
                <Card key={exercise.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleExerciseClick(exercise)}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Dumbbell className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{exercise.name}</CardTitle>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline">{exercise.muscle_group}</Badge>
                      {isSideMuscle && !isMainMuscle && (
                        <Badge variant="secondary" className="bg-primary/10 text-primary">Side Muscle</Badge>
                      )}
                      {exercise.equipment && (
                        <Badge variant="secondary">{exercise.equipment}</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {exercise.instructions && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {exercise.instructions}
                      </p>
                    )}
                    
                    {exerciseSetsRecent.length > 0 && (
                      <div className="border-t pt-3 mt-3">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">Recent Performance</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">Last Weight</p>
                            <p className="font-semibold">{lastWeight}kg</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Last Reps</p>
                            <p className="font-semibold">{lastReps}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Total Sets</p>
                            <p className="font-semibold">{totalSets}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredExercises.length === 0 && (
            <div className="text-center py-12">
              <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium text-foreground mb-2">No exercises found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Try adjusting your search' : `No exercises found for ${selectedMuscle}`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Empty state for muscle groups */}
      {!selectedMuscle && muscleGroups.length === 0 && (
        <div className="text-center py-12">
          <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium text-foreground mb-2">No muscle groups found</h3>
          <p className="text-muted-foreground mb-4">
            Create muscle groups to organize your exercises
          </p>
          <Button onClick={() => setShowManager(true)} className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Manage Muscle Groups
          </Button>
        </div>
      )}
        </div>

      </div>
      
      {/* Exercise Info Dialog */}
      <ExerciseInfoDialog
        exercise={selectedExercise}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  );
}