-- Clean up orphaned data before adding foreign keys

-- Remove meal_plan_meals records that reference non-existent meal_plans
DELETE FROM meal_plan_meals 
WHERE meal_plan_id NOT IN (SELECT id FROM meal_plans);

-- Remove meal_plan_meals records that reference non-existent meals
DELETE FROM meal_plan_meals 
WHERE meal_id NOT IN (SELECT id FROM meals);

-- Remove meal_foods records that reference non-existent meals
DELETE FROM meal_foods 
WHERE meal_id NOT IN (SELECT id FROM meals);

-- Remove meal_foods records that reference non-existent food_items
DELETE FROM meal_foods 
WHERE food_item_id NOT IN (SELECT id FROM food_items);

-- Now add the foreign key constraints
ALTER TABLE meal_plan_meals 
ADD CONSTRAINT fk_meal_plan_meals_meal_id 
FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE;

ALTER TABLE meal_plan_meals 
ADD CONSTRAINT fk_meal_plan_meals_meal_plan_id 
FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id) ON DELETE CASCADE;

ALTER TABLE meal_foods 
ADD CONSTRAINT fk_meal_foods_meal_id 
FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE;

ALTER TABLE meal_foods 
ADD CONSTRAINT fk_meal_foods_food_item_id 
FOREIGN KEY (food_item_id) REFERENCES food_items(id) ON DELETE CASCADE;