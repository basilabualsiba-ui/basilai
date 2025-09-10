-- Add location column to subcategories table
ALTER TABLE public.subcategories 
ADD COLUMN location text;