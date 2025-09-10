-- Clear existing muscle groups and add all the anatomical muscle groups
DELETE FROM muscle_groups;

-- Insert all muscle groups with their anatomical representations
INSERT INTO muscle_groups (name, icon, color) VALUES
('Chest', '💪', '#ff6b6b'),
('Back', '🏋️', '#4ecdc4'),
('Biceps', '💪', '#45b7d1'),
('Triceps', '🏋️‍♂️', '#96ceb4'),
('Shoulders', '🤸', '#feca57'),
('Abs', '🎯', '#ff9ff3'),
('Quadriceps', '🦵', '#54a0ff'),
('Hamstrings', '🦵', '#5f27cd'),
('Glutes', '🍑', '#00d2d3'),
('Calves', '🦵', '#ff6348'),
('Forearms', '💪', '#2ed573'),
('Trapezius', '🏔️', '#a55eea'),
('Neck', '🗣️', '#26de81'),
('Adductors', '🦵', '#fd79a8'),
('Abductors', '🦵', '#fdcb6e'),
('Lower Back', '🏋️', '#e17055');