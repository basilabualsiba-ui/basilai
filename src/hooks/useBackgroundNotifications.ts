import { useEffect, useState } from 'react';
import { useNotifications } from './useNotifications';
import { usePrayerNotifications } from '@/contexts/PrayerContext';
import { useSchedule } from '@/contexts/ScheduleContext';
import { useGym } from '@/contexts/GymContext';

export const useBackgroundNotifications = () => {
  const [isScheduling, setIsScheduling] = useState(false);
  const { notificationService, permissionGranted } = useNotifications();
  const { prayerTimes, notificationSettings } = usePrayerNotifications();
  const { getTodaySchedule } = useSchedule();
  const { getTodayWorkout, getWorkoutForDate } = useGym();

  const scheduleAllNotifications = async () => {
    if (!permissionGranted || isScheduling) return;
    setIsScheduling(true);
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      await notificationService.cancelAllNotifications();
      const scheduleItems = getTodaySchedule();
      
      for (const item of scheduleItems) {
        if (!item.startTime) continue;
        const [hours, minutes] = item.startTime.split(':').map(Number);
        const itemTime = new Date(now);
        itemTime.setHours(hours, minutes, 0, 0);
        if (itemTime <= now) continue;
        
        let reminderMinutes = 15;
        if (item.type === 'prayer') {
          const prayerName = item.title.toLowerCase().replace(' prayer', '');
          const prayerSettings = notificationSettings[prayerName];
          if (!prayerSettings?.enabled) continue;
          reminderMinutes = prayerSettings.reminderMinutes;
        }
        
        const reminderTime = new Date(itemTime.getTime() - (reminderMinutes * 60 * 1000));
        if (reminderTime > now) {
          const emoji = item.emoji || getEmojiForType(item.type);
          await notificationService.sendNotification({
            title: `${emoji} ${item.title}`,
            body: `${item.title} is in ${reminderMinutes} minutes`,
            scheduleAt: reminderTime,
            id: Math.floor(Math.random() * 1000000),
            sound: true,
            data: { type: item.type, itemId: item.id, scheduledTime: item.startTime, date: today }
          });
        }
      }

      const currentHour = now.getHours();
      if (currentHour >= 20) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        await scheduleEarlyMorningNotifications(tomorrow.toISOString().split('T')[0]);
      }
    } catch (error) {
      console.error('Error scheduling notifications:', error);
    } finally {
      setIsScheduling(false);
    }
  };
  
  const scheduleEarlyMorningNotifications = async (date: string) => {
    try {
      if (prayerTimes && notificationSettings.fajr?.enabled) {
        const fajrTime = new Date(date + 'T' + prayerTimes.fajr + ':00');
        const reminderTime = new Date(fajrTime.getTime() - (notificationSettings.fajr.reminderMinutes * 60 * 1000));
        if (reminderTime > new Date()) {
          await notificationService.sendNotification({
            title: '🕋 Fajr Prayer',
            body: `Fajr prayer is in ${notificationSettings.fajr.reminderMinutes} minutes`,
            scheduleAt: reminderTime,
            id: Math.floor(Math.random() * 1000000),
            sound: true,
            data: { type: 'prayer', prayer: 'fajr', date }
          });
        }
      }
      
      const workoutInfo = getWorkoutForDate(date);
      if (workoutInfo.session && workoutInfo.times?.start) {
        const workoutTime = new Date(date + 'T' + workoutInfo.times.start + ':00');
        const reminderTime = new Date(workoutTime.getTime() - (15 * 60 * 1000));
        if (reminderTime > new Date()) {
          await notificationService.sendNotification({
            title: '🏋️ Workout Time',
            body: 'Your workout is starting in 15 minutes',
            scheduleAt: reminderTime,
            id: Math.floor(Math.random() * 1000000),
            sound: true,
            data: { type: 'workout', date }
          });
        }
      }
    } catch (error) {
      console.error('Error scheduling early morning notifications:', error);
    }
  };
  
  const getEmojiForType = (type: string): string => {
    switch (type) {
      case 'prayer': return '🕋';
      case 'meal': return '🍽️';
      case 'workout': return '🏋️';
      case 'activity': return '📅';
      default: return '⏰';
    }
  };
  
  useEffect(() => {
    if (permissionGranted && !isScheduling) {
      const timer = setTimeout(() => { scheduleAllNotifications(); }, 2000);
      return () => clearTimeout(timer);
    }
  }, [permissionGranted, prayerTimes, notificationSettings]);
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && permissionGranted) {
        setTimeout(() => { scheduleAllNotifications(); }, 1000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [permissionGranted]);
  
  return { scheduleAllNotifications, isScheduling };
};
