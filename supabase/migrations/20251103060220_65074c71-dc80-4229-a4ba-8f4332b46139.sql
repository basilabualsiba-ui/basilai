-- Add movement_type field to exercises table
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS movement_type text DEFAULT 'none' CHECK (movement_type IN ('push', 'pull', 'none'));