-- Fix the photo_url paths to use proper import references
-- Since we're using imported images, we'll set photo_url to null and rely on the fallback images
UPDATE public.muscle_groups SET photo_url = NULL;