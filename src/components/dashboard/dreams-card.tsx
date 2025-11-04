import { DashboardCard } from "@/components/ui/dashboard-card";
import { Sparkles, Plus } from "lucide-react";
import { useDreams } from "@/contexts/DreamsContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export const DreamsCard = () => {
  const { dreams } = useDreams();
  const navigate = useNavigate();

  const completedDreams = dreams.filter(d => d.status === 'completed').length;
  const totalDreams = dreams.length;
  const nextDream = dreams.find(d => d.status === 'in_progress');

  return (
    <DashboardCard
      title="Dreams"
      description={nextDream ? `Next: ${nextDream.title}` : "No active dreams"}
      icon={Sparkles}
      value={`${completedDreams}/${totalDreams}`}
      trend={totalDreams > 0 ? `${Math.round((completedDreams / totalDreams) * 100)}% achieved` : undefined}
      onClick={() => navigate("/dreams")}
    />
  );
};
