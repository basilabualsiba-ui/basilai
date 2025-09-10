-- Update meal_plans table to be day-specific (remove end_date, make start_date the plan date)
ALTER TABLE public.meal_plans DROP COLUMN IF EXISTS end_date;
ALTER TABLE public.meal_plans DROP COLUMN IF EXISTS is_active;
ALTER TABLE public.meal_plans RENAME COLUMN start_date TO plan_date;

-- Update meal_plan_meals table to remove day_of_week (since each plan is for one day)
ALTER TABLE public.meal_plan_meals DROP COLUMN IF EXISTS day_of_week;

-- Add a time field to meal_plan_meals for when the meal should be consumed
ALTER TABLE public.meal_plan_meals ADD COLUMN IF NOT EXISTS meal_time TIME;