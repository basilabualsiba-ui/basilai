import { useState, useEffect } from "react";
import { BentoCard } from "./bento-grid";
import { Shirt } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface WardrobePreview {
  id: string;
  image_url: string | null;
  type: string | null;
  colors: string[];
}

const COLOR_MAP: Record<string, string> = {
  black: "#1a1a1a", white: "#f5f5f5", gray: "#888", grey: "#888",
  red: "#e53e3e", blue: "#3182ce", navy: "#1a365d", "navy blue": "#1a365d",
  green: "#38a169", yellow: "#d69e2e", orange: "#dd6b20", purple: "#805ad5",
  pink: "#d53f8c", brown: "#744210", beige: "#c4a882", cream: "#fefcbf",
  "light blue": "#90cdf4", khaki: "#c3a960", burgundy: "#7b341e", teal: "#2c7a7b",
};

function getColorHex(color: string): string {
  const lower = color.toLowerCase();
  for (const [key, hex] of Object.entries(COLOR_MAP)) {
    if (lower.includes(key)) return hex;
  }
  return "#888";
}

export function ClothesCard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [preview, setPreview] = useState<WardrobePreview[]>([]);

  useEffect(() => {
    (async () => {
      const { data, count } = await supabase
        .from("wardrobe")
        .select("id, image_url, type, colors", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(4);
      setTotal(count || 0);
      setPreview((data || []).map(d => ({ ...d, colors: Array.isArray(d.colors) ? d.colors : [] })));
      setLoading(false);
    })();
  }, []);

  return (
    <BentoCard
      onClick={() => navigate("/wardrobe")}
      loading={loading}
      className="group"
      loadingIcon={Shirt}
      loadingGradient="bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/25"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2.5 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25 group-hover:scale-110 transition-transform">
          <Shirt className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Wardrobe</h3>
          <p className="text-xs text-muted-foreground">
            {total === 0 ? "Add your clothes" : `${total} item${total !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {preview.length > 0 ? (
        <div className="grid grid-cols-4 gap-1.5">
          {preview.map(item => (
            <div
              key={item.id}
              className="aspect-square rounded-xl overflow-hidden bg-muted"
            >
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.type || "item"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{
                    background: item.colors?.[0]
                      ? `${getColorHex(item.colors[0])}33`
                      : "rgba(124,58,237,0.1)",
                  }}
                >
                  <Shirt className="h-4 w-4 text-violet-400" />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-6 h-6 rounded-lg border border-dashed border-muted-foreground/30 flex items-center justify-center">
            <Shirt className="h-3 w-3" />
          </div>
          <span>Tap to add clothes with AI recognition</span>
        </div>
      )}
    </BentoCard>
  );
}
