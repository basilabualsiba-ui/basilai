import { useState } from "react";
import { BentoCard } from "./bento-grid";
import { Scale, TrendingUp, TrendingDown, Minus, ArrowRight, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface BodyStat {
  id: string;
  weight: number;
  height?: number;
  recorded_at: string;
  notes?: string;
}

export function WeightStatsCard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<BodyStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddWeight, setShowAddWeight] = useState(false);
  const [newWeight, setNewWeight] = useState("");

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .from('user_body_stats')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setStats(data || []);
    } catch (error) {
      console.error('Error loading body stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddWeight = async () => {
    const weight = parseFloat(newWeight);
    if (isNaN(weight) || weight <= 0) {
      toast.error("Please enter a valid weight");
      return;
    }

    try {
      const { error } = await supabase
        .from('user_body_stats')
        .insert({ weight });

      if (error) throw error;

      toast.success("Weight recorded successfully");
      setNewWeight("");
      setShowAddWeight(false);
      loadStats();
    } catch (error) {
      console.error('Error adding weight:', error);
      toast.error("Failed to record weight");
    }
  };

  const currentWeight = stats[0]?.weight || 0;
  const previousWeight = stats[1]?.weight || currentWeight;
  const weightChange = currentWeight - previousWeight;
  const weekAgoWeight = stats.find((s, i) => i >= 3)?.weight || currentWeight;
  const weeklyChange = currentWeight - weekAgoWeight;

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-warning" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-success" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const formatChange = (change: number) => {
    if (change === 0) return "No change";
    const prefix = change > 0 ? "+" : "";
    return `${prefix}${change.toFixed(1)} kg`;
  };

  const handleCardClick = () => {
    navigate('/weight-stats');
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAddWeight(true);
  };

  return (
    <>
      <BentoCard onClick={handleCardClick}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
              <Scale className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Weight</p>
              <p className="text-xl font-bold text-foreground">
                {isLoading ? "..." : currentWeight > 0 ? `${currentWeight} kg` : "No data"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-accent"
              onClick={handleAddClick}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {currentWeight > 0 && (
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-2">
              {getTrendIcon(weightChange)}
              <div>
                <p className="text-xs text-muted-foreground">Last Change</p>
                <p className="text-xs font-medium text-foreground">{formatChange(weightChange)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getTrendIcon(weeklyChange)}
              <div>
                <p className="text-xs text-muted-foreground">Weekly</p>
                <p className="text-xs font-medium text-foreground">{formatChange(weeklyChange)}</p>
              </div>
            </div>
          </div>
        )}
      </BentoCard>

      <Dialog open={showAddWeight} onOpenChange={setShowAddWeight}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Weight</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                placeholder="e.g., 75.5"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddWeight()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddWeight(false)}>Cancel</Button>
            <Button onClick={handleAddWeight}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
