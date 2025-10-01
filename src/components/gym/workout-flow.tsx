import { useState, useEffect } from 'react';
import { useGym } from '@/contexts/GymContext';
import { WorkoutOverview } from './workout-overview';
import { WorkoutTimer } from './workout-timer';
import { ExerciseDetail } from './exercise-detail';
import { WorkoutSummary } from './workout-summary';
import { LiveActivityStatus } from './live-activity-status';
import { WorkoutMusicPlayer } from './workout-music-player';
import { SaveWorkoutTemplateDialog } from './save-workout-template-dialog';
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
    completeWorkoutSession, 
    resetWorkoutSession,
    workoutSessions,
    workoutPlans,
    workoutPlanDays,
    planWorkouts
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
  const [isQuickWorkout, setIsQuickWorkout] = useState(false);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);

const todayWorkout = selectedDate
  ? getWorkoutForDate(format(selectedDate, 'yyyy-MM-dd'))
  : getTodayWorkout();

  // Initialize exercises when workout starts
  useEffect(() => {
    if (todayWorkout.exercises && currentExercises.length === 0) {
      setCurrentExercises(todayWorkout.exercises);
    }
  }, [todayWorkout.exercises.length, currentExercises.length]);

  // Check for existing active session
  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayDate = `${year}-${month}-${day}`;
    
    const activeSession = workoutSessions.find(session => 
      session.scheduled_date === todayDate && 
      session.started_at && 
      !session.completed_at
    );
    
    if (activeSession && !currentSession) {
      setCurrentSession(activeSession.id);
      setCurrentScreen('timer');
    }
  }, [workoutSessions.length, currentSession]);

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
      todayWorkout.exercises.map(ex => ex.muscle_group)
    );
    
    // Start Live Activity for iOS
    const workoutName = selectedPlanForDate.name || 'Workout Session';
    const exerciseNames = todayWorkout.exercises.map(ex => ex.name);
    await startWorkoutActivity(workoutName, exerciseNames);
    
    setIsQuickWorkout(false);
    setCurrentSession(sessionId);
    setCurrentScreen('timer');
  } catch (error) {
    console.error('Failed to start workout:', error);
  }
};

const handleStartQuickWorkout = async () => {
  try {
    const baseDate = selectedDate || new Date();
    const dateString = format(baseDate, 'yyyy-MM-dd');

    // Create a session without a plan_id for quick workout
    const { data: session, error } = await supabase
      .from('workout_sessions')
      .insert({
        plan_id: null as any,
        scheduled_date: dateString,
        started_at: new Date().toISOString(),
        muscle_groups: []
      })
      .select()
      .single();

    if (error) throw error;

    // Start Live Activity
    await startWorkoutActivity('Quick Workout', []);
    
    setIsQuickWorkout(true);
    setCurrentSession(session.id);
    setCurrentExercises([]);
    setCurrentScreen('timer');
  } catch (error) {
    console.error('Failed to start quick workout:', error);
  }
};

const handleStartFromTemplate = async (workoutId: string, exercises: any[]) => {
  try {
    const baseDate = selectedDate || new Date();
    const dateString = format(baseDate, 'yyyy-MM-dd');

    // Get muscle groups from exercises
    const muscleGroups = Array.from(new Set(exercises.map(ex => ex.muscle_group)));

    // Create a session without a plan_id
    const { data: session, error } = await supabase
      .from('workout_sessions')
      .insert({
        plan_id: null as any,
        scheduled_date: dateString,
        started_at: new Date().toISOString(),
        muscle_groups: muscleGroups
      })
      .select()
      .single();

    if (error) throw error;

    // Start Live Activity
    const exerciseNames = exercises.map(ex => ex.name);
    await startWorkoutActivity('Workout from Template', exerciseNames);
    
    setIsQuickWorkout(false);
    setCurrentSession(session.id);
    setCurrentExercises(exercises);
    setCurrentScreen('timer');
  } catch (error) {
    console.error('Failed to start workout from template:', error);
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
      
      // If it was a quick workout, ask to save as template
      if (isQuickWorkout && currentExercises.length > 0) {
        setShowSaveTemplateDialog(true);
      } else {
        setCurrentScreen('summary');
      }
    } catch (error) {
      console.error('Failed to complete workout:', error);
    }
  };

  const handleSaveTemplateComplete = () => {
    setShowSaveTemplateDialog(false);
    setCurrentScreen('summary');
  };

  const handleSummaryFinish = () => {
    setCurrentSession(null);
    setCompletedExercises(new Set());
    setCurrentExercises([]);
    setIsQuickWorkout(false);
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
    setCurrentExercises(todayWorkout.exercises || []);
    setIsQuickWorkout(false);
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
      setCurrentExercises(todayWorkout.exercises || []);
      setIsQuickWorkout(false);
      setCurrentScreen('overview');
    } catch (error) {
      console.error('Failed to reset workout:', error);
    }
  };

  const handleExercisesChange = (exercises: any[]) => {
    setCurrentExercises(exercises);
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
        <>
          <WorkoutOverview 
            onStartWorkout={handleStartWorkout}
            onStartQuickWorkout={handleStartQuickWorkout}
            onStartFromTemplate={handleStartFromTemplate}
            onBack={onBack}
            selectedDate={selectedDate}
            isToday={isToday}
          />
        </>
      );
    
    case 'timer':
      return currentSession ? (
        <div className="relative">
          <div className="fixed top-20 left-0 right-0 z-50 md:left-auto md:right-6 md:left-6">
            <WorkoutMusicPlayer 
              isWorkoutActive={true}
              onWorkoutStart={() => {}}
              onWorkoutEnd={() => {}}
            />
            <LiveActivityStatus />
          </div>
          <div className="pt-36">
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
        </div>
      ) : null;
    
    case 'exercise':
      return selectedExercise && currentSession ? (
        <div className="relative">
          <div className="fixed top-20 left-0 right-0 z-50 md:left-auto md:right-6 md:left-6">
            <WorkoutMusicPlayer 
              isWorkoutActive={true}
              onWorkoutStart={() => {}}
              onWorkoutEnd={() => {}}
            />
          </div>
          <div className="pt-28">
            <ExerciseDetail
              exercise={selectedExercise.exercise}
              sessionId={currentSession}
              onFinish={handleExerciseFinish}
              onBack={() => setCurrentScreen('timer')}
              workoutConfig={selectedExercise.workoutConfig}
            />
          </div>
        </div>
      ) : null;
    
    case 'summary':
      return currentSession ? (
        <div className="relative">
          <div className="fixed top-20 left-0 right-0 z-50 md:left-auto md:right-6 md:left-6">
            <WorkoutMusicPlayer 
              isWorkoutActive={false}
              onWorkoutStart={() => {}}
              onWorkoutEnd={() => {}}
            />
          </div>
          <div className="pt-28">
            <WorkoutSummary
              sessionId={currentSession}
              onFinish={handleSummaryFinish}
            />
          </div>

          <SaveWorkoutTemplateDialog
            open={showSaveTemplateDialog}
            onOpenChange={setShowSaveTemplateDialog}
            sessionId={currentSession}
            exercises={currentExercises}
            onSaveComplete={handleSaveTemplateComplete}
          />
        </div>
      ) : null;
    
    default:
      return null;
  }
}