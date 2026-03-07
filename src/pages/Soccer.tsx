import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSound } from "@/hooks/useSound";

const PROXY = "https://sfreodzibxmniiccqpcl.supabase.co/functions/v1/soccer-proxy";
const RM_CREST = "https://a.espncdn.com/i/teamlogos/soccer/500/86.png";

interface Team { name: string; shortName: string; logo: string; score: string; winner: boolean; }
interface Match {
  id: string; date: string; home: Team; away: Team;
  competition: string; completed: boolean; live: boolean; venue: string; status: string;
}
interface Standing {
  rank: number; name: string; shortName: string; logo: string;
  played: number; wins: number; draws: number; losses: number;
  gf: number; ga: number; gd: number; points: number; isRealMadrid: boolean;
}
interface SoccerData {
  nextMatch: Match | null;
  lastMatch: Match | null;
  liveMatches: Match[];
  upcomingMatches: Match[];
  pastMatches: Match[];
  standings: Standing[];
}

const COMP_COLORS: Record<string, string> = {
  "La Liga 2025/26": "#ef4444",
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
      {[{ v: d, l: "Days" }, { v: h, l: "Hrs" }, { v: m, l: "Min" }, { v: s, l: "Sec" }].map(({ v, l }) => (
        <div key={l} className="flex flex-col items-center bg-white/5 rounded-xl px-3 py-2 min-w-[52px]">
          <span className="text-xl font-black text-white tabular-nums" style={{ textShadow: "0 0 15px #c8a84b" }}>
            {String(v).padStart(2, "0")}
          </span>
          <span className="text-[9px] text-white/30 uppercase tracking-widest mt-0.5">{l}</span>
        </div>
      ))}
    </div>
  );
}

function MatchRow({ match }: { match: Match }) {
  const date = new Date(match.date);
  const compColor = COMP_COLORS[match.competition] || "#888";

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      {/* Competition + date bar */}
      <div className="flex items-center justify-between px-4 py-2"
        style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: compColor }} />
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: compColor }}>
            {match.competition}
          </span>
          {match.live && (
            <span className="text-[9px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full font-bold animate-pulse">
              LIVE
            </span>
          )}
        </div>
        <span className="text-[10px] text-white/30">
          {date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
        </span>
      </div>

      {/* Teams & score */}
      <div className="flex items-center justify-between px-4 py-4 gap-3">
        <div className={`flex flex-col items-center gap-1.5 flex-1 ${match.completed && !match.home.winner ? "opacity-40" : ""}`}>
          <img src={match.home.logo} className="h-11 w-11 object-contain drop-shadow-lg" />
          <span className="text-[11px] font-bold text-white text-center leading-tight">{match.home.name}</span>
        </div>
        <div className="flex flex-col items-center gap-1 min-w-[80px]">
          {match.completed || match.live ? (
            <>
              <span className="text-3xl font-black text-white tabular-nums"
                style={{ textShadow: "0 0 20px rgba(200,168,75,0.4)" }}>
                {match.home.score} – {match.away.score}
              </span>
              <span className="text-[9px] text-white/30 uppercase">{match.live ? "Live" : "Full Time"}</span>
            </>
          ) : (
            <>
              <span className="text-xl font-black text-white/30">VS</span>
              <span className="text-[10px] text-white/40">
                {date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </>
          )}
        </div>
        <div className={`flex flex-col items-center gap-1.5 flex-1 ${match.completed && !match.away.winner ? "opacity-40" : ""}`}>
          <img src={match.away.logo} className="h-11 w-11 object-contain drop-shadow-lg" />
          <span className="text-[11px] font-bold text-white text-center leading-tight">{match.away.name}</span>
        </div>
      </div>

      {/* Countdown for upcoming */}
      {!match.completed && !match.live && (
        <div className="px-4 pb-4">
          <Countdown date={match.date} />
        </div>
      )}
      {match.venue && (
        <p className="text-[9px] text-white/20 text-center pb-2.5">📍 {match.venue}</p>
      )}
    </div>
  );
}

export default function Soccer() {
  const navigate = useNavigate();
  const { click } = useSound();
  const [data, setData] = useState<SoccerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"upcoming" | "results" | "standings">("upcoming");
  const [compFilter, setCompFilter] = useState("All");

  useEffect(() => {
    fetch(PROXY)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const rmStanding = data?.standings?.find(s => s.isRealMadrid);

  // All RM matches combined for filter pills
  const allMatches = [
    ...(data?.liveMatches || []),
    ...(data?.upcomingMatches || []),
    ...(data?.pastMatches || []),
  ];
  const competitions = ["All", ...Array.from(new Set(allMatches.map(m => m.competition)))];
  const filterMatches = (matches: Match[]) =>
    compFilter === "All" ? matches : matches.filter(m => m.competition === compFilter);

  return (
    <div className="min-h-screen pb-16" style={{ background: "linear-gradient(180deg, #060d1a 0%, #0a1628 100%)" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-2xl border-b"
        style={{ background: "rgba(6,13,26,0.95)", borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => { click(); navigate("/"); }}
              className="rounded-xl h-9 w-9 text-white/60 hover:text-white hover:bg-white/10">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <img src={RM_CREST} className="h-9 w-9 object-contain drop-shadow-lg" />
            <div>
              <h1 className="text-base font-black text-white tracking-wide">Real Madrid</h1>
              <p className="text-[10px] text-white/30 uppercase tracking-widest">Season 2025/26</p>
            </div>
          </div>
          {rmStanding && (
            <div className="text-right">
              <p className="text-sm font-black text-white">#{rmStanding.rank} · La Liga</p>
              <p className="text-[10px] text-yellow-400/80">{rmStanding.points} pts</p>
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <p className="text-white/30 text-sm animate-pulse">Loading Real Madrid data...</p>
          </div>
        ) : (
          <>
            {/* Stats row */}
            {rmStanding && (
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Played", value: rmStanding.played },
                  { label: "Wins", value: rmStanding.wins },
                  { label: "GD", value: rmStanding.gd > 0 ? `+${rmStanding.gd}` : rmStanding.gd },
                  { label: "Points", value: rmStanding.points },
                ].map(s => (
                  <div key={s.label} className="rounded-2xl p-3 text-center"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-lg font-black text-white">{s.value}</p>
                    <p className="text-[9px] text-white/30 uppercase tracking-widest mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1.5 rounded-2xl p-1" style={{ background: "rgba(255,255,255,0.04)" }}>
              {([
                { key: "upcoming", label: "Upcoming", icon: Calendar },
                { key: "results", label: "Results", icon: Trophy },
                { key: "standings", label: "La Liga 2025/26", icon: Trophy },
              ] as const).map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => { click(); setTab(key); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold transition-all ${tab === key ? "bg-yellow-500/20 text-yellow-400" : "text-white/40 hover:text-white"}`}>
                  <Icon className="h-3 w-3" />{label}
                </button>
              ))}
            </div>

            {/* Competition filter pills */}
            {tab !== "standings" && competitions.length > 2 && (
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {competitions.map(comp => (
                  <button key={comp} onClick={() => { click(); setCompFilter(comp); }}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all whitespace-nowrap"
                    style={{
                      background: compFilter === comp ? (comp === "All" ? "#c8a84b" : COMP_COLORS[comp] || "#666") : "rgba(255,255,255,0.06)",
                      color: compFilter === comp ? "#000" : "rgba(255,255,255,0.5)",
                    }}>
                    {comp}
                  </button>
                ))}
              </div>
            )}

            {/* Upcoming tab — next matches first, with countdown */}
            {tab === "upcoming" && (
              <div className="space-y-3">
                {/* Live now */}
                {filterMatches(data?.liveMatches || []).length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-[10px] text-green-400 uppercase tracking-widest font-bold">Live Now</span>
                    </div>
                    {filterMatches(data?.liveMatches || []).map(m => <MatchRow key={m.id} match={m} />)}
                  </div>
                )}
                {/* Next upcoming */}
                {filterMatches(data?.upcomingMatches || []).length === 0 && filterMatches(data?.liveMatches || []).length === 0
                  ? <p className="text-white/20 text-sm text-center py-12">No upcoming matches</p>
                  : filterMatches(data?.upcomingMatches || []).map(m => <MatchRow key={m.id} match={m} />)
                }
              </div>
            )}

            {/* Results tab — past matches, most recent first */}
            {tab === "results" && (
              <div className="space-y-3">
                {filterMatches(data?.pastMatches || []).length === 0
                  ? <p className="text-white/20 text-sm text-center py-12">No results found</p>
                  : filterMatches(data?.pastMatches || []).map(m => <MatchRow key={m.id} match={m} />)
                }
              </div>
            )}

            {/* La Liga standings */}
            {tab === "standings" && (
              <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="grid grid-cols-12 gap-1 px-3 py-2 text-[9px] text-white/30 uppercase tracking-widest"
                  style={{ background: "rgba(255,255,255,0.04)" }}>
                  <div className="col-span-1">#</div>
                  <div className="col-span-5">Team</div>
                  <div className="col-span-1 text-center">P</div>
                  <div className="col-span-1 text-center">W</div>
                  <div className="col-span-1 text-center">D</div>
                  <div className="col-span-1 text-center">L</div>
                  <div className="col-span-1 text-center">GD</div>
                  <div className="col-span-1 text-center font-bold">Pts</div>
                </div>
                {data?.standings?.length === 0 && (
                  <p className="text-white/20 text-sm text-center py-8">Standings unavailable</p>
                )}
                {data?.standings?.map(row => (
                  <div key={row.rank}
                    className={`grid grid-cols-12 gap-1 px-3 py-2.5 text-xs ${row.isRealMadrid ? "bg-yellow-500/10" : ""}`}
                    style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                    <div className={`col-span-1 font-bold ${row.isRealMadrid ? "text-yellow-400" : "text-white/40"}`}>{row.rank}</div>
                    <div className="col-span-5 flex items-center gap-2">
                      <img src={row.logo} className="h-4 w-4 object-contain" />
                      <span className={`text-[11px] truncate font-semibold ${row.isRealMadrid ? "text-yellow-300" : "text-white/80"}`}>
                        {row.shortName || row.name}
                      </span>
                    </div>
                    <div className="col-span-1 text-center text-white/50">{row.played}</div>
                    <div className="col-span-1 text-center text-green-400/70">{row.wins}</div>
                    <div className="col-span-1 text-center text-yellow-400/70">{row.draws}</div>
                    <div className="col-span-1 text-center text-red-400/70">{row.losses}</div>
                    <div className="col-span-1 text-center text-white/40 text-[10px]">{row.gd > 0 ? `+${row.gd}` : row.gd}</div>
                    <div className={`col-span-1 text-center font-black ${row.isRealMadrid ? "text-yellow-400" : "text-white"}`}>{row.points}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
