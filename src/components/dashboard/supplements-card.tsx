import { BentoCard } from "./bento-grid";
import { Pill, AlertTriangle, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSupplement } from "@/contexts/SupplementContext";

export function SupplementsCard() {
  const navigate = useNavigate();
  const { supplements, getLowStockSupplements } = useSupplement();

  const lowStock = getLowStockSupplements();
  const totalSupplements = supplements.length;

  return (
    <BentoCard onClick={() => navigate('/supplements')}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
          <Pill className="h-5 w-5 text-green-500" />
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>

      <h3 className="font-semibold text-foreground mb-1">Supplements</h3>
      
      <div className="mt-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Tracking</span>
          <span className="text-sm font-bold text-foreground">{totalSupplements} items</span>
        </div>

        {lowStock.length > 0 && (
          <div className="mt-3 p-2 rounded-lg bg-warning/10 border border-warning/30 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
            <span className="text-xs text-warning font-medium">
              {lowStock.length} running low
            </span>
          </div>
        )}
      </div>
    </BentoCard>
  );
}
