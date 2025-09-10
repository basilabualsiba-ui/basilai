import { useEffect, useState } from 'react';
import { useNotifications } from './useNotifications';
import { usePrayerNotifications } from '@/contexts/PrayerContext';
import { useSchedule } from '@/contexts/ScheduleContext';
import { useGym } from '@/contexts/GymContext';
import { useFood } from '@/contexts/FoodContext';

export const useBackgroundNotifications = () => {
  const [isScheduling, setIsScheduling] = useState(false);
  const { notificationService, permissionGranted } = useNotifications();
  const { prayerTimes, notificationSettings } = usePrayerNotifications();
  const { getTodaySchedule } = useSchedule();
  const { getTodayWorkout, getWorkoutForDate } = useGym();
  const { mealPlans } = useFood();

  // Schedule all upcoming notifications for today
  const scheduleAllNotifications = async () => {
    if (!permissionGranted || isScheduling) return;
    
    setIsScheduling(true);
    
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      // Clear old notifications first
      await notificationService.cancelAllNotifications();
      
      // Get all schedule items for today
      const scheduleItems = getTodaySchedule();
      
      // Schedule notifications for upcoming items
      for (const item of scheduleItems) {
        if (!item.startTime) continue;
        
        const [hours, minutes] = item.startTime.split(':').map(Number);
        const itemTime = new Date(now);
        itemTime.setHours(hours, minutes, 0, 0);
        
        // Skip if the time has already passed
        if (itemTime <= now) continue;
        
        // Calculate reminder time (15 minutes before, except for prayers which use custom settings)
        let reminderMinutes = 15;
        
        if (item.type === 'prayer') {
          const prayerName = item.title.toLowerCase().replace(' prayer', '');
          const prayerSettings = notificationSettings[prayerName];
          if (!prayerSettings?.enabled) continue;
          reminderMinutes = prayerSettings.reminderMinutes;
        }
        
        const reminderTime = new Date(itemTime.getTime() - (reminderMinutes * 60 * 1000));
        
        // Only schedule if reminder time is in the future
        if (reminderTime > now) {
          const emoji = item.emoji || getEmojiForType(item.type);
          await notificationService.sendNotification({
            title: `${emoji} ${item.title}`,
            body: `${item.title} is in ${reminderMinutes} minutes`,
            scheduleAt: reminderTime,
            id: Math.floor(Math.random() * 1000000),
            sound: true,
            data: {
              type: item.type,
              itemId: item.id,
              scheduledTime: item.startTime,
              date: today
            }
          });
          
          console.log(`Scheduled ${item.type} notification for ${item.title} at ${reminderTime.toLocaleTimeString()}`);
        }
      }
      
      // Schedule next day's early notifications if it's late in the day
      const currentHour = now.getHours();
      if (currentHour >= 20) { // After 8 PM, schedule tomorrow's early items
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowDate = tomorrow.toISOString().split('T')[0];
        
        // Schedule early morning notifications for tomorrow
        await scheduleEarlyMorningNotifications(tomorrowDate);
      }
      
      console.log('Successfully scheduled all notifications for today');
    } catch (error) {
      console.error('Error scheduling notifications:', error);
    } finally {
      setIsScheduling(false);
    }
  };
  
  // Schedule early morning notifications (prayer times, workouts)
  const scheduleEarlyMorningNotifications = async (date: string) => {
    try {
      // Schedule Fajr prayer if enabled
      if (prayerTimes && notificationSettings.fajr?.enabled) {
        const [hours, minutes] = prayerTimes.fajr.split(':').map(Number);
        const fajrTime = new Date(date + 'T' + prayerTimes.fajr + ':00');
        const reminderTime = new Date(fajrTime.getTime() - (notificationSettings.fajr.reminderMinutes * 60 * 1000));
        
        if (reminderTime > new Date()) {
          await notificationService.sendNotification({
            title: '🕋 Fajr Prayer',
            body: `Fajr prayer is in ${notificationSettings.fajr.reminderMinutes} minutes`,
            scheduleAt: reminderTime,
            id: Math.floor(Math.random() * 1000000),
            sound: true,
            data: {
              type: 'prayer',
              prayer: 'fajr',
              date: date
            }
          });
        }
      }
      
      // Schedule morning workouts
      const workoutInfo = getWorkoutForDate(date);
      if (workoutInfo.session && workoutInfo.times?.start) {
        const [hours, minutes] = workoutInfo.times.start.split(':').map(Number);
        const workoutTime = new Date(date + 'T' + workoutInfo.times.start + ':00');
        const reminderTime = new Date(workoutTime.getTime() - (15 * 60 * 1000));
        
        if (reminderTime > new Date()) {
          await notificationService.sendNotification({
            title: '🏋️ Workout Time',
            body: 'Your workout is starting in 15 minutes',
            scheduleAt: reminderTime,
            id: Math.floor(Math.random() * 1000000),
            sound: true,
            data: {
              type: 'workout',
              date: date
            }
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
  
  // Auto-schedule when data changes
  useEffect(() => {
    if (permissionGranted && !isScheduling) {
      // Delay scheduling to allow contexts to load
      const timer = setTimeout(() => {
        scheduleAllNotifications();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [permissionGranted, prayerTimes, notificationSettings]);
  
  // Schedule notifications when app becomes active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && permissionGranted) {
        // App became visible, refresh notifications
        setTimeout(() => {
          scheduleAllNotifications();
        }, 1000);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [permissionGranted]);
  
  return {
    scheduleAllNotifications,
    isScheduling
  };
};