import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, Search, Star, Tv, Film, Play, Check, Eye, Clock, Sparkles, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSound } from '@/hooks/useSound';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

interface MediaItem {
  id: string;
  tmdb_id: number;
  type: string;
  title: string;
  poster_url: string | null;
  rating: number | null;
  runtime: number | null;
  total_seasons: number | null;
  genres: string[];
  trailer_url: string | null;
  status: string;
  created_at: string;
}

interface Episode {
  id: string;
  series_id: string;
  season_number: number;
  episode_number: number;
  title: string | null;
  watched: boolean;
}

interface TMDBResult {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  vote_average: number;
  media_type?: string;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
}

const tmdbFetch = async (path: string, query?: string) => {
  const params = new URLSearchParams({ path });
  if (query) params.set('query', query);
  const { data, error } = await supabase.functions.invoke('tmdb-proxy', {
    body: null,
    headers: {},
  });
  // Use direct URL instead
  const url = `https://sfreodzibxmniiccqpcl.supabase.co/functions/v1/tmdb-proxy?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmcmVvZHppYnhtbmlpY2NxcGNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MzA1ODIsImV4cCI6MjA3MTAwNjU4Mn0.IjwnGiLJu8C8old6KnYgNE6yFlVGGZPOiCPS234hwwQ',
    },
  });
  return res.json();
};

const TVTracker = () => {
  const navigate = useNavigate();
  const { click } = useSound();
  const { toast } = useToast();
  const [library, setLibrary] = useState<MediaItem[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TMDBResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [expandedSeasons, setExpandedSeasons] = useState<number[]>([]);

  const loadLibrary = async () => {
    const { data } = await supabase.from('media').select('*').order('created_at', { ascending: false });
    setLibrary((data as MediaItem[]) || []);
  };

  const loadEpisodes = async () => {
    const { data } = await supabase.from('episodes').select('*');
    setEpisodes((data as Episode[]) || []);
  };

  useEffect(() => {
    loadLibrary();
    loadEpisodes();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const [movies, shows] = await Promise.all([
        tmdbFetch(`/search/movie`, searchQuery),
        tmdbFetch(`/search/tv`, searchQuery),
      ]);
      const movieResults = (movies.results || []).slice(0, 5).map((r: any) => ({ ...r, media_type: 'movie' }));
      const tvResults = (shows.results || []).slice(0, 5).map((r: any) => ({ ...r, media_type: 'tv', title: r.name }));
      setSearchResults([...movieResults, ...tvResults]);
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to search TMDB', variant: 'destructive' });
    }
    setSearching(false);
  };

  const addToLibrary = async (result: TMDBResult, type: 'movie' | 'series') => {
    const existing = library.find(m => m.tmdb_id === result.id && m.type === type);
    if (existing) {
      toast({ title: 'Already in library', description: `${result.title || result.name} is already added` });
      return;
    }

    try {
      // Fetch details
      const path = type === 'movie' ? `/movie/${result.id}` : `/tv/${result.id}`;
      const details = await tmdbFetch(path);
      
      // Fetch trailer
      const videosPath = type === 'movie' ? `/movie/${result.id}/videos` : `/tv/${result.id}/videos`;
      const videos = await tmdbFetch(videosPath);
      const trailer = (videos.results || []).find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');

      const mediaData = {
        tmdb_id: result.id,
        type,
        title: details.title || details.name || '',
        poster_url: details.poster_path ? `${TMDB_IMAGE_BASE}${details.poster_path}` : null,
        rating: details.vote_average ? Math.round(details.vote_average * 10) / 10 : null,
        runtime: type === 'movie' ? details.runtime : null,
        total_seasons: type === 'series' ? details.number_of_seasons : null,
        genres: (details.genres || []).map((g: any) => g.name),
        trailer_url: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null,
        status: 'want_to_watch',
      };

      const { data, error } = await supabase.from('media').insert([mediaData]).select().single();
      if (error) throw error;

      // If series, fetch all episodes
      if (type === 'series' && details.number_of_seasons) {
        for (let s = 1; s <= details.number_of_seasons; s++) {
          const season = await tmdbFetch(`/tv/${result.id}/season/${s}`);
          if (season.episodes) {
            const epData = season.episodes.map((ep: any) => ({
              series_id: data.id,
              season_number: s,
              episode_number: ep.episode_number,
              title: ep.name || `Episode ${ep.episode_number}`,
              watched: false,
            }));
            await supabase.from('episodes').insert(epData);
          }
        }
      }

      toast({ title: 'Added!', description: `${mediaData.title} added to your library` });
      setSearchOpen(false);
      setSearchQuery('');
      setSearchResults([]);
      loadLibrary();
      loadEpisodes();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to add', variant: 'destructive' });
    }
  };

  const toggleEpisodeWatched = async (ep: Episode) => {
    const newWatched = !ep.watched;
    await supabase.from('episodes').update({ watched: newWatched }).eq('id', ep.id);
    
    // Update episodes state
    setEpisodes(prev => prev.map(e => e.id === ep.id ? { ...e, watched: newWatched } : e));
    
    // Update series status
    const seriesEps = episodes.filter(e => e.series_id === ep.series_id).map(e => e.id === ep.id ? { ...e, watched: newWatched } : e);
    const allWatched = seriesEps.every(e => e.watched);
    const someWatched = seriesEps.some(e => e.watched);
    const newStatus = allWatched ? 'watched' : someWatched ? 'watching' : 'want_to_watch';
    await supabase.from('media').update({ status: newStatus }).eq('id', ep.series_id);
    loadLibrary();
  };

  const updateStatus = async (mediaId: string, status: string) => {
    await supabase.from('media').update({ status }).eq('id', mediaId);
    loadLibrary();
  };

  const deleteMedia = async (mediaId: string) => {
    await supabase.from('media').delete().eq('id', mediaId);
    loadLibrary();
    loadEpisodes();
    setSelectedMedia(null);
  };

  const filteredLibrary = useMemo(() => {
    if (activeTab === 'all') return library;
    return library.filter(m => m.status === activeTab);
  }, [library, activeTab]);

  const getEpisodesForSeries = (seriesId: string) => episodes.filter(e => e.series_id === seriesId);
  
  const getSeriesProgress = (seriesId: string) => {
    const eps = getEpisodesForSeries(seriesId);
    const watched = eps.filter(e => e.watched).length;
    return { watched, total: eps.length };
  };

  const statusColors: Record<string, string> = {
    want_to_watch: 'bg-amber-500/20 text-amber-500',
    watching: 'bg-cyan-500/20 text-cyan-500',
    watched: 'bg-emerald-500/20 text-emerald-500',
  };

  const statusLabels: Record<string, string> = {
    want_to_watch: 'Want to Watch',
    watching: 'Watching',
    watched: 'Watched',
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/30 bg-gradient-to-r from-card/95 via-card/90 to-card/95 backdrop-blur-xl sticky top-0 z-50">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-blue-500/5 pointer-events-none" />
        <div className="container mx-auto px-4 py-3 flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => { click(); navigate('/'); }} className="hover:bg-cyan-500/10 hover:text-cyan-500 rounded-xl h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/25">
                <Tv className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">TV & Series</h1>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Track your entertainment</p>
              </div>
            </div>
          </div>
          <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
            <DialogTrigger asChild>
              <Button size="icon" className="rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 h-9 w-9">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Search Movies & Shows</DialogTitle>
              </DialogHeader>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Search TMDB..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="rounded-xl"
                />
                <Button onClick={handleSearch} disabled={searching} className="rounded-xl">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-3 mt-4">
                {searchResults.map((result) => (
                  <Card key={`${result.media_type}-${result.id}`} className="border-border/30">
                    <CardContent className="p-3 flex gap-3">
                      {result.poster_path ? (
                        <img src={`${TMDB_IMAGE_BASE}${result.poster_path}`} alt={result.title || result.name} className="w-16 h-24 rounded-lg object-cover" />
                      ) : (
                        <div className="w-16 h-24 rounded-lg bg-muted flex items-center justify-center">
                          {result.media_type === 'movie' ? <Film className="h-6 w-6 text-muted-foreground" /> : <Tv className="h-6 w-6 text-muted-foreground" />}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{result.title || result.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-[10px]">
                            {result.media_type === 'movie' ? 'Movie' : 'Series'}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Star className="h-3 w-3 text-amber-500" />
                            {result.vote_average?.toFixed(1)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {result.release_date?.slice(0, 4) || result.first_air_date?.slice(0, 4)}
                        </p>
                        <Button 
                          size="sm" 
                          className="mt-2 h-7 text-xs rounded-lg"
                          onClick={() => addToLibrary(result, result.media_type === 'movie' ? 'movie' : 'series')}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Add
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {searchResults.length === 0 && searchQuery && !searching && (
                  <p className="text-sm text-muted-foreground text-center py-4">No results found</p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Tabs */}
      <div className="container mx-auto px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full rounded-xl">
            <TabsTrigger value="all" className="text-xs rounded-lg">All</TabsTrigger>
            <TabsTrigger value="want_to_watch" className="text-xs rounded-lg">
              <Clock className="h-3 w-3 mr-1" /> Watch
            </TabsTrigger>
            <TabsTrigger value="watching" className="text-xs rounded-lg">
              <Eye className="h-3 w-3 mr-1" /> Watching
            </TabsTrigger>
            <TabsTrigger value="watched" className="text-xs rounded-lg">
              <Check className="h-3 w-3 mr-1" /> Done
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {filteredLibrary.length === 0 ? (
              <Card className="border-border/30">
                <CardContent className="p-8 text-center">
                  <Tv className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No items yet. Add movies or series!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredLibrary.map((item) => {
                  const progress = item.type === 'series' ? getSeriesProgress(item.id) : null;
                  return (
                    <Card 
                      key={item.id} 
                      className="border-border/30 overflow-hidden cursor-pointer hover:border-cyan-500/30 transition-all"
                      onClick={() => setSelectedMedia(item)}
                    >
                      <div className="relative">
                        {item.poster_url ? (
                          <img src={item.poster_url} alt={item.title} className="w-full aspect-[2/3] object-cover" />
                        ) : (
                          <div className="w-full aspect-[2/3] bg-muted flex items-center justify-center">
                            <Film className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                        <Badge className={`absolute top-2 right-2 text-[10px] ${statusColors[item.status]}`}>
                          {statusLabels[item.status]}
                        </Badge>
                        {item.rating && (
                          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/70 rounded-lg px-2 py-1">
                            <Star className="h-3 w-3 text-amber-500" />
                            <span className="text-xs text-white font-semibold">{item.rating}</span>
                          </div>
                        )}
                      </div>
                      <CardContent className="p-3">
                        <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px]">
                            {item.type === 'movie' ? 'Movie' : `${item.total_seasons || '?'}S`}
                          </Badge>
                          {item.type === 'movie' && item.runtime && (
                            <span className="text-[10px] text-muted-foreground">{item.runtime} min</span>
                          )}
                          {progress && (
                            <span className="text-[10px] text-muted-foreground">
                              {progress.watched}/{progress.total} eps
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Media Detail Dialog */}
      <Dialog open={!!selectedMedia} onOpenChange={(open) => !open && setSelectedMedia(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto p-0">
          {selectedMedia && (
            <>
              {selectedMedia.poster_url && (
                <div className="relative">
                  <img src={selectedMedia.poster_url} alt={selectedMedia.title} className="w-full aspect-video object-cover object-top" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                </div>
              )}
              <div className="p-4 space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground">{selectedMedia.title}</h2>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {selectedMedia.rating && (
                      <Badge variant="secondary" className="gap-1">
                        <Star className="h-3 w-3 text-amber-500" /> {selectedMedia.rating}
                      </Badge>
                    )}
                    <Badge variant="outline">{selectedMedia.type === 'movie' ? 'Movie' : 'Series'}</Badge>
                    {selectedMedia.runtime && <Badge variant="outline">{selectedMedia.runtime} min</Badge>}
                    {selectedMedia.total_seasons && <Badge variant="outline">{selectedMedia.total_seasons} Seasons</Badge>}
                  </div>
                  {selectedMedia.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedMedia.genres.map(g => (
                        <Badge key={g} variant="secondary" className="text-[10px]">{g}</Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status buttons */}
                <div className="flex gap-2">
                  {(['want_to_watch', 'watching', 'watched'] as const).map(s => (
                    <Button
                      key={s}
                      size="sm"
                      variant={selectedMedia.status === s ? 'default' : 'outline'}
                      className="flex-1 text-xs rounded-xl"
                      onClick={() => updateStatus(selectedMedia.id, s)}
                    >
                      {statusLabels[s]}
                    </Button>
                  ))}
                </div>

                {/* Trailer */}
                {selectedMedia.trailer_url && (
                  <a href={selectedMedia.trailer_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="w-full rounded-xl gap-2">
                      <Play className="h-4 w-4" /> Watch Trailer <ExternalLink className="h-3 w-3" />
                    </Button>
                  </a>
                )}

                {/* Episodes for series */}
                {selectedMedia.type === 'series' && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground">Episodes</h3>
                    {Array.from({ length: selectedMedia.total_seasons || 0 }, (_, i) => i + 1).map(season => {
                      const seasonEps = getEpisodesForSeries(selectedMedia.id).filter(e => e.season_number === season);
                      const watchedCount = seasonEps.filter(e => e.watched).length;
                      const isExpanded = expandedSeasons.includes(season);
                      
                      return (
                        <Card key={season} className="border-border/30">
                          <CardContent className="p-0">
                            <button
                              onClick={() => setExpandedSeasons(prev => 
                                isExpanded ? prev.filter(s => s !== season) : [...prev, season]
                              )}
                              className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                            >
                              <span className="text-sm font-medium">Season {season}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">{watchedCount}/{seasonEps.length}</span>
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </div>
                            </button>
                            {isExpanded && (
                              <div className="border-t border-border/30">
                                {seasonEps.sort((a, b) => a.episode_number - b.episode_number).map(ep => (
                                  <button
                                    key={ep.id}
                                    onClick={() => toggleEpisodeWatched(ep)}
                                    className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/30 transition-colors ${
                                      ep.watched ? 'opacity-60' : ''
                                    }`}
                                  >
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                      ep.watched ? 'bg-emerald-500 border-emerald-500' : 'border-muted-foreground'
                                    }`}>
                                      {ep.watched && <Check className="h-3 w-3 text-white" />}
                                    </div>
                                    <div>
                                      <span className="text-xs text-muted-foreground">E{ep.episode_number}</span>
                                      <p className={`text-sm ${ep.watched ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                        {ep.title || `Episode ${ep.episode_number}`}
                                      </p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {/* Delete */}
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full rounded-xl"
                  onClick={() => deleteMedia(selectedMedia.id)}
                >
                  Remove from Library
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TVTracker;
