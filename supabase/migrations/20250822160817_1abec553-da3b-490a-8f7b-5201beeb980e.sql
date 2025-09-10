-- Add foreign key constraints for meal relationships

-- Add foreign key from meal_plan_meals to meals
ALTER TABLE meal_plan_meals 
ADD CONSTRAINT fk_meal_plan_meals_meal_id 
FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE;

-- Add foreign key from meal_plan_meals to meal_plans
ALTER TABLE meal_plan_meals 
ADD CONSTRAINT fk_meal_plan_meals_meal_plan_id 
FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id) ON DELETE CASCADE;

-- Add foreign key from meal_foods to meals
ALTER TABLE meal_foods 
ADD CONSTRAINT fk_meal_foods_meal_id 
FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE;

-- Add foreign key from meal_foods to food_items
ALTER TABLE meal_foods 
ADD CONSTRAINT fk_meal_foods_food_item_id 
FOREIGN KEY (food_item_id) REFERENCES food_items(id) ON DELETE CASCADE;