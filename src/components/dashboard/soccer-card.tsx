import { useEffect, useState, useRef } from "react";
import { useSound } from "@/hooks/useSound";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Team { name: string; shortName: string; logo: string; score: string; winner: boolean; }
interface MatchData {
  id: string; date: string; home: Team; away: Team;
  competition: string; completed: boolean; live: boolean; venue: string;
}
interface SoccerData {
  nextMatch: MatchData | null;
  lastMatch: MatchData | null;
  liveMatches: MatchData[];
  upcomingMatches: MatchData[];
  pastMatches: MatchData[];
  standings: { rank: number; name: string; points: number; played: number; isRealMadrid: boolean }[];
}

const PROXY = "https://sfreodzibxmniiccqpcl.supabase.co/functions/v1/soccer-proxy";
const RM_CREST = "https://a.espncdn.com/i/teamlogos/soccer/500/86.png";

const COMP_COLORS: Record<string, string> = {
  "La Liga": "#ef4444",
  "Champions League": "#3b82f6",
  "Copa del Rey": "#f59e0b",
  "Club World Cup": "#8b5cf6",
  "Europa League": "#f97316",
};

function Countdown({ date }: { date: string }) {
  const [diff, setDiff] = useState(0);
  useEffect(() => {
    const update = () => setDiff(Math.max(0, new Date(date).getTime() - Date.now()));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [date]);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return (
    <div className="flex items-center gap-2 justify-center">
      {[{ v: d, l: "d" }, { v: h, l: "h" }, { v: m, l: "m" }, { v: s, l: "s" }].map(({ v, l }) => (
        <div key={l} className="flex flex-col items-center bg-white/5 rounded-lg px-2.5 py-1.5 min-w-[38px]">
          <span className="text-base font-black text-white tabular-nums" style={{ textShadow: "0 0 10px #c8a84b" }}>
            {String(v).padStart(2, "0")}
          </span>
          <span className="text-[8px] text-white/30 uppercase">{l}</span>
        </div>
      ))}
    </div>
  );
}

export function SoccerCard() {
  const { click } = useSound();
  const [data, setData] = useState<SoccerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0); // 0 = next upcoming; negative = past; positive = further upcoming
  const [slideDir, setSlideDir] = useState<"left" | "right" | null>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    fetch(PROXY)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const rmStanding = data?.standings?.find(s => s.isRealMadrid);

  // Build a combined ordered list: past (reversed so index -1 = most recent past) + upcoming
  // index 0 = upcoming[0], index 1 = upcoming[1], index -1 = past[0], index -2 = past[1]
  const upcoming = data?.upcomingMatches || [];
  const past = data?.pastMatches || []; // already sorted most recent first
  const live = data?.liveMatches || [];

  const getMatch = (i: number): MatchData | null => {
    if (live.length > 0 && i === 0) return live[0];
    if (i >= 0) return upcoming[i] || null;
    return past[Math.abs(i) - 1] || null;
  };

  const maxIndex = Math.max(upcoming.length - 1, 0);
  const minIndex = -Math.min(past.length, 5); // show up to 5 past

  const canGoNext = index < maxIndex;
  const canGoPrev = index > minIndex;

  const go = (dir: "left" | "right") => {
    click();
    setSlideDir(dir);
    setTimeout(() => {
      setIndex(prev => dir === "left" ? Math.min(prev + 1, maxIndex) : Math.max(prev - 1, minIndex));
      setSlideDir(null);
    }, 150);
  };

  // Touch handlers
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    if (dx < 0 && canGoNext) go("left");   // swipe left = next
    if (dx > 0 && canGoPrev) go("right");  // swipe right = previous
  };

  const match = getMatch(index);
  const isLive = match?.live || false;
  const isPast = index < 0;
  const compColor = match ? (COMP_COLORS[match.competition] || "#888") : "#888";
  const matchDate = match ? new Date(match.date) : null;

  return (
    <div
      className="relative overflow-hidden rounded-3xl select-none"
      style={{
        background: "linear-gradient(135deg, #0a1628 0%, #0d2137 50%, #0a1628 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        minHeight: 200,
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Grass stripe */}
      <div className="absolute bottom-0 left-0 right-0 h-6 opacity-10"
        style={{ background: "repeating-linear-gradient(90deg, #16a34a 0px, #16a34a 18px, #15803d 18px, #15803d 36px)" }} />
      {/* Gold glow */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, #c8a84b, transparent)" }} />

      <div className="relative p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={RM_CREST} className="h-7 w-7 object-contain drop-shadow-lg" alt="Real Madrid" />
            <div>
              <p className="text-xs font-black text-white tracking-wider">REAL MADRID</p>
              <p className="text-[9px] text-white/40 uppercase tracking-widest">2025/26 Season</p>
            </div>
          </div>
          {rmStanding && (
            <div className="text-right">
              <p className="text-[10px] text-white/40">#{rmStanding.rank} La Liga</p>
              <p className="text-[9px] text-yellow-400/70 font-bold">{rmStanding.points} pts</p>
            </div>
          )}
        </div>

        {loading ? (
          <p className="text-xs text-white/30 text-center py-6 animate-pulse">Loading...</p>
        ) : !match ? (
          <p className="text-xs text-white/20 text-center py-6">No matches available</p>
        ) : (
          <div
            className="transition-all duration-150"
            style={{ opacity: slideDir ? 0 : 1, transform: slideDir === "left" ? "translateX(-12px)" : slideDir === "right" ? "translateX(12px)" : "translateX(0)" }}
          >
            {/* Competition + status badge */}
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: compColor }} />
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: compColor }}>
                  {match.competition}
                </span>
              </div>
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ${
                isLive ? "bg-green-500/20 text-green-400 animate-pulse" :
                isPast ? "bg-white/5 text-white/30" :
                "bg-yellow-500/10 text-yellow-400/60"
              }`}>
                {isLive ? "● Live" : isPast ? "Full Time" : matchDate?.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>

            {/* Teams + score */}
            <div className="flex items-center justify-between gap-2 bg-white/4 rounded-2xl px-3 py-3"
              style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className={`flex flex-col items-center gap-1 flex-1 ${isPast && !match.home.winner ? "opacity-40" : ""}`}>
                <img src={match.home.logo} className="h-10 w-10 object-contain drop-shadow-lg" />
                <span className="text-[10px] font-bold text-white text-center leading-tight">{match.home.name}</span>
              </div>
              <div className="flex flex-col items-center gap-0.5 min-w-[70px]">
                {isLive || isPast ? (
                  <>
                    <span className="text-2xl font-black text-white tabular-nums"
                      style={{ textShadow: "0 0 15px rgba(200,168,75,0.4)" }}>
                      {match.home.score} – {match.away.score}
                    </span>
                    <span className="text-[8px] text-white/30 uppercase">{isLive ? "live" : "ft"}</span>
                  </>
                ) : (
                  <>
                    <span className="text-lg font-black text-white/25">VS</span>
                    <span className="text-[9px] text-white/30">
                      {matchDate?.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </>
                )}
              </div>
              <div className={`flex flex-col items-center gap-1 flex-1 ${isPast && !match.away.winner ? "opacity-40" : ""}`}>
                <img src={match.away.logo} className="h-10 w-10 object-contain drop-shadow-lg" />
                <span className="text-[10px] font-bold text-white text-center leading-tight">{match.away.name}</span>
              </div>
            </div>

            {/* Countdown for upcoming */}
            {!isPast && !isLive && (
              <div className="mt-2.5">
                <p className="text-[8px] text-white/20 text-center uppercase tracking-widest mb-1.5">Kick-off in</p>
                <Countdown date={match.date} />
              </div>
            )}
          </div>
        )}

        {/* Swipe nav dots + arrows */}
        {!loading && (
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => canGoPrev && go("right")}
              className={`p-1 rounded-lg transition-all ${canGoPrev ? "text-white/50 hover:text-white active:scale-90" : "text-white/10 cursor-default"}`}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            {/* Dots: past on left, upcoming on right, current = gold */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(past.length, 5) }).map((_, i) => {
                const dotIndex = -(Math.min(past.length, 5) - i);
                return (
                  <div key={dotIndex} className="w-1 h-1 rounded-full transition-all"
                    style={{ background: index === dotIndex ? "#c8a84b" : "rgba(255,255,255,0.15)" }} />
                );
              })}
              {upcoming.slice(0, 5).map((_, i) => (
                <div key={i} className="w-1 h-1 rounded-full transition-all"
                  style={{ background: index === i ? "#c8a84b" : "rgba(255,255,255,0.15)" }} />
              ))}
            </div>

            <button
              onClick={() => canGoNext && go("left")}
              className={`p-1 rounded-lg transition-all ${canGoNext ? "text-white/50 hover:text-white active:scale-90" : "text-white/10 cursor-default"}`}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
