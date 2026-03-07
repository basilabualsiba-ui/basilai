import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSound } from "@/hooks/useSound";

interface MatchData {
  date: string;
  home: { name: string; shortName: string; logo: string; score: string; winner: boolean };
  away: { name: string; shortName: string; logo: string; score: string; winner: boolean };
  competition: string;
  completed: boolean;
  venue: string;
}

interface SoccerData {
  nextMatch: MatchData | null;
  lastMatch: MatchData | null;
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
    <div className="flex items-center gap-1.5 justify-center">
      {[{ v: d, l: "d" }, { v: h, l: "h" }, { v: m, l: "m" }, { v: s, l: "s" }].map(({ v, l }) => (
        <div key={l} className="flex flex-col items-center">
          <span className="text-sm font-black text-white tabular-nums w-7 text-center"
            style={{ textShadow: "0 0 10px #00d4ff" }}>
            {String(v).padStart(2, "0")}
          </span>
          <span className="text-[8px] text-white/40 uppercase">{l}</span>
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

  return (
    <div
      onClick={() => { click(); navigate("/soccer"); }}
      className="relative overflow-hidden rounded-3xl cursor-pointer group transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
      style={{
        background: "linear-gradient(135deg, #0a1628 0%, #0d2137 50%, #0a1628 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        minHeight: 160,
      }}
    >
      {/* Stadium grass effect at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-8 opacity-10"
        style={{ background: "repeating-linear-gradient(90deg, #16a34a 0px, #16a34a 18px, #15803d 18px, #15803d 36px)" }} />

      {/* Glow */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20 group-hover:opacity-30 transition-opacity"
        style={{ background: "radial-gradient(circle, #c8a84b, transparent)" }} />

      <div className="relative p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={RM_CREST} className="h-7 w-7 object-contain drop-shadow-lg" alt="Real Madrid" />
            <div>
              <p className="text-xs font-black text-white tracking-wider">REAL MADRID</p>
              <p className="text-[9px] text-white/40 uppercase tracking-widest">La Liga</p>
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
          <p className="text-xs text-white/30 text-center py-3">Loading...</p>
        ) : (
          <>
            {/* Last result */}
            {data?.lastMatch && (
              <div className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <img src={data.lastMatch.home.logo} className="h-5 w-5 object-contain" />
                  <span className="text-[10px] text-white/70 font-semibold">{data.lastMatch.home.shortName}</span>
                </div>
                <div className="text-center">
                  <span className="text-sm font-black text-white">
                    {data.lastMatch.home.score} – {data.lastMatch.away.score}
                  </span>
                  <p className="text-[8px] text-white/30">FINAL</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-white/70 font-semibold">{data.lastMatch.away.shortName}</span>
                  <img src={data.lastMatch.away.logo} className="h-5 w-5 object-contain" />
                </div>
              </div>
            )}

            {/* Next match countdown */}
            {data?.nextMatch && (
              <div className="text-center space-y-1">
                <p className="text-[9px] text-white/30 uppercase tracking-widest">Next · {data.nextMatch.home.shortName} vs {data.nextMatch.away.shortName}</p>
                <Countdown date={data.nextMatch.date} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
