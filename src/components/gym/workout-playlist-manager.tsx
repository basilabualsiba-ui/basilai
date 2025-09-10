import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Trash2, 
  Music, 
  ExternalLink, 
  GripVertical,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { extractVideoId, getVideoInfo } from '@/utils/youtubeApi';

interface YouTubeTrack {
  id: string;
  youtube_id: string;
  title: string;
  channel_name?: string;
  thumbnail_url?: string;
  order_index: number;
}

interface WorkoutPlaylistManagerProps {
  onUpdate?: () => void;
}

export function WorkoutPlaylistManager({ onUpdate }: WorkoutPlaylistManagerProps) {
  const [tracks, setTracks] = useState<YouTubeTrack[]>([]);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [playlistId, setPlaylistId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadPlaylist();
  }, []);

  const loadPlaylist = async () => {
    try {
      setIsLoading(true);
      
      // Get default playlist
      const { data: playlist, error: playlistError } = await supabase
        .from('workout_playlists')
        .select('id')
        .eq('is_default', true)
        .single();

      if (playlistError || !playlist) {
        toast({
          title: "No playlist found",
          description: "Creating a default workout playlist",
        });
        return;
      }

      setPlaylistId(playlist.id);

      // Get tracks
      const { data: playlistTracks, error: tracksError } = await supabase
        .from('youtube_tracks')
        .select('*')
        .eq('playlist_id', playlist.id)
        .order('order_index');

      if (tracksError) {
        console.error('Error loading tracks:', tracksError);
        toast({
          title: "Error",
          description: "Failed to load playlist tracks",
          variant: "destructive",
        });
        return;
      }

      setTracks(playlistTracks || []);
    } catch (error) {
      console.error('Error loading playlist:', error);
      toast({
        title: "Error",
        description: "Failed to load playlist",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addTrack = async () => {
    if (!newVideoUrl.trim() || !playlistId) return;

    const videoId = extractVideoId(newVideoUrl);
    if (!videoId) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid YouTube URL",
        variant: "destructive",
      });
      return;
    }

    setIsAdding(true);
    try {
      // Check if track already exists
      const existingTrack = tracks.find(track => track.youtube_id === videoId);
      if (existingTrack) {
        toast({
          title: "Track already exists",
          description: "This video is already in your playlist",
          variant: "destructive",
        });
        return;
      }

      // Get video info
      const videoInfo = await getVideoInfo(videoId);
      if (!videoInfo) {
        toast({
          title: "Video not found",
          description: "Could not fetch video information. Please check the URL.",
          variant: "destructive",
        });
        return;
      }

      // Add to database
      const { data, error } = await supabase
        .from('youtube_tracks')
        .insert({
          playlist_id: playlistId,
          youtube_id: videoId,
          title: videoInfo.title,
          channel_name: videoInfo.author_name,
          thumbnail_url: videoInfo.thumbnail_url,
          order_index: tracks.length
        })
        .select()
        .single();

      if (error) throw error;

      setTracks([...tracks, data]);
      setNewVideoUrl('');
      onUpdate?.();

      toast({
        title: "Track added",
        description: `Added "${videoInfo.title}" to your playlist`,
      });
    } catch (error) {
      console.error('Error adding track:', error);
      toast({
        title: "Error",
        description: "Failed to add track to playlist",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const removeTrack = async (trackId: string) => {
    try {
      const { error } = await supabase
        .from('youtube_tracks')
        .delete()
        .eq('id', trackId);

      if (error) throw error;

      setTracks(tracks.filter(track => track.id !== trackId));
      onUpdate?.();

      toast({
        title: "Track removed",
        description: "Track has been removed from your playlist",
      });
    } catch (error) {
      console.error('Error removing track:', error);
      toast({
        title: "Error",
        description: "Failed to remove track",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading playlist...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add New Track */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add YouTube Track
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="video-url">YouTube URL</Label>
            <div className="flex gap-2">
              <Input
                id="video-url"
                placeholder="Paste YouTube URL here..."
                value={newVideoUrl}
                onChange={(e) => setNewVideoUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTrack()}
              />
              <Button 
                onClick={addTrack} 
                disabled={!newVideoUrl.trim() || isAdding}
              >
                {isAdding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              The track title will be automatically fetched from YouTube
            </p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Current Playlist */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Music className="h-5 w-5" />
          Current Playlist ({tracks.length} tracks)
        </h3>

        {tracks.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Music className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h4 className="font-medium mb-2">No tracks in playlist</h4>
              <p className="text-sm text-muted-foreground">
                Add some YouTube videos to get started with your workout music
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {tracks.map((track, index) => (
              <Card key={track.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <GripVertical className="h-4 w-4" />
                      <span className="text-sm font-medium">{index + 1}</span>
                    </div>

                    {track.thumbnail_url && (
                      <img
                        src={track.thumbnail_url}
                        alt={track.title}
                        className="w-16 h-12 rounded object-cover"
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{track.title}</h4>
                      {track.channel_name && (
                        <p className="text-sm text-muted-foreground truncate">
                          {track.channel_name}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`https://youtube.com/watch?v=${track.youtube_id}`, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTrack(track.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}