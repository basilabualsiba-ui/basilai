import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export interface NotificationOptions {
  title: string;
  body: string;
  id?: number;
  sound?: boolean;
  badge?: number;
  data?: any;
  scheduleAt?: Date;
  recurring?: boolean;
}

export class NotificationService {
  private static instance: NotificationService;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize() {
    // Enable background notifications for web/PWA
    if (!Capacitor.isNativePlatform()) {
      if ('serviceWorker' in navigator && 'Notification' in window) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          console.log('Service worker registered for background notifications');
          
          // Wait for service worker to be ready
          await navigator.serviceWorker.ready;
          
          // For iOS PWA - try to get push subscription for background notifications
          if (registration.pushManager && 'PushManager' in window) {
            try {
              const subscription = await registration.pushManager.getSubscription();
              if (!subscription) {
                // Try to subscribe for push notifications (required for iOS background notifications)
                const newSubscription = await registration.pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey: this.urlB64ToUint8Array('BEl62iUYgUivxIkv69yViEuiBIa40HI80Y6McQ54tsS3BUB3VtyqOdXLTRQr4oVL8cSrMTaykg8hfOo3RruojK0')
                });
                console.log('Push subscription created:', newSubscription);
              }
            } catch (pushError) {
              console.log('Push subscription not available:', pushError);
            }
          }
        } catch (error) {
          console.log('Service worker registration failed:', error);
        }
      }
      
      // Request notification permission for web
      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
      return Notification.permission === 'granted';
    }

    try {
      // Request notification permissions
      const permission = await LocalNotifications.requestPermissions();
      
      if (permission.display === 'granted') {
        console.log('Notification permission granted');
        
        // Listen for notification actions
        await LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
          console.log('Notification action performed:', notification);
        });

        return true;
      } else {
        console.warn('Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }

  async checkPermissions() {
    if (!Capacitor.isNativePlatform()) {
      // For web, check browser notification permission
      if ('Notification' in window) {
        return Notification.permission === 'granted';
      }
      return false;
    }

    try {
      const permission = await LocalNotifications.checkPermissions();
      return permission.display === 'granted';
    } catch (error) {
      console.error('Failed to check notification permissions:', error);
      return false;
    }
  }

  async requestPermissions() {
    if (!Capacitor.isNativePlatform()) {
      // For web, request browser notification permission
      if ('Notification' in window && Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
      return Notification.permission === 'granted';
    }

    try {
      const permission = await LocalNotifications.requestPermissions();
      
      if (permission.display === 'granted') {
        // Listen for notification actions if not already listening
        await LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
          console.log('Notification action performed:', notification);
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      return false;
    }
  }

  async sendNotification(options: NotificationOptions) {
    if (!Capacitor.isNativePlatform()) {
      // For web/PWA, use enhanced service worker for background support
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const registration = await navigator.serviceWorker.ready;
        
        if (options.scheduleAt) {
          // For scheduled notifications, use service worker with IndexedDB storage
          return new Promise((resolve) => {
            const channel = new MessageChannel();
            channel.port1.onmessage = (event) => {
              resolve(event.data.success);
            };
            
            registration.active?.postMessage({
              type: 'SCHEDULE_NOTIFICATION',
              data: {
                ...options,
                id: options.id || `notification_${Date.now()}_${Math.random()}`,
                type: this.getNotificationType(options.title)
              }
            }, [channel.port2]);
          });
        } else {
          // For immediate notifications
          this.showBrowserNotification(options);
        }
      } else {
        console.log('Service worker not ready, showing browser notification fallback:', options.title);
        this.showBrowserNotification(options);
      }
      return;
    }

    try {
      const notification = {
        title: options.title,
        body: options.body,
        id: options.id || Math.floor(Math.random() * 1000000),
        schedule: options.scheduleAt ? { at: options.scheduleAt } : { at: new Date() },
        sound: options.sound ? 'default' : undefined,
        actionTypeId: '',
        extra: options.data || {}
      };

      await LocalNotifications.schedule({
        notifications: [notification]
      });

      console.log('Notification scheduled successfully');
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  private showBrowserNotification(options: NotificationOptions) {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        const notification = new Notification(options.title, {
          body: options.body,
          icon: '/lovable-uploads/fe018138-2090-4b1d-8808-4ed8082f7011.png',
          data: options.data,
          tag: `track-my-life-${this.getNotificationType(options.title)}`,
          requireInteraction: true,
          silent: false
        } as any);

        // Auto-close notification after 10 seconds for non-critical notifications
        if (!options.title.includes('Prayer') && !options.title.includes('Workout')) {
          setTimeout(() => {
            notification.close();
          }, 10000);
        }
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            new Notification(options.title, {
              body: options.body,
              icon: '/lovable-uploads/fe018138-2090-4b1d-8808-4ed8082f7011.png',
              data: options.data,
              tag: `track-my-life-${this.getNotificationType(options.title)}`,
              requireInteraction: true
            });
          }
        });
      }
    }
  }

  private getNotificationType(title: string): string {
    if (title.includes('Prayer') || title.includes('🕋')) return 'prayer';
    if (title.includes('Meal') || title.includes('🍽️')) return 'meal';
    if (title.includes('Workout') || title.includes('🏋️')) return 'workout';
    if (title.includes('Budget') || title.includes('💰')) return 'budget';
    return 'general';
  }

  private urlB64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async scheduleReminder(title: string, body: string, scheduleAt: Date, id?: number) {
    await this.sendNotification({
      title,
      body,
      scheduleAt,
      id: id || Math.floor(Math.random() * 1000000),
      sound: true
    });
  }

  async sendDailySummaryNotification(stats: {
    workoutsCompleted: number;
    mealsLogged: number;
    transactionsAdded: number;
    activitiesScheduled: number;
  }) {
    const body = `Today: ${stats.workoutsCompleted} workouts, ${stats.mealsLogged} meals logged, ${stats.transactionsAdded} transactions, ${stats.activitiesScheduled} activities`;
    
    await this.sendNotification({
      title: '📊 Daily Summary',
      body,
      sound: true,
      data: { type: 'daily_summary', stats }
    });
  }

  async sendWorkoutReminder(workoutName: string, time: string) {
    await this.sendNotification({
      title: '🏋️ Workout Reminder',
      body: `Time for your ${workoutName} workout!`,
      sound: true,
      data: { type: 'workout_reminder', workoutName, time }
    });
  }

  async sendMealReminder(mealType: string, time: string) {
    await this.sendNotification({
      title: '🍽️ Meal Reminder',
      body: `Don't forget to log your ${mealType}!`,
      sound: true,
      data: { type: 'meal_reminder', mealType, time }
    });
  }

  async sendPrayerReminder(prayerName: string, time: string) {
    await this.sendNotification({
      title: '🕋 Prayer Time',
      body: `${prayerName} prayer is in 15 minutes`,
      sound: true,
      data: { type: 'prayer_reminder', prayerName, time }
    });
  }

  async sendBudgetAlert(category: string, percentage: number) {
    await this.sendNotification({
      title: '💰 Budget Alert',
      body: `You've used ${percentage}% of your ${category} budget`,
      sound: true,
      data: { type: 'budget_alert', category, percentage }
    });
  }

  async cancelNotification(id: number) {
    if (!Capacitor.isNativePlatform()) return;

    try {
      await LocalNotifications.cancel({
        notifications: [{ id }]
      });
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  async cancelAllNotifications() {
    if (!Capacitor.isNativePlatform()) {
      // For web, clear service worker notifications
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const registration = await navigator.serviceWorker.ready;
        return new Promise((resolve) => {
          const channel = new MessageChannel();
          channel.port1.onmessage = (event) => {
            resolve(event.data.success);
          };
          
          registration.active?.postMessage({
            type: 'CLEAR_OLD_NOTIFICATIONS'
          }, [channel.port2]);
        });
      }
      return;
    }

    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({
          notifications: pending.notifications
        });
      }
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

  // Debug method to check service worker status
  async getServiceWorkerStatus() {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      return new Promise((resolve) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = (event) => {
          resolve(event.data);
        };
        
        registration.active?.postMessage({
          type: 'PING'
        }, [channel.port2]);
      });
    }
    return null;
  }
}