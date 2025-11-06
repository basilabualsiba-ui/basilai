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

        // Weight-related dreams (e.g., "Reach 75 kg")
        const weightMatch = dream.title.match(/(\d+)\s*kg/) || 
                           dream.description?.match(/(\d+)\s*kg/);
        
        if (weightMatch) {
          const targetWeight = parseFloat(weightMatch[1]);
          
          const { data: bodyStats } = await supabase
            .from('user_body_stats')
            .select('weight')
            .order('recorded_at', { ascending: false })
            .limit(2);

          if (bodyStats && bodyStats.length >= 2) {
            const currentWeight = bodyStats[0].weight;
            const startWeight = bodyStats[bodyStats.length - 1].weight;
            
            const totalChange = Math.abs(Number(targetWeight) - Number(startWeight));
            const currentChange = Math.abs(Number(currentWeight) - Number(startWeight));
            calculatedProgress = Math.min(
              Math.round((currentChange / totalChange) * 100),
              100
            );
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
          
          // Calculate current net worth from accounts
          const { data: accounts } = await supabase
            .from('accounts')
            .select('amount');

          if (accounts && accounts.length > 0) {
            const currentNetWorth = accounts.reduce((sum, acc) => sum + Number(acc.amount), 0);
            
            // Get initial net worth (could be 0 or first recorded value)
            const startNetWorth = 0; // Assuming starting from zero
            const totalChange = Math.abs(targetNetWorth - startNetWorth);
            const currentChange = Math.abs(currentNetWorth - startNetWorth);
            
            calculatedProgress = Math.min(
              Math.round((currentChange / totalChange) * 100),
              100
            );
            shouldUpdate = true;
          }
        }
        
        // Gym/Fitness-related dreams
        const gymKeywords = ['workout', 'gym', 'fitness', 'exercise', 'training', 'muscle', 'strength'];
        const isGymRelated = dream.type === 'personal' || 
          gymKeywords.some(keyword => 
            dream.title.toLowerCase().includes(keyword) || 
            dream.description?.toLowerCase().includes(keyword)
          );

        if (isGymRelated && !weightMatch) {
          const completedWorkouts = workoutSessions.filter(
            (session) => session.completed_at !== null
          ).length;

          const targetWorkouts = 50;
          calculatedProgress = Math.min(
            Math.round((completedWorkouts / targetWorkouts) * 100),
            100
          );
          shouldUpdate = true;
        }

        // Update if there's a significant change (>5%)
        if (shouldUpdate && Math.abs(calculatedProgress - dream.progress_percentage) > 5) {
          await updateDream(dream.id, {
            progress_percentage: calculatedProgress,
          });
        }
      }
    };

    if (dreams.length > 0) {
      updateDreamsProgress();
    }
  }, [workoutSessions.length, dreams.length]);

  return null;
};