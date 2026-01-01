import { BentoCard } from "./bento-grid";
import { Activity } from "lucide-react";

export function ActivityTimeline() {
  return (
    <BentoCard className="lg:col-span-4">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Recent Activity</h3>
      </div>
      <p className="text-sm text-muted-foreground text-center py-4">
        Your activity will appear here
      </p>
    </BentoCard>
  );
}
