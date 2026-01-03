import { useState } from "react";
import { BentoCard } from "./bento-grid";
import { Pill, AlertTriangle, ArrowRight, Plus, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSupplement } from "@/contexts/SupplementContext";
import { Button } from "@/components/ui/button";
import { LogSupplementDialog } from "@/components/supplements/log-supplement-dialog";
import { GradientProgress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function SupplementsCard() {
  const navigate = useNavigate();
  const { supplements, getLowStockSupplements, supplementLogs } = useSupplement();
  const [showLogDialog, setShowLogDialog] = useState(false);

  const lowStock = getLowStockSupplements();
  const totalSupplements = supplements.length;
  const today = new Date().toISOString().split('T')[0];

  // Count supplements taken today
  const todayLogs = supplementLogs?.filter(log => log.logged_date === today) || [];
  const supplementsTakenToday = new Set(todayLogs.map(log => log.supplement_id)).size;
  const dailyProgress = totalSupplements > 0 ? (supplementsTakenToday / totalSupplements) * 100 : 0;

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
          <div className={cn(
            "w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center",
            "group-hover:animate-bounce-subtle"
          )}>
            <Pill className="h-5 w-5 text-success" />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-success"
              onClick={handleLogClick}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <h3 className="font-semibold text-foreground mb-1">Supplements</h3>
        
        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Tracking</span>
            <span className="text-sm font-bold text-foreground">{totalSupplements} items</span>
          </div>

          {/* Daily Progress */}
          {totalSupplements > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Today's progress</span>
                <div className="flex items-center gap-1">
                  {dailyProgress === 100 && (
                    <Check className="h-3 w-3 text-success" />
                  )}
                  <span className="text-xs font-medium text-foreground">
                    {supplementsTakenToday}/{totalSupplements}
                  </span>
                </div>
              </div>
              <GradientProgress value={dailyProgress} size="sm" />
            </div>
          )}

          {lowStock.length > 0 && (
            <div className={cn(
              "p-2 rounded-lg bg-warning/10 border border-warning/30 flex items-center gap-2",
              "animate-pulse-soft"
            )}>
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
