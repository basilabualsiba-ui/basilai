-- Create table for workout music playlists
CREATE TABLE public.workout_playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for YouTube music tracks
CREATE TABLE public.youtube_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL REFERENCES public.workout_playlists(id) ON DELETE CASCADE,
  youtube_id TEXT NOT NULL, -- YouTube video ID
  title TEXT NOT NULL, -- YouTube video title
  channel_name TEXT, -- YouTube channel name
  duration INTEGER, -- Duration in seconds
  thumbnail_url TEXT, -- YouTube thumbnail URL
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.workout_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_tracks ENABLE ROW LEVEL SECURITY;

-- Create policies for workout_playlists (public access for demo)
CREATE POLICY "Public can view workout playlists" 
ON public.workout_playlists 
FOR SELECT 
USING (true);

CREATE POLICY "Public can create workout playlists" 
ON public.workout_playlists 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Public can update workout playlists" 
ON public.workout_playlists 
FOR UPDATE 
USING (true);

CREATE POLICY "Public can delete workout playlists" 
ON public.workout_playlists 
FOR DELETE 
USING (true);

-- Create policies for youtube_tracks (public access for demo)
CREATE POLICY "Public can view youtube tracks" 
ON public.youtube_tracks 
FOR SELECT 
USING (true);

CREATE POLICY "Public can create youtube tracks" 
ON public.youtube_tracks 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Public can update youtube tracks" 
ON public.youtube_tracks 
FOR UPDATE 
USING (true);

CREATE POLICY "Public can delete youtube tracks" 
ON public.youtube_tracks 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_workout_playlists_updated_at
BEFORE UPDATE ON public.workout_playlists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_youtube_tracks_updated_at
BEFORE UPDATE ON public.youtube_tracks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert a default playlist
INSERT INTO public.workout_playlists (name, description, is_default) 
VALUES ('Default Workout Playlist', 'Your main workout music playlist', true);