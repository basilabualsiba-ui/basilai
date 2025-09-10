import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Music,
  Settings,
  Plus,
  Shuffle
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { WorkoutPlaylistManager } from './workout-playlist-manager';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { createEmbedUrl } from '@/utils/youtubeApi';

interface YouTubeTrack {
  id: string;
  youtube_id: string;
  title: string;
  channel_name?: string;
  thumbnail_url?: string;
  order_index: number;
}

interface WorkoutMusicPlayerProps {
  isWorkoutActive: boolean;
  onWorkoutStart?: () => void;
  onWorkoutEnd?: () => void;
}

export function WorkoutMusicPlayer({ isWorkoutActive, onWorkoutStart, onWorkoutEnd }: WorkoutMusicPlayerProps) {
  const [tracks, setTracks] = useState<YouTubeTrack[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffleEnabled, setIsShuffleEnabled] = useState(false);
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showPlaylistManager, setShowPlaylistManager] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [player, setPlayer] = useState<any>(null);
  const [hasAutoStarted, setHasAutoStarted] = useState(false);
  const [needsUserInteraction, setNeedsUserInteraction] = useState(false);
  
  const playerRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Load YouTube IFrame API
  useEffect(() => {
    console.log('🎬 Loading YouTube API...');
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    console.log('Device detected - iOS:', isIOS);
    
    if (isIOS) {
      console.log('🍎 iOS detected - YouTube API may have restrictions');
    }
    
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    (window as any).onYouTubeIframeAPIReady = () => {
      console.log('🎬 YouTube API ready');
    };
  }, []);

  // Load default playlist on mount
  useEffect(() => {
    loadDefaultPlaylist();
  }, []);

  // Handle workout state changes (no autoplay for iOS web apps)
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isWebApp = (window.navigator as any).standalone === true;
    
    if (isWorkoutActive && tracks.length > 0 && !hasAutoStarted) {
      // For iOS web apps, never autoplay - show user needs to tap play
      if (isIOS && isWebApp) {
        console.log('iOS web app detected - waiting for user to start music');
        setNeedsUserInteraction(true);
        toast({
          title: "🎵 Ready to Play",
          description: "Tap the play button to start your workout music",
          duration: 3000,
        });
      } else if (player) {
        // For other platforms, try gentle autoplay
        console.log('Attempting gentle autoplay for non-iOS platform');
        const attemptAutoPlay = async () => {
          try {
            await player.playVideo();
            setHasAutoStarted(true);
            setNeedsUserInteraction(false);
            toast({
              title: "🎵 Music Started",
              description: "Your workout playlist is now playing",
            });
          } catch (error) {
            console.log('Autoplay blocked, waiting for user interaction:', error);
            setNeedsUserInteraction(true);
            toast({
              title: "🎵 Ready to Play", 
              description: "Tap the play button to start your workout music",
            });
          }
        };
        setTimeout(attemptAutoPlay, 1000);
      }
    } else if (!isWorkoutActive) {
      handlePause();
      setHasAutoStarted(false);
      setNeedsUserInteraction(false);
    }
  }, [isWorkoutActive, tracks.length, hasAutoStarted, player]);

  // Initialize YouTube player when tracks are loaded
  useEffect(() => {
    if (tracks.length > 0 && !player && (window as any).YT) {
      const currentTrack = tracks[currentTrackIndex];
      if (currentTrack) {
        console.log('Initializing YouTube player with video:', currentTrack.youtube_id);
        
        // Create a container div for the player if it doesn't exist
        if (!document.getElementById('youtube-player')) {
          const playerDiv = document.createElement('div');
          playerDiv.id = 'youtube-player';
          playerDiv.style.display = 'none';
          document.body.appendChild(playerDiv);
        }
        
        const newPlayer = new (window as any).YT.Player('youtube-player', {
          height: '0',
          width: '0',
          videoId: currentTrack.youtube_id,
          playerVars: {
            autoplay: 0,
            controls: 0,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            fs: 0,
            playsinline: 1,
            enablejsapi: 1,
            html5: 1,
            disablekb: 1,
            iv_load_policy: 3,
            // iOS-specific parameters
            origin: window.location.origin,
            widget_referrer: window.location.href
          },
          events: {
            onReady: (event: any) => {
              console.log('YouTube player ready');
              setPlayer(event.target);
              setIsLoading(false);
              
              // For iOS web apps, never attempt autoplay - wait for user gesture
              const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
              const isWebApp = (window.navigator as any).standalone === true;
              
              if (isIOS && isWebApp) {
                console.log('iOS web app detected - no autoplay attempts');
                if (isWorkoutActive) {
                  setNeedsUserInteraction(true);
                }
              }
            },
            onStateChange: (event: any) => {
              console.log('YouTube player state changed:', event.data);
              if (event.data === (window as any).YT.PlayerState.ENDED) {
                console.log('Track ended, moving to next');
                handleNextTrack();
              } else if (event.data === (window as any).YT.PlayerState.PLAYING) {
                setIsPlaying(true);
                startProgressUpdate();
              } else if (event.data === (window as any).YT.PlayerState.PAUSED) {
                setIsPlaying(false);
                stopProgressUpdate();
              } else if (event.data === (window as any).YT.PlayerState.BUFFERING) {
                console.log('Player buffering');
              } else if (event.data === (window as any).YT.PlayerState.CUED) {
                console.log('Video cued, ready to play');
              }
            },
            onError: (event: any) => {
              console.error('YouTube player error:', event.data);
            }
          }
        });
      }
    }
    
    // Cleanup function
    return () => {
      if (player) {
        try {
          stopProgressUpdate();
          if (player.destroy) {
            player.destroy();
          }
        } catch (error) {
          console.error('Error destroying player:', error);
        }
      }
    };
  }, [tracks.length, player]);

  const startProgressUpdate = () => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      if (player && player.getCurrentTime && player.getDuration) {
        setProgress(player.getCurrentTime());
        setDuration(player.getDuration());
      }
    }, 1000);
  };

  const stopProgressUpdate = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const loadDefaultPlaylist = async () => {
    try {
      setIsLoading(true);
      
      // Get default playlist
      const { data: playlist, error: playlistError } = await supabase
        .from('workout_playlists')
        .select('id')
        .eq('is_default', true)
        .single();

      if (playlistError || !playlist) {
        console.log('No default playlist found');
        setTracks([]);
        return;
      }

      // Get tracks for the playlist
      const { data: playlistTracks, error: tracksError } = await supabase
        .from('youtube_tracks')
        .select('*')
        .eq('playlist_id', playlist.id)
        .order('order_index');

      if (tracksError) {
        console.error('Error loading tracks:', tracksError);
        return;
      }

      setTracks(playlistTracks || []);
      // Initialize shuffle indices when tracks are loaded
      if (playlistTracks && playlistTracks.length > 0) {
        setShuffledIndices(playlistTracks.map((_, index) => index));
      }
    } catch (error) {
      console.error('Error loading playlist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlay = async () => {
    console.log('🎵 PLAY BUTTON CLICKED');
    console.log('Tracks length:', tracks.length);
    console.log('Player exists:', !!player);
    console.log('Current track index:', currentTrackIndex);
    
    if (tracks.length === 0) {
      console.log('❌ No tracks available');
      return;
    }
    
    if (!player) {
      console.log('❌ No player available');
      return;
    }
    
    const currentTrack = tracks[currentTrackIndex];
    if (!currentTrack) {
      console.log('❌ No current track');
      return;
    }

    console.log('🎵 Attempting to play track:', currentTrack.title);
    console.log('Video ID:', currentTrack.youtube_id);
    
    try {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isWebApp = (window.navigator as any).standalone === true;
      
      console.log('Is iOS:', isIOS);
      console.log('Is Web App:', isWebApp);
      console.log('Player state before play:', player.getPlayerState ? player.getPlayerState() : 'unknown');
      
      // For iOS, use the most reliable method
      if (isIOS) {
        console.log('🍎 Using iOS playback method');
        
        // First, ensure video is loaded
        player.loadVideoById({
          videoId: currentTrack.youtube_id,
          startSeconds: 0
        });
        
        // Wait for video to load, then play
        setTimeout(async () => {
          console.log('🍎 Attempting to play after load...');
          try {
            await player.playVideo();
            console.log('🍎 iOS play command sent');
          } catch (iosError) {
            console.error('🍎 iOS play error:', iosError);
          }
        }, 1000);
      } else {
        console.log('🖥️ Using standard playback method');
        player.loadVideoById({
          videoId: currentTrack.youtube_id,
          startSeconds: 0
        });
        
        setTimeout(() => {
          player.playVideo();
          console.log('🖥️ Standard play command sent');
        }, 300);
      }
      
      setNeedsUserInteraction(false);
      
      if (isWorkoutActive && !hasAutoStarted) {
        setHasAutoStarted(true);
        toast({
          title: "🎵 Music Started",
          description: "Your workout playlist is now playing",
        });
      }
      
    } catch (error) {
      console.error('❌ Play error:', error);
      toast({
        title: "Playback Error",
        description: "Unable to start music. Try again.", 
        variant: "destructive"
      });
    }
  };

  const handlePause = () => {
    if (!player) return;
    
    try {
      player.pauseVideo();
      setIsPlaying(false);
    } catch (error) {
      console.error('Error pausing video:', error);
    }
  };

  const handleNextTrack = () => {
    if (tracks.length === 0 || !player) return;
    
    let nextIndex;
    if (isShuffleEnabled && shuffledIndices.length > 0) {
      const currentShuffleIndex = shuffledIndices.indexOf(currentTrackIndex);
      const nextShuffleIndex = (currentShuffleIndex + 1) % shuffledIndices.length;
      nextIndex = shuffledIndices[nextShuffleIndex];
    } else {
      nextIndex = (currentTrackIndex + 1) % tracks.length;
    }
    
    const nextTrack = tracks[nextIndex];
    if (!nextTrack) return;
    
    console.log('Switching to next track:', nextTrack.title);
    setCurrentTrackIndex(nextIndex);
    
    // Load and auto-play the next video
    try {
      if (isPlaying) {
        // If currently playing, load and play immediately
        player.loadVideoById({
          videoId: nextTrack.youtube_id,
          startSeconds: 0
        });
      } else {
        // If paused, just cue the video
        player.cueVideoById({
          videoId: nextTrack.youtube_id,
          startSeconds: 0
        });
      }
    } catch (error) {
      console.error('Error switching to next track:', error);
    }
  };

  const handlePreviousTrack = () => {
    if (tracks.length === 0 || !player) return;
    
    let prevIndex;
    if (isShuffleEnabled && shuffledIndices.length > 0) {
      const currentShuffleIndex = shuffledIndices.indexOf(currentTrackIndex);
      const prevShuffleIndex = currentShuffleIndex === 0 ? shuffledIndices.length - 1 : currentShuffleIndex - 1;
      prevIndex = shuffledIndices[prevShuffleIndex];
    } else {
      prevIndex = currentTrackIndex === 0 ? tracks.length - 1 : currentTrackIndex - 1;
    }
    
    const prevTrack = tracks[prevIndex];
    if (!prevTrack) return;
    
    console.log('Switching to previous track:', prevTrack.title);
    setCurrentTrackIndex(prevIndex);
    
    // Load and auto-play the previous video
    try {
      if (isPlaying) {
        // If currently playing, load and play immediately
        player.loadVideoById({
          videoId: prevTrack.youtube_id,
          startSeconds: 0
        });
      } else {
        // If paused, just cue the video
        player.cueVideoById({
          videoId: prevTrack.youtube_id,
          startSeconds: 0
        });
      }
    } catch (error) {
      console.error('Error switching to previous track:', error);
    }
  };

  const handleMute = () => {
    if (!player) return;
    
    try {
      if (isMuted) {
        player.unMute();
      } else {
        player.mute();
      }
      setIsMuted(!isMuted);
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
  };

  const handleShuffle = () => {
    if (tracks.length === 0) return;
    
    if (!isShuffleEnabled) {
      // Enable shuffle - create shuffled indices
      const indices = tracks.map((_, index) => index);
      const shuffled = [...indices].sort(() => Math.random() - 0.5);
      setShuffledIndices(shuffled);
      setIsShuffleEnabled(true);
      toast({
        title: "🔀 Shuffle Enabled",
        description: "Tracks will play in random order",
      });
    } else {
      // Disable shuffle - reset to normal order
      setIsShuffleEnabled(false);
      setShuffledIndices(tracks.map((_, index) => index));
      toast({
        title: "📚 Shuffle Disabled", 
        description: "Tracks will play in playlist order",
      });
    }
  };

  const currentTrack = tracks[currentTrackIndex];

  if (isLoading) {
    return (
      <Card className="sticky top-0 z-40 bg-card/95 backdrop-blur-sm border-b">
        <CardContent className="p-4">
          <div className="flex items-center justify-center">
            <Music className="h-5 w-5 animate-pulse text-primary mr-2" />
            <span className="text-sm text-muted-foreground">Loading music player...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tracks.length === 0) {
    return (
      <Card className="sticky top-0 z-40 bg-card/95 backdrop-blur-sm border-b">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Music className="h-5 w-5 text-primary mr-2" />
              <span className="text-sm text-muted-foreground">No music in playlist</span>
            </div>
            <Dialog open={showPlaylistManager} onOpenChange={setShowPlaylistManager}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Music
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Manage Workout Playlist</DialogTitle>
                </DialogHeader>
                <WorkoutPlaylistManager onUpdate={loadDefaultPlaylist} />
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="sticky top-0 z-40 bg-card/95 backdrop-blur-sm border-b">
        <CardContent className="p-2 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            {/* Track Info */}
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0">
                {currentTrack?.thumbnail_url ? (
                  <img
                    src={currentTrack.thumbnail_url}
                    alt={currentTrack.title}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded bg-primary/10 flex items-center justify-center">
                    <Music className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-xs sm:text-sm truncate">{currentTrack?.title || 'Unknown Track'}</h4>
                {currentTrack?.channel_name && (
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{currentTrack.channel_name}</p>
                )}
                <div className="flex items-center gap-1 sm:gap-2 mt-1">
                  <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0">
                    {currentTrackIndex + 1} of {tracks.length}
                  </Badge>
                  {isWorkoutActive && (
                    <Badge variant="default" className="text-[10px] sm:text-xs px-1.5 py-0">
                      Workout Active
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Controls - Mobile Optimized */}
            <div className="flex items-center justify-between sm:justify-end gap-1 sm:gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handlePreviousTrack}
                className="h-8 w-8 sm:h-9 sm:w-9"
              >
                <SkipBack className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
              
              <Button 
                variant="default" 
                size="icon"
                onClick={isPlaying ? handlePause : handlePlay}
                onTouchStart={(e) => {
                  // Prevent iOS touch delay and ensure user gesture is registered
                  e.preventDefault();
                  if (!isPlaying) handlePlay();
                }}
                className={`h-9 w-9 sm:h-10 sm:w-10 rounded-full ${needsUserInteraction && isWorkoutActive ? 'animate-pulse bg-primary' : ''}`}
                style={{
                  // Ensure button is touchable on iOS
                  WebkitTouchCallout: 'none',
                  WebkitUserSelect: 'none',
                  touchAction: 'manipulation'
                }}
              >
                {isPlaying ? <Pause className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleNextTrack}
                className="h-8 w-8 sm:h-9 sm:w-9"
              >
                <SkipForward className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleMute}
                className="h-8 w-8 sm:h-9 sm:w-9"
              >
                {isMuted ? <VolumeX className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Volume2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
              </Button>

              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleShuffle}
                className={`h-8 w-8 sm:h-9 sm:w-9 ${isShuffleEnabled ? 'text-primary bg-primary/10' : ''}`}
              >
                <Shuffle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>

              <Dialog open={showPlaylistManager} onOpenChange={setShowPlaylistManager}>
                <DialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8 sm:h-9 sm:w-9"
                  >
                    <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Manage Workout Playlist</DialogTitle>
                  </DialogHeader>
                  <WorkoutPlaylistManager onUpdate={loadDefaultPlaylist} />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Progress Bar */}
          {duration > 0 && (
            <div className="mt-3">
              <Progress value={(progress / duration) * 100} className="h-1" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{Math.floor(progress / 60)}:{(progress % 60).toFixed(0).padStart(2, '0')}</span>
                <span>{Math.floor(duration / 60)}:{(duration % 60).toFixed(0).padStart(2, '0')}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

    </>
  );
}