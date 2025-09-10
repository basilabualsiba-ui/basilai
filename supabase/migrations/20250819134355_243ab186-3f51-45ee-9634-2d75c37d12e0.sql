-- Add video and photo fields to exercises table
ALTER TABLE public.exercises 
ADD COLUMN video_url TEXT,
ADD COLUMN photo_url TEXT;