import { useEffect } from 'react';
import { useDreams } from '@/contexts/DreamsContext';
import { useGym } from '@/contexts/GymContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to automatically update dream progress based on related activities
 * - Gym-related dreams track workout completion
 * - Weight-related dreams track body stats
 * - Net worth dreams track financial progress
 * - Can be extended for other activity types
 */
export const useDreamProgress = () => {
  const { dreams, updateDream } = useDreams();
  const { workoutSessions } = useGym();

  useEffect(() => {
    const updateDreamsProgress = async () => {
      for (const dream of dreams.filter(d => d.status === 'in_progress')) {
        let calculatedProgress = dream.progress_percentage;
        let shouldUpdate = false;
        let metadata: any = {};

        // Weight-related dreams (e.g., "Reach 75 kg")
        const weightMatch = dream.title.match(/(\d+)\s*kg/) || 
                           dream.description?.match(/(\d+)\s*kg/);
        
        if (weightMatch) {
          const targetWeight = parseFloat(weightMatch[1]);
          
          const { data: bodyStats } = await supabase
            .from('user_body_stats')
            .select('weight')
            .order('recorded_at', { ascending: false })
            .limit(1);

          if (bodyStats && bodyStats.length > 0) {
            const currentWeight = Number(bodyStats[0].weight);
            const remaining = Math.abs(targetWeight - currentWeight);
            
            calculatedProgress = Math.max(0, Math.min(
              Math.round((1 - (remaining / targetWeight)) * 100),
              100
            ));
            
            metadata = {
              current: currentWeight,
              target: targetWeight,
              remaining: remaining,
              unit: 'kg'
            };
            shouldUpdate = true;
          }
        }
        
        // Net worth dreams (e.g., "Reach 30000 in net worth")
        const netWorthMatch = dream.title.match(/(\d+)\s*in\s*net\s*worth/) ||
                             dream.description?.match(/(\d+)\s*in\s*net\s*worth/) ||
                             dream.title.match(/net\s*worth.*?(\d+)/) ||
                             dream.description?.match(/net\s*worth.*?(\d+)/);
        
        if (netWorthMatch) {
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
              unit: '$'
            };
            shouldUpdate = true;
          }
        }
        
        // Budget/Savings dreams with estimated_cost
        if (dream.estimated_cost && !netWorthMatch) {
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
              unit: '$'
            };
            shouldUpdate = true;
          }
        }

        // Update if progress changed
        if (shouldUpdate && calculatedProgress !== dream.progress_percentage) {
          await updateDream(dream.id, {
            progress_percentage: calculatedProgress,
          });
          // Store metadata in local storage for quick access
          localStorage.setItem(`dream_${dream.id}_meta`, JSON.stringify(metadata));
        }
      }
    };

    if (dreams.length > 0) {
      updateDreamsProgress();
    }
  }, [workoutSessions.length, dreams.length]);

  return null;
};