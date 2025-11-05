import { DashboardCard } from "@/components/ui/dashboard-card";
import { Sparkles } from "lucide-react";
import { useDreams } from "@/contexts/DreamsContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const DreamsCard = () => {
  const { dreams } = useDreams();
  const navigate = useNavigate();
  const [savingsProgress, setSavingsProgress] = useState<string>("");

  const completedDreams = dreams.filter(d => d.status === 'completed').length;
  const totalDreams = dreams.length;
  const nextDream = dreams.find(d => d.status === 'in_progress');

  useEffect(() => {
    const calculateSavingsProgress = async () => {
      // Get dreams with financial goals
      const dreamsWithCost = dreams.filter(d => d.estimated_cost && d.status === 'in_progress');
      
      if (dreamsWithCost.length === 0) {
        setSavingsProgress("");
        return;
      }

      // Get Dream Savings category
      const { data: category } = await supabase
        .from('categories')
        .select('id')
        .eq('name', 'Dream Savings')
        .single();

      if (!category) {
        setSavingsProgress("");
        return;
      }

      // Get all transactions for Dream Savings (income = savings)
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('category_id', category.id);

      const totalSaved = transactions?.reduce((sum, t) => {
        return sum + (t.type === 'income' ? Number(t.amount) : -Number(t.amount));
      }, 0) || 0;

      const totalGoals = dreamsWithCost.reduce((sum, d) => sum + Number(d.estimated_cost || 0), 0);
      
      if (totalGoals > 0) {
        const percentage = Math.min(Math.round((totalSaved / totalGoals) * 100), 100);
        setSavingsProgress(`${percentage}% saved ($${totalSaved.toFixed(0)}/$${totalGoals.toFixed(0)})`);
      }
    };

    calculateSavingsProgress();
  }, [dreams]);

  return (
    <DashboardCard
      title="Dreams"
      description={savingsProgress || (nextDream ? `Next: ${nextDream.title}` : "No active dreams")}
      icon={Sparkles}
      value={`${completedDreams}/${totalDreams}`}
      trend={totalDreams > 0 ? `${Math.round((completedDreams / totalDreams) * 100)}% achieved` : undefined}
      onClick={() => navigate("/dreams")}
    />
  );
};
