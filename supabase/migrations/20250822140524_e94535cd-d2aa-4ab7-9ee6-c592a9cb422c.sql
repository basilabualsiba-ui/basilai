-- Add new columns to meal_plans table to support recurring plans
ALTER TABLE public.meal_plans 
ADD COLUMN start_date date,
ADD COLUMN end_date date,
ADD COLUMN is_active boolean DEFAULT true,
ADD COLUMN day_of_week integer;

-- Update existing meal_plans to have start_date and end_date based on plan_date
UPDATE public.meal_plans 
SET start_date = plan_date, 
    end_date = plan_date,
    day_of_week = EXTRACT(DOW FROM plan_date);

-- Make start_date required (not null)
ALTER TABLE public.meal_plans 
ALTER COLUMN start_date SET NOT NULL;

-- Add day_of_week column to meal_plan_meals table for better querying
ALTER TABLE public.meal_plan_meals 
ADD COLUMN day_of_week integer;

-- Update existing meal_plan_meals with day_of_week from their meal_plans
UPDATE public.meal_plan_meals 
SET day_of_week = (
  SELECT EXTRACT(DOW FROM plan_date) 
  FROM public.meal_plans 
  WHERE meal_plans.id = meal_plan_meals.meal_plan_id
);

-- Add default time field to meals table for automatic time assignment
ALTER TABLE public.meals 
ADD COLUMN default_time time without time zone;