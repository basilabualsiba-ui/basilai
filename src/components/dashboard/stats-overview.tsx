import { DashboardCard } from "@/components/ui/dashboard-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  Wallet, 
  TrendingUp, 
  CreditCard, 
  Target,
  Dumbbell,
  Calendar,
  Timer,
  Pill,
  Clock,
  CheckCircle2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGym } from "@/contexts/GymContext";
import { useSchedule } from "@/contexts/ScheduleContext";
import { useState, useEffect } from "react";

export const StatsOverview = () => {
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);
  const { exercises, workoutSessions, workoutPlans } = useGym();
  const { getTodaySchedule, toggleActivityCompletion, getScheduleForDate } = useSchedule();
  
  // Fetch supplements data
  const { data: supplements } = useQuery({
    queryKey: ['supplements-dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase.from('supplements').select('*');
      if (error) throw error;
      return data;
    }
  });
  
  const lowStockCount = supplements?.filter(s => s.remaining_doses <= s.warning_threshold).length || 0;

  // Fetch accounts data
  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('accounts').select('*');
      if (error) throw error;
      return data;
    }
  });

  // Fetch currency rates for proper conversion
  const { data: currencyRates } = useQuery({
    queryKey: ['currency-rates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('currency_ratios').select('*');
      if (error) throw error;
      return data;
    }
  });

  // Fetch transactions for this month
  const { data: transactions } = useQuery({
    queryKey: ['transactions-monthly'],
    queryFn: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .gte('date', startOfMonth.toISOString().split('T')[0]);
      if (error) throw error;
      return data;
    }
  });

  // Fetch budgets for this month
  const { data: budgets } = useQuery({
    queryKey: ['budgets-monthly'],
    queryFn: async () => {
      const now = new Date();
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('month', now.getMonth() + 1)
        .eq('year', now.getFullYear());
      if (error) throw error;
      return data;
    }
  });

  // Helper function to get currency conversion rate
  const getRate = (fromCurrency: string, toCurrency: string): number => {
    if (fromCurrency === toCurrency) return 1;
    
    const rate = currencyRates?.find(r => 
      r.from_currency === fromCurrency && r.to_currency === toCurrency
    );
    
    return rate?.rate || 1;
  };

  // Calculate stats - convert all currencies to ILS for consistency
  const totalBalance = accounts?.reduce((sum, account) => {
    const conversionRate = getRate(account.currency, 'ILS');
    return sum + (Number(account.amount) * conversionRate);
  }, 0) || 0;
  const monthlyExpenses = transactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
  const monthlyIncome = transactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
  const totalBudget = budgets?.reduce((sum, budget) => sum + Number(budget.amount), 0) || 0;
  const budgetUsed = totalBudget > 0 ? Math.round((monthlyExpenses / totalBudget) * 100) : 0;

  // Calculate gym stats
  const completedWorkouts = workoutSessions.filter(s => s.completed_at).length;
  const activePlans = workoutPlans.filter(p => p.is_active).length;
  const thisWeekWorkouts = workoutSessions.filter(s => {
    const sessionDate = new Date(s.scheduled_date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return sessionDate >= weekAgo && s.completed_at;
  }).length;

  const stats = [
    {
      title: "Cash",
      description: "Across all accounts",
      icon: Wallet,
      value: `₪${totalBalance.toLocaleString()}`,
      trend: `${accounts?.length || 0} accounts`,
      onClick: () => navigate("/financial")
    },
    {
      title: "Exercises",
      description: "In your library",
      icon: Dumbbell,
      value: exercises.length.toString(),
      trend: `${completedWorkouts} workouts done`,
      onClick: () => navigate("/gym")
    },
    {
      title: "Supplements",
      description: "Tracking your intake",
      icon: Pill,
      value: (supplements?.length || 0).toString(),
      trend: lowStockCount > 0 ? `${lowStockCount} low stock` : 'All stocked',
      onClick: () => navigate("/supplements")
    }
  ];

  // Get current or next scheduled activity (can return multiple if overlapping)
  const getNextActivity = async () => {
    const todaySchedule = getTodaySchedule();
    const now = new Date();
    const currentTimeStr = now.toTimeString().slice(0, 5);

    // 1. Check if current time is between start/end time and not completed - show as "currently"
    const currentActivities = todaySchedule.filter(item => {
      if (item.isCompleted || !item.startTime) return false;
      
      if (item.endTime) {
        // Has both start and end time
        return item.startTime <= currentTimeStr && currentTimeStr <= item.endTime;
      } else {
        // Only has start time - consider current if start time has passed but within 2 hours
        if (item.startTime <= currentTimeStr) {
          const startTime = new Date();
          const [hours, minutes] = item.startTime.split(':').map(Number);
          startTime.setHours(hours, minutes, 0, 0);
          const twoHoursLater = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);
          return now <= twoHoursLater;
        }
      }
      return false;
    });

    if (currentActivities.length > 0) {
      // If multiple overlapping activities, return all of them
      if (currentActivities.length > 1) {
        return { 
          activities: currentActivities.map(activity => ({ ...activity, isCurrent: true })),
          isMultiple: true,
          isCurrent: true 
        };
      }
      return { ...currentActivities[0], isCurrent: true };
    }

    // 2. If current time is between start/end and completed, OR if not in time range - show next uncompleted
    const incompleteItems = todaySchedule.filter(item => !item.isCompleted);
    
    if (incompleteItems.length > 0) {
      // Sort by time, putting items without times at the end
      const sortedIncomplete = incompleteItems.sort((a, b) => {
        if (!a.startTime && !b.startTime) return 0;
        if (!a.startTime) return 1;
        if (!b.startTime) return -1;
        return a.startTime.localeCompare(b.startTime);
      });
      
      return sortedIncomplete[0];
    }

    // 3. Look for next incomplete activity in future days
    for (let i = 1; i <= 7; i++) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + i);
      const futureDateStr = futureDate.toISOString().split('T')[0];
      
      try {
        const futureSchedule = await getScheduleForDate(futureDateStr);
        const nextIncomplete = futureSchedule.find(item => !item.isCompleted);
        
        if (nextIncomplete) {
          return {
            ...nextIncomplete,
            date: futureDateStr
          };
        }
      } catch (error) {
        console.error('Error getting future schedule:', error);
      }
    }

    return null;
  };

  // Use state to store the next activity since we now need async loading
  const [nextActivity, setNextActivity] = useState<any>(null);
  
  // Load next activity on component mount and schedule changes
  useEffect(() => {
    const loadNextActivity = async () => {
      const activity = await getNextActivity();
      setNextActivity(activity);
    };
    loadNextActivity();
  }, [getTodaySchedule, getScheduleForDate]);

  // Determine if the activity is current or upcoming
  const isCurrentActivity = () => {
    return nextActivity?.isCurrent || false;
  };

  // Format date for display
  const getActivityDateDisplay = (activity: any) => {
    if (!activity.date) return '';
    
    const today = new Date().toISOString().split('T')[0];
    if (activity.date === today) return '';
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    if (activity.date === tomorrowStr) return 'Tomorrow';
    
    const activityDate = new Date(activity.date);
    return activityDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getActivityIcon = (type: string, activityType?: string) => {
    if (type === 'prayer') return '🕌';
    if (type === 'meal') return '🍽️';
    if (activityType === 'exercise' || type === 'workout') return '💪';
    if (activityType === 'work') return '💼';
    if (activityType === 'appointment') return '📅';
    return '📋';
  };

  const getActivityTypeColor = (type: string, activityType?: string) => {
    if (type === 'prayer') return 'bg-emerald-500/10 text-emerald-700 border-emerald-200';
    if (type === 'meal') return 'bg-orange-500/10 text-orange-700 border-orange-200';
    if (activityType === 'exercise' || type === 'workout') return 'bg-blue-500/10 text-blue-700 border-blue-200';
    if (activityType === 'work') return 'bg-purple-500/10 text-purple-700 border-purple-200';
    if (activityType === 'appointment') return 'bg-red-500/10 text-red-700 border-red-200';
    return 'bg-gray-500/10 text-gray-700 border-gray-200';
  };

  // Handle clicking on activities
  const handleActivityClick = async (activity: any, event?: React.MouseEvent) => {
    if (isUpdating) return;
    
    // Prevent event bubbling if clicking on a specific activity in multiple mode
    if (event) {
      event.stopPropagation();
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    if (activity.activityType === 'exercise') {
      navigate('/gym?action=start');
    } else if (activity.type === 'activity') {
      setIsUpdating(true);
      try {
        await toggleActivityCompletion(activity.id, today, !activity.isCompleted);
        // Reload the activity after update
        const updatedActivity = await getNextActivity();
        setNextActivity(updatedActivity);
      } catch (error) {
        console.error('Error updating activity:', error);
      } finally {
        setIsUpdating(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <DashboardCard
            key={index}
            title={stat.title}
            description={stat.description}
            icon={stat.icon}
            value={stat.value}
            trend={stat.trend}
            onClick={stat.onClick}
          />
        ))}
      </div>
    </div>
  );
};