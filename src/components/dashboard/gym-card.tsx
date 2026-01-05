import { useMemo } from "react";
import { BentoCard } from "./bento-grid";
import { Dumbbell, Play, Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CircularProgress } from "@/components/ui/circular-progress";
import { useGym } from "@/contexts/GymContext";
import { format } from "date-fns";

export function GymCard() {
  const navigate = useNavigate();
  const { workoutSessions } = useGym();

  // Calculate workout streak
  const streak = useMemo(() => {
    if (!workoutSessions || workoutSessions.length === 0) return 0;
    
    const completedSessions = workoutSessions
      .filter(s => s.completed_at)
      .map(s => new Date(s.scheduled_date).toDateString())
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    if (completedSessions.length === 0) return 0;

    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toDateString();
      
      if (completedSessions.includes(dateStr)) {
        currentStreak++;
      } else if (i > 0) {
        break;
      }
    }

    return currentStreak;
  }, [workoutSessions]);

  // Calculate this week's workouts
  const thisWeekWorkouts = useMemo(() => {
    if (!workoutSessions) return 0;
    
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    return workoutSessions.filter(s => {
      const sessionDate = new Date(s.scheduled_date);
      return s.completed_at && sessionDate >= weekStart;
    }).length;
  }, [workoutSessions]);

  const weeklyGoal = 4;

  const handleCardClick = () => {
    navigate('/gym');
  };

  const handleStartWorkout = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = format(new Date(), 'yyyy-MM-dd');
    navigate(`/workout-day?date=${today}`);
  };

  return (
    <BentoCard onClick={handleCardClick} className="group">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-gym/20 flex items-center justify-center group-hover:scale-110 transition-transform">
          <Dumbbell className="h-5 w-5 text-gym" />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-gym hover:bg-gym/10"
          onClick={handleStartWorkout}
        >
          <Play className="h-4 w-4" />
        </Button>
      </div>

      <h3 className="font-semibold text-foreground mb-1">Gym</h3>
      <p className="text-xs text-muted-foreground mb-3">Track workouts & progress</p>

      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        {/* Weekly Progress Ring */}
        <div className="flex items-center gap-2">
          <CircularProgress 
            value={thisWeekWorkouts} 
            max={weeklyGoal} 
            size={36} 
            strokeWidth={3}
            color="gym"
          >
            <span className="text-[10px] font-bold text-foreground">{thisWeekWorkouts}</span>
          </CircularProgress>
          <div>
            <p className="text-xs text-muted-foreground">This week</p>
            <p className="text-xs font-medium text-foreground">{thisWeekWorkouts}/{weeklyGoal} done</p>
          </div>
        </div>

        {/* Streak Badge */}
        {streak > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-warning/20 border border-warning/30">
            <Flame className="h-3 w-3 text-warning animate-pulse-soft" />
            <span className="text-xs font-semibold text-warning">{streak}</span>
          </div>
        )}
      </div>
    </BentoCard>
  );
}
