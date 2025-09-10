-- Insert common food items into the database
INSERT INTO public.food_items (name, serving_size, serving_unit, calories_per_serving, protein_per_serving, fat_per_serving, carbs_per_serving, fiber_per_serving, description) VALUES 
('Egg', '1 large', 'piece', 80, 7, 5, 0.5, 0, 'Large egg (~50g)'),
('Olive Oil', '1 tsp', 'ml', 45, 0, 5, 0, 0, '1 teaspoon (5ml)'),
('Whole Wheat Toast', '1 slice', 'slice', 75, 3, 1, 14, 2, 'One slice (~35g)'),
('Boiled Potato', '100', 'gram', 77, 2, 0, 19, 0, 'Boiled potato (100g)'),
('White Rice', '100', 'gram', 130, 2.7, 0.3, 28, 0, 'Cooked white rice (100g)'),
('Grilled Chicken Breast', '100', 'gram', 165, 31, 3.6, 0, 0, 'Grilled chicken breast (100g)'),
('Grilled Beef', '100', 'gram', 180, 25, 8, 0, 0, 'Grilled red meat/beef (100g)'),
('Grilled Salmon', '100', 'gram', 190, 20, 12, 0, 0, 'Grilled salmon (100g)'),
('Grilled Tilapia', '100', 'gram', 110, 20, 2, 0, 0, 'Grilled tilapia (100g)'),
('Dates', '1 piece', 'piece', 27, 0.3, 0, 7, 0, 'One date (~10g)'),
('Coffee', '1 cup', 'cup', 3, 0, 0, 0, 0, 'Black coffee without sugar'),
('Banana', '1 medium', 'piece', 105, 1.3, 0.3, 27, 0, 'Medium banana (~120g)'),
('Canned Tuna', '120', 'gram', 130, 28, 1, 0, 0, 'Canned tuna (120g)'),
('Green Salad', '100', 'gram', 23, 1, 0, 4, 0, 'Mixed green salad (100g)'),
('Yogurt', '100', 'ml', 60, 3.5, 3, 5, 0, 'Plain yogurt (100ml)'),
('Almond', '1 piece', 'piece', 7, 0.25, 0.6, 0.25, 0, 'One almond (~1.2g)'),
('Walnut', '1 half', 'piece', 13, 0.3, 1.3, 0.3, 0, 'One walnut half (~2g)');