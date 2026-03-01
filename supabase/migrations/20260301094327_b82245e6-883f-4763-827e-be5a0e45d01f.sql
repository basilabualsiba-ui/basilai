
-- New tables for Smart Cooking
CREATE TABLE recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  image text,
  category text NOT NULL DEFAULT 'meal',
  tools text[] DEFAULT '{}',
  total_time integer DEFAULT 0,
  video_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE recipe_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE,
  step_number integer NOT NULL,
  instruction text NOT NULL,
  tool text,
  timer_minutes integer,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE user_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- New tables for Smart Closet
CREATE TABLE clothing_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  image text,
  type text NOT NULL,
  color text,
  pattern text DEFAULT 'plain',
  status text DEFAULT 'closet',
  last_worn timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE saved_outfits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  item_ids uuid[] NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE shopping_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  price numeric,
  is_purchased boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- RLS policies for all new tables (permissive, matching existing app pattern)
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE clothing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on recipes" ON recipes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on recipe_ingredients" ON recipe_ingredients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on recipe_steps" ON recipe_steps FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on user_ingredients" ON user_ingredients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on clothing_items" ON clothing_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on saved_outfits" ON saved_outfits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on shopping_list" ON shopping_list FOR ALL USING (true) WITH CHECK (true);
