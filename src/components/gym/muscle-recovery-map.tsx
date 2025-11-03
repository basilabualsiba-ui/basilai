import { useState, useEffect } from 'react';
import { useGym } from '@/contexts/GymContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FlipHorizontal2, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

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

// Muscle group SVG paths and positions for each view
const muscleSVGs = {
  front: [
    { name: 'neck', path: 'M90,25 Q100,20 110,25 L110,35 Q100,33 90,35 Z', label: { x: 100, y: 30 } },
    { name: 'shoulders', path: 'M70,40 Q85,35 100,40 L100,55 L85,50 L70,55 Z M100,40 Q115,35 130,40 L130,55 L115,50 L100,55 Z', label: { x: 100, y: 48 } },
    { name: 'chest', path: 'M85,55 Q100,50 115,55 L115,75 Q100,78 85,75 Z', label: { x: 100, y: 65 } },
    { name: 'biceps', path: 'M70,55 L70,80 Q75,82 80,80 L80,55 Z M120,55 L120,80 Q115,82 110,80 L110,55 Z', label: { x: 75, y: 68 } },
    { name: 'abs', path: 'M88,78 L112,78 L112,105 Q100,108 88,105 Z', label: { x: 100, y: 92 } },
    { name: 'forearms', path: 'M68,82 L68,105 Q73,107 78,105 L78,82 Z M122,82 L122,105 Q117,107 112,105 L112,82 Z', label: { x: 73, y: 94 } },
    { name: 'quadriceps', path: 'M85,110 L85,155 Q90,157 95,155 L95,110 Z M105,110 L105,155 Q100,157 95,155 L95,110 Z', label: { x: 100, y: 133 } },
    { name: 'calves', path: 'M85,160 L85,185 Q90,188 95,185 L95,160 Z M105,160 L105,185 Q100,188 95,185 L95,160 Z', label: { x: 100, y: 173 } },
  ],
  back: [
    { name: 'neck', path: 'M90,25 Q100,20 110,25 L110,35 Q100,33 90,35 Z', label: { x: 100, y: 30 } },
    { name: 'trapezius', path: 'M80,35 Q100,30 120,35 L115,50 Q100,48 85,50 Z', label: { x: 100, y: 42 } },
    { name: 'shoulders', path: 'M65,40 L80,35 L80,55 L65,58 Z M120,35 L135,40 L135,58 L120,55 Z', label: { x: 73, y: 48 } },
    { name: 'back', path: 'M85,52 L115,52 L118,90 Q100,95 82,90 Z', label: { x: 100, y: 72 } },
    { name: 'triceps', path: 'M65,58 L65,85 Q70,87 75,85 L75,58 Z M125,58 L125,85 Q120,87 115,85 L115,58 Z', label: { x: 70, y: 72 } },
    { name: 'lower-back', path: 'M85,92 L115,92 L112,108 Q100,110 88,108 Z', label: { x: 100, y: 100 } },
    { name: 'glutes', path: 'M88,110 L112,110 L112,128 Q100,130 88,128 Z', label: { x: 100, y: 119 } },
    { name: 'hamstrings', path: 'M85,130 L85,165 Q90,167 95,165 L95,130 Z M105,130 L105,165 Q100,167 95,165 L95,130 Z', label: { x: 100, y: 148 } },
    { name: 'calves', path: 'M85,168 L85,188 Q90,190 95,188 L95,168 Z M105,168 L105,188 Q100,190 95,188 L95,168 Z', label: { x: 100, y: 178 } },
  ],
  side: [
    { name: 'neck', path: 'M95,25 Q100,22 105,25 L105,35 Q100,33 95,35 Z', label: { x: 100, y: 30 } },
    { name: 'shoulders', path: 'M85,38 Q95,35 105,38 L105,52 Q95,50 85,52 Z', label: { x: 95, y: 45 } },
    { name: 'chest', path: 'M95,52 L115,55 L115,75 L95,72 Z', label: { x: 105, y: 64 } },
    { name: 'back', path: 'M75,52 L95,52 L95,75 L78,72 Z', label: { x: 85, y: 64 } },
    { name: 'abs', path: 'M95,75 L110,77 L110,100 L95,98 Z', label: { x: 103, y: 88 } },
    { name: 'lower-back', path: 'M80,77 L95,75 L95,98 L82,100 Z', label: { x: 88, y: 88 } },
    { name: 'glutes', path: 'M82,102 L95,100 L95,120 L85,122 Z', label: { x: 90, y: 111 } },
    { name: 'quadriceps', path: 'M95,122 L105,120 L105,160 L95,162 Z', label: { x: 100, y: 141 } },
    { name: 'hamstrings', path: 'M85,124 L95,122 L95,162 L87,164 Z', label: { x: 91, y: 143 } },
    { name: 'calves', path: 'M90,165 L100,163 L100,188 L90,188 Z', label: { x: 95, y: 176 } },
  ],
};

export const MuscleRecoveryMap = () => {
  const { muscleGroups } = useGym();
  const [view, setView] = useState<ViewSide>('front');
  const [muscleRecovery, setMuscleRecovery] = useState<Map<string, MuscleRecovery>>(new Map());
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleRecovery | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    loadRecoveryData();
  }, []);

  const loadRecoveryData = async () => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: sets } = await supabase
        .from('exercise_sets')
        .select('*, exercise_id, exercises(name, muscle_group)')
        .not('completed_at', 'is', null)
        .gte('completed_at', sevenDaysAgo.toISOString())
        .order('completed_at', { ascending: false });

      const recoveryMap = new Map<string, MuscleRecovery>();

      muscleGroups.forEach(mg => {
        recoveryMap.set(mg.name.toLowerCase(), {
          name: mg.name,
          state: 'recovered',
          exercises: [],
          hoursSince: undefined,
        });
      });

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
        return 'hsl(45 93% 47%)';
      case 'recovered':
        return 'hsl(142 71% 45%)';
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

  const currentMuscles = muscleSVGs[view];

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
        <div className="flex gap-4 mb-6 p-3 bg-muted/50 rounded-lg flex-wrap">
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

        {/* SVG Body Map */}
        <div className="relative w-full max-w-md mx-auto">
          <svg 
            viewBox="0 0 200 200" 
            className="w-full h-auto"
            style={{ minHeight: '500px' }}
          >
            {/* Body outline */}
            <g className="opacity-20" stroke="hsl(var(--foreground))" strokeWidth="1" fill="none">
              {/* Head */}
              <circle cx="100" cy="15" r="10" />
              {/* Torso */}
              <path d="M100,25 L100,110" />
              {/* Arms */}
              <path d="M100,40 L{view === 'side' ? '75' : '70'},40 L{view === 'side' ? '75' : '68'},105" />
              <path d="M100,40 L{view === 'side' ? '125' : '130'},40 L{view === 'side' ? '125' : '132'},105" />
              {/* Legs */}
              <path d="M95,110 L90,190" />
              <path d="M105,110 L110,190" />
            </g>

            {/* Muscle groups with recovery colors */}
            {currentMuscles.map((muscle) => {
              const recovery = muscleRecovery.get(muscle.name.toLowerCase());
              const state = recovery?.state || 'recovered';
              const color = getRecoveryColor(state);

              return (
                <g key={muscle.name}>
                  <path
                    d={muscle.path}
                    fill={color}
                    opacity="0.6"
                    stroke={color}
                    strokeWidth="1"
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleMuscleClick(muscle.name)}
                  />
                  <text
                    x={muscle.label.x}
                    y={muscle.label.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="8"
                    fill="hsl(var(--foreground))"
                    className="pointer-events-none font-semibold"
                    style={{ textShadow: '0 0 3px hsl(var(--background))' }}
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
