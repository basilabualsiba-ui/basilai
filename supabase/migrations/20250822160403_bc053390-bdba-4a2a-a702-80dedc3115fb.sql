-- Add foreign key constraints for meal_plan_meals table
ALTER TABLE public.meal_plan_meals 
ADD CONSTRAINT fk_meal_plan_meals_meal_id 
FOREIGN KEY (meal_id) REFERENCES public.meals(id) ON DELETE CASCADE;

ALTER TABLE public.meal_plan_meals 
ADD CONSTRAINT fk_meal_plan_meals_plan_id 
FOREIGN KEY (meal_plan_id) REFERENCES public.meal_plans(id) ON DELETE CASCADE;