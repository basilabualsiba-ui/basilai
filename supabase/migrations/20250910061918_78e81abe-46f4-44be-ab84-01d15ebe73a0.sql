-- Add side muscle groups column to exercises table
ALTER TABLE public.exercises 
ADD COLUMN side_muscle_groups TEXT[] DEFAULT ARRAY[]::TEXT[];