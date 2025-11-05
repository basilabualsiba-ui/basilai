import { useEffect } from 'react';
import { useDreams } from '@/contexts/DreamsContext';
import { useGym } from '@/contexts/GymContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to automatically update dream progress based on related activities
 * - Gym-related dreams track workout completion
 * - Weight-related dreams track body stats
 * - Can be extended for other activity types
 */
export const useDreamProgress = () => {
  const { dreams, updateDream } = useDreams();
  const { workoutSessions } = useGym();

  useEffect(() => {
    const updateDreamsProgress = async () => {
      // Update gym-related dreams
      const gymRelatedDreams = dreams.filter(
        (dream) => 
          dream.status === 'in_progress' && 
          (dream.type === 'personal' || dream.description?.toLowerCase().includes('workout') || 
           dream.description?.toLowerCase().includes('gym') || 
           dream.description?.toLowerCase().includes('fitness'))
      );

      for (const dream of gymRelatedDreams) {
        const completedWorkouts = workoutSessions.filter(
          (session) => session.completed_at !== null
        ).length;

        const targetWorkouts = 50;
        const calculatedProgress = Math.min(
          Math.round((completedWorkouts / targetWorkouts) * 100),
          100
        );

        if (Math.abs(calculatedProgress - dream.progress_percentage) > 5) {
          await updateDream(dream.id, {
            progress_percentage: calculatedProgress,
          });
        }
      }

      // Update weight-related dreams
      const weightRelatedDreams = dreams.filter(
        (dream) =>
          dream.status === 'in_progress' &&
          (dream.title.toLowerCase().match(/\d+\s*kg/) ||
           dream.title.toLowerCase().includes('weight') ||
           dream.description?.toLowerCase().includes('weight') ||
           dream.description?.toLowerCase().match(/\d+\s*kg/))
      );

      for (const dream of weightRelatedDreams) {
        // Extract target weight from title or description
        const targetMatch = dream.title.match(/(\d+)\s*kg/) || 
                           dream.description?.match(/(\d+)\s*kg/);
        
        if (targetMatch) {
          const targetWeight = parseFloat(targetMatch[1]);
          
          // Get latest weight from body stats
          const { data: bodyStats } = await supabase
            .from('user_body_stats')
            .select('weight')
            .order('recorded_at', { ascending: false })
            .limit(2);

          if (bodyStats && bodyStats.length >= 2) {
            const currentWeight = bodyStats[0].weight;
            const startWeight = bodyStats[bodyStats.length - 1].weight;
            
            // Calculate progress based on how close to target
            const totalChange = Math.abs(Number(targetWeight) - Number(startWeight));
            const currentChange = Math.abs(Number(currentWeight) - Number(startWeight));
            const calculatedProgress = Math.min(
              Math.round((currentChange / totalChange) * 100),
              100
            );

            if (Math.abs(calculatedProgress - dream.progress_percentage) > 5) {
              await updateDream(dream.id, {
                progress_percentage: calculatedProgress,
              });
            }
          }
        }
      }
    };

    if (dreams.length > 0) {
      updateDreamsProgress();
    }
  }, [workoutSessions.length, dreams.length]);

  return null;
};
