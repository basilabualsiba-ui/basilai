import { useState } from "react";
import { BentoCard } from "./bento-grid";
import { Pill, AlertTriangle, ArrowRight, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSupplement } from "@/contexts/SupplementContext";
import { Button } from "@/components/ui/button";
import { LogSupplementDialog } from "@/components/supplements/log-supplement-dialog";

export function SupplementsCard() {
  const navigate = useNavigate();
  const { supplements, getLowStockSupplements } = useSupplement();
  const [showLogDialog, setShowLogDialog] = useState(false);

  const lowStock = getLowStockSupplements();
  const totalSupplements = supplements.length;
  const today = new Date().toISOString().split('T')[0];

  const handleCardClick = () => {
    navigate('/supplements');
  };

  const handleLogClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowLogDialog(true);
  };

  return (
    <>
      <BentoCard onClick={handleCardClick}>
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
            <Pill className="h-5 w-5 text-green-500" />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-green-500"
              onClick={handleLogClick}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
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

      <LogSupplementDialog
        open={showLogDialog}
        onOpenChange={setShowLogDialog}
        selectedDate={today}
      />
    </>
  );
}
