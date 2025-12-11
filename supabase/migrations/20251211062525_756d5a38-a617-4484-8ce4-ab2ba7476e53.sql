-- Add with_trainer column to workout_sessions table
ALTER TABLE public.workout_sessions 
ADD COLUMN with_trainer boolean DEFAULT false;