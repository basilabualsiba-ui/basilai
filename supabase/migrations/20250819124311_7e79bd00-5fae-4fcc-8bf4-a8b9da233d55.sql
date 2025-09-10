-- Create exercises table
CREATE TABLE public.exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  instructions TEXT,
  difficulty_level TEXT DEFAULT 'beginner',
  equipment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workout_plans table
CREATE TABLE public.workout_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workout_plan_days table
CREATE TABLE public.workout_plan_days (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1=Monday, 7=Sunday
  muscle_groups TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(plan_id, day_of_week)
);

-- Create workout_sessions table
CREATE TABLE public.workout_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  total_duration_minutes INTEGER,
  notes TEXT,
  muscle_groups TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create exercise_sets table
CREATE TABLE public.exercise_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  weight NUMERIC(6,2),
  reps INTEGER,
  rest_seconds INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_sets ENABLE ROW LEVEL SECURITY;

-- Create policies for exercises (public read, anyone can manage)
CREATE POLICY "Exercises are viewable by everyone" 
ON public.exercises FOR SELECT USING (true);

CREATE POLICY "Anyone can create exercises" 
ON public.exercises FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update exercises" 
ON public.exercises FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete exercises" 
ON public.exercises FOR DELETE USING (true);

-- Create policies for workout_plans
CREATE POLICY "Workout plans are viewable by everyone" 
ON public.workout_plans FOR SELECT USING (true);

CREATE POLICY "Anyone can create workout plans" 
ON public.workout_plans FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update workout plans" 
ON public.workout_plans FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete workout plans" 
ON public.workout_plans FOR DELETE USING (true);

-- Create policies for workout_plan_days
CREATE POLICY "Workout plan days are viewable by everyone" 
ON public.workout_plan_days FOR SELECT USING (true);

CREATE POLICY "Anyone can create workout plan days" 
ON public.workout_plan_days FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update workout plan days" 
ON public.workout_plan_days FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete workout plan days" 
ON public.workout_plan_days FOR DELETE USING (true);

-- Create policies for workout_sessions
CREATE POLICY "Workout sessions are viewable by everyone" 
ON public.workout_sessions FOR SELECT USING (true);

CREATE POLICY "Anyone can create workout sessions" 
ON public.workout_sessions FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update workout sessions" 
ON public.workout_sessions FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete workout sessions" 
ON public.workout_sessions FOR DELETE USING (true);

-- Create policies for exercise_sets
CREATE POLICY "Exercise sets are viewable by everyone" 
ON public.exercise_sets FOR SELECT USING (true);

CREATE POLICY "Anyone can create exercise sets" 
ON public.exercise_sets FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update exercise sets" 
ON public.exercise_sets FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete exercise sets" 
ON public.exercise_sets FOR DELETE USING (true);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_exercises_updated_at
BEFORE UPDATE ON public.exercises
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workout_plans_updated_at
BEFORE UPDATE ON public.workout_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workout_plan_days_updated_at
BEFORE UPDATE ON public.workout_plan_days
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workout_sessions_updated_at
BEFORE UPDATE ON public.workout_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exercise_sets_updated_at
BEFORE UPDATE ON public.exercise_sets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample muscle groups and exercises
INSERT INTO public.exercises (name, muscle_group, instructions, equipment) VALUES
('Bench Press', 'Chest', 'Lie on bench, press weight up from chest level', 'Barbell'),
('Push-ups', 'Chest', 'Start in plank position, lower body to ground and push up', 'Bodyweight'),
('Squats', 'Legs', 'Stand with feet shoulder-width apart, lower body as if sitting', 'Bodyweight'),
('Deadlift', 'Back', 'Lift barbell from ground to hip level with straight back', 'Barbell'),
('Pull-ups', 'Back', 'Hang from bar, pull body up until chin over bar', 'Pull-up bar'),
('Shoulder Press', 'Shoulders', 'Press weight overhead from shoulder level', 'Dumbbells'),
('Bicep Curls', 'Arms', 'Curl weight from extended arm to shoulder level', 'Dumbbells'),
('Tricep Dips', 'Arms', 'Lower and raise body using tricep strength', 'Dip bars'),
('Plank', 'Core', 'Hold body in straight line from head to toes', 'Bodyweight'),
('Crunches', 'Core', 'Lie on back, lift shoulders toward knees', 'Bodyweight');