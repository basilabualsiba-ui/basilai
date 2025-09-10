-- Create prayer_times table
CREATE TABLE public.prayer_times (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  fajr TIME NOT NULL,
  dhuhr TIME NOT NULL,
  asr TIME NOT NULL,
  maghrib TIME NOT NULL,
  isha TIME NOT NULL,
  sunrise TIME,
  sunset TIME,
  city TEXT,
  country TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prayer_times ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Prayer times are viewable by everyone" 
ON public.prayer_times 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert prayer times" 
ON public.prayer_times 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update prayer times" 
ON public.prayer_times 
FOR UPDATE 
USING (true);

-- Add trigger for timestamps
CREATE TRIGGER update_prayer_times_updated_at
BEFORE UPDATE ON public.prayer_times
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_prayer_times_date ON public.prayer_times(date);

-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;