-- Fix the incorrect quantity for Orange Juice in Breakfast meal
-- Orange juice should be 1 serving (250ml), not 200 grams
UPDATE meal_foods 
SET quantity = 1, unit = 'serving'
WHERE food_item_id = (SELECT id FROM food_items WHERE name = 'Orange Juice, fresh')
AND meal_id = (SELECT id FROM meals WHERE name = 'Breakfast');

-- Fix Olive Oil quantity - should be 1 serving (1 tbsp), not 2
UPDATE meal_foods 
SET quantity = 1
WHERE food_item_id = (SELECT id FROM food_items WHERE name = 'Olive Oil')
AND meal_id = (SELECT id FROM meals WHERE name = 'Breakfast');