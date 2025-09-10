-- Create currency_ratios table
CREATE TABLE public.currency_ratios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate NUMERIC(10, 6) NOT NULL,
  is_live BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(from_currency, to_currency)
);

-- Enable RLS
ALTER TABLE public.currency_ratios ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Currency ratios are viewable by everyone" 
ON public.currency_ratios 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create currency ratios" 
ON public.currency_ratios 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update currency ratios" 
ON public.currency_ratios 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete currency ratios" 
ON public.currency_ratios 
FOR DELETE 
USING (true);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_currency_ratios_updated_at
BEFORE UPDATE ON public.currency_ratios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default currency ratios (these will be the base rates from ILS)
INSERT INTO public.currency_ratios (from_currency, to_currency, rate) VALUES
-- ILS as base currency
('ILS', 'USD', 0.27),
('ILS', 'EUR', 0.25),
('ILS', 'JOD', 0.19),
('ILS', 'TL', 9.50),
-- USD conversions
('USD', 'ILS', 3.70),
('USD', 'EUR', 0.92),
('USD', 'JOD', 0.71),
('USD', 'TL', 35.20),
-- EUR conversions
('EUR', 'ILS', 4.00),
('EUR', 'USD', 1.08),
('EUR', 'JOD', 0.77),
('EUR', 'TL', 38.00),
-- JOD conversions
('JOD', 'ILS', 5.20),
('JOD', 'USD', 1.41),
('JOD', 'EUR', 1.30),
('JOD', 'TL', 49.50),
-- TL conversions
('TL', 'ILS', 0.105),
('TL', 'USD', 0.028),
('TL', 'EUR', 0.026),
('TL', 'JOD', 0.020);