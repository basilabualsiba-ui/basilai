-- Update meal_plans table to use date ranges properly
ALTER TABLE public.meal_plans ALTER COLUMN plan_date DROP NOT NULL;
ALTER TABLE public.meal_plans ALTER COLUMN plan_date SET DEFAULT NULL;

-- Add index for better performance on date range queries
CREATE INDEX IF NOT EXISTS idx_meal_plans_date_range ON public.meal_plans (start_date, end_date);

-- Update meal_plan_meals to support day_of_week for recurring patterns
ALTER TABLE public.meal_plan_meals ALTER COLUMN day_of_week SET DEFAULT 1;