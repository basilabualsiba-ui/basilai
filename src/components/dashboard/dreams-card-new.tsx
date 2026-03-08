import { useState, useEffect } from "react";
import { BentoCard } from "./bento-grid";
import { Target, Dumbbell, Scale, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDreams } from "@/contexts/DreamsContext";
import { DreamMetadata } from "@/hooks/useDreamProgress";

const moduleIcons: Record<string, React.ElementType> = {
  gym: Dumbbell,
  weight: Scale,
  financial: Wallet,
};

export function DreamsCardNew() {
  const navigate = useNavigate();
  const { dreams } = useDreams();
  const [loading, setLoading] = useState(true);
  const [linkedDreams, setLinkedDreams] = useState<Array<{ title: string; progress: number; module?: string }>>([]);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const active = dreams.filter(d => d.status === 'in_progress').slice(0, 3);
    const linked = active.map(d => {
      const stored = localStorage.getItem(`dream_${d.id}_meta`);
      const meta: DreamMetadata | null = stored ? JSON.parse(stored) : null;
      return {
        title: d.title,
        progress: d.progress_percentage || 0,
        module: meta?.linkedModule,
      };
    });
    setLinkedDreams(linked);
  }, [dreams]);

  const activeCount = dreams.filter(d => d.status === 'in_progress').length;

  return (
    <BentoCard onClick={() => navigate('/dreams')} loading={loading} className="group" loadingIcon={Target} loadingGradient="bg-gradient-to-br from-pink-500 to-rose-500 shadow-pink-500/25">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2.5 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg shadow-pink-500/25 group-hover:scale-110 transition-transform">
          <Target className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Dreams</h3>
          <p className="text-xs text-muted-foreground">{activeCount} active goal{activeCount !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {linkedDreams.length > 0 && (
        <div className="space-y-2">
          {linkedDreams.map((d, i) => {
            const Icon = d.module ? moduleIcons[d.module] || Target : Target;
            return (
              <div key={i} className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground truncate">{d.title}</p>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-0.5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-pink-500 to-rose-500 transition-all"
                      style={{ width: `${d.progress}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs font-bold text-pink-600 shrink-0">{d.progress}%</span>
              </div>
            );
          })}
        </div>
      )}
    </BentoCard>
  );
}