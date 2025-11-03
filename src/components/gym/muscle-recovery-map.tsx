import { useState, useEffect } from 'react';
import { useGym } from '@/contexts/GymContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FlipHorizontal2, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import muscleMapImg from '@/assets/muscle-map.webp';

type RecoveryState = 'recovered' | 'recovering' | 'not-recovered';
type ViewSide = 'front' | 'back' | 'side';

interface MuscleRecovery {
  name: string;
  state: RecoveryState;
  lastWorkout?: Date;
  hoursSince?: number;
  exercises: string[];
  lastIntensity?: number;
}

// Muscle group positioning for each view (percentage-based)
const musclePositions = {
  front: [
    { name: 'chest', x: 50, y: 25, width: 25, height: 12 },
    { name: 'shoulders', x: 50, y: 18, width: 35, height: 8 },
    { name: 'biceps', x: 50, y: 30, width: 45, height: 10 },
    { name: 'abs', x: 50, y: 40, width: 20, height: 15 },
    { name: 'quadriceps', x: 50, y: 65, width: 25, height: 20 },
    { name: 'forearms', x: 50, y: 45, width: 50, height: 8 },
  ],
  back: [
    { name: 'trapezius', x: 50, y: 18, width: 25, height: 8 },
    { name: 'back', x: 50, y: 30, width: 30, height: 20 },
    { name: 'triceps', x: 50, y: 32, width: 45, height: 8 },
    { name: 'lower-back', x: 50, y: 48, width: 25, height: 8 },
    { name: 'glutes', x: 50, y: 55, width: 25, height: 10 },
    { name: 'hamstrings', x: 50, y: 68, width: 25, height: 18 },
  ],
  side: [
    { name: 'shoulders', x: 50, y: 20, width: 20, height: 8 },
    { name: 'chest', x: 45, y: 28, width: 15, height: 10 },
    { name: 'abs', x: 48, y: 42, width: 15, height: 12 },
    { name: 'quadriceps', x: 52, y: 65, width: 18, height: 20 },
    { name: 'calves', x: 52, y: 82, width: 12, height: 12 },
  ],
};

export const MuscleRecoveryMap = () => {
  const { muscleGroups, exercises } = useGym();
  const [view, setView] = useState<ViewSide>('front');
  const [muscleRecovery, setMuscleRecovery] = useState<Map<string, MuscleRecovery>>(new Map());
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleRecovery | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    loadRecoveryData();
  }, []);

  const loadRecoveryData = async () => {
    try {
      // Get all exercise sets from the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: sets } = await supabase
        .from('exercise_sets')
        .select('*, exercise_id, exercises(name, muscle_group)')
        .not('completed_at', 'is', null)
        .gte('completed_at', sevenDaysAgo.toISOString())
        .order('completed_at', { ascending: false });

      const recoveryMap = new Map<string, MuscleRecovery>();

      // Initialize all muscle groups
      muscleGroups.forEach(mg => {
        recoveryMap.set(mg.name.toLowerCase(), {
          name: mg.name,
          state: 'recovered',
          exercises: [],
          hoursSince: undefined,
        });
      });

      // Process workout history
      if (sets) {
        const muscleLastWorkout = new Map<string, Date>();
        const muscleExercises = new Map<string, Set<string>>();

        sets.forEach((set: any) => {
          const muscleName = set.exercises?.muscle_group?.toLowerCase();
          const exerciseName = set.exercises?.name;
          
          if (muscleName && exerciseName) {
            const completedAt = new Date(set.completed_at);
            
            if (!muscleLastWorkout.has(muscleName) || completedAt > muscleLastWorkout.get(muscleName)!) {
              muscleLastWorkout.set(muscleName, completedAt);
            }

            if (!muscleExercises.has(muscleName)) {
              muscleExercises.set(muscleName, new Set());
            }
            muscleExercises.get(muscleName)!.add(exerciseName);
          }
        });

        // Calculate recovery states
        muscleLastWorkout.forEach((lastWorkout, muscleName) => {
          const hoursSince = (Date.now() - lastWorkout.getTime()) / (1000 * 60 * 60);
          let state: RecoveryState = 'recovered';
          
          if (hoursSince < 24) {
            state = 'not-recovered';
          } else if (hoursSince < 48) {
            state = 'recovering';
          }

          const exerciseList = Array.from(muscleExercises.get(muscleName) || []);

          recoveryMap.set(muscleName, {
            name: muscleName.charAt(0).toUpperCase() + muscleName.slice(1),
            state,
            lastWorkout,
            hoursSince,
            exercises: exerciseList,
          });
        });
      }

      setMuscleRecovery(recoveryMap);
    } catch (error) {
      console.error('Error loading recovery data:', error);
    }
  };

  const getRecoveryColor = (state: RecoveryState): string => {
    switch (state) {
      case 'not-recovered':
        return 'hsl(var(--destructive))';
      case 'recovering':
        return 'hsl(45 93% 47%)'; // Yellow/warning color
      case 'recovered':
        return 'hsl(142 71% 45%)'; // Green color
    }
  };

  const getRecoveryEmoji = (state: RecoveryState): string => {
    switch (state) {
      case 'not-recovered': return '❌';
      case 'recovering': return '⚠️';
      case 'recovered': return '✅';
    }
  };

  const handleMuscleClick = (muscleName: string) => {
    const recovery = muscleRecovery.get(muscleName.toLowerCase());
    if (recovery) {
      setSelectedMuscle(recovery);
      setIsDialogOpen(true);
    }
  };

  const cycleView = () => {
    const views: ViewSide[] = ['front', 'back', 'side'];
    const currentIndex = views.indexOf(view);
    const nextIndex = (currentIndex + 1) % views.length;
    setView(views[nextIndex]);
  };

  const currentMuscles = musclePositions[view];

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Muscle Recovery Map</h2>
            <p className="text-sm text-muted-foreground">Track your muscle recovery status</p>
          </div>
          <Button onClick={cycleView} variant="outline" className="gap-2">
            <FlipHorizontal2 className="h-4 w-4" />
            {view.charAt(0).toUpperCase() + view.slice(1)} View
          </Button>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mb-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(142 71% 45%)' }} />
            <span className="text-sm">✅ Recovered (48h+)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(45 93% 47%)' }} />
            <span className="text-sm">⚠️ Recovering (24-48h)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--destructive))' }} />
            <span className="text-sm">❌ Not Recovered (&lt;24h)</span>
          </div>
        </div>

        {/* Interactive Muscle Map */}
        <div className="relative w-full max-w-md mx-auto aspect-[1/3]">
          <img 
            src={muscleMapImg} 
            alt="Muscle Map" 
            className="w-full h-full object-contain"
            style={{ 
              filter: 'grayscale(100%) brightness(1.2)',
              opacity: 0.3
            }}
          />
          
          {/* Overlay muscle regions */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
            {currentMuscles.map((muscle) => {
              const recovery = muscleRecovery.get(muscle.name.toLowerCase());
              const state = recovery?.state || 'recovered';
              const color = getRecoveryColor(state);

              return (
                <g key={muscle.name}>
                  <ellipse
                    cx={muscle.x}
                    cy={muscle.y}
                    rx={muscle.width / 2}
                    ry={muscle.height / 2}
                    fill={color}
                    opacity="0.4"
                    className="cursor-pointer hover:opacity-60 transition-opacity"
                    onClick={() => handleMuscleClick(muscle.name)}
                  />
                  <text
                    x={muscle.x}
                    y={muscle.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="3"
                    fill="hsl(var(--foreground))"
                    className="pointer-events-none font-semibold"
                    style={{ textShadow: '0 0 2px hsl(var(--background))' }}
                  >
                    {getRecoveryEmoji(state)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </Card>

      {/* Muscle Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedMuscle && getRecoveryEmoji(selectedMuscle.state)}
              {selectedMuscle?.name} Recovery Status
            </DialogTitle>
          </DialogHeader>

          {selectedMuscle && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg" style={{ backgroundColor: `${getRecoveryColor(selectedMuscle.state)}20` }}>
                <div className="text-lg font-semibold mb-2">
                  {selectedMuscle.state === 'not-recovered' && 'Not Recovered'}
                  {selectedMuscle.state === 'recovering' && 'Recovering'}
                  {selectedMuscle.state === 'recovered' && 'Fully Recovered'}
                </div>
                
                {selectedMuscle.lastWorkout && (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Last trained: {formatDistanceToNow(selectedMuscle.lastWorkout, { addSuffix: true })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Time since: {Math.floor(selectedMuscle.hoursSince || 0)}h ({Math.floor((selectedMuscle.hoursSince || 0) / 24)}d)
                    </p>
                  </>
                )}

                {!selectedMuscle.lastWorkout && (
                  <p className="text-sm text-muted-foreground">
                    No recent workouts in the last 7 days
                  </p>
                )}
              </div>

              {selectedMuscle.exercises.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Recent Exercises
                  </h4>
                  <ul className="space-y-1">
                    {selectedMuscle.exercises.map((ex, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground pl-4">
                        • {ex}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-2">Recovery Guidelines</h4>
                <p className="text-sm text-muted-foreground">
                  Most muscle groups benefit from 48-72 hours of recovery between intense training sessions.
                  Listen to your body and adjust as needed.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
