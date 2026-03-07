import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSound } from "@/hooks/useSound";

interface Team { name: string; shortName: string; logo: string; score: string; winner: boolean; }
interface MatchData {
  id: string; date: string; home: Team; away: Team;
  competition: string; completed: boolean; live: boolean; venue: string; status: string;
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
    <div className="flex items-center gap-1.5 justify-center">
      {[{ v: d, l: "d" }, { v: h, l: "h" }, { v: m, l: "m" }, { v: s, l: "s" }].map(({ v, l }) => (
        <div key={l} className="flex flex-col items-center bg-white/5 rounded-lg px-2 py-1">
          <span className="text-sm font-black text-white tabular-nums" style={{ textShadow: "0 0 8px #c8a84b" }}>
            {String(v).padStart(2, "0")}
          </span>
          <span className="text-[7px] text-white/30 uppercase">{l}</span>
        </div>
      ))}
    </div>
  );
}

function MiniMatch({ match, showCountdown }: { match: MatchData; showCountdown?: boolean }) {
  const compColor = COMP_COLORS[match.competition] || "#888";
  const date = new Date(match.date);
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
      {/* Competition row */}
      <div className="flex items-center justify-between px-2.5 py-1"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-1.5">
          <div className="w-1 h-1 rounded-full" style={{ background: compColor }} />
          <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: compColor }}>
            {match.competition}
          </span>
          {match.live && <span className="text-[7px] bg-green-500/20 text-green-400 px-1 py-0.5 rounded-full font-bold animate-pulse">LIVE</span>}
        </div>
        {!match.live && (
          <span className="text-[8px] text-white/25">
            {match.completed
              ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
              : date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        )}
      </div>
      {/* Score row */}
      <div className="flex items-center justify-between px-2.5 py-1.5">
        <div className="flex items-center gap-1">
          <img src={match.home.logo} className="h-4 w-4 object-contain" />
          <span className="text-[9px] text-white/70 font-semibold">{match.home.shortName}</span>
        </div>
        <div className="text-center">
          {match.completed || match.live ? (
            <span className="text-xs font-black text-white">{match.home.score} – {match.away.score}</span>
          ) : (
            <span className="text-[9px] text-white/40 font-bold">
              {date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-white/70 font-semibold">{match.away.shortName}</span>
          <img src={match.away.logo} className="h-4 w-4 object-contain" />
        </div>
      </div>
      {/* Countdown for upcoming */}
      {showCountdown && !match.completed && !match.live && (
        <div className="pb-2">
          <Countdown date={match.date} />
        </div>
      )}
    </div>
  );
}

export function SoccerCard() {
  const navigate = useNavigate();
  const { click } = useSound();
  const [data, setData] = useState<SoccerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"upcoming" | "results">("upcoming");

  useEffect(() => {
    fetch(PROXY)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const rmStanding = data?.standings?.find(s => s.isRealMadrid);
  const liveMatch = data?.liveMatches?.[0] || null;
  const nextMatch = data?.nextMatch || null;

  // Hero: show live match if live, else show next upcoming match
  const heroMatch = liveMatch || nextMatch;

  // Tabs data — show 3 items max in card
  const upcomingList = (data?.upcomingMatches || []).slice(0, 3);
  const resultsList = (data?.pastMatches || []).slice(0, 3);

  return (
    <div
      className="relative overflow-hidden rounded-3xl cursor-pointer group transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
      style={{
        background: "linear-gradient(135deg, #0a1628 0%, #0d2137 50%, #0a1628 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Grass stripe */}
      <div className="absolute bottom-0 left-0 right-0 h-5 opacity-10"
        style={{ background: "repeating-linear-gradient(90deg, #16a34a 0px, #16a34a 18px, #15803d 18px, #15803d 36px)" }} />
      {/* Gold glow */}
      <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full opacity-20 group-hover:opacity-30 transition-opacity"
        style={{ background: "radial-gradient(circle, #c8a84b, transparent)" }} />

      <div className="relative p-4 space-y-3" onClick={() => { click(); navigate("/soccer"); }}>
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
          <p className="text-xs text-white/30 text-center py-4 animate-pulse">Loading...</p>
        ) : (
          <>
            {/* Hero: next match OR live match */}
            {heroMatch && (
              <div className="rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {/* Label bar */}
                <div className="flex items-center justify-center gap-1.5 py-1.5"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: liveMatch ? "rgba(34,197,94,0.1)" : "rgba(200,168,75,0.07)" }}>
                  {liveMatch ? (
                    <><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /><span className="text-[9px] text-green-400 font-bold uppercase tracking-widest">Live · {heroMatch.competition}</span></>
                  ) : (
                    <span className="text-[9px] text-yellow-400/60 uppercase tracking-widest font-semibold">
                      Next · {heroMatch.competition}
                    </span>
                  )}
                </div>
                {/* Teams */}
                <div className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <img src={heroMatch.home.logo} className="h-6 w-6 object-contain" />
                    <span className="text-[10px] text-white/80 font-bold">{heroMatch.home.shortName}</span>
                  </div>
                  <div className="text-center">
                    {liveMatch ? (
                      <>
                        <span className="text-base font-black text-white">{heroMatch.home.score} – {heroMatch.away.score}</span>
                        <p className="text-[8px] text-green-400/60">LIVE</p>
                      </>
                    ) : (
                      <span className="text-base font-black text-white/30">VS</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-white/80 font-bold">{heroMatch.away.shortName}</span>
                    <img src={heroMatch.away.logo} className="h-6 w-6 object-contain" />
                  </div>
                </div>
                {/* Countdown for next match */}
                {!liveMatch && nextMatch && (
                  <div className="pb-2.5">
                    <Countdown date={nextMatch.date} />
                  </div>
                )}
              </div>
            )}

            {/* Tabs: Upcoming / Results */}
            <div onClick={e => e.stopPropagation()}>
              <div className="flex gap-1 rounded-xl p-0.5 mb-2" style={{ background: "rgba(255,255,255,0.04)" }}>
                {(["upcoming", "results"] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${tab === t ? "bg-yellow-500/20 text-yellow-400" : "text-white/30 hover:text-white/60"}`}>
                    {t === "upcoming" ? "Upcoming" : "Results"}
                  </button>
                ))}
              </div>

              <div className="space-y-1.5">
                {tab === "upcoming" && (
                  upcomingList.length === 0
                    ? <p className="text-[10px] text-white/20 text-center py-2">No upcoming matches</p>
                    : upcomingList.map(m => <MiniMatch key={m.id} match={m} showCountdown={false} />)
                )}
                {tab === "results" && (
                  resultsList.length === 0
                    ? <p className="text-[10px] text-white/20 text-center py-2">No results yet</p>
                    : resultsList.map(m => <MiniMatch key={m.id} match={m} />)
                )}
              </div>
            </div>

            {/* View all link */}
            <p className="text-[9px] text-white/20 text-center">Tap to view all matches →</p>
          </>
        )}
      </div>
    </div>
  );
}
