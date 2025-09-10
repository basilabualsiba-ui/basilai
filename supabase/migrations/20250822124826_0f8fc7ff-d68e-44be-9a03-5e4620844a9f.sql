-- Create table for tracking user body stats (weight, height)
CREATE TABLE public.user_body_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  weight NUMERIC(5,2) NOT NULL,
  height NUMERIC(5,2) NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_body_stats ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Body stats are viewable by everyone" 
ON public.user_body_stats 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create body stats" 
ON public.user_body_stats 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update body stats" 
ON public.user_body_stats 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete body stats" 
ON public.user_body_stats 
FOR DELETE 
USING (true);

-- Add trigger for timestamps
CREATE TRIGGER update_user_body_stats_updated_at
BEFORE UPDATE ON public.user_body_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();