import { useState } from 'react';
import { useGym } from '@/contexts/GymContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, ArrowLeft, Dumbbell, CheckCircle2 } from 'lucide-react';

// Import muscle group images
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

const getMuscleGroupImage = (muscleGroup: any) => {
  if (muscleGroup.photo_url) {
    return muscleGroup.photo_url;
  }
  return fallbackMuscleGroupImages[muscleGroup.name];
};

interface QuickWorkoutExerciseSelectorProps {
  currentExercises: any[];
  completedExercises: Set<string>;
  onExerciseSelect: (exercise: any) => void;
  onComplete: () => void;
  onCancel: () => void;
}

export function QuickWorkoutExerciseSelector({
  currentExercises,
  completedExercises,
  onExerciseSelect,
  onComplete,
  onCancel,
}: QuickWorkoutExerciseSelectorProps) {
  const { muscleGroups, exercises, getExercisesByMuscleGroup } = useGym();
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredExercises = selectedMuscle 
    ? getExercisesByMuscleGroup(selectedMuscle).filter(ex => 
        ex.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const handleBack = () => {
    if (selectedMuscle) {
      setSelectedMuscle(null);
      setSearchTerm('');
    } else {
      onCancel();
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {selectedMuscle ? `${selectedMuscle} Exercises` : 'Select Muscle Group'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {currentExercises.length} exercise{currentExercises.length !== 1 ? 's' : ''} added
            </p>
          </div>
        </div>
        {currentExercises.length > 0 && (
          <Button onClick={onComplete}>
            Complete Workout
          </Button>
        )}
      </div>

      {/* Current Exercises Summary */}
      {currentExercises.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Current Workout</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {currentExercises.map((exercise) => (
                <Badge 
                  key={exercise.id} 
                  variant={completedExercises.has(exercise.id) ? "default" : "outline"}
                  className="flex items-center gap-1"
                >
                  {completedExercises.has(exercise.id) && (
                    <CheckCircle2 className="h-3 w-3" />
                  )}
                  {exercise.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search (only when muscle selected) */}
      {selectedMuscle && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search exercises..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Muscle Groups Grid */}
      {!selectedMuscle && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {muscleGroups.map((muscleGroup) => (
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
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Exercises List */}
      {selectedMuscle && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredExercises.map((exercise) => {
            const isAdded = currentExercises.some(ex => ex.id === exercise.id);
            const isCompleted = completedExercises.has(exercise.id);

            return (
              <Card 
                key={exercise.id} 
                className={`hover:shadow-md transition-shadow cursor-pointer ${
                  isAdded ? 'border-primary' : ''
                }`}
                onClick={() => onExerciseSelect(exercise)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <Dumbbell className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{exercise.name}</CardTitle>
                    </div>
                    {isCompleted && (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">{exercise.muscle_group}</Badge>
                    {exercise.equipment && (
                      <Badge variant="secondary">{exercise.equipment}</Badge>
                    )}
                  </div>
                </CardHeader>
                {exercise.instructions && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {exercise.instructions}
                    </p>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {selectedMuscle && filteredExercises.length === 0 && (
        <div className="text-center py-12">
          <Dumbbell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium text-foreground mb-2">No exercises found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or select a different muscle group
          </p>
        </div>
      )}
    </div>
  );
}
