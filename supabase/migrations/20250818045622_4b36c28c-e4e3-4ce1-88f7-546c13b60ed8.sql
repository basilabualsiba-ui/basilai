-- Add time field to transactions table
ALTER TABLE public.transactions 
ADD COLUMN time TIME DEFAULT CURRENT_TIME;