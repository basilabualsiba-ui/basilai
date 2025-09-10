-- Delete all food-related data to start fresh
-- Delete in order to respect foreign key relationships

-- Delete meal consumptions first (references meal_plan_meals)
TRUNCATE TABLE meal_consumptions CASCADE;

-- Delete meal plan meals (references meal_plans and meals)
TRUNCATE TABLE meal_plan_meals CASCADE;

-- Delete meal foods (references meals and food_items)
TRUNCATE TABLE meal_foods CASCADE;

-- Delete meal plans
TRUNCATE TABLE meal_plans CASCADE;

-- Delete meals
TRUNCATE TABLE meals CASCADE;

-- Delete food items
TRUNCATE TABLE food_items CASCADE;