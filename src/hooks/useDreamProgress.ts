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
  type: 'weight' | 'networth' | 'savings';
}

/**
 * Intelligently parses weight goals from dream text
 * Detects gain/loss direction based on keywords
 */
const parseWeightGoal = (title: string, description?: string | null): { target: number; direction: 'gain' | 'loss' } | null => {
  const text = `${title} ${description || ''}`.toLowerCase();
  
  // Match patterns like "reach 70 kg", "get to 75kg", "70 kg goal"
  const weightPatterns = [
    /reach\s*(\d+\.?\d*)\s*kg/i,
    /get\s*to\s*(\d+\.?\d*)\s*kg/i,
    /(\d+\.?\d*)\s*kg\s*goal/i,
    /target\s*(\d+\.?\d*)\s*kg/i,
    /(\d+\.?\d*)\s*kg/i,
  ];
  
  let targetWeight: number | null = null;
  for (const pattern of weightPatterns) {
    const match = text.match(pattern);
    if (match) {
      targetWeight = parseFloat(match[1]);
      break;
    }
  }
  
  if (!targetWeight) return null;
  
  // Detect direction from keywords
  const gainKeywords = ['gain', 'increase', 'bulk', 'build', 'muscle', 'grow'];
  const lossKeywords = ['lose', 'loss', 'reduce', 'cut', 'slim', 'drop'];
  
  const hasGainKeyword = gainKeywords.some(k => text.includes(k));
  const hasLossKeyword = lossKeywords.some(k => text.includes(k));
  
  // Default direction based on keywords, or we'll determine from current weight later
  let direction: 'gain' | 'loss' = hasGainKeyword ? 'gain' : hasLossKeyword ? 'loss' : 'gain';
  
  return { target: targetWeight, direction };
};

/**
 * Hook to automatically update dream progress based on related activities
 */
export const useDreamProgress = () => {
  const { dreams, updateDream } = useDreams();
  const { workoutSessions } = useGym();

  useEffect(() => {
    const updateDreamsProgress = async () => {
      // Fetch all weight stats once for efficiency
      const { data: bodyStats } = await supabase
        .from('user_body_stats')
        .select('weight, recorded_at')
        .order('recorded_at', { ascending: true });
      
      const currentWeight = bodyStats && bodyStats.length > 0 
        ? Number(bodyStats[bodyStats.length - 1].weight) 
        : null;
      const startingWeight = bodyStats && bodyStats.length > 0 
        ? Number(bodyStats[0].weight) 
        : null;

      for (const dream of dreams.filter(d => d.status === 'in_progress')) {
        let calculatedProgress = dream.progress_percentage;
        let shouldUpdate = false;
        let metadata: DreamMetadata | null = null;

        // Weight-related dreams
        const weightGoal = parseWeightGoal(dream.title, dream.description);
        
        if (weightGoal && currentWeight !== null && startingWeight !== null) {
          const { target, direction } = weightGoal;
          
          // Auto-detect direction if not clear from keywords
          let actualDirection = direction;
          if (currentWeight < target) {
            actualDirection = 'gain';
          } else if (currentWeight > target) {
            actualDirection = 'loss';
          }
          
          // Calculate progress based on direction
          let progress: number;
          const remaining = Math.abs(target - currentWeight);
          
          if (actualDirection === 'gain') {
            // Weight gain: progress from starting weight toward target
            const totalToGain = target - startingWeight;
            const gained = currentWeight - startingWeight;
            progress = totalToGain > 0 ? Math.round((gained / totalToGain) * 100) : 0;
          } else {
            // Weight loss: progress from starting weight toward target
            const totalToLose = startingWeight - target;
            const lost = startingWeight - currentWeight;
            progress = totalToLose > 0 ? Math.round((lost / totalToLose) * 100) : 0;
          }
          
          calculatedProgress = Math.max(0, Math.min(progress, 100));
          
          metadata = {
            current: currentWeight,
            target: target,
            starting: startingWeight,
            remaining: remaining,
            unit: 'kg',
            direction: actualDirection,
            type: 'weight'
          };
          shouldUpdate = true;
        }
        
        // Net worth dreams
        const netWorthMatch = dream.title.match(/(\d+)\s*in\s*net\s*worth/i) ||
                             dream.description?.match(/(\d+)\s*in\s*net\s*worth/i) ||
                             dream.title.match(/net\s*worth.*?(\d+)/i) ||
                             dream.description?.match(/net\s*worth.*?(\d+)/i);
        
        if (netWorthMatch && !metadata) {
          const targetNetWorth = parseFloat(netWorthMatch[1]);
          
          const { data: accounts } = await supabase
            .from('accounts')
            .select('amount');

          if (accounts && accounts.length > 0) {
            const currentNetWorth = accounts.reduce((sum, acc) => sum + Number(acc.amount), 0);
            const remaining = Math.max(0, targetNetWorth - currentNetWorth);
            
            calculatedProgress = Math.max(0, Math.min(
              Math.round((currentNetWorth / targetNetWorth) * 100),
              100
            ));
            
            metadata = {
              current: currentNetWorth,
              target: targetNetWorth,
              remaining: remaining,
              unit: '₪',
              type: 'networth'
            };
            shouldUpdate = true;
          }
        }
        
        // Budget/Savings dreams with estimated_cost
        if (dream.estimated_cost && !metadata) {
          const { data: category } = await supabase
            .from('categories')
            .select('id')
            .eq('name', 'Dream Savings')
            .single();

          if (category) {
            const { data: transactions } = await supabase
              .from('transactions')
              .select('amount, type')
              .eq('category_id', category.id);

            const totalSaved = transactions?.reduce((sum, t) => {
              return sum + (t.type === 'income' ? Number(t.amount) : -Number(t.amount));
            }, 0) || 0;

            const remaining = Math.max(0, Number(dream.estimated_cost) - totalSaved);
            calculatedProgress = Math.max(0, Math.min(
              Math.round((totalSaved / Number(dream.estimated_cost)) * 100),
              100
            ));
            
            metadata = {
              current: totalSaved,
              target: Number(dream.estimated_cost),
              remaining: remaining,
              unit: '₪',
              type: 'savings'
            };
            shouldUpdate = true;
          }
        }

        // Update if progress changed or metadata needs storing
        if (shouldUpdate && metadata) {
          localStorage.setItem(`dream_${dream.id}_meta`, JSON.stringify(metadata));
          
          if (calculatedProgress !== dream.progress_percentage) {
            await updateDream(dream.id, {
              progress_percentage: calculatedProgress,
            });
          }
        }
      }
    };

    if (dreams.length > 0) {
      updateDreamsProgress();
    }
  }, [workoutSessions.length, dreams.length, dreams, updateDream]);

  return null;
};