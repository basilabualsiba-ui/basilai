import { useEffect, useState } from 'react';
import { NotificationService } from '@/services/NotificationService';
import { useToast } from '@/hooks/use-toast';

export const useNotifications = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const notificationService = NotificationService.getInstance();
  const { toast } = useToast();

  useEffect(() => {
    const initializeNotifications = async () => {
      const granted = await notificationService.initialize();
      setPermissionGranted(granted);
      setIsInitialized(true);
    };

    initializeNotifications();
  }, []);

  const sendTestNotification = async () => {
    await notificationService.sendNotification({
      title: '🎉 Test Notification',
      body: 'Your Track My Life app notifications are working!',
      sound: true
    });
    
    toast({
      title: "Test notification sent!",
      description: "Check your device notifications"
    });
  };

  const scheduleWorkoutReminder = async (workoutName: string, time: Date) => {
    await notificationService.scheduleReminder(
      '🏋️ Workout Time!',
      `Time for your ${workoutName} workout`,
      time
    );
    
    toast({
      title: "Workout reminder set",
      description: `You'll be notified at ${time.toLocaleTimeString()}`
    });
  };

  const scheduleMealReminder = async (mealType: string, time: Date) => {
    await notificationService.scheduleReminder(
      '🍽️ Meal Time!',
      `Don't forget to log your ${mealType}`,
      time
    );
    
    toast({
      title: "Meal reminder set",
      description: `You'll be notified at ${time.toLocaleTimeString()}`
    });
  };

  const schedulePrayerReminder = async (prayerName: string, time: Date) => {
    await notificationService.scheduleReminder(
      '🕋 Prayer Time',
      `${prayerName} prayer is in 15 minutes`,
      time
    );
    
    toast({
      title: "Prayer reminder set",
      description: `You'll be notified 15 minutes before ${prayerName}`
    });
  };

  const sendDailySummary = async (stats: {
    workoutsCompleted: number;
    mealsLogged: number;
    transactionsAdded: number;
    activitiesScheduled: number;
  }) => {
    await notificationService.sendDailySummaryNotification(stats);
  };

  const sendBudgetAlert = async (category: string, percentage: number) => {
    await notificationService.sendBudgetAlert(category, percentage);
  };

  const checkNotificationPermission = async () => {
    const granted = await notificationService.checkPermissions();
    setPermissionGranted(granted);
    return granted;
  };

  const enableNotifications = async () => {
    const granted = await notificationService.requestPermissions();
    setPermissionGranted(granted);
    
    if (granted) {
      toast({
        title: "✅ Notifications Enabled",
        description: "You'll receive notifications for workouts, meals, and reminders",
      });
    } else {
      toast({
        title: "❌ Notifications Denied",
        description: "Enable notifications in your device settings to get reminders",
        variant: "destructive"
      });
    }
    
    return granted;
  };

  return {
    isInitialized,
    permissionGranted,
    sendTestNotification,
    scheduleWorkoutReminder,
    scheduleMealReminder,
    schedulePrayerReminder,
    sendDailySummary,
    sendBudgetAlert,
    checkNotificationPermission,
    enableNotifications,
    notificationService
  };
};