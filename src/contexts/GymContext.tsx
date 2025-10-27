import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface MuscleGroup {
  id: string;
  name: string;
  color: string;
  photo_url?: string;
  created_at: string;
  updated_at: string;
}

interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
  side_muscle_groups?: string[];
  instructions?: string;
  difficulty_level?: string;
  equipment?: string;
  video_url?: string;
  photo_url?: string;
  created_at: string;
  updated_at: string;
}

interface WorkoutPlan {
  id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface WorkoutPlanDay {
  id: string;
  plan_id: string;
  day_of_week: number;
  muscle_groups: string[];
  exercise_ids?: string[];
  name?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  created_at: string;
  updated_at: string;
}

interface WorkoutSession {
  id: string;
  plan_id: string;
  scheduled_date: string;
  started_at?: string;
  completed_at?: string;
  total_duration_minutes?: number;
  notes?: string;
  muscle_groups?: string[];
  exercise_ids?: string[];
  created_at: string;
  updated_at: string;
}

interface ExerciseSet {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  weight?: number;
  reps?: number;
  rest_seconds?: number;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

interface GymContextType {
  muscleGroups: MuscleGroup[];
  exercises: Exercise[];
  workoutPlans: WorkoutPlan[];
  workoutPlanDays: WorkoutPlanDay[];
  workoutSessions: WorkoutSession[];
  exerciseSets: ExerciseSet[];
  workouts: any[];
  workoutExercises: any[];
  planWorkouts: any[];
  isLoading: boolean;
  
  // Muscle group functions
  addMuscleGroup: (muscleGroup: Omit<MuscleGroup, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateMuscleGroup: (id: string, muscleGroup: Partial<MuscleGroup>) => Promise<void>;
  deleteMuscleGroup: (id: string) => Promise<void>;
  
  // Exercise functions
  addExercise: (exercise: Omit<Exercise, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateExercise: (id: string, exercise: Partial<Exercise>) => Promise<void>;
  deleteExercise: (id: string) => Promise<void>;
  
  // Workout plan functions
  addWorkoutPlan: (plan: Omit<WorkoutPlan, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateWorkoutPlan: (id: string, plan: Partial<WorkoutPlan>, applyToFuture?: boolean) => Promise<void>;
  deleteWorkoutPlan: (id: string) => Promise<void>;
  
  // Workout session functions
  startWorkoutSession: (planId: string, scheduledDate: string, muscleGroups: string[], exerciseIds?: string[]) => Promise<string>;
  updateSessionExercises: (sessionId: string, exerciseIds: string[]) => Promise<void>;
  completeWorkoutSession: (id: string, notes?: string) => Promise<void>;
  resetWorkoutSession: (id: string) => Promise<void>;
  
  // Exercise set functions
  addExerciseSet: (set: Omit<ExerciseSet, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateExerciseSet: (id: string, set: Partial<ExerciseSet>) => Promise<void>;
  
  // Utility functions
  getExercisesByMuscleGroup: (muscleGroup: string) => Exercise[];
  getWorkoutPlanDays: (planId: string) => WorkoutPlanDay[];
  getTodayWorkout: () => { session: WorkoutSession | null; exercises: Exercise[] };
  getWorkoutForDate: (date: string) => { session: WorkoutSession | null; exercises: Exercise[]; times?: { start: string; end: string } };
}

const GymContext = createContext<GymContextType | undefined>(undefined);

export const useGym = () => {
  const context = useContext(GymContext);
  if (context === undefined) {
    throw new Error('useGym must be used within a GymProvider');
  }
  return context;
};

export const GymProvider = ({ children }: { children: React.ReactNode }) => {
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [workoutPlanDays, setWorkoutPlanDays] = useState<WorkoutPlanDay[]>([]);
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSession[]>([]);
  const [exerciseSets, setExerciseSets] = useState<ExerciseSet[]>([]);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [workoutExercises, setWorkoutExercises] = useState<any[]>([]);
  const [planWorkouts, setPlanWorkouts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Load data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [
        muscleGroupsRes,
        exercisesRes,
        plansRes,
        planDaysRes,
        sessionsRes,
        setsRes,
        workoutsRes,
        workoutExercisesRes,
        planWorkoutsRes
      ] = await Promise.all([
        supabase.from('muscle_groups').select('*').order('name'),
        supabase.from('exercises').select('*').order('name'),
        supabase.from('workout_plans').select('*').order('created_at', { ascending: false }),
        supabase.from('workout_plan_days').select('*').order('day_of_week'),
        supabase.from('workout_sessions').select('*').order('scheduled_date', { ascending: false }),
        supabase.from('exercise_sets').select('*').order('created_at', { ascending: false }),
        supabase.from('workouts').select('*').order('name'),
        supabase.from('workout_exercises').select('*').order('order_index'),
        supabase.from('plan_workouts').select('*').order('day_of_week')
      ]);

      if (muscleGroupsRes.data) setMuscleGroups(muscleGroupsRes.data);
      if (exercisesRes.data) setExercises(exercisesRes.data);
      if (plansRes.data) setWorkoutPlans(plansRes.data);
      if (planDaysRes.data) setWorkoutPlanDays(planDaysRes.data);
      if (sessionsRes.data) setWorkoutSessions(sessionsRes.data);
      if (setsRes.data) setExerciseSets(setsRes.data);
      if (workoutsRes.data) setWorkouts(workoutsRes.data);
      if (workoutExercisesRes.data) setWorkoutExercises(workoutExercisesRes.data);
      if (planWorkoutsRes.data) setPlanWorkouts(planWorkoutsRes.data);
    } catch (error) {
      console.error('Error loading gym data:', error);
      toast({
        title: "Error",
        description: "Failed to load gym data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Muscle group functions
  const addMuscleGroup = async (muscleGroup: Omit<MuscleGroup, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('muscle_groups')
      .insert([muscleGroup])
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add muscle group",
        variant: "destructive"
      });
      return;
    }

    setMuscleGroups(prev => [...prev, data]);
    toast({
      title: "Success",
      description: "Muscle group added successfully"
    });
  };

  const updateMuscleGroup = async (id: string, muscleGroup: Partial<MuscleGroup>) => {
    const { data, error } = await supabase
      .from('muscle_groups')
      .update(muscleGroup)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update muscle group",
        variant: "destructive"
      });
      return;
    }

    setMuscleGroups(prev => prev.map(mg => mg.id === id ? data : mg));
    
    // Update exercises that use this muscle group
    if (muscleGroup.name) {
      const oldMuscleGroup = muscleGroups.find(mg => mg.id === id);
      if (oldMuscleGroup && oldMuscleGroup.name !== muscleGroup.name) {
        const { error: exerciseError } = await supabase
          .from('exercises')
          .update({ muscle_group: muscleGroup.name })
          .eq('muscle_group', oldMuscleGroup.name);

        if (!exerciseError) {
          setExercises(prev => prev.map(ex => 
            ex.muscle_group === oldMuscleGroup.name 
              ? { ...ex, muscle_group: muscleGroup.name! }
              : ex
          ));
        }
      }
    }

    toast({
      title: "Success",
      description: "Muscle group updated successfully"
    });
  };

  const deleteMuscleGroup = async (id: string) => {
    const muscleGroup = muscleGroups.find(mg => mg.id === id);
    if (!muscleGroup) return;

    // Check if any exercises use this muscle group
    const exercisesUsingGroup = exercises.filter(ex => ex.muscle_group === muscleGroup.name);
    if (exercisesUsingGroup.length > 0) {
      toast({
        title: "Cannot Delete",
        description: `This muscle group is used by ${exercisesUsingGroup.length} exercises. Delete them first.`,
        variant: "destructive"
      });
      return;
    }

    const { error } = await supabase
      .from('muscle_groups')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete muscle group",
        variant: "destructive"
      });
      return;
    }

    setMuscleGroups(prev => prev.filter(mg => mg.id !== id));
    toast({
      title: "Success",
      description: "Muscle group deleted successfully"
    });
  };

  // Exercise functions
  const addExercise = async (exercise: Omit<Exercise, 'id' | 'created_at' | 'updated_at'>) => {
    console.log('Adding exercise:', exercise);
    
    try {
      const { data, error } = await supabase
        .from('exercises')
        .insert([exercise])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        toast({
          title: "Error",
          description: `Failed to add exercise: ${error.message}`,
          variant: "destructive"
        });
        return;
      }

      setExercises(prev => [...prev, data]);
      toast({
        title: "Success",
        description: "Exercise added successfully"
      });
    } catch (err) {
      console.error('Unexpected error:', err);
      toast({
        title: "Error",
        description: "Failed to add exercise: Unexpected error",
        variant: "destructive"
      });
    }
  };

  const updateExercise = async (id: string, exercise: Partial<Exercise>) => {
    const { data, error } = await supabase
      .from('exercises')
      .update(exercise)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update exercise",
        variant: "destructive"
      });
      return;
    }

    setExercises(prev => prev.map(ex => ex.id === id ? data : ex));
    toast({
      title: "Success",
      description: "Exercise updated successfully"
    });
  };

  const deleteExercise = async (id: string) => {
    const { error } = await supabase
      .from('exercises')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete exercise",
        variant: "destructive"
      });
      return;
    }

    setExercises(prev => prev.filter(ex => ex.id !== id));
    toast({
      title: "Success",
      description: "Exercise deleted successfully"
    });
  };

  // Workout plan functions
  const addWorkoutPlan = async (plan: Omit<WorkoutPlan, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('workout_plans')
      .insert([plan])
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add workout plan",
        variant: "destructive"
      });
      return;
    }

    setWorkoutPlans(prev => [...prev, data]);
    toast({
      title: "Success",
      description: "Workout plan created successfully"
    });
  };

  const updateWorkoutPlan = async (id: string, plan: Partial<WorkoutPlan>, applyToFuture?: boolean) => {
    const { data, error } = await supabase
      .from('workout_plans')
      .update(plan)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update workout plan",
        variant: "destructive"
      });
      return;
    }

    // If applyToFuture is true, update future workout sessions
    if (applyToFuture && (plan.start_date || plan.end_date)) {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      try {
        // Update future workout sessions based on new dates
        if (plan.start_date && plan.start_date > today) {
          // If new start date is in future, delete sessions before new start date
          await supabase
            .from('workout_sessions')
            .delete()
            .eq('plan_id', id)
            .lt('scheduled_date', plan.start_date)
            .is('completed_at', null);
        }
        
        if (plan.end_date) {
          // Delete sessions after new end date that are not completed
          await supabase
            .from('workout_sessions')
            .delete()
            .eq('plan_id', id)
            .gt('scheduled_date', plan.end_date)
            .is('completed_at', null);
        }
        
        // Reload sessions to reflect changes
        const { data: updatedSessions } = await supabase
          .from('workout_sessions')
          .select('*')
          .order('scheduled_date', { ascending: false });
        
        if (updatedSessions) {
          setWorkoutSessions(updatedSessions);
        }
      } catch (sessionError) {
        console.error('Error updating future sessions:', sessionError);
      }
    }

    setWorkoutPlans(prev => prev.map(p => p.id === id ? data : p));
    toast({
      title: "Success",
      description: applyToFuture ? "Workout plan and future sessions updated successfully" : "Workout plan updated successfully"
    });
  };

  const deleteWorkoutPlan = async (id: string) => {
    try {
      // First, delete uncompleted workout sessions for this plan
      const { error: sessionsError } = await supabase
        .from('workout_sessions')
        .delete()
        .eq('plan_id', id)
        .is('completed_at', null);

      if (sessionsError) {
        console.error('Error deleting uncompleted sessions:', sessionsError);
      }

      // Delete workout plan days
      const { error: planDaysError } = await supabase
        .from('workout_plan_days')
        .delete()
        .eq('plan_id', id);

      if (planDaysError) {
        console.error('Error deleting plan days:', planDaysError);
      }

      // Delete plan workouts
      const { error: planWorkoutsError } = await supabase
        .from('plan_workouts')
        .delete()
        .eq('plan_id', id);

      if (planWorkoutsError) {
        console.error('Error deleting plan workouts:', planWorkoutsError);
      }

      // Finally, delete the workout plan itself
      const { error } = await supabase
        .from('workout_plans')
        .delete()
        .eq('id', id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to delete workout plan",
          variant: "destructive"
        });
        return;
      }

      // Update local state
      setWorkoutPlans(prev => prev.filter(p => p.id !== id));
      setWorkoutPlanDays(prev => prev.filter(d => d.plan_id !== id));
      setPlanWorkouts(prev => prev.filter(pw => pw.plan_id !== id));
      setWorkoutSessions(prev => prev.filter(s => s.plan_id !== id || s.completed_at));

      toast({
        title: "Success",
        description: "Workout plan deleted successfully (completed sessions preserved)"
      });
    } catch (error) {
      console.error('Error deleting workout plan:', error);
      toast({
        title: "Error",
        description: "Failed to delete workout plan",
        variant: "destructive"
      });
    }
  };

  // Workout session functions
  const startWorkoutSession = async (planId: string, scheduledDate: string, muscleGroups: string[], exerciseIds?: string[]) => {
    const { data, error } = await supabase
      .from('workout_sessions')
      .insert([{
        plan_id: planId,
        scheduled_date: scheduledDate,
        started_at: new Date().toISOString(),
        muscle_groups: muscleGroups,
        exercise_ids: exerciseIds || []
      }])
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to start workout session",
        variant: "destructive"
      });
      throw error;
    }

    setWorkoutSessions(prev => [...prev, data]);
    toast({
      title: "Success",
      description: "Workout started successfully"
    });
    
    return data.id;
  };

  const updateSessionExercises = async (sessionId: string, exerciseIds: string[]) => {
    const { data, error } = await supabase
      .from('workout_sessions')
      .update({ exercise_ids: exerciseIds })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update session exercises:', error);
      return;
    }

    setWorkoutSessions(prev => prev.map(s => s.id === sessionId ? data : s));
  };

  const completeWorkoutSession = async (id: string, notes?: string) => {
    const session = workoutSessions.find(s => s.id === id);
    if (!session || !session.started_at) return;

    const startTime = new Date(session.started_at);
    const endTime = new Date();
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

    const { data, error } = await supabase
      .from('workout_sessions')
      .update({
        completed_at: endTime.toISOString(),
        total_duration_minutes: duration,
        notes: notes
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to complete workout session",
        variant: "destructive"
      });
      return;
    }

    setWorkoutSessions(prev => prev.map(s => s.id === id ? data : s));
    toast({
      title: "Success",
      description: `Workout completed! Duration: ${duration} minutes`
    });
  };

  const resetWorkoutSession = async (id: string) => {
    try {
      // Remove all exercise sets for this session
      const { error: setsError } = await supabase
        .from('exercise_sets')
        .delete()
        .eq('session_id', id);

      if (setsError) throw setsError;

      // Reset the session by removing started_at, completed_at, and duration
      const { data, error } = await supabase
        .from('workout_sessions')
        .update({
          started_at: null,
          completed_at: null,
          total_duration_minutes: null,
          notes: null,
          exercise_ids: []
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setWorkoutSessions(prev => prev.map(s => s.id === id ? data : s));
      setExerciseSets(prev => prev.filter(set => set.session_id !== id));

      toast({
        title: "Workout Reset",
        description: "Workout session has been reset successfully"
      });
    } catch (error) {
      console.error('Error resetting workout session:', error);
      toast({
        title: "Error",
        description: "Failed to reset workout session",
        variant: "destructive"
      });
    }
  };

  // Exercise set functions
  const addExerciseSet = async (set: Omit<ExerciseSet, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('exercise_sets')
      .insert([{ ...set, completed_at: new Date().toISOString() }])
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add exercise set",
        variant: "destructive"
      });
      return;
    }

    setExerciseSets(prev => [...prev, data]);
  };

  const updateExerciseSet = async (id: string, set: Partial<ExerciseSet>) => {
    const { data, error } = await supabase
      .from('exercise_sets')
      .update(set)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update exercise set",
        variant: "destructive"
      });
      return;
    }

    setExerciseSets(prev => prev.map(s => s.id === id ? data : s));
  };

  // Utility functions
  const getExercisesByMuscleGroup = (muscleGroup: string) => {
    return exercises.filter(ex => ex.muscle_group === muscleGroup);
  };

  const getWorkoutPlanDays = (planId: string) => {
    return workoutPlanDays.filter(day => day.plan_id === planId);
  };

  const getTodayWorkout = useCallback(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayDate = `${year}-${month}-${day}`;
    const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay();

    console.log('getTodayWorkout - LOCAL today:', todayDate, 'dayOfWeek:', dayOfWeek);

    // Find all plans active for today's date
    const activePlans = workoutPlans.filter(plan => 
      plan.is_active && 
      plan.start_date <= todayDate && 
      (!plan.end_date || plan.end_date >= todayDate)
    );

    // Prefer the plan that actually has a day configured for today
    const selectedPlan = activePlans.find(plan =>
      planWorkouts.some(pw => pw.plan_id === plan.id && pw.day_of_week === dayOfWeek) ||
      workoutPlanDays.some(wpd => wpd.plan_id === plan.id && wpd.day_of_week === dayOfWeek)
    );

    console.log('getTodayWorkout - activePlans:', activePlans);
    console.log('getTodayWorkout - selectedPlan:', selectedPlan);

    if (!selectedPlan) {
      return { session: null, exercises: [] };
    }

    // Find today's session if exists for the selected plan
    const todaySession = workoutSessions.find(session => 
      session.plan_id === selectedPlan.id && 
      session.scheduled_date === todayDate
    );

    // If session has exercise_ids, use those instead of plan exercises
    if (todaySession?.exercise_ids && todaySession.exercise_ids.length > 0) {
      const sessionExercises = todaySession.exercise_ids
        .map(exerciseId => exercises.find(ex => ex.id === exerciseId))
        .filter(Boolean) as Exercise[];
      return { session: todaySession, exercises: sessionExercises };
    }

    // Try newer structure with workouts and workout_exercises first
    const todayPlanWorkout = planWorkouts.find(pw => 
      pw.plan_id === selectedPlan.id && pw.day_of_week === dayOfWeek
    );

    if (todayPlanWorkout) {
      const workout = workouts.find(w => w.id === todayPlanWorkout.workout_id);
      if (workout) {
        const workoutExerciseIds = workoutExercises
          .filter(we => we.workout_id === workout.id)
          .sort((a, b) => a.order_index - b.order_index)
          .map(we => we.exercise_id);

        const todayExercises = workoutExerciseIds
          .map(exerciseId => exercises.find(ex => ex.id === exerciseId))
          .filter(Boolean);

        return { session: todaySession || null, exercises: todayExercises };
      }
    }

    // Fall back to workout_plan_days for the selected plan
    const todayPlanDay = workoutPlanDays.find(wpd => 
      wpd.plan_id === selectedPlan.id && wpd.day_of_week === dayOfWeek
    );

    console.log('getTodayWorkout - todayPlanDay:', todayPlanDay);
    console.log('getTodayWorkout - available workoutPlanDays:', workoutPlanDays);

    if (!todayPlanDay) {
      return { session: todaySession || null, exercises: [] };
    }

    let todayExercises: Exercise[] = [];
    if (todayPlanDay.exercise_ids && todayPlanDay.exercise_ids.length > 0) {
      todayExercises = todayPlanDay.exercise_ids
        .map(exerciseId => exercises.find(ex => ex.id === exerciseId))
        .filter(Boolean) as Exercise[];
    } else if (todayPlanDay.muscle_groups && todayPlanDay.muscle_groups.length > 0) {
      todayExercises = exercises.filter(ex => todayPlanDay.muscle_groups.includes(ex.muscle_group));
    }

    console.log('getTodayWorkout - todayExercises:', todayExercises);

    return { session: todaySession || null, exercises: todayExercises };
  }, [workoutPlans, planWorkouts, workoutPlanDays, workoutSessions, workouts, workoutExercises, exercises]);

  const getWorkoutForDate = useCallback((date: string) => {
    const targetDate = new Date(date);
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    const dayOfWeek = targetDate.getDay() === 0 ? 7 : targetDate.getDay();

    // Find all plans active for this date
    const activePlans = workoutPlans.filter(plan => 
      plan.is_active && 
      plan.start_date <= dateString && 
      (!plan.end_date || plan.end_date >= dateString)
    );

    // Prefer plan that has a configured day matching this date
    const selectedPlan = activePlans.find(plan =>
      planWorkouts.some(pw => pw.plan_id === plan.id && pw.day_of_week === dayOfWeek) ||
      workoutPlanDays.some(wpd => wpd.plan_id === plan.id && wpd.day_of_week === dayOfWeek)
    );

    if (!selectedPlan) {
      return { session: null, exercises: [] };
    }

    // Find existing session for this date
    const existingSession = workoutSessions.find(session => 
      session.plan_id === selectedPlan.id && 
      session.scheduled_date === dateString
    );

    // If session has exercise_ids, use those instead of plan exercises
    if (existingSession?.exercise_ids && existingSession.exercise_ids.length > 0) {
      const sessionExercises = existingSession.exercise_ids
        .map(exerciseId => exercises.find(ex => ex.id === exerciseId))
        .filter(Boolean) as Exercise[];
      
      // Get times from plan day
      const todayPlanDay = workoutPlanDays.find(wpd => 
        wpd.plan_id === selectedPlan.id && wpd.day_of_week === dayOfWeek
      );
      const startTime = todayPlanDay?.start_time || null;
      const endTime = todayPlanDay?.end_time || null;
      
      return { 
        session: existingSession, 
        exercises: sessionExercises,
        times: { start: startTime, end: endTime }
      };
    }

    // Check plan_workouts first (newer structure with times)
    const planWorkout = planWorkouts.find(pw => 
      pw.plan_id === selectedPlan.id && pw.day_of_week === dayOfWeek
    );

    if (planWorkout) {
      const workout = workouts.find(w => w.id === planWorkout.workout_id);
      if (workout) {
        const workoutExerciseList = workoutExercises
          .filter(we => we.workout_id === workout.id)
          .map(we => exercises.find(ex => ex.id === we.exercise_id))
          .filter(Boolean) as Exercise[];

        // Get the corresponding workout plan day for times
        const todayPlanDay = workoutPlanDays.find(wpd => 
          wpd.plan_id === selectedPlan.id && wpd.day_of_week === dayOfWeek
        );

        const startTime = todayPlanDay?.start_time || null;
        const endTime = todayPlanDay?.end_time || null;

        return { 
          session: existingSession || null, 
          exercises: workoutExerciseList,
          times: { start: startTime, end: endTime }
        };
      }
    }

    // Fall back to workout_plan_days structure
    const todayPlanDay = workoutPlanDays.find(wpd => 
      wpd.plan_id === selectedPlan.id && wpd.day_of_week === dayOfWeek
    );

    if (!todayPlanDay) {
      return { session: existingSession || null, exercises: [] };
    }

    let planExercises: Exercise[] = [];
    if (todayPlanDay.exercise_ids && todayPlanDay.exercise_ids.length > 0) {
      planExercises = todayPlanDay.exercise_ids
        .map(exerciseId => exercises.find(ex => ex.id === exerciseId))
        .filter(Boolean) as Exercise[];
    } else if (todayPlanDay.muscle_groups && todayPlanDay.muscle_groups.length > 0) {
      planExercises = exercises.filter(ex => todayPlanDay.muscle_groups.includes(ex.muscle_group));
    }

    const startTime = todayPlanDay.start_time || null;
    const endTime = todayPlanDay.end_time || null;

    return { 
      session: existingSession || null, 
      exercises: planExercises,
      times: { start: startTime, end: endTime }
    };
  }, [workoutPlans, planWorkouts, workoutPlanDays, workoutSessions, workouts, workoutExercises, exercises]);

  const value: GymContextType = {
    muscleGroups,
    exercises,
    workoutPlans,
    workoutPlanDays,
    workoutSessions,
    exerciseSets,
    workouts,
    workoutExercises,
    planWorkouts,
    isLoading,
    addMuscleGroup,
    updateMuscleGroup,
    deleteMuscleGroup,
    addExercise,
    updateExercise,
    deleteExercise,
    addWorkoutPlan,
    updateWorkoutPlan,
    deleteWorkoutPlan,
    startWorkoutSession,
    updateSessionExercises,
    completeWorkoutSession,
    resetWorkoutSession,
    addExerciseSet,
    updateExerciseSet,
    getExercisesByMuscleGroup,
    getWorkoutPlanDays,
    getTodayWorkout,
    getWorkoutForDate
  };

  return (
    <GymContext.Provider value={value}>
      {children}
    </GymContext.Provider>
  );
};