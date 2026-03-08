import { useEffect } from 'react';
import { useDreams } from '@/contexts/DreamsContext';
import { useGym } from '@/contexts/GymContext';
import { supabase } from '@/integrations/supabase/client';

export interface DreamMetadata {
  current: number;
  target: number;
  starting?: number;
  remaining: number;
  unit: string;
  direction?: 'gain' | 'loss';
  type: 'weight' | 'networth' | 'savings' | 'workouts';
  linkedModule?: 'weight' | 'financial' | 'gym' | 'supplements';
}

const parseWeightGoal = (title: string, description?: string | null): { target: number; direction: 'gain' | 'loss' } | null => {
  const text = `${title} ${description || ''}`.toLowerCase();
  const weightPatterns = [
    /reach\s*(\d+\.?\d*)\s*kg/i, /get\s*to\s*(\d+\.?\d*)\s*kg/i,
    /(\d+\.?\d*)\s*kg\s*goal/i, /target\s*(\d+\.?\d*)\s*kg/i, /(\d+\.?\d*)\s*kg/i,
  ];
  let targetWeight: number | null = null;
  for (const pattern of weightPatterns) {
    const match = text.match(pattern);
    if (match) { targetWeight = parseFloat(match[1]); break; }
  }
  if (!targetWeight) return null;
  const gainKeywords = ['gain', 'increase', 'bulk', 'build', 'muscle', 'grow'];
  const lossKeywords = ['lose', 'loss', 'reduce', 'cut', 'slim', 'drop'];
  const hasGainKeyword = gainKeywords.some(k => text.includes(k));
  let direction: 'gain' | 'loss' = hasGainKeyword ? 'gain' : lossKeywords.some(k => text.includes(k)) ? 'loss' : 'gain';
  return { target: targetWeight, direction };
};

const parseWorkoutGoal = (title: string, description?: string | null): number | null => {
  const text = `${title} ${description || ''}`.toLowerCase();
  const patterns = [
    /complete\s*(\d+)\s*workout/i, /(\d+)\s*workouts?\s*goal/i,
    /(\d+)\s*workout/i, /(\d+)\s*sessions?/i, /(\d+)\s*gym\s*sessions?/i,
  ];
  const gymKeywords = ['workout', 'gym', 'training', 'session', 'exercise'];
  if (!gymKeywords.some(k => text.includes(k))) return null;
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return parseInt(match[1]);
  }
  return null;
};

export const useDreamProgress = () => {
  const { dreams, updateDream } = useDreams();
  const { workoutSessions } = useGym();

  useEffect(() => {
    const updateDreamsProgress = async () => {
      const { data: bodyStats } = await supabase
        .from('user_body_stats').select('weight, recorded_at')
        .order('recorded_at', { ascending: true });
      
      const currentWeight = bodyStats && bodyStats.length > 0 ? Number(bodyStats[bodyStats.length - 1].weight) : null;
      const completedWorkouts = workoutSessions.filter(s => s.completed_at).length;

      for (const dream of dreams.filter(d => d.status === 'in_progress')) {
        let calculatedProgress = dream.progress_percentage;
        let shouldUpdate = false;
        let metadata: DreamMetadata | null = null;

        // Workout-count dreams (Gym linking)
        const workoutTarget = parseWorkoutGoal(dream.title, dream.description);
        if (workoutTarget) {
          const remaining = Math.max(0, workoutTarget - completedWorkouts);
          calculatedProgress = Math.max(0, Math.min(Math.round((completedWorkouts / workoutTarget) * 100), 100));
          metadata = {
            current: completedWorkouts, target: workoutTarget, remaining,
            unit: 'workouts', type: 'workouts', linkedModule: 'gym'
          };
          shouldUpdate = true;
        }

        // Weight dreams
        if (!metadata) {
          const weightGoal = parseWeightGoal(dream.title, dream.description);
          if (weightGoal && currentWeight !== null && bodyStats && bodyStats.length > 0) {
            const { target, direction } = weightGoal;
            let actualDirection = direction;
            if (currentWeight < target) actualDirection = 'gain';
            else if (currentWeight > target) actualDirection = 'loss';

            let startingWeight: number;
            if (actualDirection === 'gain') {
              startingWeight = Math.min(...bodyStats.map(s => Number(s.weight)));
            } else {
              startingWeight = Math.max(...bodyStats.map(s => Number(s.weight)));
            }

            const remaining = Math.abs(target - currentWeight);
            let progress: number;
            if (actualDirection === 'gain') {
              const totalToGain = target - startingWeight;
              const gained = currentWeight - startingWeight;
              progress = (totalToGain <= 0 || gained <= 0) ? 0 : Math.round((gained / totalToGain) * 100);
            } else {
              const totalToLose = startingWeight - target;
              const lost = startingWeight - currentWeight;
              progress = (totalToLose <= 0 || lost <= 0) ? 0 : Math.round((lost / totalToLose) * 100);
            }
            
            calculatedProgress = Math.max(0, Math.min(progress, 100));
            metadata = { current: currentWeight, target, starting: startingWeight, remaining, unit: 'kg', direction: actualDirection, type: 'weight', linkedModule: 'weight' };
            shouldUpdate = true;
          }
        }
        
        // Net worth dreams
        if (!metadata) {
          const netWorthMatch = dream.title.match(/(\d+)\s*in\s*net\s*worth/i) ||
            dream.description?.match(/(\d+)\s*in\s*net\s*worth/i) ||
            dream.title.match(/net\s*worth.*?(\d+)/i) ||
            dream.description?.match(/net\s*worth.*?(\d+)/i);
          
          if (netWorthMatch) {
            const targetNetWorth = parseFloat(netWorthMatch[1]);
            const { data: accounts } = await supabase.from('accounts').select('amount');
            if (accounts && accounts.length > 0) {
              const currentNetWorth = accounts.reduce((sum, acc) => sum + Number(acc.amount), 0);
              const remaining = Math.max(0, targetNetWorth - currentNetWorth);
              calculatedProgress = Math.max(0, Math.min(Math.round((currentNetWorth / targetNetWorth) * 100), 100));
              metadata = { current: currentNetWorth, target: targetNetWorth, remaining, unit: '₪', type: 'networth', linkedModule: 'financial' };
              shouldUpdate = true;
            }
          }
        }
        
        // Budget/Savings dreams
        if (dream.estimated_cost && !metadata) {
          const { data: category } = await supabase.from('categories').select('id').eq('name', 'Dream Savings').single();
          if (category) {
            const { data: transactions } = await supabase.from('transactions').select('amount, type').eq('category_id', category.id);
            const totalSaved = transactions?.reduce((sum, t) => sum + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0) || 0;
            const remaining = Math.max(0, Number(dream.estimated_cost) - totalSaved);
            calculatedProgress = Math.max(0, Math.min(Math.round((totalSaved / Number(dream.estimated_cost)) * 100), 100));
            metadata = { current: totalSaved, target: Number(dream.estimated_cost), remaining, unit: '₪', type: 'savings', linkedModule: 'financial' };
            shouldUpdate = true;
          }
        }

        if (shouldUpdate && metadata) {
          localStorage.setItem(`dream_${dream.id}_meta`, JSON.stringify(metadata));
          if (calculatedProgress !== dream.progress_percentage) {
            await updateDream(dream.id, { progress_percentage: calculatedProgress });
          }
        }
      }
    };

    if (dreams.length > 0) updateDreamsProgress();
  }, [workoutSessions.length, dreams.length, dreams, updateDream]);

  return null;
};