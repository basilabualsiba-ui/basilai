-- Make plan_id nullable to support quick workouts without a plan
ALTER TABLE public.workout_sessions 
ALTER COLUMN plan_id DROP NOT NULL;

-- Update the foreign key constraint to allow NULL
ALTER TABLE public.workout_sessions 
DROP CONSTRAINT IF EXISTS workout_sessions_plan_id_fkey;

ALTER TABLE public.workout_sessions
ADD CONSTRAINT workout_sessions_plan_id_fkey 
FOREIGN KEY (plan_id) 
REFERENCES public.workout_plans(id) 
ON DELETE SET NULL;