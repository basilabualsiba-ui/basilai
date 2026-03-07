import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSound } from "@/hooks/useSound";

interface MatchData {
  date: string;
  home: { name: string; shortName: string; logo: string; score: string; winner: boolean };
  away: { name: string; shortName: string; logo: string; score: string; winner: boolean };
  competition: string;
  completed: boolean;
  live: boolean;
  venue: string;
}

interface SoccerData {
  nextMatch: MatchData | null;
  lastMatch: MatchData | null;
  liveMatches: MatchData[];
  standings: { rank: number; name: string; points: number; played: number; isRealMadrid: boolean }[];
}

const PROXY = "https://sfreodzibxmniiccqpcl.supabase.co/functions/v1/soccer-proxy";
const RM_CREST = "https://a.espncdn.com/i/teamlogos/soccer/500/86.png";

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
        <div key={l} className="flex flex-col items-center bg-white/5 rounded-lg px-2.5 py-1.5">
          <span className="text-base font-black text-white tabular-nums"
            style={{ textShadow: "0 0 10px #c8a84b" }}>
            {String(v).padStart(2, "0")}
          </span>
          <span className="text-[8px] text-white/30 uppercase">{l}</span>
        </div>
      ))}
    </div>
  );
}

export function SoccerCard() {
  const navigate = useNavigate();
  const { click } = useSound();
  const [data, setData] = useState<SoccerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(PROXY)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const rmStanding = data?.standings?.find(s => s.isRealMadrid);
  const liveMatch = data?.liveMatches?.[0] || null;
  // Show live match if happening, otherwise last result
  const displayMatch = liveMatch || data?.lastMatch || null;
  const nextMatch = data?.nextMatch || null;

  return (
    <div
      onClick={() => { click(); navigate("/soccer"); }}
      className="relative overflow-hidden rounded-3xl cursor-pointer group transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
      style={{
        background: "linear-gradient(135deg, #0a1628 0%, #0d2137 50%, #0a1628 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        minHeight: 170,
      }}
    >
      {/* Stadium stripe at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-6 opacity-10"
        style={{ background: "repeating-linear-gradient(90deg, #16a34a 0px, #16a34a 18px, #15803d 18px, #15803d 36px)" }} />

      {/* Gold glow */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20 group-hover:opacity-30 transition-opacity"
        style={{ background: "radial-gradient(circle, #c8a84b, transparent)" }} />

      <div className="relative p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={RM_CREST} className="h-7 w-7 object-contain drop-shadow-lg" alt="Real Madrid" />
            <div>
              <p className="text-xs font-black text-white tracking-wider">REAL MADRID</p>
              <p className="text-[9px] text-white/40 uppercase tracking-widest">All Competitions</p>
            </div>
          </div>
          {rmStanding && (
            <div className="text-right">
              <p className="text-[10px] text-white/40">#{rmStanding.rank} · {rmStanding.points}pts</p>
              <p className="text-[9px] text-white/30">{rmStanding.played} played</p>
            </div>
          )}
        </div>

        {loading ? (
          <p className="text-xs text-white/30 text-center py-3 animate-pulse">Loading...</p>
        ) : (
          <div className="space-y-2.5">
            {/* Live badge or last result */}
            {displayMatch && (
              <div className="rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                {liveMatch && (
                  <div className="flex items-center justify-center gap-1.5 py-1"
                    style={{ background: "rgba(34,197,94,0.15)", borderBottom: "1px solid rgba(34,197,94,0.2)" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-[9px] text-green-400 font-bold uppercase tracking-widest">Live · {displayMatch.competition}</span>
                  </div>
                )}
                {!liveMatch && (
                  <div className="flex items-center justify-center py-1"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <span className="text-[9px] text-white/25 uppercase tracking-widest">Last · {displayMatch.competition}</span>
                  </div>
                )}
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <img src={displayMatch.home.logo} className="h-5 w-5 object-contain" />
                    <span className="text-[10px] text-white/70 font-semibold">{displayMatch.home.shortName}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-black text-white">
                      {displayMatch.home.score} – {displayMatch.away.score}
                    </span>
                    <p className="text-[8px] text-white/30">{liveMatch ? "LIVE" : "FT"}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-white/70 font-semibold">{displayMatch.away.shortName}</span>
                    <img src={displayMatch.away.logo} className="h-5 w-5 object-contain" />
                  </div>
                </div>
              </div>
            )}

            {/* Next match countdown — always shown */}
            {nextMatch ? (
              <div className="space-y-1.5">
                <p className="text-[9px] text-white/30 uppercase tracking-widest text-center">
                  Next · {nextMatch.home.shortName} vs {nextMatch.away.shortName} · {nextMatch.competition}
                </p>
                <Countdown date={nextMatch.date} />
              </div>
            ) : (
              <p className="text-[9px] text-white/20 text-center">No upcoming matches scheduled</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
