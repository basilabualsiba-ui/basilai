-- Create RLS policies for anonymous access to gym-related tables
-- This allows the app to work without authentication for now

-- Workouts table policies
CREATE POLICY "Allow anonymous access to workouts" 
ON public.workouts 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Exercises table policies  
CREATE POLICY "Allow anonymous access to exercises"
ON public.exercises
FOR ALL
USING (true)  
WITH CHECK (true);

-- Muscle groups table policies
CREATE POLICY "Allow anonymous access to muscle_groups"
ON public.muscle_groups
FOR ALL
USING (true)
WITH CHECK (true);

-- Workout plans table policies
CREATE POLICY "Allow anonymous access to workout_plans"
ON public.workout_plans
FOR ALL
USING (true)
WITH CHECK (true);

-- Workout plan days table policies
CREATE POLICY "Allow anonymous access to workout_plan_days"
ON public.workout_plan_days
FOR ALL
USING (true)
WITH CHECK (true);

-- Workout sessions table policies
CREATE POLICY "Allow anonymous access to workout_sessions"
ON public.workout_sessions
FOR ALL
USING (true)
WITH CHECK (true);

-- Exercise sets table policies
CREATE POLICY "Allow anonymous access to exercise_sets"
ON public.exercise_sets
FOR ALL
USING (true)
WITH CHECK (true);

-- Workout exercises table policies
CREATE POLICY "Allow anonymous access to workout_exercises"
ON public.workout_exercises
FOR ALL
USING (true)
WITH CHECK (true);

-- Plan workouts table policies
CREATE POLICY "Allow anonymous access to plan_workouts"
ON public.plan_workouts
FOR ALL
USING (true)
WITH CHECK (true);