-- Fix security warning by updating the function with proper search_path
CREATE OR REPLACE FUNCTION public.update_meal_consumptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';