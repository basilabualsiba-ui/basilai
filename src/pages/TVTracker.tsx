import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Plus, Search, Star, Tv, Film, Play, Check, Eye, EyeOff, Clock, ChevronDown, ChevronUp, ExternalLink, BarChart3, Sparkles, Library as LibraryIcon, Trash2, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSound } from '@/hooks/useSound';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { FloatingActionButton } from '@/components/ui/floating-action-button';
import { ModuleIntroScreen } from '@/components/ui/module-intro-screen';
import { useModuleIntro } from '@/hooks/use-module-intro';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const STAT_COLORS = ['#06B6D4', '#8B5CF6', '#F59E0B', '#EF4444', '#10B981', '#EC4899', '#84CC16', '#F97316'];

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
  user_rating: number | null;
}

interface Episode {
  id: string;
  series_id: string;
  season_number: number;
  episode_number: number;
  title: string | null;
  watched: boolean;
  air_date: string | null;
  user_rating: number | null;
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
  genres?: { id: number; name: string }[];
  runtime?: number;
  number_of_seasons?: number;
}

const tmdbFetch = async (path: string, query?: string) => {
  const params = new URLSearchParams({ path });
  if (query) params.set('query', query);
  const url = `https://sfreodzibxmniiccqpcl.supabase.co/functions/v1/tmdb-proxy?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmcmVvZHppYnhtbmlpY2NxcGNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MzA1ODIsImV4cCI6MjA3MTAwNjU4Mn0.IjwnGiLJu8C8old6KnYgNE6yFlVGGZPOiCPS234hwwQ',
    },
  });
  return res.json();
};

type ContentMode = 'movies' | 'series';
type BottomTab = 'library' | 'recommendations' | 'stats';
type StatusFilter = 'all' | 'want_to_watch' | 'watching' | 'watched';

const TVTracker = () => {
  const navigate = useNavigate();
  const { click } = useSound();
  const { toast } = useToast();
  const showIntro = useModuleIntro(900);
  const [library, setLibrary] = useState<MediaItem[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [contentMode, setContentMode] = useState<ContentMode>('movies');
  const [bottomTab, setBottomTab] = useState<BottomTab>('library');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [librarySearch, setLibrarySearch] = useState('');
  const [searchResults, setSearchResults] = useState<TMDBResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [expandedSeasons, setExpandedSeasons] = useState<number[]>([]);
  const [ratingMedia, setRatingMedia] = useState<string | null>(null);
  const [ratingEpisode, setRatingEpisode] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<TMDBResult[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [recDetail, setRecDetail] = useState<TMDBResult | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [movieRatingValue, setMovieRatingValue] = useState(0);
  const [episodeRatingValue, setEpisodeRatingValue] = useState(0);
  const [selectedMediaExtra, setSelectedMediaExtra] = useState<{ overview?: string; year?: string } | null>(null);

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

  // Sync series on load
  useEffect(() => {
    const syncSeries = async () => {
      const seriesItems = library.filter(m => m.type === 'series');
      for (const series of seriesItems) {
        try {
          const details = await tmdbFetch(`/tv/${series.tmdb_id}`);
          if (!details.number_of_seasons) continue;
          if (details.number_of_seasons !== series.total_seasons) {
            await supabase.from('media').update({ total_seasons: details.number_of_seasons }).eq('id', series.id);
          }
          const seriesEps = episodes.filter(e => e.series_id === series.id);
          for (let s = 1; s <= details.number_of_seasons; s++) {
            const seasonEps = seriesEps.filter(e => e.season_number === s);
            const season = await tmdbFetch(`/tv/${series.tmdb_id}/season/${s}`);
            if (!season.episodes) continue;
            const missing = season.episodes.filter((ep: any) => !seasonEps.some(e => e.episode_number === ep.episode_number));
            if (missing.length > 0) {
              const epData = missing.map((ep: any) => ({
                series_id: series.id, season_number: s, episode_number: ep.episode_number,
                title: ep.name || `Episode ${ep.episode_number}`, watched: false, air_date: ep.air_date || null,
              }));
              await supabase.from('episodes').insert(epData);
            }
          }
        } catch (e) { console.error('Sync error for', series.title, e); }
      }
      loadEpisodes();
      loadLibrary();
    };
    if (library.length > 0) syncSeries();
  }, [library.length > 0]);

  // Dynamic search with debounce
  useEffect(() => {
    if (!searchOpen) return;
    if (searchQuery.trim().length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        if (contentMode === 'movies') {
          const movies = await tmdbFetch(`/search/movie`, searchQuery);
          setSearchResults((movies.results || []).slice(0, 10).map((r: any) => ({ ...r, media_type: 'movie' })));
        } else {
          const shows = await tmdbFetch(`/search/tv`, searchQuery);
          setSearchResults((shows.results || []).slice(0, 10).map((r: any) => ({ ...r, media_type: 'tv', title: r.name })));
        }
      } catch (e) { toast({ title: 'Error', description: 'Failed to search TMDB', variant: 'destructive' }); }
      setSearching(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, searchOpen, contentMode]);

  const addToLibrary = async (result: TMDBResult, type: 'movie' | 'series') => {
    const existing = library.find(m => m.tmdb_id === result.id && m.type === type);
    if (existing) { toast({ title: 'Already in library', description: `${result.title || result.name} is already added` }); return; }
    try {
      const path = type === 'movie' ? `/movie/${result.id}` : `/tv/${result.id}`;
      const details = await tmdbFetch(path);
      const videosPath = type === 'movie' ? `/movie/${result.id}/videos` : `/tv/${result.id}/videos`;
      const videos = await tmdbFetch(videosPath);
      const trailer = (videos.results || []).find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
      const mediaData = {
        tmdb_id: result.id, type,
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
      if (type === 'series' && details.number_of_seasons) {
        for (let s = 1; s <= details.number_of_seasons; s++) {
          const season = await tmdbFetch(`/tv/${result.id}/season/${s}`);
          if (season.episodes) {
            const epData = season.episodes.map((ep: any) => ({
              series_id: data.id, season_number: s, episode_number: ep.episode_number,
              title: ep.name || `Episode ${ep.episode_number}`, watched: false, air_date: ep.air_date || null,
            }));
            await supabase.from('episodes').insert(epData);
          }
        }
      }
      toast({ title: 'Added!', description: `${mediaData.title} added to your library` });
      setSearchOpen(false); setSearchQuery(''); setSearchResults([]); setRecDetail(null);
      loadLibrary(); loadEpisodes();
    } catch (e: any) { toast({ title: 'Error', description: e.message || 'Failed to add', variant: 'destructive' }); }
  };

  const toggleMovieWatched = async (movie: MediaItem) => {
    const newStatus = movie.status === 'watched' ? 'want_to_watch' : 'watched';
    if (newStatus === 'watched' && !movie.user_rating) { setMovieRatingValue(0); setRatingMedia(movie.id); return; }
    await supabase.from('media').update({ status: newStatus }).eq('id', movie.id);
    loadLibrary();
  };

  const submitMovieRating = async (mediaId: string, rating: number) => {
    await supabase.from('media').update({ status: 'watched', user_rating: rating }).eq('id', mediaId);
    setRatingMedia(null); loadLibrary();
  };

  const toggleEpisodeWatched = async (ep: Episode) => {
    const newWatched = !ep.watched;
    if (newWatched && !ep.user_rating) { setEpisodeRatingValue(0); setRatingEpisode(ep.id); return; }
    await doToggleEpisode(ep, newWatched);
  };

  const submitEpisodeRating = async (epId: string, rating: number) => {
    const ep = episodes.find(e => e.id === epId);
    if (!ep) return;
    await supabase.from('episodes').update({ watched: true, user_rating: rating }).eq('id', epId);
    setRatingEpisode(null);
    setEpisodes(prev => prev.map(e => e.id === epId ? { ...e, watched: true, user_rating: rating } : e));
    await updateSeriesStatus(ep.series_id, epId, true);
    loadLibrary();
  };

  const doToggleEpisode = async (ep: Episode, newWatched: boolean) => {
    await supabase.from('episodes').update({ watched: newWatched }).eq('id', ep.id);
    setEpisodes(prev => prev.map(e => e.id === ep.id ? { ...e, watched: newWatched } : e));
    await updateSeriesStatus(ep.series_id, ep.id, newWatched);
    loadLibrary();
  };

  const updateSeriesStatus = async (seriesId: string, changedEpId: string, newWatched: boolean) => {
    const seriesEps = episodes.filter(e => e.series_id === seriesId).map(e => e.id === changedEpId ? { ...e, watched: newWatched } : e);
    const allWatched = seriesEps.every(e => e.watched);
    const someWatched = seriesEps.some(e => e.watched);
    const newStatus = allWatched ? 'watched' : someWatched ? 'watching' : 'want_to_watch';
    await supabase.from('media').update({ status: newStatus }).eq('id', seriesId);
  };

  const deleteMedia = async (mediaId: string) => {
    await supabase.from('media').delete().eq('id', mediaId);
    loadLibrary(); loadEpisodes(); setSelectedMedia(null);
  };

  const getEpisodesForSeries = (seriesId: string) => episodes.filter(e => e.series_id === seriesId);
  const getSeriesProgress = (seriesId: string) => {
    const eps = getEpisodesForSeries(seriesId);
    const watched = eps.filter(e => e.watched).length;
    return { watched, total: eps.length, percentage: eps.length > 0 ? (watched / eps.length) * 100 : 0 };
  };

  const getAutoStatus = (item: MediaItem) => {
    if (item.type === 'movie') return item.status;
    const progress = getSeriesProgress(item.id);
    if (progress.watched === 0) return 'want_to_watch';
    if (progress.watched >= progress.total && progress.total > 0) return 'watched';
    return 'watching';
  };

  // Filtered library with status filter
  const filteredLibrary = useMemo(() => {
    const typeFilter = contentMode === 'movies' ? 'movie' : 'series';
    let items = library.filter(m => m.type === typeFilter);
    if (librarySearch.trim()) {
      items = items.filter(m => m.title.toLowerCase().includes(librarySearch.toLowerCase()));
    }
    if (statusFilter !== 'all') {
      items = items.filter(m => getAutoStatus(m) === statusFilter);
    }
    return items;
  }, [library, contentMode, librarySearch, statusFilter, episodes]);

  const loadRecommendations = useCallback(async () => {
    setLoadingRecs(true);
    try {
      const existingIds = new Set(library.map(m => m.tmdb_id));
      let recs: TMDBResult[] = [];
      if (contentMode === 'series') {
        const watchingSeries = library.filter(m => m.type === 'series' && getAutoStatus(m) === 'watching');
        for (const series of watchingSeries.slice(0, 3)) {
          const data = await tmdbFetch(`/tv/${series.tmdb_id}/recommendations`);
          const results = (data.results || []).filter((r: any) => !existingIds.has(r.id)).map((r: any) => ({ ...r, media_type: 'tv', title: r.name }));
          recs.push(...results);
        }
      } else {
        const watchedMovies = library.filter(m => m.type === 'movie' && m.status === 'watched');
        const topRated = [...watchedMovies].sort((a, b) => (b.user_rating || b.rating || 0) - (a.user_rating || a.rating || 0));
        for (const movie of topRated.slice(0, 3)) {
          const data = await tmdbFetch(`/movie/${movie.tmdb_id}/recommendations`);
          const results = (data.results || []).filter((r: any) => !existingIds.has(r.id)).map((r: any) => ({ ...r, media_type: 'movie' }));
          recs.push(...results);
        }
      }
      const seen = new Set<number>();
      recs = recs.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
      setRecommendations(recs.slice(0, 12));
    } catch (e) { console.error('Failed to load recommendations', e); }
    setLoadingRecs(false);
  }, [library, contentMode, episodes]);

  useEffect(() => {
    if (bottomTab === 'recommendations') loadRecommendations();
  }, [bottomTab, contentMode]);

  // Pull-to-refresh sync
  const handleRefreshSync = async () => {
    setSyncing(true);
    const seriesItems = library.filter(m => m.type === 'series');
    for (const series of seriesItems) {
      try {
        const details = await tmdbFetch(`/tv/${series.tmdb_id}`);
        if (!details.number_of_seasons) continue;
        if (details.number_of_seasons !== series.total_seasons) {
          await supabase.from('media').update({ total_seasons: details.number_of_seasons }).eq('id', series.id);
        }
        const seriesEps = episodes.filter(e => e.series_id === series.id);
        for (let s = 1; s <= details.number_of_seasons; s++) {
          const season = await tmdbFetch(`/tv/${series.tmdb_id}/season/${s}`);
          if (!season.episodes) continue;
          const missing = season.episodes.filter((ep: any) => !seriesEps.some(e => e.season_number === s && e.episode_number === ep.episode_number));
          if (missing.length > 0) {
            const epData = missing.map((ep: any) => ({
              series_id: series.id, season_number: s, episode_number: ep.episode_number,
              title: ep.name || `Episode ${ep.episode_number}`, watched: false, air_date: ep.air_date || null,
            }));
            await supabase.from('episodes').insert(epData);
          }
        }
      } catch (e) { console.error('Sync error', e); }
    }
    await loadEpisodes();
    await loadLibrary();
    setSyncing(false);
    toast({ title: 'Synced!', description: 'Series episodes updated from TMDb' });
  };

  // Rec detail loader
  const openRecDetail = async (rec: TMDBResult) => {
    click();
    try {
      const path = rec.media_type === 'movie' ? `/movie/${rec.id}` : `/tv/${rec.id}`;
      const videosPath = rec.media_type === 'movie' ? `/movie/${rec.id}/videos` : `/tv/${rec.id}/videos`;
      const [details, videos] = await Promise.all([tmdbFetch(path), tmdbFetch(videosPath)]);
      const trailer = (videos.results || []).find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
      const trailer_url = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
      setRecDetail({ ...rec, ...details, title: details.title || details.name || rec.title || rec.name, trailer_url });
    } catch {
      setRecDetail(rec);
    }
  };

  const openLibraryDetail = async (item: MediaItem) => {
    click();
    setSelectedMedia(item);
    setSelectedMediaExtra(null);
    try {
      const path = item.type === 'movie' ? `/movie/${item.tmdb_id}` : `/tv/${item.tmdb_id}`;
      const details = await tmdbFetch(path);
      const year = item.type === 'movie'
        ? details.release_date?.slice(0, 4)
        : details.first_air_date?.slice(0, 4);
      setSelectedMediaExtra({ overview: details.overview || '', year });
    } catch {
      setSelectedMediaExtra({});
    }
  };

  const statsData = useMemo(() => {
    const typeFilter = contentMode === 'movies' ? 'movie' : 'series';
    const items = library.filter(m => m.type === typeFilter);
    const watchedItems = items.filter(m => contentMode === 'movies' ? m.status === 'watched' : getAutoStatus(m) === 'watched');
    const genreMap = new Map<string, number>();
    watchedItems.forEach(m => m.genres.forEach(g => genreMap.set(g, (genreMap.get(g) || 0) + 1)));
    const topGenres = [...genreMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }));
    let totalMinutes = 0;
    if (contentMode === 'movies') {
      totalMinutes = watchedItems.reduce((sum, m) => sum + (m.runtime || 0), 0);
    } else {
      watchedItems.forEach(m => { totalMinutes += getEpisodesForSeries(m.id).filter(e => e.watched).length * 45; });
    }
    return { total: items.length, watched: watchedItems.length, topGenres, totalMinutes };
  }, [library, contentMode, episodes]);

  const isUpcoming = (airDate: string | null) => { if (!airDate) return false; return new Date(airDate) > new Date(); };

  const statusFilters = contentMode === 'movies'
    ? [{ label: 'All', value: 'all' as StatusFilter }, { label: 'Want to Watch', value: 'want_to_watch' as StatusFilter }, { label: 'Watched', value: 'watched' as StatusFilter }]
    : [{ label: 'All', value: 'all' as StatusFilter }, { label: 'Want to Watch', value: 'want_to_watch' as StatusFilter }, { label: 'Watching', value: 'watching' as StatusFilter }, { label: 'Watched', value: 'watched' as StatusFilter }];

  if (showIntro) {
    return <ModuleIntroScreen icon={Tv} title="TV & Series" subtitle="Track your watchlist" theme="tv" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-cyan-500/5 pb-20">
      {/* Header */}
      <header className="border-b border-border/20 bg-gradient-to-r from-background/95 via-background/90 to-background/95 backdrop-blur-2xl sticky top-0 z-50">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-blue-500/5 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
        <div className="container mx-auto px-4 py-3 flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => { click(); navigate('/'); }} className="hover:bg-cyan-500/10 hover:text-cyan-500 rounded-xl h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="relative group">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30 transition-transform duration-300 group-hover:scale-105">
                  <Tv className="h-5 w-5 text-white" />
                </div>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 opacity-50 blur-xl -z-10 group-hover:opacity-70 transition-opacity" />
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">TV & Series</h1>
                <p className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase">Track your watchlist</p>
              </div>
            </div>
          </div>
          {/* Movies/Series toggle in header */}
          <div className="flex items-center gap-1 rounded-2xl border border-border/40 bg-card/60 p-1">
            <button onClick={() => { click(); setContentMode('movies'); setStatusFilter('all'); }} className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all flex items-center gap-1.5 ${contentMode === 'movies' ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow' : 'text-muted-foreground hover:text-foreground'}`}>
              <Film className="h-3.5 w-3.5" /> Movies
            </button>
            <button onClick={() => { click(); setContentMode('series'); setStatusFilter('all'); }} className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all flex items-center gap-1.5 ${contentMode === 'series' ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow' : 'text-muted-foreground hover:text-foreground'}`}>
              <Tv className="h-3.5 w-3.5" /> Series
            </button>
          </div>
        </div>
      </header>

      {/* Status filter row + refresh */}
      <div className="container mx-auto px-4 pt-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-1">
            {statusFilters.map(f => (
              <button key={f.value} onClick={() => { click(); setStatusFilter(f.value); }}
                className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium border transition-all ${statusFilter === f.value ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-500' : 'border-border/40 bg-card/50 text-muted-foreground hover:text-foreground'}`}>
                {f.label}
              </button>
            ))}
          </div>
          {contentMode === 'series' && (
            <Button variant="ghost" size="icon" onClick={handleRefreshSync} disabled={syncing} className="rounded-xl h-8 w-8 shrink-0 hover:bg-cyan-500/10 hover:text-cyan-500">
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </div>

      {/* Library Search */}
      {bottomTab === 'library' && (
        <div className="container mx-auto px-4 pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search your library..." value={librarySearch} onChange={(e) => setLibrarySearch(e.target.value)} className="pl-9 rounded-xl bg-muted/30 border-border/30" />
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="container mx-auto px-4 py-4">
        {bottomTab === 'library' && (
          <>
            {filteredLibrary.length === 0 ? (
              <Card className="border-border/30">
                <CardContent className="p-8 text-center">
                  <Tv className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No {contentMode} yet. Tap + to add!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredLibrary.map((item) => {
                  const progress = item.type === 'series' ? getSeriesProgress(item.id) : null;
                  return (
                    <Card key={item.id} className="border-border/30 overflow-hidden cursor-pointer hover:border-cyan-500/30 transition-all" onClick={() => openLibraryDetail(item)}>
                      <div className="relative">
                        {item.poster_url ? (
                          <img src={item.poster_url} alt={item.title} className="w-full aspect-[2/3] object-cover" />
                        ) : (
                          <div className="w-full aspect-[2/3] bg-muted flex items-center justify-center"><Film className="h-12 w-12 text-muted-foreground" /></div>
                        )}
                        {item.rating && (
                          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/70 rounded-lg px-2 py-1">
                            <Star className="h-3 w-3 text-amber-500" /><span className="text-xs text-white font-semibold">{item.rating}</span>
                          </div>
                        )}
                        {item.type === 'movie' && (
                          <button onClick={(e) => { e.stopPropagation(); toggleMovieWatched(item); }} className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 backdrop-blur-sm">
                            {item.status === 'watched' ? <Eye className="h-4 w-4 text-emerald-400" /> : <EyeOff className="h-4 w-4 text-white/70" />}
                          </button>
                        )}
                        {progress && progress.total > 0 && (
                          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/30">
                            <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all" style={{ width: `${progress.percentage}%` }} />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-sm font-semibold text-foreground truncate flex-1">{item.title}</p>
                          {item.user_rating && (
                            <div className="flex items-center gap-0.5">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              <span className="text-xs font-medium text-amber-500">{item.user_rating}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {item.type === 'movie' && item.runtime && <span className="text-[10px] text-muted-foreground">{item.runtime} min</span>}
                          {progress && <span className="text-[10px] text-muted-foreground">{progress.watched}/{progress.total} eps</span>}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}

        {bottomTab === 'recommendations' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">{contentMode === 'series' ? 'What to Watch Next' : 'Recommended Movies'}</h2>
            {loadingRecs ? (
              <div className="text-center py-8"><p className="text-sm text-muted-foreground">Loading recommendations...</p></div>
            ) : recommendations.length === 0 ? (
              <Card className="border-border/30">
                <CardContent className="p-8 text-center">
                  <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">Watch more {contentMode} to get recommendations!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {recommendations.map(r => (
                  <Card key={r.id} className="border-border/30 overflow-hidden cursor-pointer hover:border-cyan-500/30 transition-all" onClick={() => openRecDetail(r)}>
                    <div className="relative">
                      {r.poster_path ? (
                        <img src={`${TMDB_IMAGE_BASE}${r.poster_path}`} alt={r.title} className="w-full aspect-[2/3] object-cover" />
                      ) : (
                        <div className="w-full aspect-[2/3] bg-muted flex items-center justify-center"><Film className="h-12 w-12 text-muted-foreground" /></div>
                      )}
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/70 rounded-lg px-2 py-1">
                        <Star className="h-3 w-3 text-amber-500" /><span className="text-xs text-white font-semibold">{r.vote_average?.toFixed(1)}</span>
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <p className="text-sm font-semibold text-foreground truncate">{r.title || r.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{r.release_date?.slice(0, 4) || r.first_air_date?.slice(0, 4)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {bottomTab === 'stats' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">{contentMode === 'movies' ? 'Movie' : 'Series'} Stats</h2>
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border-cyan-500/20">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-foreground">{statsData.watched}</p>
                  <p className="text-xs text-muted-foreground mt-1">Watched</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border-cyan-500/20">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-foreground">{statsData.total}</p>
                  <p className="text-xs text-muted-foreground mt-1">In Library</p>
                </CardContent>
              </Card>
              <Card className="col-span-2 bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border-cyan-500/20">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-foreground">
                    {statsData.totalMinutes >= 60 ? `${Math.floor(statsData.totalMinutes / 60)}h ${statsData.totalMinutes % 60}m` : `${statsData.totalMinutes}m`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Total Time Watched</p>
                </CardContent>
              </Card>
            </div>
            {statsData.topGenres.length > 0 && (
              <Card className="border-border/30">
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Top Genres</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statsData.topGenres} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                          {statsData.topGenres.map((_, i) => <Cell key={i} fill={STAT_COLORS[i % STAT_COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1.5 mt-2">
                    {statsData.topGenres.map((g, i) => (
                      <div key={g.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STAT_COLORS[i % STAT_COLORS.length] }} />
                          <span className="text-foreground">{g.name}</span>
                        </div>
                        <span className="text-muted-foreground">{g.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Media Detail Dialog */}
      <Dialog open={!!selectedMedia} onOpenChange={(open) => { if (!open) { setSelectedMedia(null); setSelectedMediaExtra(null); } }}>
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
                    {selectedMedia.rating && <Badge variant="secondary" className="gap-1"><Star className="h-3 w-3 text-amber-500" /> {selectedMedia.rating} TMDB</Badge>}
                    {selectedMedia.user_rating && <Badge variant="secondary" className="gap-1"><Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {selectedMedia.user_rating}/5 Your Rating</Badge>}
                    <Badge variant="outline">{selectedMedia.type === 'movie' ? 'Movie' : 'Series'}</Badge>
                    {selectedMedia.runtime && <Badge variant="outline">{selectedMedia.runtime} min</Badge>}
                    {selectedMedia.total_seasons && <Badge variant="outline">{selectedMedia.total_seasons} Seasons</Badge>}
                    {selectedMediaExtra?.year && <Badge variant="outline">{selectedMediaExtra.year}</Badge>}
                  </div>
                  {selectedMedia.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedMedia.genres.map(g => <Badge key={g} variant="secondary" className="text-[10px]">{g}</Badge>)}
                    </div>
                  )}
                  {selectedMediaExtra?.overview && (
                    <p className="text-sm text-muted-foreground leading-relaxed mt-2">{selectedMediaExtra.overview}</p>
                  )}
                </div>
                {selectedMedia.trailer_url && (
                  <a href={selectedMedia.trailer_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="w-full rounded-xl gap-2"><Play className="h-4 w-4" /> Watch Trailer <ExternalLink className="h-3 w-3" /></Button>
                  </a>
                )}
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
                            <button onClick={() => setExpandedSeasons(prev => isExpanded ? prev.filter(s => s !== season) : [...prev, season])} className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                              <span className="text-sm font-medium">Season {season}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">{watchedCount}/{seasonEps.length}</span>
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </div>
                            </button>
                            {isExpanded && (
                              <div className="border-t border-border/30">
                                {seasonEps.sort((a, b) => a.episode_number - b.episode_number).map(ep => {
                                  const upcoming = isUpcoming(ep.air_date);
                                  return (
                                    <button key={ep.id} onClick={() => !upcoming && toggleEpisodeWatched(ep)} disabled={upcoming}
                                      className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/30 transition-colors ${ep.watched ? 'opacity-60' : ''} ${upcoming ? 'opacity-50' : ''}`}>
                                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${ep.watched ? 'bg-emerald-500 border-emerald-500' : 'border-muted-foreground'}`}>
                                        {ep.watched && <Check className="h-3 w-3 text-white" />}
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-muted-foreground">E{ep.episode_number}</span>
                                          {upcoming && <Badge className="bg-emerald-500/20 text-emerald-500 text-[9px] px-1.5 py-0">🟢 Upcoming</Badge>}
                                          {ep.user_rating && (
                                            <div className="flex items-center gap-0.5">
                                              <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                                              <span className="text-[10px] text-amber-500">{ep.user_rating}</span>
                                            </div>
                                          )}
                                        </div>
                                        <p className={`text-sm ${ep.watched ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{ep.title || `Episode ${ep.episode_number}`}</p>
                                        {ep.air_date && <p className="text-[10px] text-muted-foreground">{new Date(ep.air_date).toLocaleDateString()}</p>}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
                <Button variant="destructive" size="sm" className="w-full rounded-xl" onClick={() => deleteMedia(selectedMedia.id)}>
                  <Trash2 className="h-4 w-4 mr-2" /> Remove from Library
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Recommendation Detail Dialog */}
      <Dialog open={!!recDetail} onOpenChange={(open) => !open && setRecDetail(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto p-0">
          {recDetail && (
            <>
              {recDetail.poster_path && (
                <div className="relative">
                  <img src={`${TMDB_IMAGE_BASE}${recDetail.poster_path}`} alt={recDetail.title || recDetail.name} className="w-full aspect-video object-cover object-top" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                </div>
              )}
              <div className="p-4 space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground">{recDetail.title || recDetail.name}</h2>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant="secondary" className="gap-1"><Star className="h-3 w-3 text-amber-500" /> {recDetail.vote_average?.toFixed(1)}</Badge>
                    <Badge variant="outline">{recDetail.media_type === 'movie' ? 'Movie' : 'Series'}</Badge>
                    {recDetail.release_date && <Badge variant="outline">{recDetail.release_date.slice(0, 4)}</Badge>}
                    {recDetail.first_air_date && <Badge variant="outline">{recDetail.first_air_date.slice(0, 4)}</Badge>}
                    {recDetail.runtime && <Badge variant="outline">{recDetail.runtime} min</Badge>}
                    {recDetail.number_of_seasons && <Badge variant="outline">{recDetail.number_of_seasons} Seasons</Badge>}
                  </div>
                  {recDetail.genres && recDetail.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {recDetail.genres.map((g: any) => <Badge key={g.id || g.name || g} variant="secondary" className="text-[10px]">{typeof g === 'string' ? g : g.name}</Badge>)}
                    </div>
                  )}
                </div>
                {recDetail.overview && <p className="text-sm text-muted-foreground leading-relaxed">{recDetail.overview}</p>}
                {(recDetail as any).trailer_url && (
                  <a href={(recDetail as any).trailer_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="w-full rounded-xl gap-2"><Play className="h-4 w-4" /> Watch Trailer <ExternalLink className="h-3 w-3" /></Button>
                  </a>
                )}
                <Button className="w-full rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white"
                  onClick={() => addToLibrary(recDetail, recDetail.media_type === 'movie' ? 'movie' : 'series')}>
                  <Plus className="h-4 w-4 mr-2" /> Add to Library
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Rating Dialog for Movies - Progressive fill */}
      <Dialog open={!!ratingMedia} onOpenChange={(open) => !open && setRatingMedia(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle>Rate this movie</DialogTitle></DialogHeader>
          <div className="flex items-center justify-between py-4">
            <span className="text-xs text-muted-foreground">1</span>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(r => (
                <button key={r} onClick={() => ratingMedia && submitMovieRating(ratingMedia, r)}
                  onMouseEnter={() => setMovieRatingValue(r)} onMouseLeave={() => setMovieRatingValue(0)}
                  className="p-2 hover:scale-110 transition-transform">
                  <Star className={`h-8 w-8 transition-colors ${r <= movieRatingValue ? 'fill-amber-400 text-amber-400' : 'text-amber-400/30'}`} />
                </button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">5</span>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rating Dialog for Episodes - Progressive fill */}
      <Dialog open={!!ratingEpisode} onOpenChange={(open) => !open && setRatingEpisode(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle>Rate this episode</DialogTitle></DialogHeader>
          <div className="flex items-center justify-between py-4">
            <span className="text-xs text-muted-foreground">1</span>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(r => (
                <button key={r} onClick={() => ratingEpisode && submitEpisodeRating(ratingEpisode, r)}
                  onMouseEnter={() => setEpisodeRatingValue(r)} onMouseLeave={() => setEpisodeRatingValue(0)}
                  className="p-2 hover:scale-110 transition-transform">
                  <Star className={`h-8 w-8 transition-colors ${r <= episodeRatingValue ? 'fill-amber-400 text-amber-400' : 'text-amber-400/30'}`} />
                </button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">5</span>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Dialog (FAB) with dynamic search */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add {contentMode === 'movies' ? 'Movie' : 'TV Show'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={`Search ${contentMode === 'movies' ? 'movies' : 'TV shows'}...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 rounded-xl" />
            </div>
            {searching && <p className="text-xs text-muted-foreground">Searching…</p>}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {searchResults.map((result) => (
                <button key={`${result.media_type}-${result.id}`} onClick={() => addToLibrary(result, contentMode === 'movies' ? 'movie' : 'series')}
                  className="w-full flex gap-3 rounded-2xl border border-border/40 bg-card/50 p-3 text-left hover:border-cyan-500/30 transition-all">
                  {result.poster_path ? (
                    <img src={`${TMDB_IMAGE_BASE}${result.poster_path}`} alt={result.title || result.name} className="w-14 h-20 rounded-lg object-cover" />
                  ) : (
                    <div className="w-14 h-20 rounded-lg bg-muted flex items-center justify-center">
                      {result.media_type === 'movie' ? <Film className="h-6 w-6 text-muted-foreground" /> : <Tv className="h-6 w-6 text-muted-foreground" />}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{result.title || result.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Star className="h-3 w-3 text-amber-500" />{result.vote_average?.toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground">{result.release_date?.slice(0, 4) || result.first_air_date?.slice(0, 4)}</span>
                    </div>
                    {result.overview && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{result.overview}</p>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* FAB */}
      <FloatingActionButton onClick={() => { click(); setSearchOpen(true); }} className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-cyan-500/40 hover:opacity-90">
        <Plus className="h-6 w-6" />
      </FloatingActionButton>

      {/* Bottom Navigation - Wallet-style glass */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        <div className="bg-background/80 backdrop-blur-2xl border-t border-border/20 shadow-2xl shadow-black/10">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
          <div className="grid grid-cols-3 h-16 px-2">
            {([
              { key: 'library' as BottomTab, icon: LibraryIcon, label: 'Library' },
              { key: 'recommendations' as BottomTab, icon: Sparkles, label: 'For You' },
              { key: 'stats' as BottomTab, icon: BarChart3, label: 'Stats' },
            ]).map(({ key, icon: Icon, label }) => (
              <button key={key} onClick={() => { click(); setBottomTab(key); }}
                className={`relative flex flex-col items-center justify-center gap-0.5 transition-all duration-300 rounded-2xl mx-1 ${bottomTab === key ? 'text-cyan-500' : 'text-muted-foreground hover:text-foreground'}`}>
                {bottomTab === key && (
                  <>
                    <div className="absolute inset-1 bg-gradient-to-b from-cyan-500/15 to-cyan-500/5 rounded-xl" />
                    <div className="absolute top-1 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r from-transparent via-cyan-500 to-transparent rounded-full" />
                  </>
                )}
                <div className={`relative z-10 transition-all duration-300 ${bottomTab === key ? 'scale-110 -translate-y-0.5' : ''}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className={`relative z-10 text-[10px] font-medium transition-all duration-300 ${bottomTab === key ? 'font-semibold' : ''}`}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TVTracker;
