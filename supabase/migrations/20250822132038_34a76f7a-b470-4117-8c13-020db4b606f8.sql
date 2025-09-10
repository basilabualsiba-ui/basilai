-- Create food_items table for individual food items with nutrition info
CREATE TABLE public.food_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  brand TEXT,
  serving_size TEXT,
  serving_unit TEXT DEFAULT 'gram',
  calories_per_serving NUMERIC DEFAULT 0,
  protein_per_serving NUMERIC DEFAULT 0,
  carbs_per_serving NUMERIC DEFAULT 0,
  fat_per_serving NUMERIC DEFAULT 0,
  fiber_per_serving NUMERIC DEFAULT 0,
  sugar_per_serving NUMERIC DEFAULT 0,
  sodium_per_serving NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create meals table to group food items together
CREATE TABLE public.meals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  meal_type TEXT DEFAULT 'main', -- breakfast, lunch, dinner, snack, main
  total_calories NUMERIC DEFAULT 0,
  total_protein NUMERIC DEFAULT 0,
  total_carbs NUMERIC DEFAULT 0,
  total_fat NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create meal_foods table to link foods to meals (many-to-many)
CREATE TABLE public.meal_foods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_id UUID NOT NULL,
  food_item_id UUID NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'serving',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create meal_plans table for daily meal planning
CREATE TABLE public.meal_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create meal_plan_meals table to schedule meals in plans
CREATE TABLE public.meal_plan_meals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_plan_id UUID NOT NULL,
  meal_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL, -- 0=Sunday, 1=Monday, etc.
  scheduled_time TIME,
  meal_order INTEGER DEFAULT 1, -- for multiple meals at same time
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plan_meals ENABLE ROW LEVEL SECURITY;

-- Create policies for food_items
CREATE POLICY "Food items are viewable by everyone" 
ON public.food_items 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create food items" 
ON public.food_items 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update food items" 
ON public.food_items 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete food items" 
ON public.food_items 
FOR DELETE 
USING (true);

-- Create policies for meals
CREATE POLICY "Meals are viewable by everyone" 
ON public.meals 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create meals" 
ON public.meals 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update meals" 
ON public.meals 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete meals" 
ON public.meals 
FOR DELETE 
USING (true);

-- Create policies for meal_foods
CREATE POLICY "Meal foods are viewable by everyone" 
ON public.meal_foods 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create meal foods" 
ON public.meal_foods 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update meal foods" 
ON public.meal_foods 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete meal foods" 
ON public.meal_foods 
FOR DELETE 
USING (true);

-- Create policies for meal_plans
CREATE POLICY "Meal plans are viewable by everyone" 
ON public.meal_plans 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create meal plans" 
ON public.meal_plans 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update meal plans" 
ON public.meal_plans 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete meal plans" 
ON public.meal_plans 
FOR DELETE 
USING (true);

-- Create policies for meal_plan_meals
CREATE POLICY "Meal plan meals are viewable by everyone" 
ON public.meal_plan_meals 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create meal plan meals" 
ON public.meal_plan_meals 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update meal plan meals" 
ON public.meal_plan_meals 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete meal plan meals" 
ON public.meal_plan_meals 
FOR DELETE 
USING (true);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_food_items_updated_at
BEFORE UPDATE ON public.food_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meals_updated_at
BEFORE UPDATE ON public.meals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meal_foods_updated_at
BEFORE UPDATE ON public.meal_foods
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meal_plans_updated_at
BEFORE UPDATE ON public.meal_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meal_plan_meals_updated_at
BEFORE UPDATE ON public.meal_plan_meals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX idx_meal_foods_meal_id ON public.meal_foods(meal_id);
CREATE INDEX idx_meal_foods_food_item_id ON public.meal_foods(food_item_id);
CREATE INDEX idx_meal_plan_meals_plan_id ON public.meal_plan_meals(meal_plan_id);
CREATE INDEX idx_meal_plan_meals_meal_id ON public.meal_plan_meals(meal_id);
CREATE INDEX idx_meal_plan_meals_day_time ON public.meal_plan_meals(day_of_week, scheduled_time);