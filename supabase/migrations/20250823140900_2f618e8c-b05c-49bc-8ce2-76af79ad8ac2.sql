-- Create user preferences table for sleep and workout schedules
CREATE TABLE IF NOT EXISTS public.user_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  sleep_time TIME NOT NULL DEFAULT '23:00:00',
  wake_time TIME NOT NULL DEFAULT '07:00:00',
  workout_time TIME,
  workout_duration_minutes INTEGER DEFAULT 60,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_schedules ENABLE ROW LEVEL SECURITY;

-- Create policies for user schedules (allowing access to everyone for now, can be restricted later)
CREATE POLICY "Anyone can view user schedules" 
ON public.user_schedules 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create user schedules" 
ON public.user_schedules 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update user schedules" 
ON public.user_schedules 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete user schedules" 
ON public.user_schedules 
FOR DELETE 
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_user_schedules_updated_at
BEFORE UPDATE ON public.user_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default schedule
INSERT INTO public.user_schedules (sleep_time, wake_time, workout_time, workout_duration_minutes) 
VALUES ('23:00:00', '07:00:00', '18:00:00', 60);

-- Update meal default times to be calculated based on schedule
UPDATE public.meals 
SET 
  default_time = CASE 
    WHEN name LIKE '%Before Bed%' THEN '22:00:00'  -- 1 hour before default sleep time
    WHEN name LIKE '%Pre-Workout%' THEN '17:45:00'  -- 15 min before default workout
    WHEN name LIKE '%Post-Workout%' THEN '19:00:00'  -- Right after default workout
    ELSE default_time
  END
WHERE name IN ('Before Bed Snack', 'Pre-Workout Snack', 'Post-Workout Dinner');