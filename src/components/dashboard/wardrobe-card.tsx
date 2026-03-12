import { useState, useEffect } from "react";
import { BentoCard } from "./bento-grid";
import { Shirt } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export function WardrobeCard() {
  const navigate = useNavigate();
  const [loading, setLoading]   = useState(true);
  const [total,   setTotal]     = useState(0);
  const [inCloset, setInCloset] = useState(0);
  const [inLaundry, setInLaundry] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("wardrobe").select("location");
      const all = data || [];
      setTotal(all.length);
      setInCloset(all.filter((i: any) => i.location === "Closet" || i.location === "Ready to Wear").length);
      setInLaundry(all.filter((i: any) => ["Laundry Basket","Washing Machine","Drying"].includes(i.location)).length);
      setLoading(false);
    })();
  }, []);

  const subtitle = total === 0
    ? "Add your wardrobe"
    : inLaundry > 0
    ? `${inCloset} in closet · ${inLaundry} in laundry`
    : `${total} item${total !== 1 ? "s" : ""} · all in closet`;

  return (
    <BentoCard
      onClick={() => navigate("/wardrobe")}
      loading={loading}
      className="group"
      loadingIcon={Shirt}
      loadingGradient="bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/25"
    >
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25 group-hover:scale-110 transition-transform">
          <Shirt className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Smart Closet</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    </BentoCard>
  );
}
