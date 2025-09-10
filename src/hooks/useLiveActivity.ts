import { useEffect, useState, useCallback } from 'react';
import { LiveActivityService, WorkoutLiveActivityData } from '@/services/LiveActivityService';
import { useSchedule } from '@/contexts/ScheduleContext';

export const useLiveActivity = () => {
  const [isActive, setIsActive] = useState(false);
  const [currentData, setCurrentData] = useState<WorkoutLiveActivityData | null>(null);
  const liveActivityService = LiveActivityService.getInstance();
  const { getTodaySchedule } = useSchedule();

  useEffect(() => {
    // Initialize the service
    liveActivityService.initialize();
    
    // Update local state
    setIsActive(liveActivityService.isWorkoutActive());
    setCurrentData(liveActivityService.getCurrentData());
  }, []);

  const getNextEvent = useCallback(() => {
    const schedule = getTodaySchedule();
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    // Find next event
    const upcomingEvents = schedule
      .filter(item => {
        if (!item.time && !item.startTime) return false;
        const eventTime = item.time || item.startTime;
        if (!eventTime) return false;
        
        const [hours, minutes] = eventTime.split(':').map(Number);
        const eventTimeMinutes = hours * 60 + minutes;
        return eventTimeMinutes > currentTime;
      })
      .sort((a, b) => {
        const timeA = a.time || a.startTime || '23:59';
        const timeB = b.time || b.startTime || '23:59';
        return timeA.localeCompare(timeB);
      });

    if (upcomingEvents.length > 0) {
      const nextEvent = upcomingEvents[0];
      const eventTime = nextEvent.time || nextEvent.startTime || '00:00';
      const [hours, minutes] = eventTime.split(':').map(Number);
      const eventTimeMinutes = hours * 60 + minutes;
      const timeUntil = eventTimeMinutes - currentTime;

      return {
        title: nextEvent.title,
        time: eventTime,
        timeUntil: Math.max(0, timeUntil)
      };
    }

    return undefined;
  }, [getTodaySchedule]);

  const startWorkoutActivity = useCallback(async (workoutName: string, exercises: string[]) => {
    const nextEvent = getNextEvent();
    
    const data = {
      workoutName,
      currentExercise: exercises[0] || 'Getting Started',
      exerciseIndex: 0,
      totalExercises: exercises.length,
      nextEvent
    };

    await liveActivityService.startWorkoutActivity(data);
    setIsActive(true);
    setCurrentData(liveActivityService.getCurrentData());
  }, [getNextEvent]);

  const updateCurrentExercise = useCallback(async (exerciseName: string, index: number, totalExercises: number) => {
    await liveActivityService.updateCurrentExercise(exerciseName, index, totalExercises);
    setCurrentData(liveActivityService.getCurrentData());
  }, []);

  const startRestPeriod = useCallback(async (seconds: number) => {
    await liveActivityService.startRestPeriod(seconds);
    setCurrentData(liveActivityService.getCurrentData());
  }, []);

  const updateNextEvent = useCallback(async () => {
    const nextEvent = getNextEvent();
    await liveActivityService.updateNextEvent(nextEvent);
    setCurrentData(liveActivityService.getCurrentData());
  }, [getNextEvent]);

  const endWorkoutActivity = useCallback(async () => {
    await liveActivityService.endWorkoutActivity();
    setIsActive(false);
    setCurrentData(null);
  }, []);

  return {
    isActive,
    currentData,
    startWorkoutActivity,
    updateCurrentExercise,
    startRestPeriod,
    updateNextEvent,
    endWorkoutActivity
  };
};