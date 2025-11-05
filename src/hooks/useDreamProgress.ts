import { useEffect } from 'react';
import { useDreams } from '@/contexts/DreamsContext';
import { useGym } from '@/contexts/GymContext';

/**
 * Hook to automatically update dream progress based on related activities
 * - Gym-related dreams track workout completion
 * - Can be extended for other activity types
 */
export const useDreamProgress = () => {
  const { dreams, updateDream } = useDreams();
  const { workoutSessions } = useGym();

  useEffect(() => {
    const updateGymDreamsProgress = async () => {
      const gymRelatedDreams = dreams.filter(
        (dream) => 
          dream.status === 'in_progress' && 
          (dream.type === 'personal' || dream.description?.toLowerCase().includes('workout') || 
           dream.description?.toLowerCase().includes('gym') || 
           dream.description?.toLowerCase().includes('fitness'))
      );

      for (const dream of gymRelatedDreams) {
        // Calculate progress based on workout sessions
        const completedWorkouts = workoutSessions.filter(
          (session) => session.completed_at !== null
        ).length;

        // Simple calculation: assume 50 workouts = 100% for fitness dreams
        const targetWorkouts = 50;
        const calculatedProgress = Math.min(
          Math.round((completedWorkouts / targetWorkouts) * 100),
          100
        );

        // Only update if progress changed significantly (>5% difference)
        if (Math.abs(calculatedProgress - dream.progress_percentage) > 5) {
          await updateDream(dream.id, {
            progress_percentage: calculatedProgress,
          });
        }
      }
    };

    if (dreams.length > 0 && workoutSessions.length > 0) {
      updateGymDreamsProgress();
    }
  }, [workoutSessions.length, dreams.length]);

  return null;
};
