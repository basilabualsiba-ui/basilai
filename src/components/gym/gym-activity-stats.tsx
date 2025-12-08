import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Activity, 
  Flame,
  TrendingUp,
  Clock,
  Dumbbell,
  CalendarIcon,
  ChevronRight
} from 'lucide-react';
import { useGym } from '@/contexts/GymContext';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfWeek, endOfWeek, differenceInHours, isWithinInterval, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';

interface MuscleVolumeData {
  muscle: string;
  volume: number;
  sets: number;
  color: string;
}

interface MuscleRecoveryData {
  muscle: string;
  lastTrained: Date | null;
  hoursSince: number;
  status: 'recovered' | 'recovering' | 'fatigued';
  color: string;
  muscleColor: string;
}

type TimePeriod = 'day' | 'week' | 'month' | 'custom';

export function GymActivityStats() {
  const { workoutSessions, exercises, muscleGroups, exerciseSets } = useGym();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('week');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: subDays(new Date(), 7),
    to: new Date()
  });
  const [muscleVolumes, setMuscleVolumes] = useState<MuscleVolumeData[]>([]);
  const [isLoadingVolume, setIsLoadingVolume] = useState(false);

  // Calculate date range based on time period
  const dateRange = useMemo(() => {
    const today = new Date();
    switch (timePeriod) {
      case 'day':
        return { from: today, to: today };
      case 'week':
        return { from: startOfWeek(today, { weekStartsOn: 1 }), to: endOfWeek(today, { weekStartsOn: 1 }) };
      case 'month':
        return { from: startOfMonth(today), to: endOfMonth(today) };
      case 'custom':
        return { from: customDateRange.from || today, to: customDateRange.to || today };
    }
  }, [timePeriod, customDateRange]);

  // Calculate last week's activity
  const weeklyStats = useMemo(() => {
    const now = new Date();
    const weekStart = subDays(now, 7);
    
    const sessionsThisWeek = workoutSessions.filter(session => {
      if (!session.completed_at) return false;
      const sessionDate = new Date(session.scheduled_date);
      return sessionDate >= weekStart && sessionDate <= now;
    });

    const totalWorkouts = sessionsThisWeek.length;
    const totalMinutes = sessionsThisWeek.reduce((sum, s) => sum + (s.total_duration_minutes || 0), 0);
    const totalExercises = sessionsThisWeek.reduce((sum, s) => sum + (s.exercise_ids?.length || 0), 0);
    
    // Get unique muscles trained
    const musclesTrained = new Set<string>();
    sessionsThisWeek.forEach(session => {
      session.muscle_groups?.forEach(muscle => musclesTrained.add(muscle));
    });

    return {
      totalWorkouts,
      totalMinutes,
      totalExercises,
      musclesTrained: musclesTrained.size,
      averageDuration: totalWorkouts > 0 ? Math.round(totalMinutes / totalWorkouts) : 0
    };
  }, [workoutSessions]);

  // Calculate muscle recovery status
  const muscleRecovery = useMemo((): MuscleRecoveryData[] => {
    const now = new Date();
    const muscleLastTrained: Record<string, Date> = {};

    // Find the last time each muscle was trained
    workoutSessions
      .filter(session => session.completed_at)
      .sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime())
      .forEach(session => {
        const sessionExercises = (session.exercise_ids || [])
          .map(id => exercises.find(ex => ex.id === id))
          .filter(Boolean);

        sessionExercises.forEach(exercise => {
          if (exercise && !muscleLastTrained[exercise.muscle_group]) {
            muscleLastTrained[exercise.muscle_group] = new Date(session.scheduled_date);
          }
          // Also track side muscles
          exercise?.side_muscle_groups?.forEach(sideMuscle => {
            if (!muscleLastTrained[sideMuscle]) {
              muscleLastTrained[sideMuscle] = new Date(session.scheduled_date);
            }
          });
        });
      });

    return muscleGroups.map(mg => {
      const lastTrained = muscleLastTrained[mg.name] || null;
      const hoursSince = lastTrained ? differenceInHours(now, lastTrained) : Infinity;
      
      let status: 'recovered' | 'recovering' | 'fatigued';
      let color: string;
      
      if (hoursSince === Infinity) {
        status = 'recovered';
        color = 'hsl(var(--muted-foreground))';
      } else if (hoursSince < 24) {
        status = 'fatigued';
        color = 'hsl(0 84% 60%)'; // red
      } else if (hoursSince < 48) {
        status = 'recovering';
        color = 'hsl(48 96% 53%)'; // yellow
      } else {
        status = 'recovered';
        color = 'hsl(142 76% 36%)'; // green
      }

      return {
        muscle: mg.name,
        lastTrained,
        hoursSince,
        status,
        color,
        muscleColor: mg.color
      };
    }).sort((a, b) => a.hoursSince - b.hoursSince);
  }, [workoutSessions, exercises, muscleGroups]);

  // Fetch muscle volume data
  useEffect(() => {
    const fetchMuscleVolumes = async () => {
      setIsLoadingVolume(true);
      try {
        const fromDate = format(dateRange.from, 'yyyy-MM-dd');
        const toDate = format(dateRange.to, 'yyyy-MM-dd');

        // Get all sessions in the date range
        const sessionsInRange = workoutSessions.filter(session => {
          if (!session.completed_at) return false;
          return session.scheduled_date >= fromDate && session.scheduled_date <= toDate;
        });

        const sessionIds = sessionsInRange.map(s => s.id);
        
        if (sessionIds.length === 0) {
          setMuscleVolumes([]);
          setIsLoadingVolume(false);
          return;
        }

        // Fetch exercise sets for these sessions
        const { data: sets, error } = await supabase
          .from('exercise_sets')
          .select('exercise_id, weight, reps, completed_at')
          .in('session_id', sessionIds)
          .not('completed_at', 'is', null);

        if (error) throw error;

        // Calculate volume per muscle group
        const muscleVolumeMap: Record<string, { volume: number; sets: number }> = {};

        (sets || []).forEach(set => {
          const exercise = exercises.find(ex => ex.id === set.exercise_id);
          if (!exercise) return;

          const volume = (set.weight || 0) * (set.reps || 0);
          
          // Main muscle gets 75% of volume
          if (!muscleVolumeMap[exercise.muscle_group]) {
            muscleVolumeMap[exercise.muscle_group] = { volume: 0, sets: 0 };
          }
          muscleVolumeMap[exercise.muscle_group].volume += volume * 0.75;
          muscleVolumeMap[exercise.muscle_group].sets += 1;

          // Side muscles get 25% split
          const sideMuscles = exercise.side_muscle_groups || [];
          if (sideMuscles.length > 0) {
            const sideVolume = (volume * 0.25) / sideMuscles.length;
            sideMuscles.forEach(sideMuscle => {
              if (!muscleVolumeMap[sideMuscle]) {
                muscleVolumeMap[sideMuscle] = { volume: 0, sets: 0 };
              }
              muscleVolumeMap[sideMuscle].volume += sideVolume;
            });
          }
        });

        const volumeData: MuscleVolumeData[] = Object.entries(muscleVolumeMap)
          .map(([muscle, data]) => ({
            muscle,
            volume: Math.round(data.volume),
            sets: data.sets,
            color: muscleGroups.find(mg => mg.name === muscle)?.color || '#ff7f00'
          }))
          .sort((a, b) => b.volume - a.volume);

        setMuscleVolumes(volumeData);
      } catch (error) {
        console.error('Error fetching muscle volumes:', error);
      } finally {
        setIsLoadingVolume(false);
      }
    };

    fetchMuscleVolumes();
  }, [dateRange, workoutSessions, exercises, muscleGroups]);

  const maxVolume = Math.max(...muscleVolumes.map(m => m.volume), 1);

  const formatHours = (hours: number) => {
    if (hours === Infinity) return 'Never trained';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getStatusBadge = (status: 'recovered' | 'recovering' | 'fatigued') => {
    switch (status) {
      case 'fatigued':
        return <Badge variant="destructive" className="text-xs">Fatigued</Badge>;
      case 'recovering':
        return <Badge variant="secondary" className="text-xs bg-yellow-500/20 text-yellow-600">Recovering</Badge>;
      case 'recovered':
        return <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-600">Recovered</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Weekly Summary Cards */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Last 7 Days Activity
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Workouts</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{weeklyStats.totalWorkouts}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="text-xs text-muted-foreground">Total Time</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{weeklyStats.totalMinutes}m</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Dumbbell className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Exercises</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{weeklyStats.totalExercises}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                <span className="text-xs text-muted-foreground">Muscles Hit</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{weeklyStats.musclesTrained}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Muscle Recovery Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Muscle Recovery Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {muscleRecovery.slice(0, 12).map(muscle => (
              <div 
                key={muscle.muscle}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: muscle.color }}
                  />
                  <span className="font-medium text-foreground text-sm">{muscle.muscle}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {formatHours(muscle.hoursSince)}
                  </span>
                  {getStatusBadge(muscle.status)}
                </div>
              </div>
            ))}
          </div>
          
          {/* Recovery Legend */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-xs text-muted-foreground">&lt;24h (Fatigued)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              <span className="text-xs text-muted-foreground">24-48h (Recovering)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="text-xs text-muted-foreground">&gt;48h (Recovered)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Volume Per Muscle */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Volume Per Muscle
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Tabs value={timePeriod} onValueChange={(v) => setTimePeriod(v as TimePeriod)}>
                <TabsList className="h-8">
                  <TabsTrigger value="day" className="text-xs px-2">Day</TabsTrigger>
                  <TabsTrigger value="week" className="text-xs px-2">Week</TabsTrigger>
                  <TabsTrigger value="month" className="text-xs px-2">Month</TabsTrigger>
                  <TabsTrigger value="custom" className="text-xs px-2">Custom</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          
          {timePeriod === 'custom' && (
            <div className="flex items-center gap-2 mt-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    {customDateRange.from ? format(customDateRange.from, 'MMM d') : 'From'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customDateRange.from}
                    onSelect={(date) => setCustomDateRange(prev => ({ ...prev, from: date }))}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    {customDateRange.to ? format(customDateRange.to, 'MMM d') : 'To'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customDateRange.to}
                    onSelect={(date) => setCustomDateRange(prev => ({ ...prev, to: date }))}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoadingVolume ? (
            <div className="flex items-center justify-center py-8">
              <Dumbbell className="h-6 w-6 text-primary animate-pulse" />
            </div>
          ) : muscleVolumes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Dumbbell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No workout data for this period</p>
            </div>
          ) : (
            <div className="space-y-3">
              {muscleVolumes.map(muscle => (
                <div key={muscle.muscle} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{muscle.muscle}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">{muscle.sets} sets</span>
                      <span className="font-semibold" style={{ color: muscle.color }}>
                        {muscle.volume.toLocaleString()} kg
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${(muscle.volume / maxVolume) * 100}%`,
                        backgroundColor: muscle.color
                      }}
                    />
                  </div>
                </div>
              ))}
              
              {/* Total Volume */}
              <div className="pt-3 mt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Total Volume</span>
                  <span className="font-bold text-primary text-lg">
                    {muscleVolumes.reduce((sum, m) => sum + m.volume, 0).toLocaleString()} kg
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
