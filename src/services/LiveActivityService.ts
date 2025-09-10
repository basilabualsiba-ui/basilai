import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export interface WorkoutLiveActivityData {
  workoutName: string;
  currentExercise: string;
  exerciseIndex: number;
  totalExercises: number;
  elapsedTime: number;
  nextEvent?: {
    title: string;
    time: string;
    timeUntil: number; // minutes until event
  };
  restTime?: number;
}

export class LiveActivityService {
  private static instance: LiveActivityService;
  private isActive = false;
  private activityId: string | null = null;
  private timer: NodeJS.Timeout | null = null;
  private startTime: number = 0;
  private currentData: WorkoutLiveActivityData | null = null;

  static getInstance(): LiveActivityService {
    if (!LiveActivityService.instance) {
      LiveActivityService.instance = new LiveActivityService();
    }
    return LiveActivityService.instance;
  }

  async initialize() {
    if (!Capacitor.isNativePlatform()) return;

    // Request notification permissions
    const permission = await LocalNotifications.requestPermissions();
    if (permission.display !== 'granted') {
      console.warn('Notification permission not granted');
    }
  }

  async startWorkoutActivity(data: Omit<WorkoutLiveActivityData, 'elapsedTime'>) {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
      console.warn('Live Activities only supported on iOS');
      return;
    }

    this.isActive = true;
    this.startTime = Date.now();
    this.currentData = { ...data, elapsedTime: 0 };
    this.activityId = `workout_${Date.now()}`;

    // Start the timer to update every second
    this.timer = setInterval(() => {
      this.updateActivity();
    }, 1000);

    // Create initial notification
    await this.createWorkoutNotification();
    
    // Schedule periodic updates
    await this.schedulePeriodicUpdates();
  }

  private async updateActivity() {
    if (!this.isActive || !this.currentData) return;

    const now = Date.now();
    this.currentData.elapsedTime = Math.floor((now - this.startTime) / 1000);

    // Update next event time until
    if (this.currentData.nextEvent) {
      const nextEventTime = new Date();
      const [hours, minutes] = this.currentData.nextEvent.time.split(':');
      nextEventTime.setHours(parseInt(hours), parseInt(minutes), 0);
      
      const timeUntil = Math.max(0, Math.floor((nextEventTime.getTime() - now) / (1000 * 60)));
      this.currentData.nextEvent.timeUntil = timeUntil;
    }

    // Update the ongoing notification
    await this.updateWorkoutNotification();
  }

  private async createWorkoutNotification() {
    if (!this.currentData) return;

    const { workoutName, currentExercise, exerciseIndex, totalExercises, nextEvent } = this.currentData;
    
    let body = `${currentExercise} (${exerciseIndex + 1}/${totalExercises})`;
    if (nextEvent) {
      body += `\nNext: ${nextEvent.title} in ${nextEvent.timeUntil}min`;
    }

    try {
      await LocalNotifications.schedule({
        notifications: [{
          title: `🏋️ ${workoutName}`,
          body,
          id: parseInt(this.activityId?.replace('workout_', '') || '1'),
          schedule: { at: new Date() },
          ongoing: true,
          autoCancel: false,
          extra: {
            type: 'workout_live_activity',
            data: this.currentData
          }
        }]
      });
    } catch (error) {
      console.error('Failed to create workout notification:', error);
    }
  }

  private async updateWorkoutNotification() {
    if (!this.currentData || !this.activityId) return;

    const { workoutName, currentExercise, exerciseIndex, totalExercises, elapsedTime, nextEvent, restTime } = this.currentData;
    
    const minutes = Math.floor(elapsedTime / 60);
    const seconds = elapsedTime % 60;
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    let body = `⏱️ ${timeStr} | ${currentExercise} (${exerciseIndex + 1}/${totalExercises})`;
    
    if (restTime && restTime > 0) {
      body = `😴 Rest: ${restTime}s | ${body}`;
    }
    
    if (nextEvent && nextEvent.timeUntil > 0) {
      body += `\n📅 Next: ${nextEvent.title} in ${nextEvent.timeUntil}min`;
    }

    try {
      // Cancel previous notification and create new one (iOS doesn't support true updates)
      await LocalNotifications.cancel({
        notifications: [{ id: parseInt(this.activityId.replace('workout_', '')) }]
      });

      await LocalNotifications.schedule({
        notifications: [{
          title: `🏋️ ${workoutName}`,
          body,
          id: parseInt(this.activityId.replace('workout_', '')),
          schedule: { at: new Date() },
          ongoing: true,
          autoCancel: false,
          extra: {
            type: 'workout_live_activity',
            data: this.currentData
          }
        }]
      });
    } catch (error) {
      console.error('Failed to update workout notification:', error);
    }
  }

  private async schedulePeriodicUpdates() {
    // Schedule notifications for rest periods and key workout milestones
    const notifications = [];
    
    // Schedule 10-minute milestone notifications
    for (let i = 10; i <= 60; i += 10) {
      notifications.push({
        title: `🏋️ Workout Progress`,
        body: `${i} minutes completed! Keep going! 💪`,
        id: parseInt(`${this.activityId?.replace('workout_', '') || '1'}${i}`),
        schedule: { at: new Date(Date.now() + i * 60 * 1000) },
        autoCancel: true
      });
    }

    try {
      await LocalNotifications.schedule({ notifications });
    } catch (error) {
      console.error('Failed to schedule periodic updates:', error);
    }
  }

  async updateCurrentExercise(exerciseName: string, index: number, totalExercises: number) {
    if (!this.isActive || !this.currentData) return;

    this.currentData.currentExercise = exerciseName;
    this.currentData.exerciseIndex = index;
    this.currentData.totalExercises = totalExercises;

    await this.updateWorkoutNotification();
  }

  async updateNextEvent(nextEvent: WorkoutLiveActivityData['nextEvent']) {
    if (!this.isActive || !this.currentData) return;

    this.currentData.nextEvent = nextEvent;
    await this.updateWorkoutNotification();
  }

  async startRestPeriod(seconds: number) {
    if (!this.isActive || !this.currentData) return;

    this.currentData.restTime = seconds;
    
    // Create rest timer notification
    const restTimer = setInterval(async () => {
      if (!this.currentData || !this.currentData.restTime) {
        clearInterval(restTimer);
        return;
      }

      this.currentData.restTime--;
      
      if (this.currentData.restTime <= 0) {
        clearInterval(restTimer);
        this.currentData.restTime = undefined;
        
        // Show rest complete notification
        await LocalNotifications.schedule({
          notifications: [{
            title: '✅ Rest Complete!',
            body: 'Time to continue your workout!',
            id: 99999,
            schedule: { at: new Date() },
            sound: 'default'
          }]
        });
      }
      
      await this.updateWorkoutNotification();
    }, 1000);
  }

  async endWorkoutActivity() {
    if (!this.isActive) return;

    this.isActive = false;
    
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    // Cancel ongoing notification
    if (this.activityId) {
      try {
        await LocalNotifications.cancel({
          notifications: [{ id: parseInt(this.activityId.replace('workout_', '')) }]
        });
      } catch (error) {
        console.error('Failed to cancel workout notification:', error);
      }
    }

    // Show workout completion notification
    if (this.currentData) {
      const minutes = Math.floor(this.currentData.elapsedTime / 60);
      const seconds = this.currentData.elapsedTime % 60;
      const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

      await LocalNotifications.schedule({
        notifications: [{
          title: '🎉 Workout Complete!',
          body: `Great job! You worked out for ${timeStr}`,
          id: 99998,
          schedule: { at: new Date() },
          sound: 'default'
        }]
      });
    }

    this.activityId = null;
    this.currentData = null;
    this.startTime = 0;
  }

  isWorkoutActive(): boolean {
    return this.isActive;
  }

  getCurrentData(): WorkoutLiveActivityData | null {
    return this.currentData;
  }
}