-- Create table to track meal consumption
CREATE TABLE public.meal_consumptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_plan_meal_id UUID NOT NULL,
  consumed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.meal_consumptions ENABLE ROW LEVEL SECURITY;

-- Create policies for meal consumptions
CREATE POLICY "Anyone can view meal consumptions" 
ON public.meal_consumptions 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create meal consumptions" 
ON public.meal_consumptions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update meal consumptions" 
ON public.meal_consumptions 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete meal consumptions" 
ON public.meal_consumptions 
FOR DELETE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_meal_consumptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_meal_consumptions_updated_at
  BEFORE UPDATE ON public.meal_consumptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_meal_consumptions_updated_at();