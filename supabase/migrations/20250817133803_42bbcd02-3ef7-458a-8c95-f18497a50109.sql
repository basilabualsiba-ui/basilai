-- Add currency field to accounts table
ALTER TABLE public.accounts 
ADD COLUMN currency text NOT NULL DEFAULT 'ILS';

-- Add check constraint for supported currencies
ALTER TABLE public.accounts 
ADD CONSTRAINT check_supported_currency 
CHECK (currency IN ('ILS', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF'));