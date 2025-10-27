-- Create exercise alternatives table (many-to-many relationship)
CREATE TABLE public.exercise_alternatives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exercise_id UUID NOT NULL,
  alternative_exercise_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(exercise_id, alternative_exercise_id)
);

-- Enable RLS
ALTER TABLE public.exercise_alternatives ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view exercise alternatives"
  ON public.exercise_alternatives
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create exercise alternatives"
  ON public.exercise_alternatives
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can delete exercise alternatives"
  ON public.exercise_alternatives
  FOR DELETE
  USING (true);

-- Create index for better query performance
CREATE INDEX idx_exercise_alternatives_exercise_id ON public.exercise_alternatives(exercise_id);
CREATE INDEX idx_exercise_alternatives_alternative_id ON public.exercise_alternatives(alternative_exercise_id);