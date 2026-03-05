CREATE TABLE IF NOT EXISTS public.games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rawg_id INTEGER NOT NULL,
  slug TEXT,
  name TEXT NOT NULL,
  image TEXT,
  genres TEXT[] NOT NULL DEFAULT '{}'::text[],
  platform TEXT NOT NULL,
  project_link TEXT,
  user_price_ils NUMERIC NOT NULL DEFAULT 0,
  rating NUMERIC,
  date_added TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(rawg_id, platform)
);

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Games are viewable by everyone"
ON public.games
FOR SELECT
USING (true);

CREATE POLICY "Anyone can create games"
ON public.games
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update games"
ON public.games
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete games"
ON public.games
FOR DELETE
USING (true);

CREATE INDEX IF NOT EXISTS idx_games_platform ON public.games(platform);
CREATE INDEX IF NOT EXISTS idx_games_rawg_id ON public.games(rawg_id);
CREATE INDEX IF NOT EXISTS idx_games_date_added ON public.games(date_added DESC);

CREATE TRIGGER update_games_updated_at
BEFORE UPDATE ON public.games
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();