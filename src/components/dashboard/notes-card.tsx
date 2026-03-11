import { useState, useEffect } from "react";
import { BentoCard } from "./bento-grid";
import { StickyNote } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export function NotesCard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(0);
  const [done, setDone] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("notes").select("is_done");
      const all = data || [];
      setPending(all.filter(n => !n.is_done).length);
      setDone(all.filter(n => n.is_done).length);
      setLoading(false);
    })();
  }, []);

  const subtitle = pending > 0
    ? `${pending} pending · ${done} done`
    : done > 0
    ? `All ${done} done ✓`
    : "Your to-do notes";

  return (
    <BentoCard
      onClick={() => navigate("/notes")}
      loading={loading}
      className="group"
      loadingIcon={StickyNote}
      loadingGradient="bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/25"
    >
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/25 group-hover:scale-110 transition-transform">
          <StickyNote className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Notes</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    </BentoCard>
  );
}
