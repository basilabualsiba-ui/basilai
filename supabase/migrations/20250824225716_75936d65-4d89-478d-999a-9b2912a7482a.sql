-- Create workouts table
CREATE TABLE IF NOT EXISTS public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  muscle_groups TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create workout_exercises table
CREATE TABLE IF NOT EXISTS public.workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE RESTRICT,
  order_index INTEGER NOT NULL DEFAULT 1,
  sets INTEGER,
  reps INTEGER,
  weight NUMERIC,
  rest_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create plan_workouts table (mapping workouts to workout_plans by day)
CREATE TABLE IF NOT EXISTS public.plan_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_workouts ENABLE ROW LEVEL SECURITY;

-- Policies (match existing open-access style in project)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workouts' AND policyname = 'Workouts are viewable by everyone'
  ) THEN
    CREATE POLICY "Workouts are viewable by everyone" ON public.workouts FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workouts' AND policyname = 'Anyone can create workouts'
  ) THEN
    CREATE POLICY "Anyone can create workouts" ON public.workouts FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workouts' AND policyname = 'Anyone can update workouts'
  ) THEN
    CREATE POLICY "Anyone can update workouts" ON public.workouts FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workouts' AND policyname = 'Anyone can delete workouts'
  ) THEN
    CREATE POLICY "Anyone can delete workouts" ON public.workouts FOR DELETE USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workout_exercises' AND policyname = 'Workout exercises are viewable by everyone'
  ) THEN
    CREATE POLICY "Workout exercises are viewable by everyone" ON public.workout_exercises FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workout_exercises' AND policyname = 'Anyone can create workout exercises'
  ) THEN
    CREATE POLICY "Anyone can create workout exercises" ON public.workout_exercises FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workout_exercises' AND policyname = 'Anyone can update workout exercises'
  ) THEN
    CREATE POLICY "Anyone can update workout exercises" ON public.workout_exercises FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workout_exercises' AND policyname = 'Anyone can delete workout exercises'
  ) THEN
    CREATE POLICY "Anyone can delete workout exercises" ON public.workout_exercises FOR DELETE USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'plan_workouts' AND policyname = 'Plan workouts are viewable by everyone'
  ) THEN
    CREATE POLICY "Plan workouts are viewable by everyone" ON public.plan_workouts FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'plan_workouts' AND policyname = 'Anyone can create plan workouts'
  ) THEN
    CREATE POLICY "Anyone can create plan workouts" ON public.plan_workouts FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'plan_workouts' AND policyname = 'Anyone can update plan workouts'
  ) THEN
    CREATE POLICY "Anyone can update plan workouts" ON public.plan_workouts FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'plan_workouts' AND policyname = 'Anyone can delete plan workouts'
  ) THEN
    CREATE POLICY "Anyone can delete plan workouts" ON public.plan_workouts FOR DELETE USING (true);
  END IF;
END $$;

-- Triggers to keep updated_at fresh
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_workouts_updated_at'
  ) THEN
    CREATE TRIGGER update_workouts_updated_at
    BEFORE UPDATE ON public.workouts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_workout_exercises_updated_at'
  ) THEN
    CREATE TRIGGER update_workout_exercises_updated_at
    BEFORE UPDATE ON public.workout_exercises
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_plan_workouts_updated_at'
  ) THEN
    CREATE TRIGGER update_plan_workouts_updated_at
    BEFORE UPDATE ON public.plan_workouts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id_order ON public.workout_exercises(workout_id, order_index);
CREATE INDEX IF NOT EXISTS idx_plan_workouts_plan_day ON public.plan_workouts(plan_id, day_of_week);
