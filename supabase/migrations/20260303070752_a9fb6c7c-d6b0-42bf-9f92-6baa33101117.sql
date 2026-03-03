
CREATE TABLE public.media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_id integer NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  poster_url text,
  rating numeric,
  runtime integer,
  total_seasons integer,
  genres text[] DEFAULT '{}',
  trailer_url text,
  status text DEFAULT 'want_to_watch',
  created_at timestamptz DEFAULT now(),
  UNIQUE(tmdb_id, type)
);

ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on media" ON public.media FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id uuid REFERENCES public.media(id) ON DELETE CASCADE NOT NULL,
  season_number integer NOT NULL,
  episode_number integer NOT NULL,
  title text,
  watched boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(series_id, season_number, episode_number)
);

ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on episodes" ON public.episodes FOR ALL USING (true) WITH CHECK (true);
