import { useState, useEffect } from 'react';
import { useGym } from '@/contexts/GymContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Play, Clock, TrendingUp, RotateCcw, CheckCircle2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ExerciseHistoryDialog } from './exercise-history-dialog';
import { useLiveActivity } from '@/hooks/useLiveActivity';
interface ExerciseDetailProps {
  exercise: any;
  sessionId: string;
  onFinish: () => void;
  onBack: () => void;
  workoutConfig?: {
    sets?: number;
    reps?: number;
    weight?: number;
    rest_seconds?: number;
  };
}
interface SetData {
  reps: string;
  weight: string;
}
export function ExerciseDetail({
  exercise,
  sessionId,
  onFinish,
  onBack,
  workoutConfig
}: ExerciseDetailProps) {
  const {
    addExerciseSet,
    exerciseSets
  } = useGym();
  
  const { startRestPeriod } = useLiveActivity();

  // Create default sets with progressive reps (12-10-8)
  const createDefaultSets = () => {
    const defaultSets = workoutConfig?.sets || 3;
    const defaultWeight = workoutConfig?.weight?.toString() || '25';
    const repsProgression = ['12', '10', '8'];
    return Array.from({
      length: defaultSets
    }, (_, index) => ({
      reps: repsProgression[index] || '8',
      weight: defaultWeight
    }));
  };
  const [sets, setSets] = useState<SetData[]>(createDefaultSets);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const {
    toast
  } = useToast();

  // Helper function to convert YouTube URLs to embed format
  const getEmbedUrl = (url: string) => {
    if (url.includes('youtube.com/watch?v=')) {
      return url.replace('watch?v=', 'embed/');
    } else if (url.includes('youtu.be/')) {
      return url.replace('youtu.be/', 'youtube.com/embed/');
    }
    return url;
  };

  // Rest timer countdown effect
  useEffect(() => {
    if (showRestTimer && restTimeLeft > 0) {
      const timer = setTimeout(() => {
        setRestTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (showRestTimer && restTimeLeft === 0) {
      onFinish();
    }
  }, [showRestTimer, restTimeLeft, onFinish]);
  useEffect(() => {
    const existingSets = exerciseSets.filter(set => set.session_id === sessionId && set.exercise_id === exercise.id).sort((a, b) => a.set_number - b.set_number);
    if (existingSets.length > 0) {
      // Use existing sets from current session
      const loadedSets = existingSets.map(set => ({
        reps: set.reps?.toString() || workoutConfig?.reps?.toString() || '8',
        weight: set.weight?.toString() || workoutConfig?.weight?.toString() || '25'
      }));

      // Ensure we have at least the configured number of sets for UI
      const minSets = workoutConfig?.sets || 3;
      while (loadedSets.length < minSets) {
        const lastSet = loadedSets[loadedSets.length - 1] || {
          reps: workoutConfig?.reps?.toString() || '8',
          weight: workoutConfig?.weight?.toString() || '25'
        };
        loadedSets.push({
          ...lastSet
        });
      }
      setSets(loadedSets);
    } else {
      // Reset to defaults when no existing sets
      setSets(createDefaultSets());
    }
  }, [exerciseSets, sessionId, exercise.id, workoutConfig]);
  const updateSet = (index: number, field: keyof SetData, value: string) => {
    setSets(prev => prev.map((set, i) => i === index ? {
      ...set,
      [field]: value
    } : set));
  };

  const removeSet = (index: number) => {
    const minSets = Math.max(1, workoutConfig?.sets || 1);
    if (sets.length <= minSets) {
      toast({
        title: "Cannot remove set",
        description: `Minimum ${minSets} set${minSets > 1 ? 's' : ''} required`,
        variant: "destructive"
      });
      return;
    }
    setSets(prev => prev.filter((_, i) => i !== index));
  };
  const handleFinishExercise = async () => {
    setIsCompleting(true);
    try {
      // Clear existing sets for this exercise in this session
      const existingSets = exerciseSets.filter(set => set.session_id === sessionId && set.exercise_id === exercise.id);

      // Add all sets
      for (let i = 0; i < sets.length; i++) {
        const setData = sets[i];
        if (setData.reps && setData.weight) {
          await addExerciseSet({
            session_id: sessionId,
            exercise_id: exercise.id,
            set_number: i + 1,
            weight: parseFloat(setData.weight) || 0,
            reps: parseInt(setData.reps) || 0,
            rest_seconds: 90
          });
        }
      }

      // Show success animation
      setShowSuccess(true);

      // Wait for animation then start rest timer
      setTimeout(async () => {
        setShowSuccess(false);
        setShowRestTimer(true);
        const restSeconds = workoutConfig?.rest_seconds || 90;
        setRestTimeLeft(restSeconds);
        
        // Start Live Activity rest timer
        await startRestPeriod(restSeconds);
        
        setIsCompleting(false);
      }, 1500);
    } catch (error) {
      console.error('Error finishing exercise:', error);
      toast({
        title: "Error",
        description: "Failed to save exercise data",
        variant: "destructive"
      });
      setIsCompleting(false);
    }
  };
  if (showSuccess) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center animate-scale-in">
          <div className="w-20 h-20 bg-success rounded-full flex items-center justify-center mb-4 mx-auto animate-bounce">
            <CheckCircle2 className="h-10 w-10 text-success-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-success mb-2">Exercise Complete!</h2>
          <p className="text-muted-foreground">{exercise.name}</p>
        </div>
      </div>;
  }

  if (showRestTimer) {
    const minutes = Math.floor(restTimeLeft / 60);
    const seconds = restTimeLeft % 60;
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center mb-6 mx-auto border-4 border-primary/20">
            <Clock className="h-16 w-16 text-primary" />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-2">Rest Time</h2>
          <div className="text-6xl font-bold text-primary mb-4">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </div>
          <p className="text-muted-foreground mb-8">Take a break before your next exercise</p>
          <Button 
            onClick={() => onFinish()} 
            variant="outline" 
            className="border-primary/30 text-primary hover:bg-primary/10"
          >
            Skip Rest
          </Button>
        </div>
      </div>
    );
  }
  return <div className="min-h-screen bg-background">
      {/* Hero Image */}
      <div className="relative h-64 bg-gradient-to-br from-muted to-muted/50 overflow-hidden">
        {exercise.photo_url ? <img src={exercise.photo_url} alt={exercise.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <div className="text-6xl">🏋️</div>
          </div>}
        
        {/* Header Overlay */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-background/50 to-transparent">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={onBack} className="bg-background/20 backdrop-blur-sm">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            {exercise.video_url && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="bg-background/20 backdrop-blur-sm"
                onClick={() => setShowVideoDialog(true)}
              >
                <Play className="h-4 w-4 mr-2" />
                How-To
              </Button>
            )}
          </div>
        </div>

        {/* Exercise Title */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background/80 to-transparent">
          <h1 className="text-2xl font-bold text-foreground mb-2">{exercise.name}</h1>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-4">
        <div className="flex gap-3 mb-6">
          <Button size="sm" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold" title={`Rest: ${workoutConfig?.rest_seconds || 90} seconds`}>
            <Clock className="h-4 w-4 mr-2" />
            {Math.floor((workoutConfig?.rest_seconds || 90) / 60)}:{((workoutConfig?.rest_seconds || 90) % 60).toString().padStart(2, '0')} rest
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowHistory(true)}>
            <TrendingUp className="h-4 w-4 mr-2" />
            History
          </Button>
          
        </div>

        {/* Exercise Info */}
        <div className="flex gap-2 mb-6">
          <Badge variant="outline">{exercise.muscle_group}</Badge>
          {exercise.equipment && <Badge variant="secondary">{exercise.equipment}</Badge>}
          {exercise.difficulty_level && <Badge variant="outline">{exercise.difficulty_level}</Badge>}
        </div>

        {/* Sets */}
        <div className="space-y-4 mb-20">
          {sets.map((set, index) => <div key={index} className="flex items-center gap-4">
              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-sm font-medium">
                {index + 1}
              </div>
              
              <div className="flex-1">
                <div className="text-sm text-muted-foreground mb-1">Reps</div>
                <Input type="number" value={set.reps} onChange={e => updateSet(index, 'reps', e.target.value)} className="h-12 text-center text-lg font-semibold bg-input border-border" placeholder="8" />
              </div>
              
              <div className="flex-1">
                <div className="text-sm text-muted-foreground mb-1">Weight (kg)</div>
                <Input type="number" value={set.weight} onChange={e => updateSet(index, 'weight', e.target.value)} className="h-12 text-center text-lg font-semibold bg-input border-border" placeholder="25" />
              </div>

              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => removeSet(index)}
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>)}

          {/* Add Set Button */}
          <Button variant="outline" className="w-full border-primary/30 text-primary hover:bg-primary/10" onClick={() => setSets(prev => [...prev, {
          reps: workoutConfig?.reps?.toString() || '8',
          weight: workoutConfig?.weight?.toString() || '25'
        }])}>
            <div className="w-6 h-6 border-2 border-primary rounded-md flex items-center justify-center mr-2">
              <span className="text-primary text-lg font-bold">+</span>
            </div>
            Add Set
          </Button>
        </div>

        {/* Finish Exercise Button */}
        <div className="sticky bottom-4 mt-6 p-4">
          <Button onClick={handleFinishExercise} disabled={isCompleting} className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg">
            {isCompleting ? 'Saving...' : 'Finish Exercise'}
          </Button>
        </div>
      </div>

      {/* Exercise History Dialog */}
      <ExerciseHistoryDialog open={showHistory} onOpenChange={setShowHistory} exercise={exercise} />

      {/* Video Dialog */}
      <Dialog open={showVideoDialog} onOpenChange={setShowVideoDialog}>
        <DialogContent className="max-w-4xl w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              {exercise.name} - How-To Video
            </DialogTitle>
          </DialogHeader>
          <div className="w-full">
            {exercise.video_url && (
              <div className="aspect-video w-full bg-muted rounded-lg overflow-hidden">
                {exercise.video_url.includes('youtube.com') || exercise.video_url.includes('youtu.be') ? (
                  <iframe
                    src={exercise.video_url.includes('youtube.com/watch?v=') 
                      ? exercise.video_url.replace('watch?v=', 'embed/').replace('&', '?')
                      : exercise.video_url.includes('youtu.be/') 
                      ? exercise.video_url.replace('youtu.be/', 'youtube.com/embed/')
                      : exercise.video_url
                    }
                    className="w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    title={`${exercise.name} exercise video`}
                    frameBorder="0"
                  />
                ) : (
                  <video
                    src={exercise.video_url}
                    className="w-full h-full object-cover"
                    controls
                    preload="metadata"
                  >
                    Your browser does not support the video tag.
                  </video>
                )}
              </div>
            )}
            {exercise.instructions && (
              <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium mb-2">Instructions</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {exercise.instructions}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>;
}