ALTER TABLE episodes ADD COLUMN IF NOT EXISTS air_date date;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS user_rating integer;
ALTER TABLE media ADD COLUMN IF NOT EXISTS user_rating integer;