-- Create activity_completions table to track completions per date
CREATE TABLE public.activity_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL,
  completion_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(activity_id, completion_date)
);

-- Enable RLS
ALTER TABLE public.activity_completions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Activity completions are viewable by everyone" 
ON public.activity_completions 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create activity completions" 
ON public.activity_completions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can delete activity completions" 
ON public.activity_completions 
FOR DELETE 
USING (true);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_activity_completions_updated_at
BEFORE UPDATE ON public.activity_completions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();