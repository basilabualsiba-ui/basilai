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
  ChevronRight,
  Users
} from 'lucide-react';
import { useGym } from '@/contexts/GymContext';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfWeek, endOfWeek, differenceInHours, isWithinInterval, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';

interface MuscleVolumeData {
  muscle: string;
  mainVolume: number;
  sideVolume: number;
  totalVolume: number;
  mainSets: number;
  sideSets: number;
  color: string;
}

interface MuscleRecoveryData {
  muscle: string;
  lastTrained: Date | null;
  hoursSince: number;
  status: 'recovered' | 'recovering' | 'fatigued';
  color: string;
  muscleColor: string;
  trainedAs: 'main' | 'side' | 'both' | 'never';
}

type TimePeriod = 'day' | 'week' | 'month' | 'custom';

// Trainer payment tracking - subcategory ID for "اشتراك اشرف" under "Gym"
const TRAINER_PAYMENT_SUBCATEGORY_ID = 'f6b8d483-436a-4cad-9e52-8919292087d0';
const TRAINER_PACKAGE_SIZE = 12;
const TRAINER_START_DATE = new Date('2024-12-04');

export function GymActivityStats() {
  const { workoutSessions, exercises, muscleGroups, exerciseSets } = useGym();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('week');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: subDays(new Date(), 7),
    to: new Date()
  });
  const [muscleVolumes, setMuscleVolumes] = useState<MuscleVolumeData[]>([]);
  const [isLoadingVolume, setIsLoadingVolume] = useState(false);
  const [trainerPayments, setTrainerPayments] = useState<Array<{ date: string; amount: number }>>([]);

  // Fetch trainer payments from wallet
  useEffect(() => {
    const fetchTrainerPayments = async () => {
      const { data: transactions } = await supabase
        .from('transactions')
        .select('date, amount')
        .eq('subcategory_id', TRAINER_PAYMENT_SUBCATEGORY_ID)
        .order('date', { ascending: true });
      
      if (transactions) {
        setTrainerPayments(transactions.map(t => ({ date: t.date, amount: Number(t.amount) })));
      }
    };
    fetchTrainerPayments();
  }, []);

  // Calculate date range based on time period
  const dateRange = useMemo(() => {
    const today = new Date();
    switch (timePeriod) {
      case 'day':
        return { from: today, to: today };
      case 'week':
        return { from: subDays(today, 7), to: today };
      case 'month':
        return { from: startOfMonth(today), to: endOfMonth(today) };
      case 'custom':
        return { from: customDateRange.from || today, to: customDateRange.to || today };
    }
  }, [timePeriod, customDateRange]);

  // Calculate trainer package stats from wallet payments
  const trainerStats = useMemo(() => {
    const completedSessions = workoutSessions
      .filter(s => s.completed_at)
      .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime());
    
    // Only count trainer sessions from the start date onwards
    const trainerSessions = completedSessions.filter(s => 
      s.with_trainer && new Date(s.scheduled_date) >= TRAINER_START_DATE
    );
    const totalTrainerSessions = trainerSessions.length;
    const currentPackageUsed = totalTrainerSessions % TRAINER_PACKAGE_SIZE;
    const packagesCompleted = Math.floor(totalTrainerSessions / TRAINER_PACKAGE_SIZE);
    const sessionsRemaining = TRAINER_PACKAGE_SIZE - currentPackageUsed;
    
    // Calculate paid packages from wallet transactions
    const packagesPaid = trainerPayments.length;
    const needsPayment = packagesCompleted >= packagesPaid && currentPackageUsed > 0;
    const nextPaymentAt = packagesPaid * TRAINER_PACKAGE_SIZE;
    const sessionsUntilPayment = nextPaymentAt - totalTrainerSessions;
    
    // Get recent sessions for history display - only from start date
    const recentSessions = completedSessions
      .filter(s => new Date(s.scheduled_date) >= TRAINER_START_DATE)
      .slice(-20)
      .reverse();
    
    // Mark which sessions are paid (within paid packages)
    const sessionsWithPaymentStatus = recentSessions.map(session => {
      if (!session.with_trainer) return { ...session, paymentStatus: 'solo' as const };
      
      // Find the session's position in trainer sessions
      const trainerIndex = trainerSessions.findIndex(ts => ts.id === session.id);
      if (trainerIndex === -1) return { ...session, paymentStatus: 'solo' as const };
      
      const packageNumber = Math.floor(trainerIndex / TRAINER_PACKAGE_SIZE);
      const isPaid = packageNumber < packagesPaid;
      return { ...session, paymentStatus: isPaid ? 'paid' as const : 'unpaid' as const };
    });
    
    const lastPaymentDate = trainerPayments.length > 0 
      ? new Date(trainerPayments[trainerPayments.length - 1].date)
      : TRAINER_START_DATE;
    
    return {
      totalTrainerSessions,
      currentPackageUsed: currentPackageUsed === 0 && totalTrainerSessions > 0 ? TRAINER_PACKAGE_SIZE : currentPackageUsed,
      packagesCompleted: currentPackageUsed === 0 && totalTrainerSessions > 0 ? packagesCompleted : packagesCompleted,
      sessionsRemaining: currentPackageUsed === 0 && totalTrainerSessions > 0 ? 0 : sessionsRemaining,
      recentSessions: sessionsWithPaymentStatus,
      packagesPaid,
      needsPayment,
      sessionsUntilPayment: sessionsUntilPayment > 0 ? sessionsUntilPayment : 0,
      lastPaymentDate,
      totalPaid: trainerPayments.reduce((sum, p) => sum + p.amount, 0)
    };
  }, [workoutSessions, trainerPayments]);

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
    
    // Count trainer sessions
    const withTrainer = sessionsThisWeek.filter(s => s.with_trainer).length;
    const withoutTrainer = totalWorkouts - withTrainer;
    
    // Get unique muscles trained - separate main and side
    const mainMusclesTrained = new Set<string>();
    const sideMusclesTrained = new Set<string>();
    
    sessionsThisWeek.forEach(session => {
      if (session.exercise_ids && session.exercise_ids.length > 0) {
        session.exercise_ids.forEach(exerciseId => {
          const exercise = exercises.find(ex => ex.id === exerciseId);
          if (exercise) {
            mainMusclesTrained.add(exercise.muscle_group);
            exercise.side_muscle_groups?.forEach(sideMuscle => sideMusclesTrained.add(sideMuscle));
          }
        });
      }
    });

    return {
      totalWorkouts,
      totalMinutes,
      totalExercises,
      mainMusclesTrained: mainMusclesTrained.size,
      sideMusclesTrained: sideMusclesTrained.size,
      averageDuration: totalWorkouts > 0 ? Math.round(totalMinutes / totalWorkouts) : 0,
      withTrainer,
      withoutTrainer
    };
  }, [workoutSessions, exercises]);

  // Calculate muscle recovery status
  const muscleRecovery = useMemo((): MuscleRecoveryData[] => {
    const now = new Date();
    const muscleLastTrained: Record<string, { date: Date; trainedAs: 'main' | 'side' | 'both' }> = {};

    // Find the last time each muscle was trained and how it was trained
    workoutSessions
      .filter(session => session.completed_at)
      .sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime())
      .forEach(session => {
        const sessionExercises = (session.exercise_ids || [])
          .map(id => exercises.find(ex => ex.id === id))
          .filter(Boolean);

        sessionExercises.forEach(exercise => {
          if (exercise) {
            // Track main muscle
            if (!muscleLastTrained[exercise.muscle_group]) {
              muscleLastTrained[exercise.muscle_group] = { 
                date: new Date(session.scheduled_date), 
                trainedAs: 'main' 
              };
            }
            // Track side muscles
            exercise.side_muscle_groups?.forEach(sideMuscle => {
              if (!muscleLastTrained[sideMuscle]) {
                muscleLastTrained[sideMuscle] = { 
                  date: new Date(session.scheduled_date), 
                  trainedAs: 'side' 
                };
              } else if (muscleLastTrained[sideMuscle].trainedAs === 'main') {
                muscleLastTrained[sideMuscle].trainedAs = 'both';
              }
            });
          }
        });
      });

    return muscleGroups.map(mg => {
      const trainingData = muscleLastTrained[mg.name];
      const lastTrained = trainingData?.date || null;
      const hoursSince = lastTrained ? differenceInHours(now, lastTrained) : Infinity;
      const trainedAs: 'main' | 'side' | 'both' | 'never' = trainingData?.trainedAs || 'never';
      
      let status: 'recovered' | 'recovering' | 'fatigued';
      let color: string;
      
      // Side muscles recover faster (different thresholds)
      const fatigueThreshold = trainedAs === 'side' ? 18 : 24;
      const recoverThreshold = trainedAs === 'side' ? 36 : 48;
      
      if (hoursSince === Infinity) {
        status = 'recovered';
        color = 'hsl(var(--muted-foreground))';
      } else if (hoursSince < fatigueThreshold) {
        status = 'fatigued';
        color = 'hsl(0 84% 60%)'; // red
      } else if (hoursSince < recoverThreshold) {
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
        muscleColor: mg.color,
        trainedAs
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

        // Calculate volume per muscle group - separate main and side
        const muscleVolumeMap: Record<string, { mainVolume: number; sideVolume: number; mainSets: number; sideSets: number }> = {};

        (sets || []).forEach(set => {
          const exercise = exercises.find(ex => ex.id === set.exercise_id);
          if (!exercise) return;

          const volume = (set.weight || 0) * (set.reps || 0);
          
          // Main muscle gets 75% of volume
          if (!muscleVolumeMap[exercise.muscle_group]) {
            muscleVolumeMap[exercise.muscle_group] = { mainVolume: 0, sideVolume: 0, mainSets: 0, sideSets: 0 };
          }
          muscleVolumeMap[exercise.muscle_group].mainVolume += volume * 0.75;
          muscleVolumeMap[exercise.muscle_group].mainSets += 1;

          // Side muscles get 25% split
          const sideMuscles = exercise.side_muscle_groups || [];
          if (sideMuscles.length > 0) {
            const sideVolume = (volume * 0.25) / sideMuscles.length;
            sideMuscles.forEach(sideMuscle => {
              if (!muscleVolumeMap[sideMuscle]) {
                muscleVolumeMap[sideMuscle] = { mainVolume: 0, sideVolume: 0, mainSets: 0, sideSets: 0 };
              }
              muscleVolumeMap[sideMuscle].sideVolume += sideVolume;
              muscleVolumeMap[sideMuscle].sideSets += 1;
            });
          }
        });

        const volumeData: MuscleVolumeData[] = Object.entries(muscleVolumeMap)
          .map(([muscle, data]) => ({
            muscle,
            mainVolume: Math.round(data.mainVolume),
            sideVolume: Math.round(data.sideVolume),
            totalVolume: Math.round(data.mainVolume + data.sideVolume),
            mainSets: data.mainSets,
            sideSets: data.sideSets,
            color: muscleGroups.find(mg => mg.name === muscle)?.color || '#ff7f00'
          }))
          .sort((a, b) => b.totalVolume - a.totalVolume);

        setMuscleVolumes(volumeData);
      } catch (error) {
        console.error('Error fetching muscle volumes:', error);
      } finally {
        setIsLoadingVolume(false);
      }
    };

    fetchMuscleVolumes();
  }, [dateRange, workoutSessions, exercises, muscleGroups]);

  const maxVolume = Math.max(...muscleVolumes.map(m => m.totalVolume), 1);

  const formatHours = (hours: number) => {
    if (hours === Infinity) return 'Never trained';
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${Math.round(hours)}h ago`;
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-foreground">{weeklyStats.mainMusclesTrained + weeklyStats.sideMusclesTrained}</p>
                <span className="text-xs text-muted-foreground">
                  ({weeklyStats.mainMusclesTrained} main, {weeklyStats.sideMusclesTrained} side)
                </span>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Trainer Package Tracker */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Trainer Package Tracker
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Payment Status Alert */}
          {trainerStats.needsPayment ? (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-medium text-red-500">Payment Required</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Package {trainerStats.packagesCompleted + 1} needs payment
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium text-green-600">Paid</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Last payment: {format(trainerStats.lastPaymentDate, 'MMM d, yyyy')}
              </p>
            </div>
          )}

          {/* Current Package Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current Package</span>
              <span className="text-sm font-medium">
                {trainerStats.currentPackageUsed} / {TRAINER_PACKAGE_SIZE} sessions
              </span>
            </div>
            <Progress 
              value={(trainerStats.currentPackageUsed / TRAINER_PACKAGE_SIZE) * 100} 
              className="h-3"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{trainerStats.sessionsRemaining} sessions remaining</span>
              {trainerStats.sessionsUntilPayment > 0 && (
                <span className="text-green-600">{trainerStats.sessionsUntilPayment} until next payment</span>
              )}
            </div>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="text-2xl font-bold text-blue-500">{trainerStats.totalTrainerSessions}</div>
              <div className="text-xs text-muted-foreground">Trainer Sessions</div>
            </div>
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="text-2xl font-bold text-green-600">{trainerStats.packagesPaid}</div>
              <div className="text-xs text-muted-foreground">Packages Paid</div>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <div className="text-2xl font-bold text-foreground">
                {workoutSessions.filter(s => s.completed_at && !s.with_trainer).length}
              </div>
              <div className="text-xs text-muted-foreground">Solo Sessions</div>
            </div>
          </div>

          {/* Recent Sessions List */}
          <div className="pt-2">
            <h4 className="text-sm font-medium text-foreground mb-2">Recent Workouts</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {trainerStats.recentSessions.map((session) => (
                <div 
                  key={session.id}
                  className="flex items-center justify-between p-2 rounded-lg border border-border bg-card text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      session.paymentStatus === 'paid' ? "bg-green-500" :
                      session.paymentStatus === 'unpaid' ? "bg-red-500" :
                      session.with_trainer ? "bg-blue-500" : "bg-muted-foreground"
                    )} />
                    <span className="text-foreground">
                      {format(new Date(session.scheduled_date), 'MMM d, yyyy')}
                    </span>
                    {session.muscle_groups && session.muscle_groups.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        • {session.muscle_groups.slice(0, 2).join(', ')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {session.with_trainer && session.paymentStatus !== 'solo' && (
                      <Badge 
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1.5",
                          session.paymentStatus === 'paid' ? "border-green-500/50 text-green-600" :
                          session.paymentStatus === 'unpaid' ? "border-red-500/50 text-red-500" : ""
                        )}
                      >
                        {session.paymentStatus === 'paid' ? 'Paid' : 
                         session.paymentStatus === 'unpaid' ? 'Unpaid' : ''}
                      </Badge>
                    )}
                    <Badge 
                      variant={session.with_trainer ? "default" : "secondary"}
                      className={cn(
                        "text-xs",
                        session.with_trainer ? "bg-blue-500 hover:bg-blue-600" : ""
                      )}
                    >
                      {session.with_trainer ? "Trainer" : "Solo"}
                    </Badge>
                  </div>
                </div>
              ))}
              {trainerStats.recentSessions.length === 0 && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No completed workouts yet
                </div>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="text-xs text-muted-foreground">Paid</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-xs text-muted-foreground">Unpaid</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-xs text-muted-foreground">With Trainer</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground" />
              <span className="text-xs text-muted-foreground">Solo</span>
            </div>
          </div>
        </CardContent>
      </Card>


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
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground text-sm">{muscle.muscle}</span>
                    {muscle.trainedAs !== 'never' && (
                      <span className="text-[10px] text-muted-foreground">
                        as {muscle.trainedAs === 'both' ? 'main & side' : muscle.trainedAs}
                      </span>
                    )}
                  </div>
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
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-xs text-muted-foreground">Fatigued (main &lt;24h, side &lt;18h)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              <span className="text-xs text-muted-foreground">Recovering (main 24-48h, side 18-36h)</span>
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
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        {muscle.mainSets > 0 && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                            Main: {muscle.mainVolume.toLocaleString()}kg
                          </span>
                        )}
                        {muscle.sideSets > 0 && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            Side: {muscle.sideVolume.toLocaleString()}kg
                          </span>
                        )}
                      </div>
                      <span className="font-semibold" style={{ color: muscle.color }}>
                        {muscle.totalVolume.toLocaleString()} kg
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                    {/* Main volume bar */}
                    <div 
                      className="h-full transition-all duration-500"
                      style={{ 
                        width: `${(muscle.mainVolume / maxVolume) * 100}%`,
                        backgroundColor: muscle.color
                      }}
                    />
                    {/* Side volume bar - slightly transparent */}
                    <div 
                      className="h-full transition-all duration-500"
                      style={{ 
                        width: `${(muscle.sideVolume / maxVolume) * 100}%`,
                        backgroundColor: muscle.color,
                        opacity: 0.4
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
                    {muscleVolumes.reduce((sum, m) => sum + m.totalVolume, 0).toLocaleString()} kg
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
