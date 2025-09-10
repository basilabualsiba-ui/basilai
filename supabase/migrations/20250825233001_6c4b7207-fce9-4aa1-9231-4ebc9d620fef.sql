-- Create workout playlists table
CREATE TABLE IF NOT EXISTS workout_playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL DEFAULT 'Default Workout Playlist',
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create YouTube tracks table
CREATE TABLE IF NOT EXISTS youtube_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL REFERENCES workout_playlists(id) ON DELETE CASCADE,
  youtube_id VARCHAR(20) NOT NULL,
  title VARCHAR(500) NOT NULL,
  channel_name VARCHAR(255),
  thumbnail_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(playlist_id, youtube_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_youtube_tracks_playlist_id ON youtube_tracks(playlist_id);
CREATE INDEX IF NOT EXISTS idx_youtube_tracks_order ON youtube_tracks(playlist_id, order_index);
CREATE INDEX IF NOT EXISTS idx_workout_playlists_default ON workout_playlists(is_default);

-- Create update triggers for timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workout_playlists_updated_at
    BEFORE UPDATE ON workout_playlists
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_youtube_tracks_updated_at
    BEFORE UPDATE ON youtube_tracks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default playlist
INSERT INTO workout_playlists (name, description, is_default)
VALUES ('Default Workout Playlist', 'Your main workout music playlist', true)
ON CONFLICT DO NOTHING;

-- Enable Row Level Security
ALTER TABLE workout_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_tracks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allowing all users for now - you can restrict later)
CREATE POLICY "workout_playlists_select_policy" ON workout_playlists
  FOR SELECT USING (true);

CREATE POLICY "workout_playlists_insert_policy" ON workout_playlists
  FOR INSERT WITH CHECK (true);

CREATE POLICY "workout_playlists_update_policy" ON workout_playlists
  FOR UPDATE USING (true);

CREATE POLICY "workout_playlists_delete_policy" ON workout_playlists
  FOR DELETE USING (true);

CREATE POLICY "youtube_tracks_select_policy" ON youtube_tracks
  FOR SELECT USING (true);

CREATE POLICY "youtube_tracks_insert_policy" ON youtube_tracks
  FOR INSERT WITH CHECK (true);

CREATE POLICY "youtube_tracks_update_policy" ON youtube_tracks
  FOR UPDATE USING (true);

CREATE POLICY "youtube_tracks_delete_policy" ON youtube_tracks
  FOR DELETE USING (true);