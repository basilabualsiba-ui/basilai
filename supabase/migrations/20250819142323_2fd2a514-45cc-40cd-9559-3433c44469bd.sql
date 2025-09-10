-- Create muscle groups table
CREATE TABLE public.muscle_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT '💪',
  color TEXT NOT NULL DEFAULT '#ff7f00',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.muscle_groups ENABLE ROW LEVEL SECURITY;

-- Create policies for muscle groups
CREATE POLICY "Muscle groups are viewable by everyone" 
ON public.muscle_groups 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create muscle groups" 
ON public.muscle_groups 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update muscle groups" 
ON public.muscle_groups 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete muscle groups" 
ON public.muscle_groups 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_muscle_groups_updated_at
BEFORE UPDATE ON public.muscle_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default muscle groups
INSERT INTO public.muscle_groups (name, icon, color) VALUES
('Chest', '💪', '#ff6b6b'),
('Back', '🏋️', '#4ecdc4'),
('Shoulders', '🤸', '#45b7d1'),
('Arms', '💪', '#96ceb4'),
('Legs', '🦵', '#feca57'),
('Core', '🏃', '#ff9ff3'),
('Full Body', '🏋️‍♂️', '#54a0ff'),
('Cardio', '❤️', '#ee5a24');