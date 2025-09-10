import { useGym } from '@/contexts/GymContext';
import { ScheduleItem, DailyActivity } from '@/contexts/ScheduleContext';

export const useGymSchedule = (dailyActivities: DailyActivity[] = []) => {
  const { getWorkoutForDate } = useGym();

  const getGymScheduleItems = (date?: string): ScheduleItem[] => {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const workout = getWorkoutForDate(targetDate);
    
    if (!workout.exercises.length) return [];

    const workoutItems: ScheduleItem[] = [];
    
    // If there's a scheduled workout session with exercises
    if (workout.exercises.length > 0) {
      const muscleGroups = Array.from(new Set(workout.exercises.map(ex => ex.muscle_group)));
      const muscleGroupEmojis = {
        'chest': '💪',
        'back': '🏋️',
        'shoulders': '🤲',
        'arms': '💪',
        'legs': '🦵',
        'abs': '🔥',
        'cardio': '❤️'
      };
      
      const emoji = muscleGroups.map(mg => muscleGroupEmojis[mg.toLowerCase() as keyof typeof muscleGroupEmojis] || '🏃').join('');

      // Check for exercise activity times in schedule if workout plan doesn't have times
      let startTime = workout.times?.start;
      let endTime = workout.times?.end;
      
      // If no workout plan times, check schedule for exercise activities
      if (!startTime || !endTime) {
        const targetDayOfWeek = new Date(targetDate).getDay() || 7; // Convert Sunday (0) to 7
        const exerciseActivity = dailyActivities.find(activity => 
          activity.activity_type === 'exercise' && 
          activity.days_of_week?.includes(targetDayOfWeek)
        );
        
        if (exerciseActivity) {
          startTime = startTime || exerciseActivity.start_time;
          endTime = endTime || exerciseActivity.end_time;
        }
      }

      // Only show workout if it has a time set
      if (startTime && endTime) {
        workoutItems.push({
          id: `workout-${targetDate}`,
          title: `Workout Session`,
          description: `${muscleGroups.join(', ')} - ${workout.exercises.length} exercises`,
          type: 'activity',
          startTime: startTime,
          endTime: endTime,
          isCompleted: !!workout.session?.completed_at,
          activityType: 'exercise',
          muscleGroups: muscleGroups,
          emoji: emoji
        });
      }
    }

    return workoutItems;
  };

  return {
    getGymScheduleItems
  };
};