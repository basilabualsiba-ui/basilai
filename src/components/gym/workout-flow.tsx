import { useState, useEffect } from 'react';
import { useGym } from '@/contexts/GymContext';
import { WorkoutOverview } from './workout-overview';
import { WorkoutTimer } from './workout-timer';
import { ExerciseDetail } from './exercise-detail';
import { WorkoutSummary } from './workout-summary';
import { LiveActivityStatus } from './live-activity-status';
import { WorkoutMusicPlayer } from './workout-music-player';
import { SaveBlankWorkoutDialog } from './save-blank-workout-dialog';
import { format } from 'date-fns';
import { useLiveActivity } from '@/hooks/useLiveActivity';
import { supabase } from '@/integrations/supabase/client';

type WorkoutScreen = 'overview' | 'timer' | 'exercise' | 'summary';

interface WorkoutFlowProps {
  onBack: () => void;
  selectedDate?: Date;
  isToday?: boolean;
}

export function WorkoutFlow({ onBack, selectedDate, isToday = true }: WorkoutFlowProps) {
  const { 
    getTodayWorkout,
    getWorkoutForDate, 
    startWorkoutSession,
    updateSessionExercises,
    completeWorkoutSession, 
    resetWorkoutSession,
    workoutSessions,
    workoutPlans,
    workoutPlanDays,
    planWorkouts,
    exercises
  } = useGym();
  
  const {
    startWorkoutActivity,
    updateCurrentExercise,
    updateNextEvent,
    endWorkoutActivity,
    isActive: isLiveActivityActive
  } = useLiveActivity();
  
  const [currentScreen, setCurrentScreen] = useState<WorkoutScreen>('overview');
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<{ exercise: any; workoutConfig?: any } | null>(null);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [currentExercises, setCurrentExercises] = useState<any[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isBlankWorkout, setIsBlankWorkout] = useState(false);

const todayWorkout = selectedDate
  ? getWorkoutForDate(format(selectedDate, 'yyyy-MM-dd'))
  : getTodayWorkout();

  // Initialize exercises from session or workout plan
  useEffect(() => {
    if (todayWorkout.exercises && todayWorkout.exercises.length > 0) {
      // Only set if currentExercises is empty or different
      if (currentExercises.length === 0 || 
          JSON.stringify(currentExercises.map(e => e.id)) !== JSON.stringify(todayWorkout.exercises.map(e => e.id))) {
        setCurrentExercises(todayWorkout.exercises);
      }
    }
  }, [todayWorkout.exercises]);

  // Check for existing active session
  useEffect(() => {
    const checkDate = selectedDate || new Date();
    const dateString = format(checkDate, 'yyyy-MM-dd');
    
    const activeSession = workoutSessions.find(session => 
      session.scheduled_date === dateString && 
      session.started_at && 
      !session.completed_at
    );
    
    if (activeSession && !currentSession) {
      console.log('Found existing active session:', activeSession);
      setCurrentSession(activeSession.id);
      setCurrentScreen('timer');
    }
  }, [workoutSessions, selectedDate, currentSession]);

  const getActivePlanIdForToday = (): string | null => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayDate = `${year}-${month}-${day}`;
    const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
    
    const activePlan = workoutPlans.find(plan => 
      plan.is_active && 
      plan.start_date <= todayDate && 
      (!plan.end_date || plan.end_date >= todayDate)
    );
    
    if (!activePlan) return null;
    
    // Check if there's a workout for today using newer structure (plan_workouts)
    const todayPlanWorkout = planWorkouts.find(pw => 
      pw.plan_id === activePlan.id && pw.day_of_week === dayOfWeek
    );
    
    // Or check older structure (workout_plan_days)
    const todayPlanDay = workoutPlanDays.find(day => 
      day.plan_id === activePlan.id && day.day_of_week === dayOfWeek
    );
    
    return (todayPlanWorkout || todayPlanDay) ? activePlan.id : null;
  };

  const handleStartBlankWorkout = async () => {
    try {
      const baseDate = selectedDate || new Date();
      const dateString = format(baseDate, 'yyyy-MM-dd');

      // Create a blank workout session with no plan
      const sessionId = await startWorkoutSession(
        '', // Empty planId for blank workout
        dateString,
        [],
        []
      );
      
      await startWorkoutActivity('Blank Workout', []);
      
      setIsBlankWorkout(true);
      setCurrentSession(sessionId);
      setCurrentScreen('timer');
    } catch (error) {
      console.error('Failed to start blank workout:', error);
    }
  };

  const handleSelectWorkout = async (workoutId: string) => {
    try {
      const baseDate = selectedDate || new Date();
      const dateString = format(baseDate, 'yyyy-MM-dd');

      // Fetch workout details
      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', workoutId)
        .single();

      if (workoutError) throw workoutError;

      // Fetch workout exercises
      const { data: workoutExercises, error: exercisesError } = await supabase
        .from('workout_exercises')
        .select('exercise_id, order_index')
        .eq('workout_id', workoutId)
        .order('order_index');

      if (exercisesError) throw exercisesError;

      const exerciseIds = workoutExercises?.map(we => we.exercise_id) || [];

      // Create session with the workout's data
      const sessionId = await startWorkoutSession(
        '', // No plan needed
        dateString,
        workout.muscle_groups || [],
        exerciseIds
      );

      // Fetch full exercise details
      const sessionExercises = exerciseIds
        .map(id => exercises.find(ex => ex.id === id))
        .filter(Boolean);

      await startWorkoutActivity(workout.name, sessionExercises.map(ex => ex?.name || ''));
      setCurrentExercises(sessionExercises);
      setCurrentSession(sessionId);
      setCurrentScreen('timer');
    } catch (error) {
      console.error('Failed to start workout from template:', error);
    }
  };

const handleStartWorkout = async () => {
  if (todayWorkout.exercises.length === 0) return;
  
  try {
    const baseDate = selectedDate || new Date();
    const dateString = format(baseDate, 'yyyy-MM-dd');
    const dayOfWeek = baseDate.getDay() === 0 ? 7 : baseDate.getDay();

    const activePlansForDate = workoutPlans.filter(plan => 
      plan.is_active && 
      plan.start_date <= dateString && 
      (!plan.end_date || plan.end_date >= dateString)
    );

    const selectedPlanForDate =
      activePlansForDate.find(plan =>
        planWorkouts.some(pw => pw.plan_id === plan.id && pw.day_of_week === dayOfWeek) ||
        workoutPlanDays.some(wpd => wpd.plan_id === plan.id && wpd.day_of_week === dayOfWeek)
      ) || activePlansForDate[0];

    if (!selectedPlanForDate) {
      console.error('No active plan found for selected date', dateString);
      return;
    }

    const sessionId = await startWorkoutSession(
      selectedPlanForDate.id,
      dateString,
      todayWorkout.exercises.map(ex => ex.muscle_group),
      todayWorkout.exercises.map(ex => ex.id)
    );
    
    // Start Live Activity for iOS
    const workoutName = selectedPlanForDate.name || 'Workout Session';
    const exerciseNames = todayWorkout.exercises.map(ex => ex.name);
    await startWorkoutActivity(workoutName, exerciseNames);
    
    setCurrentSession(sessionId);
    setCurrentScreen('timer');
  } catch (error) {
    console.error('Failed to start workout:', error);
  }
};

  const handleExerciseSelect = async (exercise: any, workoutConfig?: any) => {
    setSelectedExercise({ exercise, workoutConfig });
    
    // Update Live Activity with current exercise
    const exerciseIndex = currentExercises.findIndex(ex => ex.id === exercise.id);
    if (exerciseIndex !== -1) {
      await updateCurrentExercise(exercise.name, exerciseIndex, currentExercises.length);
    }
    
    setCurrentScreen('exercise');
  };

  const handleExerciseSwap = async (newExerciseId: string) => {
    if (!currentSession || !selectedExercise) return;

    const { exercises } = useGym();
    const newExercise = exercises.find(ex => ex.id === newExerciseId);
    if (!newExercise) return;

    const updatedExercises = currentExercises.map(ex => 
      ex.id === selectedExercise.exercise.id ? newExercise : ex
    );

    setCurrentExercises(updatedExercises);
    await updateSessionExercises(currentSession, updatedExercises.map(ex => ex.id));
    setSelectedExercise({ exercise: newExercise, workoutConfig: selectedExercise.workoutConfig });
  };

  const handleExerciseFinish = () => {
    if (selectedExercise) {
      setCompletedExercises(prev => new Set([...prev, selectedExercise.exercise.id]));
    }
    setSelectedExercise(null);
    setCurrentScreen('timer');
  };

  const handleWorkoutComplete = async () => {
    if (!currentSession) return;
    
    try {
      await completeWorkoutSession(currentSession);
      
      // End Live Activity
      await endWorkoutActivity();
      
      // Check if this is a blank workout with exercises - show save dialog
      const session = workoutSessions.find(s => s.id === currentSession);
      const wasBlankWorkout = isBlankWorkout || (!session?.plan_id || session.plan_id === '');
      
      if (wasBlankWorkout && currentExercises.length > 0) {
        setShowSaveDialog(true);
      } else {
        setCurrentScreen('summary');
      }
    } catch (error) {
      console.error('Failed to complete workout:', error);
    }
  };

  const handleSaveDialogComplete = () => {
    setShowSaveDialog(false);
    setCurrentScreen('summary');
  };

  const handleSaveDialogSkip = () => {
    setShowSaveDialog(false);
    setCurrentScreen('summary');
  };

  const handleSummaryFinish = () => {
    setCurrentSession(null);
    setCompletedExercises(new Set());
    setIsBlankWorkout(false);
    setCurrentScreen('overview');
    onBack();
  };

  const handleCancel = async () => {
    // End Live Activity if active
    if (isLiveActivityActive) {
      await endWorkoutActivity();
    }
    
    setCurrentSession(null);
    setCompletedExercises(new Set());
    setIsBlankWorkout(false);
    setCurrentExercises(todayWorkout.exercises || []);
    setCurrentScreen('overview');
  };

  const handleReset = async () => {
    if (!currentSession) return;
    
    try {
      await resetWorkoutSession(currentSession);
      
      // End Live Activity if active
      if (isLiveActivityActive) {
        await endWorkoutActivity();
      }
      
      setCurrentSession(null);
      setCompletedExercises(new Set());
      setIsBlankWorkout(false);
      setCurrentExercises(todayWorkout.exercises || []);
      setCurrentScreen('overview');
    } catch (error) {
      console.error('Failed to reset workout:', error);
    }
  };

  const handleExercisesChange = async (exercises: any[]) => {
    setCurrentExercises(exercises);
    
    // Save to database if we have an active session
    if (currentSession) {
      await updateSessionExercises(currentSession, exercises.map(ex => ex.id));
    }
    
    // Remove completed status for exercises that are no longer in the list
    setCompletedExercises(prev => {
      const newCompleted = new Set<string>();
      for (const exerciseId of prev) {
        if (exercises.some(ex => ex.id === exerciseId)) {
          newCompleted.add(exerciseId);
        }
      }
      return newCompleted;
    });
  };

  switch (currentScreen) {
    case 'overview':
      return (
        <WorkoutOverview 
          onStartWorkout={handleStartWorkout}
          onBack={onBack}
          selectedDate={selectedDate}
          isToday={isToday}
          onStartBlankWorkout={handleStartBlankWorkout}
          onSelectWorkout={handleSelectWorkout}
        />
      );
    
    case 'timer':
      return currentSession ? (
        <div className="relative">
          <div className="fixed top-20 left-0 right-0 z-50 md:left-auto md:right-6 md:left-6">
            <LiveActivityStatus />
          </div>
          <div className="pt-24">
            <WorkoutTimer
              sessionId={currentSession}
              onExerciseSelect={handleExerciseSelect}
              onComplete={handleWorkoutComplete}
              onCancel={handleCancel}
              onReset={handleReset}
              completedExercises={completedExercises}
              currentExercises={currentExercises}
              onExercisesChange={handleExercisesChange}
            />
          </div>
          <SaveBlankWorkoutDialog
            open={showSaveDialog}
            onOpenChange={setShowSaveDialog}
            exercises={currentExercises}
            onSave={handleSaveDialogComplete}
            onSkip={handleSaveDialogSkip}
          />
        </div>
      ) : null;
    
    case 'exercise':
      return selectedExercise && currentSession ? (
        <div className="relative">
          <div className="pt-4">
            <ExerciseDetail
              exercise={selectedExercise.exercise}
              sessionId={currentSession}
              onFinish={handleExerciseFinish}
              onBack={() => setCurrentScreen('timer')}
              onSwap={handleExerciseSwap}
              workoutConfig={selectedExercise.workoutConfig}
            />
          </div>
        </div>
      ) : null;
    
    case 'summary':
      return currentSession ? (
        <div className="relative">
          <div className="pt-4">
            <WorkoutSummary
              sessionId={currentSession}
              onFinish={handleSummaryFinish}
            />
          </div>
        </div>
      ) : null;
    
    default:
      return null;
  }
}