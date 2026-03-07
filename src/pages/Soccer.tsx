import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, Calendar, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSound } from "@/hooks/useSound";

const PROXY = "https://sfreodzibxmniiccqpcl.supabase.co/functions/v1/soccer-proxy";
const RM_CREST = "https://a.espncdn.com/i/teamlogos/soccer/500/86.png";

interface Team { name: string; shortName: string; logo: string; score: string; winner: boolean; }
interface Match {
  date: string; home: Team; away: Team;
  competition: string; completed: boolean; venue: string; status: string;
}
interface Standing {
  rank: number; name: string; shortName: string; logo: string;
  played: number; wins: number; draws: number; losses: number;
  gf: number; ga: number; gd: number; points: number; isRealMadrid: boolean;
}
interface SoccerData {
  nextMatch: Match | null;
  lastMatch: Match | null;
  standings: Standing[];
  liveGames: Match[];
}

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
      {[{ v: d, l: "Days" }, { v: h, l: "Hours" }, { v: m, l: "Min" }, { v: s, l: "Sec" }].map(({ v, l }) => (
        <div key={l} className="flex flex-col items-center bg-white/5 rounded-2xl px-4 py-3 min-w-[60px]">
          <span className="text-2xl font-black text-white tabular-nums" style={{ textShadow: "0 0 20px #c8a84b" }}>
            {String(v).padStart(2, "0")}
          </span>
          <span className="text-[9px] text-white/40 uppercase tracking-widest mt-0.5">{l}</span>
        </div>
      ))}
    </div>
  );
}

function MatchCard({ match, label }: { match: Match; label: string }) {
  const date = new Date(match.date);
  const isRM_Home = match.home.name.toLowerCase().includes("real madrid");
  const rm = isRM_Home ? match.home : match.away;
  const opp = isRM_Home ? match.away : match.home;

  return (
    <div className="relative overflow-hidden rounded-2xl p-5 space-y-4"
      style={{ background: "linear-gradient(135deg, #0a1628, #0d2137)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">{label}</span>
        <span className="text-[10px] text-white/40">{match.competition}</span>
      </div>

      <div className="flex items-center justify-between gap-4">
        {/* Home */}
        <div className="flex flex-col items-center gap-2 flex-1">
          <img src={match.home.logo} className="h-14 w-14 object-contain drop-shadow-xl" />
          <span className="text-xs font-bold text-white text-center">{match.home.name}</span>
        </div>

        {/* Score / Date */}
        <div className="flex flex-col items-center gap-1">
          {match.completed ? (
            <>
              <span className="text-4xl font-black text-white" style={{ textShadow: "0 0 20px rgba(200,168,75,0.5)" }}>
                {match.home.score} – {match.away.score}
              </span>
              <span className="text-[10px] text-white/40 uppercase">Full Time</span>
            </>
          ) : (
            <>
              <span className="text-lg font-black text-white/60">VS</span>
              <span className="text-[10px] text-white/40">
                {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
              <span className="text-[10px] text-white/40">
                {date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </>
          )}
        </div>

        {/* Away */}
        <div className="flex flex-col items-center gap-2 flex-1">
          <img src={match.away.logo} className="h-14 w-14 object-contain drop-shadow-xl" />
          <span className="text-xs font-bold text-white text-center">{match.away.name}</span>
        </div>
      </div>

      {match.venue && (
        <p className="text-[10px] text-white/30 text-center">📍 {match.venue}</p>
      )}

      {!match.completed && (
        <div className="pt-2">
          <p className="text-[10px] text-white/30 text-center uppercase tracking-widest mb-3">Kick-off in</p>
          <Countdown date={match.date} />
        </div>
      )}
    </div>
  );
}

export default function Soccer() {
  const navigate = useNavigate();
  const { click } = useSound();
  const [data, setData] = useState<SoccerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"matches" | "standings">("matches");

  useEffect(() => {
    fetch(PROXY)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const rmStanding = data?.standings?.find(s => s.isRealMadrid);

  return (
    <div className="min-h-screen pb-10" style={{ background: "linear-gradient(180deg, #060d1a 0%, #0a1628 100%)" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-2xl border-b"
        style={{ background: "rgba(6,13,26,0.92)", borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => { click(); navigate("/"); }}
              className="rounded-xl h-9 w-9 text-white/60 hover:text-white hover:bg-white/10">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <img src={RM_CREST} className="h-9 w-9 object-contain drop-shadow-lg" />
              <div>
                <h1 className="text-base font-black text-white tracking-wide">Real Madrid</h1>
                <p className="text-[10px] text-white/30 uppercase tracking-widest">La Liga 2024/25</p>
              </div>
            </div>
          </div>
          {rmStanding && (
            <div className="text-right">
              <p className="text-sm font-black text-white">#{rmStanding.rank}</p>
              <p className="text-[10px] text-yellow-400/80">{rmStanding.points} pts</p>
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-5 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-white/30 text-sm animate-pulse">Loading Real Madrid data...</div>
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
            <div className="flex gap-2 rounded-2xl p-1" style={{ background: "rgba(255,255,255,0.04)" }}>
              {([
                { key: "matches", label: "Matches", icon: Calendar },
                { key: "standings", label: "Standings", icon: Trophy },
              ] as const).map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => { click(); setTab(key); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all ${tab === key ? "bg-yellow-500/20 text-yellow-400" : "text-white/40 hover:text-white"}`}>
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>

            {/* Matches tab */}
            {tab === "matches" && (
              <div className="space-y-4">
                {data?.liveGames && data.liveGames.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[10px] text-green-400 uppercase tracking-widest font-bold flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" /> Live Now
                    </p>
                    {data.liveGames.map((m, i) => m && <MatchCard key={i} match={m} label="Live" />)}
                  </div>
                )}
                {data?.lastMatch && <MatchCard match={data.lastMatch} label="Last Match" />}
                {data?.nextMatch && <MatchCard match={data.nextMatch} label="Next Match" />}
              </div>
            )}

            {/* Standings tab */}
            {tab === "standings" && (
              <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                {/* Header */}
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
                {data?.standings?.map((row) => (
                  <div key={row.rank}
                    className={`grid grid-cols-12 gap-1 px-3 py-2.5 text-xs transition-colors ${row.isRealMadrid ? "bg-yellow-500/10" : "hover:bg-white/3"}`}
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
