-- Add photo_url column to muscle_groups table for storing custom images
ALTER TABLE public.muscle_groups 
ADD COLUMN photo_url TEXT;

-- Update muscle groups with image paths that match the uploaded reference images
-- These will reference the existing muscle images in src/assets/muscles/

UPDATE public.muscle_groups 
SET photo_url = '/src/assets/muscles/abductors.png'
WHERE name = 'Abductors';

UPDATE public.muscle_groups 
SET photo_url = '/src/assets/muscles/abs.png'
WHERE name = 'Abs';

UPDATE public.muscle_groups 
SET photo_url = '/src/assets/muscles/adductors.png'
WHERE name = 'Adductors';

UPDATE public.muscle_groups 
SET photo_url = '/src/assets/muscles/back.png'
WHERE name = 'Back';

UPDATE public.muscle_groups 
SET photo_url = '/src/assets/muscles/biceps.png'
WHERE name = 'Biceps';

UPDATE public.muscle_groups 
SET photo_url = '/src/assets/muscles/calves.png'
WHERE name = 'Calves';

UPDATE public.muscle_groups 
SET photo_url = '/src/assets/muscles/chest.png'
WHERE name = 'Chest';

UPDATE public.muscle_groups 
SET photo_url = '/src/assets/muscles/forearms.png'
WHERE name = 'Forearms';

UPDATE public.muscle_groups 
SET photo_url = '/src/assets/muscles/glutes.png'
WHERE name = 'Glutes';

UPDATE public.muscle_groups 
SET photo_url = '/src/assets/muscles/hamstrings.png'
WHERE name = 'Hamstrings';

UPDATE public.muscle_groups 
SET photo_url = '/src/assets/muscles/lower-back.png'
WHERE name = 'Lower Back';

UPDATE public.muscle_groups 
SET photo_url = '/src/assets/muscles/neck.png'
WHERE name = 'Neck';

UPDATE public.muscle_groups 
SET photo_url = '/src/assets/muscles/quadriceps.png'
WHERE name = 'Quadriceps';

UPDATE public.muscle_groups 
SET photo_url = '/src/assets/muscles/shoulders.png'
WHERE name = 'Shoulders';

UPDATE public.muscle_groups 
SET photo_url = '/src/assets/muscles/trapezius.png'
WHERE name = 'Trapezius';

UPDATE public.muscle_groups 
SET photo_url = '/src/assets/muscles/triceps.png'
WHERE name = 'Triceps';