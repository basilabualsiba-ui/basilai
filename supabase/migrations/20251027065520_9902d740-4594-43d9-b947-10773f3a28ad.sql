-- Add exercise_ids column to workout_sessions to track exercises in each session
ALTER TABLE workout_sessions 
ADD COLUMN exercise_ids uuid[] DEFAULT ARRAY[]::uuid[];