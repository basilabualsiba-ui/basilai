-- Create supplements table
CREATE TABLE public.supplements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  dose_unit TEXT NOT NULL DEFAULT 'scoop',
  total_doses NUMERIC NOT NULL DEFAULT 0,
  remaining_doses NUMERIC NOT NULL DEFAULT 0,
  warning_threshold NUMERIC NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create supplement_logs table for tracking daily intake
CREATE TABLE public.supplement_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplement_id UUID NOT NULL REFERENCES public.supplements(id) ON DELETE CASCADE,
  doses_taken NUMERIC NOT NULL DEFAULT 1,
  logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
  logged_time TIME WITHOUT TIME ZONE DEFAULT CURRENT_TIME,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.supplements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplement_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for supplements
CREATE POLICY "Supplements are viewable by everyone" ON public.supplements FOR SELECT USING (true);
CREATE POLICY "Anyone can create supplements" ON public.supplements FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update supplements" ON public.supplements FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete supplements" ON public.supplements FOR DELETE USING (true);

-- RLS policies for supplement_logs
CREATE POLICY "Supplement logs are viewable by everyone" ON public.supplement_logs FOR SELECT USING (true);
CREATE POLICY "Anyone can create supplement logs" ON public.supplement_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update supplement logs" ON public.supplement_logs FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete supplement logs" ON public.supplement_logs FOR DELETE USING (true);

-- Create updated_at trigger for supplements
CREATE TRIGGER update_supplements_updated_at
  BEFORE UPDATE ON public.supplements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for supplement_logs
CREATE TRIGGER update_supplement_logs_updated_at
  BEFORE UPDATE ON public.supplement_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();