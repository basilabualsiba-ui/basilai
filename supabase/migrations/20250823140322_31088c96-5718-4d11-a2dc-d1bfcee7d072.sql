-- Create meals with calculated nutritional information
INSERT INTO public.meals (name, meal_type, total_calories, total_protein, total_carbs, total_fat, default_time, description) VALUES 
('Breakfast 1 - Fried Eggs & Toast', 'breakfast', 515, 34, 30, 27, '07:00:00', '4 fried eggs with olive oil and 2 whole wheat toast slices'),
('Breakfast 2 - Boiled Eggs & Potato', 'breakfast', 519, 32, 40, 25, '07:00:00', '4 boiled eggs with thyme, boiled potato and olive oil'),
('Lunch 1 - Rice & Chicken', 'lunch', 443, 51, 42, 6, '10:00:00', 'White rice with grilled chicken breast'),
('Lunch 2 - Potato & Fish', 'lunch', 338, 35, 43, 3, '10:00:00', 'Boiled potato with grilled fish'),
('Lunch 3 - Rice & Red Meat', 'lunch', 465, 42, 42, 12, '10:00:00', 'White rice with grilled red meat'),
('Pre-Workout Snack', 'snack', 84, 1, 21, 0, NULL, '3 dates and black coffee for energy'),
('Post-Workout Dinner', 'dinner', 558, 42, 87, 5, NULL, 'Banana, tuna, salad and whole wheat toast'),
('Before Bed Snack', 'snack', 123, 5, 5, 10, NULL, 'Yogurt with almonds for recovery');

-- Get the meal IDs we just created (using the names to find them)
-- Add foods to Breakfast 1 (Fried Eggs & Toast)
INSERT INTO public.meal_foods (meal_id, food_item_id, quantity, unit)
SELECT 
    m.id as meal_id,
    f.id as food_item_id,
    CASE f.name
        WHEN 'Egg' THEN 4
        WHEN 'Olive Oil' THEN 1
        WHEN 'Whole Wheat Toast' THEN 2
    END as quantity,
    CASE f.name
        WHEN 'Egg' THEN 'piece'
        WHEN 'Olive Oil' THEN 'tsp'
        WHEN 'Whole Wheat Toast' THEN 'slice'
    END as unit
FROM public.meals m
CROSS JOIN public.food_items f
WHERE m.name = 'Breakfast 1 - Fried Eggs & Toast'
AND f.name IN ('Egg', 'Olive Oil', 'Whole Wheat Toast');

-- Add foods to Breakfast 2 (Boiled Eggs & Potato)
INSERT INTO public.meal_foods (meal_id, food_item_id, quantity, unit)
SELECT 
    m.id as meal_id,
    f.id as food_item_id,
    CASE f.name
        WHEN 'Egg' THEN 4
        WHEN 'Boiled Potato' THEN 200
        WHEN 'Olive Oil' THEN 1
    END as quantity,
    CASE f.name
        WHEN 'Egg' THEN 'piece'
        WHEN 'Boiled Potato' THEN 'gram'
        WHEN 'Olive Oil' THEN 'tsp'
    END as unit
FROM public.meals m
CROSS JOIN public.food_items f
WHERE m.name = 'Breakfast 2 - Boiled Eggs & Potato'
AND f.name IN ('Egg', 'Boiled Potato', 'Olive Oil');

-- Add foods to Lunch 1 (Rice & Chicken)
INSERT INTO public.meal_foods (meal_id, food_item_id, quantity, unit)
SELECT 
    m.id as meal_id,
    f.id as food_item_id,
    CASE f.name
        WHEN 'White Rice' THEN 150
        WHEN 'Grilled Chicken Breast' THEN 150
    END as quantity,
    'gram' as unit
FROM public.meals m
CROSS JOIN public.food_items f
WHERE m.name = 'Lunch 1 - Rice & Chicken'
AND f.name IN ('White Rice', 'Grilled Chicken Breast');

-- Add foods to Lunch 2 (Potato & Fish)
INSERT INTO public.meal_foods (meal_id, food_item_id, quantity, unit)
SELECT 
    m.id as meal_id,
    f.id as food_item_id,
    CASE f.name
        WHEN 'Boiled Potato' THEN 225
        WHEN 'Grilled Tilapia' THEN 150
    END as quantity,
    'gram' as unit
FROM public.meals m
CROSS JOIN public.food_items f
WHERE m.name = 'Lunch 2 - Potato & Fish'
AND f.name IN ('Boiled Potato', 'Grilled Tilapia');

-- Add foods to Lunch 3 (Rice & Red Meat)
INSERT INTO public.meal_foods (meal_id, food_item_id, quantity, unit)
SELECT 
    m.id as meal_id,
    f.id as food_item_id,
    CASE f.name
        WHEN 'White Rice' THEN 150
        WHEN 'Grilled Beef' THEN 150
    END as quantity,
    'gram' as unit
FROM public.meals m
CROSS JOIN public.food_items f
WHERE m.name = 'Lunch 3 - Rice & Red Meat'
AND f.name IN ('White Rice', 'Grilled Beef');

-- Add foods to Pre-Workout Snack
INSERT INTO public.meal_foods (meal_id, food_item_id, quantity, unit)
SELECT 
    m.id as meal_id,
    f.id as food_item_id,
    CASE f.name
        WHEN 'Dates' THEN 3
        WHEN 'Coffee' THEN 1
    END as quantity,
    CASE f.name
        WHEN 'Dates' THEN 'piece'
        WHEN 'Coffee' THEN 'cup'
    END as unit
FROM public.meals m
CROSS JOIN public.food_items f
WHERE m.name = 'Pre-Workout Snack'
AND f.name IN ('Dates', 'Coffee');

-- Add foods to Post-Workout Dinner
INSERT INTO public.meal_foods (meal_id, food_item_id, quantity, unit)
SELECT 
    m.id as meal_id,
    f.id as food_item_id,
    CASE f.name
        WHEN 'Banana' THEN 1
        WHEN 'Canned Tuna' THEN 120
        WHEN 'Green Salad' THEN 100
        WHEN 'Whole Wheat Toast' THEN 4
    END as quantity,
    CASE f.name
        WHEN 'Banana' THEN 'piece'
        WHEN 'Canned Tuna' THEN 'gram'
        WHEN 'Green Salad' THEN 'gram'
        WHEN 'Whole Wheat Toast' THEN 'slice'
    END as unit
FROM public.meals m
CROSS JOIN public.food_items f
WHERE m.name = 'Post-Workout Dinner'
AND f.name IN ('Banana', 'Canned Tuna', 'Green Salad', 'Whole Wheat Toast');

-- Add foods to Before Bed Snack
INSERT INTO public.meal_foods (meal_id, food_item_id, quantity, unit)
SELECT 
    m.id as meal_id,
    f.id as food_item_id,
    CASE f.name
        WHEN 'Yogurt' THEN 30
        WHEN 'Almond' THEN 15
    END as quantity,
    CASE f.name
        WHEN 'Yogurt' THEN 'ml'
        WHEN 'Almond' THEN 'piece'
    END as unit
FROM public.meals m
CROSS JOIN public.food_items f
WHERE m.name = 'Before Bed Snack'
AND f.name IN ('Yogurt', 'Almond');