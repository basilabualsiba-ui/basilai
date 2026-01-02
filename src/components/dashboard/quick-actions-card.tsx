import { useState } from "react";
import { BentoCard } from "./bento-grid";
import { Button } from "@/components/ui/button";
import { PiggyBank, Dumbbell, Pill, Plus, CalendarPlus, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AddTransactionDialog } from "@/components/financial/add-transaction-dialog";
import { LogSupplementDialog } from "@/components/supplements/log-supplement-dialog";
import { AddActivityDialog } from "@/components/schedule/add-activity-dialog";

export function QuickActionsCard() {
  const navigate = useNavigate();
  const [showSupplementDialog, setShowSupplementDialog] = useState(false);
  const [showActivityDialog, setShowActivityDialog] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  return (
    <>
      <BentoCard className="lg:col-span-2">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Quick Actions</h3>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {/* Add Expense - Uses drawer trigger */}
          <AddTransactionDialog
            defaultType="expense"
            trigger={
              <Button
                variant="ghost"
                className="h-auto flex-col gap-2 p-3 hover:bg-secondary/50 w-full"
              >
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <PiggyBank className="h-5 w-5 text-destructive" />
                </div>
                <span className="text-[10px] sm:text-xs font-medium text-muted-foreground text-center leading-tight">
                  Add Expense
                </span>
              </Button>
            }
          />

          {/* Start Workout */}
          <Button
            variant="ghost"
            className="h-auto flex-col gap-2 p-3 hover:bg-secondary/50"
            onClick={() => navigate("/gym")}
          >
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <Dumbbell className="h-5 w-5 text-success" />
            </div>
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground text-center leading-tight">
              Start Workout
            </span>
          </Button>

          {/* Log Supplement */}
          <Button
            variant="ghost"
            className="h-auto flex-col gap-2 p-3 hover:bg-secondary/50"
            onClick={() => setShowSupplementDialog(true)}
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Pill className="h-5 w-5 text-primary" />
            </div>
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground text-center leading-tight">
              Log Supplement
            </span>
          </Button>

          {/* Add Event */}
          <Button
            variant="ghost"
            className="h-auto flex-col gap-2 p-3 hover:bg-secondary/50"
            onClick={() => setShowActivityDialog(true)}
          >
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <CalendarPlus className="h-5 w-5 text-accent" />
            </div>
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground text-center leading-tight">
              Add Event
            </span>
          </Button>

          {/* Add Dream */}
          <Button
            variant="ghost"
            className="h-auto flex-col gap-2 p-3 hover:bg-secondary/50"
            onClick={() => navigate("/dreams")}
          >
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <Target className="h-5 w-5 text-warning" />
            </div>
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground text-center leading-tight">
              Add Dream
            </span>
          </Button>
        </div>
      </BentoCard>

      <LogSupplementDialog
        open={showSupplementDialog}
        onOpenChange={setShowSupplementDialog}
        selectedDate={today}
      />

      <AddActivityDialog
        open={showActivityDialog}
        onOpenChange={setShowActivityDialog}
        onActivityAdded={() => setShowActivityDialog(false)}
      />
    </>
  );
}
