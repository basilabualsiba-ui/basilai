import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Music2, Play, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtime } from "@/hooks/useRealtime";

export function SongsCard() {
  const navigate = useNavigate();
  const [count, setCount] = useState(0);
  const [latest, setLatest] = useState<string | null>(null);

  async function load() {
    const { data, count: total } = await supabase
      .from("songs")
      .select("title", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(1);
    setCount(total ?? 0);
    setLatest(data?.[0]?.title ?? null);
  }

  useEffect(() => { load(); }, []);
  useRealtime("songs", load);

  return (
    <div
      onClick={() => navigate("/songs")}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-950/80 to-emerald-900/40 border border-green-500/20 p-5 cursor-pointer transition-all duration-300 active:scale-95 hover:border-green-400/40 hover:shadow-lg hover:shadow-green-900/20"
    >
      {/* Glow orb */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-green-400/10 blur-2xl pointer-events-none" />

      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-2xl bg-green-400/15 border border-green-400/20 flex items-center justify-center">
          <Music2 className="h-5 w-5 text-green-400" />
        </div>
        <ChevronRight className="h-4 w-4 text-green-400/40 mt-1" />
      </div>

      <div className="space-y-1">
        <p className="text-xs text-green-400/70 font-medium uppercase tracking-wide">Playlist</p>
        <p className="text-2xl font-bold text-green-100">
          {count} <span className="text-base font-normal text-green-300/70">songs</span>
        </p>
        {latest && (
          <div className="flex items-center gap-1.5 mt-2">
            <Play className="h-3 w-3 text-green-400/60 fill-green-400/60" />
            <p className="text-xs text-green-300/60 truncate">{latest}</p>
          </div>
        )}
        {!latest && (
          <p className="text-xs text-green-300/40 mt-1">No songs yet</p>
        )}
      </div>
    </div>
  );
}
