-- Add start_time and end_time columns to workout_plan_days
ALTER TABLE public.workout_plan_days
  ADD COLUMN IF NOT EXISTS start_time TIME WITHOUT TIME ZONE,
  ADD COLUMN IF NOT EXISTS end_time TIME WITHOUT TIME ZONE;