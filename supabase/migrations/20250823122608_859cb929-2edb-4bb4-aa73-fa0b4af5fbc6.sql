-- Delete all data from food and exercise related tables
-- Order matters due to dependencies between tables

-- Delete food-related data (dependent tables first)
DELETE FROM meal_consumptions;
DELETE FROM meal_foods;
DELETE FROM meal_plan_meals;
DELETE FROM meal_plans;
DELETE FROM meals;
DELETE FROM food_items;

-- Delete exercise-related data (dependent tables first)
DELETE FROM exercise_sets;
DELETE FROM workout_sessions;
DELETE FROM plan_workouts;
DELETE FROM workout_exercises;
DELETE FROM workout_plan_days;
DELETE FROM workout_plans;
DELETE FROM workouts;
DELETE FROM exercises;
DELETE FROM muscle_groups;