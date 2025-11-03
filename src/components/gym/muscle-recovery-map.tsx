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

// Detailed muscle paths for each view
const muscleSVGs = {
  front: [
    { 
      name: 'neck', 
      path: 'M 95 30 L 105 30 L 108 40 L 92 40 Z',
      label: { x: 100, y: 35 }
    },
    { 
      name: 'shoulders', 
      path: 'M 75 42 Q 85 40 95 42 L 95 55 Q 85 52 75 55 Z M 105 42 Q 115 40 125 42 L 125 55 Q 115 52 105 55 Z',
      label: { x: 100, y: 48 }
    },
    { 
      name: 'chest', 
      path: 'M 85 55 Q 100 52 115 55 L 115 75 Q 108 78 100 78 Q 92 78 85 75 Z',
      label: { x: 100, y: 66 }
    },
    { 
      name: 'biceps', 
      path: 'M 70 52 Q 75 50 80 52 L 82 75 Q 77 77 72 75 Z M 118 52 Q 123 50 128 52 L 128 75 Q 123 77 118 75 Z',
      label: { x: 76, y: 64 }
    },
    { 
      name: 'abs', 
      path: 'M 88 80 L 112 80 L 112 110 Q 100 112 88 110 Z M 95 85 L 105 85 M 95 92 L 105 92 M 95 99 L 105 99 M 95 106 L 105 106',
      label: { x: 100, y: 95 }
    },
    { 
      name: 'forearms', 
      path: 'M 68 77 Q 72 75 76 77 L 78 105 Q 74 107 70 105 Z M 122 77 Q 126 75 130 77 L 132 105 Q 128 107 124 105 Z',
      label: { x: 73, y: 91 }
    },
    { 
      name: 'quadriceps', 
      path: 'M 85 115 L 90 115 L 92 165 L 87 165 Z M 95 115 L 100 115 L 102 165 L 97 165 Z M 105 115 L 110 115 L 112 165 L 107 165 Z',
      label: { x: 100, y: 140 }
    },
    { 
      name: 'calves', 
      path: 'M 87 168 L 92 168 L 94 195 L 89 195 Z M 106 168 L 111 168 L 113 195 L 108 195 Z',
      label: { x: 100, y: 182 }
    },
  ],
  back: [
    { 
      name: 'neck', 
      path: 'M 95 30 L 105 30 L 108 40 L 92 40 Z',
      label: { x: 100, y: 35 }
    },
    { 
      name: 'trapezius', 
      path: 'M 85 40 Q 100 38 115 40 L 118 55 Q 100 52 82 55 Z',
      label: { x: 100, y: 47 }
    },
    { 
      name: 'shoulders', 
      path: 'M 70 42 L 82 40 L 82 58 L 70 60 Z M 118 40 L 130 42 L 130 60 L 118 58 Z',
      label: { x: 76, y: 50 }
    },
    { 
      name: 'back', 
      path: 'M 82 58 L 118 58 L 120 95 Q 100 98 80 95 Z M 90 65 L 110 65 M 88 75 L 112 75 M 87 85 L 113 85',
      label: { x: 100, y: 77 }
    },
    { 
      name: 'triceps', 
      path: 'M 66 60 Q 70 58 74 60 L 76 85 Q 72 87 68 85 Z M 124 60 Q 128 58 132 60 L 134 85 Q 130 87 126 85 Z',
      label: { x: 71, y: 73 }
    },
    { 
      name: 'lower-back', 
      path: 'M 85 98 L 115 98 L 115 115 Q 100 117 85 115 Z',
      label: { x: 100, y: 107 }
    },
    { 
      name: 'glutes', 
      path: 'M 87 117 L 113 117 L 113 135 Q 100 137 87 135 Z',
      label: { x: 100, y: 126 }
    },
    { 
      name: 'hamstrings', 
      path: 'M 85 138 L 92 138 L 94 170 L 87 170 Z M 97 138 L 103 138 L 105 170 L 98 170 Z M 108 138 L 115 138 L 117 170 L 110 170 Z',
      label: { x: 100, y: 154 }
    },
    { 
      name: 'calves', 
      path: 'M 87 173 L 92 173 L 94 195 L 89 195 Z M 106 173 L 111 173 L 113 195 L 108 195 Z',
      label: { x: 100, y: 184 }
    },
  ],
  side: [
    { 
      name: 'neck', 
      path: 'M 95 30 L 105 30 L 105 40 L 95 40 Z',
      label: { x: 100, y: 35 }
    },
    { 
      name: 'shoulders', 
      path: 'M 85 40 Q 95 38 105 40 L 108 55 Q 98 53 88 55 Z',
      label: { x: 97, y: 47 }
    },
    { 
      name: 'chest', 
      path: 'M 100 55 L 120 58 L 120 78 L 100 75 Z',
      label: { x: 110, y: 67 }
    },
    { 
      name: 'back', 
      path: 'M 80 55 L 100 55 L 100 78 L 80 75 Z',
      label: { x: 90, y: 67 }
    },
    { 
      name: 'abs', 
      path: 'M 100 80 L 115 82 L 115 110 L 100 108 Z M 105 87 L 112 87 M 105 95 L 112 95 M 105 103 L 112 103',
      label: { x: 108, y: 95 }
    },
    { 
      name: 'lower-back', 
      path: 'M 85 80 L 100 80 L 100 110 L 85 108 Z',
      label: { x: 93, y: 95 }
    },
    { 
      name: 'glutes', 
      path: 'M 87 112 L 100 112 L 100 130 L 90 132 Z',
      label: { x: 94, y: 121 }
    },
    { 
      name: 'quadriceps', 
      path: 'M 100 132 L 108 130 L 110 170 L 102 170 Z',
      label: { x: 105, y: 151 }
    },
    { 
      name: 'hamstrings', 
      path: 'M 88 134 L 98 132 L 100 170 L 90 170 Z',
      label: { x: 94, y: 151 }
    },
    { 
      name: 'calves', 
      path: 'M 92 173 L 106 173 L 108 195 L 94 195 Z',
      label: { x: 100, y: 184 }
    },
  ],
};

// Detailed body outline SVG for each view
const bodyOutlines = {
  front: `
    M 100 20 
    A 10 10 0 1 1 100 20
    M 100 28 L 100 40
    M 92 40 Q 85 42 75 42 L 70 52 L 68 77 L 70 105 L 75 115 L 85 115 L 85 200
    M 108 40 Q 115 42 125 42 L 130 52 L 132 77 L 130 105 L 125 115 L 115 115 L 115 200
    M 100 40 L 100 80
    M 85 80 L 115 80
    M 85 115 L 92 115 L 92 168 L 94 200
    M 97 115 L 103 115 L 103 168 L 103 200
    M 108 115 L 115 115 L 113 168 L 111 200
  `,
  back: `
    M 100 20 
    A 10 10 0 1 1 100 20
    M 100 28 L 100 40
    M 92 40 Q 85 42 75 42 L 70 60 L 68 85 L 75 117 L 85 138 L 85 200
    M 108 40 Q 115 42 125 42 L 130 60 L 132 85 L 125 117 L 115 138 L 115 200
    M 100 40 L 100 98
    M 82 58 L 118 58
    M 85 98 L 115 98
    M 85 117 L 115 117
    M 85 138 L 92 138 L 94 173 L 94 200
    M 97 138 L 103 138 L 103 173 L 103 200
    M 108 138 L 115 138 L 113 173 L 111 200
  `,
  side: `
    M 100 20 
    A 10 10 0 1 1 100 20
    M 100 28 L 100 40
    M 95 40 L 85 40 L 80 55 L 80 80 L 85 112 L 87 134 L 88 173 L 90 200
    M 105 40 L 115 40 L 120 58 L 120 82 L 115 110 L 108 130 L 110 170 L 108 200
    M 100 40 L 100 112
    M 85 80 L 120 82
    M 85 112 L 115 110
  `,
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
        return '#ff4d6d';  // Pink/red like reference
      case 'recovering':
        return '#ffb703';  // Orange/yellow
      case 'recovered':
        return '#06d6a0';  // Green/teal
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
  const bodyOutline = bodyOutlines[view];

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
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#06d6a0' }} />
            <span className="text-sm">✅ Recovered (48h+)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ffb703' }} />
            <span className="text-sm">⚠️ Recovering (24-48h)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ff4d6d' }} />
            <span className="text-sm">❌ Not Recovered (&lt;24h)</span>
          </div>
        </div>

        {/* Anatomical Body Map */}
        <div className="relative w-full max-w-md mx-auto">
          <svg 
            viewBox="0 0 200 220" 
            className="w-full h-auto"
            style={{ minHeight: '600px' }}
          >
            {/* Base body outline - light blue tint */}
            <g opacity="0.3">
              <path
                d={bodyOutline}
                fill="#a8dadc"
                stroke="#457b9d"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>

            {/* Muscle groups with recovery state highlighting */}
            {currentMuscles.map((muscle) => {
              const recovery = muscleRecovery.get(muscle.name.toLowerCase());
              const state = recovery?.state || 'recovered';
              const color = getRecoveryColor(state);

              return (
                <g key={muscle.name}>
                  {/* Highlighted muscle region */}
                  <path
                    d={muscle.path}
                    fill={color}
                    opacity="0.7"
                    stroke={color}
                    strokeWidth="0.5"
                    className="cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => handleMuscleClick(muscle.name)}
                  />
                  {/* Emoji indicator */}
                  <text
                    x={muscle.label.x}
                    y={muscle.label.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="10"
                    className="pointer-events-none"
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
              <div 
                className="p-4 rounded-lg" 
                style={{ backgroundColor: `${getRecoveryColor(selectedMuscle.state)}30` }}
              >
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
