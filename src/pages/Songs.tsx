import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Music2, Plus, Play, Pause, SkipForward, SkipBack,
  Repeat, Shuffle, Trash2, X, Check, ListMusic, Volume2,
  Youtube, ExternalLink, Lock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtime } from "@/hooks/useRealtime";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Song {
  id: string;
  title: string;
  artist: string | null;
  platform: "youtube" | "spotify";
  youtube_id: string | null;
  spotify_id: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  order_index: number;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseYouTubeId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([^?&\s]+)/,
    /youtube\.com\/watch\?v=([^&\s]+)/,
    /youtube\.com\/embed\/([^?&\s]+)/,
    /youtube\.com\/shorts\/([^?&\s]+)/,
    /^([a-zA-Z0-9_-]{11})$/, // raw ID
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function parseSpotifyId(url: string): string | null {
  const m = url.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/);
  return m ? m[1] : null;
}

function ytThumb(id: string) {
  return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
}

function formatTime(s: number | null) {
  if (!s) return "--:--";
  const m = Math.floor(s / 60);
  const sec = String(Math.floor(s % 60)).padStart(2, "0");
  return `${m}:${sec}`;
}

// ─── Admin passcode (5 taps on title) ────────────────────────────────────────
const ADMIN_TAPS = 5;

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Songs() {
  const navigate = useNavigate();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout>>();

  // Add form state
  const [addUrl, setAddUrl] = useState("");
  const [addTitle, setAddTitle] = useState("");
  const [addArtist, setAddArtist] = useState("");
  const [addSaving, setAddSaving] = useState(false);

  // YouTube player ref
  const ytRef = useRef<HTMLIFrameElement>(null);
  const silentAudioRef = useRef<HTMLAudioElement>(null);

  // ── Load songs ──────────────────────────────────────────────────────────────
  const loadSongs = useCallback(async () => {
    const { data } = await supabase
      .from("songs")
      .select("*")
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: true });
    setSongs((data as Song[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadSongs(); }, [loadSongs]);
  useRealtime("songs", loadSongs);

  const current = songs[currentIdx] ?? null;

  // ── MediaSession API — lock screen controls ──────────────────────────────────
  useEffect(() => {
    if (!current || !("mediaSession" in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: current.artist ?? "BASILIX Playlist",
      artwork: current.thumbnail_url
        ? [{ src: current.thumbnail_url, sizes: "512x512", type: "image/jpeg" }]
        : [],
    });

    navigator.mediaSession.setActionHandler("play", () => {
      setIsPlaying(true);
      postYT("playVideo");
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      setIsPlaying(false);
      postYT("pauseVideo");
    });
    navigator.mediaSession.setActionHandler("nexttrack", () => advance(1));
    navigator.mediaSession.setActionHandler("previoustrack", () => advance(-1));

    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
    };
  }, [current, currentIdx]);

  // Keep audio session alive on iOS — silent audio loop
  useEffect(() => {
    const el = silentAudioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [isPlaying]);

  // ── YouTube postMessage helper ────────────────────────────────────────────────
  function postYT(func: string, ...args: unknown[]) {
    const iframe = ytRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(
      JSON.stringify({ event: "command", func, args }),
      "*"
    );
  }

  // ── Play / Pause ─────────────────────────────────────────────────────────────
  function togglePlay() {
    if (!current) return;
    if (isPlaying) {
      postYT("pauseVideo");
      if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
    } else {
      postYT("playVideo");
      if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
    }
    setIsPlaying(p => !p);
  }

  // ── Navigate playlist ─────────────────────────────────────────────────────────
  function advance(dir: 1 | -1) {
    if (!songs.length) return;
    let next: number;
    if (shuffle) {
      next = Math.floor(Math.random() * songs.length);
    } else {
      next = (currentIdx + dir + songs.length) % songs.length;
    }
    setCurrentIdx(next);
    setIsPlaying(true);
  }

  function selectSong(idx: number) {
    setCurrentIdx(idx);
    setIsPlaying(true);
  }

  // ── Admin unlock (5 taps on Music title) ──────────────────────────────────────
  function handleTitleTap() {
    clearTimeout(tapTimer.current);
    const next = tapCount + 1;
    if (next >= ADMIN_TAPS) {
      setAdminMode(m => !m);
      setTapCount(0);
    } else {
      setTapCount(next);
      tapTimer.current = setTimeout(() => setTapCount(0), 1500);
    }
  }

  // ── Add song ──────────────────────────────────────────────────────────────────
  async function handleAdd() {
    const url = addUrl.trim();
    if (!url || !addTitle.trim()) return;
    setAddSaving(true);

    let platform: "youtube" | "spotify" = "youtube";
    let youtube_id: string | null = null;
    let spotify_id: string | null = null;
    let thumbnail_url: string | null = null;

    const ytId = parseYouTubeId(url);
    const spId = parseSpotifyId(url);

    if (ytId) {
      platform = "youtube";
      youtube_id = ytId;
      thumbnail_url = ytThumb(ytId);
    } else if (spId) {
      platform = "spotify";
      spotify_id = spId;
    } else {
      setAddSaving(false);
      return;
    }

    const payload = {
      title: addTitle.trim(),
      artist: addArtist.trim() || null,
      platform,
      youtube_id,
      spotify_id,
      thumbnail_url,
      order_index: songs.length,
    };

    const tempId = `temp-${Date.now()}`;
    const tempSong: Song = {
      id: tempId,
      duration_seconds: null,
      created_at: new Date().toISOString(),
      ...payload,
    };
    setSongs(prev => [...prev, tempSong]);
    setAddUrl(""); setAddTitle(""); setAddArtist("");
    setShowAdd(false); setAddSaving(false);

    const { data } = await supabase.from("songs").insert(payload).select().single();
    if (data) setSongs(prev => prev.map(s => s.id === tempId ? data as Song : s));
  }

  // ── Delete song ───────────────────────────────────────────────────────────────
  async function deleteSong(id: string) {
    setSongs(prev => {
      const next = prev.filter(s => s.id !== id);
      if (currentIdx >= next.length) setCurrentIdx(Math.max(0, next.length - 1));
      return next;
    });
    await supabase.from("songs").delete().eq("id", id);
  }

  // ── YT iframe src ─────────────────────────────────────────────────────────────
  function ytSrc(id: string, autoplay: boolean) {
    return `https://www.youtube.com/embed/${id}?enablejsapi=1&autoplay=${autoplay ? 1 : 0}&controls=0&rel=0&playsinline=1&loop=0`;
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Silent audio for iOS audio session */}
      <audio ref={silentAudioRef} loop preload="none"
        src="data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAA..." />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-bold text-lg cursor-pointer select-none" onClick={handleTitleTap}>
          <Music2 className="inline h-5 w-5 mr-1.5 text-green-400" />
          Songs
          {adminMode && <span className="ml-2 text-[10px] bg-green-400/20 text-green-400 px-2 py-0.5 rounded-full">Admin</span>}
        </h1>
        {adminMode && (
          <button onClick={() => setShowAdd(true)}
            className="w-9 h-9 rounded-xl bg-green-400/15 flex items-center justify-center text-green-400 transition-all active:scale-90">
            <Plus className="h-5 w-5" />
          </button>
        )}
        {!adminMode && <div className="w-9" />}
      </div>

      {/* Player area */}
      {current ? (
        <div className="flex flex-col">
          {/* Album art / video area */}
          <div className="relative w-full bg-black" style={{ aspectRatio: "16/9" }}>
            {current.platform === "youtube" && current.youtube_id ? (
              <iframe
                ref={ytRef}
                key={current.youtube_id}
                src={ytSrc(current.youtube_id, isPlaying)}
                className="w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title={current.title}
              />
            ) : current.platform === "spotify" && current.spotify_id ? (
              <iframe
                key={current.spotify_id}
                src={`https://open.spotify.com/embed/track/${current.spotify_id}?utm_source=generator&theme=0`}
                className="w-full h-full"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                title={current.title}
              />
            ) : null}
          </div>

          {/* iOS background note */}
          <div className="flex items-center gap-1.5 px-4 py-2 bg-yellow-400/5 border-b border-yellow-400/10">
            <Lock className="h-3 w-3 text-yellow-400/60" />
            <span className="text-[10px] text-yellow-400/60">
              For lock-screen audio on iOS, keep the screen on or use the YouTube/Spotify app
            </span>
          </div>

          {/* Song info + controls */}
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-start justify-between gap-2 mb-4">
              <div className="min-w-0">
                <h2 className="font-bold text-base truncate">{current.title}</h2>
                <p className="text-sm text-muted-foreground truncate">{current.artist ?? "Unknown artist"}</p>
              </div>
              <span className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded-full shrink-0 flex items-center gap-1">
                {current.platform === "youtube"
                  ? <><Youtube className="h-3 w-3 text-red-500" />YouTube</>
                  : <><ExternalLink className="h-3 w-3 text-green-500" />Spotify</>
                }
              </span>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between mb-5">
              <button onClick={() => setShuffle(s => !s)}
                className={`p-2 rounded-xl transition-all ${shuffle ? "text-green-400" : "text-muted-foreground"}`}>
                <Shuffle className="h-5 w-5" />
              </button>
              <button onClick={() => advance(-1)}
                className="p-3 rounded-xl hover:bg-muted transition-all active:scale-90">
                <SkipBack className="h-6 w-6" />
              </button>
              <button onClick={togglePlay}
                className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-lg transition-all active:scale-90">
                {isPlaying ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 ml-1" />}
              </button>
              <button onClick={() => advance(1)}
                className="p-3 rounded-xl hover:bg-muted transition-all active:scale-90">
                <SkipForward className="h-6 w-6" />
              </button>
              <button onClick={() => setRepeat(r => !r)}
                className={`p-2 rounded-xl transition-all ${repeat ? "text-green-400" : "text-muted-foreground"}`}>
                <Repeat className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      ) : !loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-16 text-center px-6">
          <div className="w-20 h-20 rounded-3xl bg-green-400/10 flex items-center justify-center">
            <Music2 className="h-10 w-10 text-green-400/50" />
          </div>
          <div>
            <p className="font-semibold text-muted-foreground">No songs yet</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Tap the title 5 times to unlock admin mode and add songs</p>
          </div>
        </div>
      ) : null}

      {/* Playlist */}
      {songs.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <ListMusic className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Playlist · {songs.length} songs</span>
          </div>
          <div className="divide-y divide-border/40">
            {songs.map((song, idx) => (
              <div key={song.id}
                className={`flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer ${idx === currentIdx ? "bg-white/5" : "hover:bg-muted/40"}`}
                onClick={() => selectSong(idx)}>
                {/* Thumbnail */}
                <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-muted relative">
                  {song.thumbnail_url
                    ? <img src={song.thumbnail_url} alt={song.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center">
                        {song.platform === "youtube" ? <Youtube className="h-5 w-5 text-red-400" /> : <Music2 className="h-5 w-5 text-green-400" />}
                      </div>
                  }
                  {idx === currentIdx && isPlaying && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Volume2 className="h-4 w-4 text-white animate-pulse" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium truncate ${idx === currentIdx ? "text-green-400" : ""}`}>
                    {song.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{song.artist ?? "—"}</p>
                </div>

                {/* Duration / delete */}
                <div className="flex items-center gap-2 shrink-0">
                  {song.duration_seconds && (
                    <span className="text-[11px] text-muted-foreground">{formatTime(song.duration_seconds)}</span>
                  )}
                  {adminMode && (
                    <button onClick={e => { e.stopPropagation(); deleteSong(song.id); }}
                      className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-all active:scale-90">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Song Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card rounded-t-3xl p-6 pb-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base">Add Song</h3>
              <button onClick={() => setShowAdd(false)} className="p-2 rounded-xl hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">YouTube or Spotify URL *</label>
                <input
                  value={addUrl}
                  onChange={e => setAddUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... or spotify.com/track/..."
                  className="w-full bg-muted rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400/40"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Title *</label>
                <input
                  value={addTitle}
                  onChange={e => setAddTitle(e.target.value)}
                  placeholder="Song title"
                  className="w-full bg-muted rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400/40"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Artist (optional)</label>
                <input
                  value={addArtist}
                  onChange={e => setAddArtist(e.target.value)}
                  placeholder="Artist name"
                  className="w-full bg-muted rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400/40"
                />
              </div>
            </div>

            <button
              onClick={handleAdd}
              disabled={addSaving || !addUrl.trim() || !addTitle.trim()}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm text-black bg-green-400 disabled:opacity-40 active:scale-95 transition-all flex items-center justify-center gap-2">
              <Check className="h-4 w-4" />
              Add to Playlist
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
