-- Add days_of_week column to daily_activities table
ALTER TABLE public.daily_activities 
ADD COLUMN days_of_week INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6,7];

-- Update existing activities to have all days selected by default
UPDATE public.daily_activities 
SET days_of_week = ARRAY[1,2,3,4,5,6,7] 
WHERE days_of_week IS NULL;