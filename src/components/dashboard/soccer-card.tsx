import { useEffect, useState, useRef } from "react";
import { useSound } from "@/hooks/useSound";
import { scheduleMatchPush } from "@/services/PushService";
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
    <div className="flex items-center gap-3 justify-center">
      {[{ v: d, l: "Days" }, { v: h, l: "Hrs" }, { v: m, l: "Min" }, { v: s, l: "Sec" }].map(({ v, l }) => (
        <div key={l} className="flex flex-col items-center bg-white/5 rounded-xl px-4 py-2 min-w-[52px]">
          <span className="text-2xl font-black text-white tabular-nums" style={{ textShadow: "0 0 14px #c8a84b" }}>
            {String(v).padStart(2, "0")}
          </span>
          <span className="text-[9px] text-white/30 uppercase tracking-widest mt-0.5">{l}</span>
        </div>
      ))}
    </div>
  );
}

export function SoccerCard() {
  const { click } = useSound();
  const [data, setData] = useState<SoccerData | null>(null);
  const [loading, setLoading] = useState(true);
  // index: 0 = upcoming[0] (default), 1 = upcoming[1], -1 = past[0], etc.
  const [index, setIndex] = useState(0);
  const [anim, setAnim] = useState<"left"|"right"|null>(null);
  const touchStartX = useRef<number|null>(null);

  useEffect(() => {
    fetch(PROXY)
      .then(r => r.json())
      .then(d => {
        setData(d);
        setLoading(false);
        // Schedule push notification 30 min before next match
        if (d?.upcomingMatches?.[0]) scheduleMatchPush(d.upcomingMatches[0]).catch(console.error);
      })
      .catch(() => setLoading(false));
  }, []);

  const live     = data?.liveMatches     || [];
  const upcoming = data?.upcomingMatches || [];
  const past     = data?.pastMatches     || [];

  // index 0 = upcoming[0], 1 = upcoming[1], -1 = past[0], -2 = past[1]
  const getMatch = (i: number): MatchData | null => {
    if (live.length > 0 && i === 0) return live[0];
    if (i >= 0) return upcoming[i] ?? null;
    return past[Math.abs(i) - 1] ?? null;
  };

  const maxIdx =  Math.max(upcoming.length - 1, 0);
  const minIdx = -Math.min(past.length, 5);
  const canNext = index < maxIdx;
  const canPrev = index > minIdx;

  const go = (dir: "left"|"right") => {
    if (dir === "left" && !canNext) return;
    if (dir === "right" && !canPrev) return;
    click();
    setAnim(dir);
    setTimeout(() => {
      setIndex(i => dir === "left" ? i + 1 : i - 1);
      setAnim(null);
    }, 150);
  };

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd   = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) go("left");
    if (dx > 0) go("right");
  };

  const match = getMatch(index);
  const isLive = match?.live || false;
  const isPast = index < 0;
  const compColor = match ? (COMP_COLORS[match.competition] || "#888") : "#888";
  const matchDate = match ? new Date(match.date) : null;

  // Dots: up to 5 past on left, up to 5 upcoming on right
  const pastDots     = Math.min(past.length, 5);
  const upcomingDots = Math.min(upcoming.length, 5);

  return (
    <div
      className="relative overflow-hidden rounded-3xl select-none w-full"
      style={{
        background: "linear-gradient(135deg, #0a1628 0%, #0d2137 50%, #0a1628 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        minHeight: 220,
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Grass stripe */}
      <div className="absolute bottom-0 left-0 right-0 h-6 opacity-10"
        style={{ background: "repeating-linear-gradient(90deg, #16a34a 0px, #16a34a 18px, #15803d 18px, #15803d 36px)" }} />
      {/* Gold glow */}
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, #c8a84b, transparent)" }} />

      <div className="relative p-5">
          </div>
          {rmStanding && (
            <div className="text-right">
              <p className="text-xs text-white/40">#{rmStanding.rank} La Liga</p>
              <p className="text-[10px] text-yellow-400/70 font-bold">{rmStanding.points} pts</p>
            </div>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-white/30 text-center py-8 animate-pulse">Loading...</p>
        ) : !match ? (
          <p className="text-sm text-white/20 text-center py-8">No matches available</p>
        ) : (
          <div
            className="transition-all duration-150"
            style={{
              opacity: anim ? 0 : 1,
              transform: anim === "left" ? "translateX(-16px)" : anim === "right" ? "translateX(16px)" : "translateX(0)",
            }}
          >
            {/* Competition + date badge */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: compColor }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: compColor }}>
                  {match.competition}
                </span>
              </div>
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-widest ${
                isLive ? "bg-green-500/20 text-green-400 animate-pulse" :
                isPast ? "bg-white/5 text-white/30" :
                "bg-yellow-500/10 text-yellow-400/60"
              }`}>
                {isLive ? "● Live" : isPast
                  ? matchDate?.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  : matchDate?.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </span>
            </div>

            {/* Teams + score */}
            <div className="flex items-center justify-between gap-4 rounded-2xl px-6 py-4 mb-3"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className={`flex flex-col items-center gap-2 flex-1 ${isPast && !match.home.winner ? "opacity-40" : ""}`}>
                <img src={match.home.logo} className="h-14 w-14 object-contain drop-shadow-xl" />
                <span className="text-xs font-bold text-white text-center leading-tight">{match.home.name}</span>
              </div>
              <div className="flex flex-col items-center gap-1 min-w-[80px]">
                {isLive || isPast ? (
                  <>
                    <span className="text-3xl font-black text-white tabular-nums"
                      style={{ textShadow: "0 0 20px rgba(200,168,75,0.5)" }}>
                      {match.home.score} – {match.away.score}
                    </span>
                    <span className="text-[9px] text-white/30 uppercase">{isLive ? "Live" : "FT"}</span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl font-black text-white/25">VS</span>
                    <span className="text-[10px] text-white/30">
                      {matchDate?.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </>
                )}
              </div>
              <div className={`flex flex-col items-center gap-2 flex-1 ${isPast && !match.away.winner ? "opacity-40" : ""}`}>
                <img src={match.away.logo} className="h-14 w-14 object-contain drop-shadow-xl" />
                <span className="text-xs font-bold text-white text-center leading-tight">{match.away.name}</span>
              </div>
            </div>

            {/* Countdown for upcoming */}
            {!isPast && !isLive && (
              <div className="mb-1">
                <p className="text-[9px] text-white/20 text-center uppercase tracking-widest mb-2">Kick-off in</p>
                <Countdown date={match.date} />
              </div>
            )}

            {match.venue && (
              <p className="text-[9px] text-white/15 text-center mt-2">📍 {match.venue}</p>
            )}
          </div>
        )}

        {/* Nav row */}
        {!loading && (
          <div className="flex items-center justify-between mt-4">
            <button onClick={() => go("right")}
              className={`p-1.5 rounded-xl transition-all ${canPrev ? "text-white/50 hover:text-white hover:bg-white/5 active:scale-90" : "text-white/10 cursor-default"}`}>
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Dots */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: pastDots }).map((_, i) => {
                const di = -(pastDots - i);
                return <div key={di} className="rounded-full transition-all duration-200"
                  style={{ width: index===di ? 16 : 6, height: 6, background: index===di ? "#c8a84b" : "rgba(255,255,255,0.15)" }} />;
              })}
              {Array.from({ length: upcomingDots }).map((_, i) => (
                <div key={i} className="rounded-full transition-all duration-200"
                  style={{ width: index===i ? 16 : 6, height: 6, background: index===i ? "#c8a84b" : "rgba(255,255,255,0.15)" }} />
              ))}
            </div>

            <button onClick={() => go("left")}
              className={`p-1.5 rounded-xl transition-all ${canNext ? "text-white/50 hover:text-white hover:bg-white/5 active:scale-90" : "text-white/10 cursor-default"}`}>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
