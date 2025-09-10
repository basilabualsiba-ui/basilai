-- Add brand and image embedding columns to clothes table
ALTER TABLE public.clothes 
ADD COLUMN brand text,
ADD COLUMN image_embedding double precision[];