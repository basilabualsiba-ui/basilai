import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePrayerSchedule } from '@/hooks/usePrayerSchedule';
import { useNotifications } from '@/hooks/useNotifications';
import { usePrayerNotifications } from './PrayerContext';
import { useGymSchedule } from '@/hooks/useGymSchedule';
import { useFoodSchedule } from '@/hooks/useFoodSchedule';

export interface DailyActivity {
  id: string;
  title: string;
  description?: string;
  activity_type: 'work' | 'exercise' | 'personal' | 'appointment' | 'other';
  start_time?: string;
  end_time?: string;
  date: string;
  is_completed: boolean;
  is_recurring: boolean;
  recurrence_type: 'daily' | 'weekly' | 'monthly' | 'custom';
  created_date: string;
  created_at: string;
  updated_at: string;
  days_of_week?: number[];
}

export interface ScheduleItem {
  id: string;
  title: string;
  description?: string;
  type: 'meal' | 'activity' | 'prayer';
  time?: string;
  startTime?: string;
  endTime?: string;
  isCompleted: boolean;
  activityType?: string;
  muscleGroups?: string[];
  emoji?: string;
  dayOfWeek?: number; // Added for meal scheduling
}

interface ScheduleContextType {
  dailyActivities: DailyActivity[];
  isLoading: boolean;
  addActivity: (activity: Omit<DailyActivity, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateActivity: (id: string, updates: Partial<DailyActivity>) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;
  getTodaySchedule: () => ScheduleItem[];
  getScheduleForDate: (date: string) => Promise<ScheduleItem[]>;
  toggleActivityCompletion: (activityId: string, date: string, isCompleted: boolean) => Promise<void>;
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

const NOTIFICATIONS_SCHEDULED_KEY = 'schedule_notifications_scheduled_date';

export const ScheduleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dailyActivities, setDailyActivities] = useState<DailyActivity[]>([]);
  const [todayCompletions, setTodayCompletions] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { getPrayerScheduleItems } = usePrayerSchedule();
  const { scheduleWorkoutReminder, scheduleMealReminder, schedulePrayerReminder } = useNotifications();
  const { notificationSettings } = usePrayerNotifications();
  const { getGymScheduleItems } = useGymSchedule(dailyActivities);
  const { getFoodScheduleItems } = useFoodSchedule();

  useEffect(() => {
    loadActivities();
    loadTodayCompletions();
  }, []);

  // Load today's completions when activities are loaded
  useEffect(() => {
    if (!isLoading) {
      loadTodayCompletions();
    }
  }, [dailyActivities, isLoading]);

  const loadTodayCompletions = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: completions } = await supabase
        .from('activity_completions')
        .select('activity_id')
        .eq('completion_date', today);

      setTodayCompletions(new Set(completions?.map(c => c.activity_id) || []));
    } catch (error) {
      console.error('Error loading today\'s completions:', error);
    }
  };

  // Schedule notifications when activities change
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const lastScheduledDate = localStorage.getItem(NOTIFICATIONS_SCHEDULED_KEY);
    
    if (lastScheduledDate !== today && !isLoading) {
      scheduleNotifications();
      localStorage.setItem(NOTIFICATIONS_SCHEDULED_KEY, today);
    }
  }, [dailyActivities, isLoading]);

  const loadActivities = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('daily_activities')
        .select('*')
        .order('date', { ascending: false })
        .order('start_time', { ascending: true });

      if (error) throw error;
      setDailyActivities((data || []) as DailyActivity[]);
    } catch (error) {
      console.error('Error loading activities:', error);
      toast({
        title: "Error",
        description: "Failed to load activities",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const scheduleNotifications = async () => {
    const todaySchedule = getTodaySchedule();
    const now = new Date();
    const currentTimeStr = now.toTimeString().slice(0, 5);

    // Find upcoming items with start times
    const upcomingItems = todaySchedule.filter(item => {
      if (!item.startTime) return false;
      return item.startTime > currentTimeStr;
    });

    // Schedule notifications for the next few upcoming items
    const itemsToNotify = upcomingItems.slice(0, 3); // Limit to next 3 items to avoid too many notifications

    for (const item of itemsToNotify) {
      if (!item.startTime) continue;

      // Skip prayer notifications if they're disabled
      if (item.type === 'prayer') {
        const prayerKey = item.title.toLowerCase().replace(' prayer', '');
        const prayerSettings = notificationSettings[prayerKey];
        if (!prayerSettings?.enabled) continue;
        
        // Use prayer-specific reminder minutes
        const [hours, minutes] = item.startTime.split(':').map(Number);
        const itemDate = new Date(now);
        itemDate.setHours(hours, minutes - prayerSettings.reminderMinutes, 0, 0);
        
        if (itemDate > now) {
          try {
            await schedulePrayerReminder(item.title.replace(' Prayer', ''), itemDate);
            console.log(`Scheduled prayer notification for ${item.title} at ${itemDate.toLocaleTimeString()}`);
          } catch (error) {
            console.error('Error scheduling prayer notification for', item.title, error);
          }
        }
      } else if (item.type === 'meal') {
        // Handle meal notifications (15 minutes before)
        const [hours, minutes] = item.startTime.split(':').map(Number);
        const itemDate = new Date(now);
        itemDate.setHours(hours, minutes - 15, 0, 0);

        if (itemDate > now) {
          try {
            await scheduleMealReminder(item.title, itemDate);
            console.log(`Scheduled meal notification for ${item.title} at ${itemDate.toLocaleTimeString()}`);
          } catch (error) {
            console.error('Error scheduling meal notification for', item.title, error);
          }
        }
      } else {
        // Handle activity/workout notifications (15 minutes before)
        const [hours, minutes] = item.startTime.split(':').map(Number);
        const itemDate = new Date(now);
        itemDate.setHours(hours, minutes - 15, 0, 0);

        if (itemDate > now) {
          try {
            if (item.activityType === 'exercise' || item.muscleGroups) {
              await scheduleWorkoutReminder(item.title, itemDate);
            } else {
              await scheduleWorkoutReminder(`Activity: ${item.title}`, itemDate);
            }
            console.log(`Scheduled activity notification for ${item.title} at ${itemDate.toLocaleTimeString()}`);
          } catch (error) {
            console.error('Error scheduling activity notification for', item.title, error);
          }
        }
      }
    }
  };

  const addActivity = async (activity: Omit<DailyActivity, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('daily_activities')
        .insert([activity])
        .select()
        .single();

      if (error) throw error;
      setDailyActivities(prev => [...prev, data as DailyActivity]);
      toast({
        title: "Success",
        description: "Activity added successfully"
      });
    } catch (error) {
      console.error('Error adding activity:', error);
      toast({
        title: "Error",
        description: "Failed to add activity",
        variant: "destructive"
      });
    }
  };

  const updateActivity = async (id: string, updates: Partial<DailyActivity>) => {
    try {
      // If updating completion status, handle it with date-specific completion tracking
      if ('is_completed' in updates) {
        const currentDate = new Date().toISOString().split('T')[0];
        await toggleActivityCompletion(id, currentDate, updates.is_completed || false);
        return;
      }

      // For other updates, update the activity directly
      const { data, error } = await supabase
        .from('daily_activities')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setDailyActivities(prev => prev.map(activity => 
        activity.id === id ? data as DailyActivity : activity
      ));
    } catch (error) {
      console.error('Error updating activity:', error);
      toast({
        title: "Error",
        description: "Failed to update activity",
        variant: "destructive"
      });
    }
  };

  const toggleActivityCompletion = async (activityId: string, date: string, isCompleted: boolean) => {
    try {
      if (isCompleted) {
        // Add completion record for this date
        const { error } = await supabase
          .from('activity_completions')
          .insert([{
            activity_id: activityId,
            completion_date: date
          }]);
        
        if (error && error.code !== '23505') { // Ignore unique constraint violation
          throw error;
        }
      } else {
        // Remove completion record for this date
        const { error } = await supabase
          .from('activity_completions')
          .delete()
          .eq('activity_id', activityId)
          .eq('completion_date', date);

        if (error) throw error;
      }

      // Update today's completions state if the date is today
      const today = new Date().toISOString().split('T')[0];
      if (date === today) {
        setTodayCompletions(prev => {
          const newSet = new Set(prev);
          if (isCompleted) {
            newSet.add(activityId);
          } else {
            newSet.delete(activityId);
          }
          return newSet;
        });
      }
    } catch (error) {
      console.error('Error toggling activity completion:', error);
      throw error;
    }
  };

  const deleteActivity = async (id: string) => {
    try {
      const { error } = await supabase
        .from('daily_activities')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setDailyActivities(prev => prev.filter(activity => activity.id !== id));
      toast({
        title: "Success",
        description: "Activity deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast({
        title: "Error",
        description: "Failed to delete activity",
        variant: "destructive"
      });
    }
  };

  const getTodaySchedule = (): ScheduleItem[] => {
    const today = new Date().toISOString().split('T')[0];
    const todayDayOfWeek = new Date().getDay() || 7; // Convert Sunday (0) to 7
    
    // Get activities that should show today
    const todayActivities = dailyActivities
      .filter(activity => {
        // If activity has a specific date, only show on that date
        if (activity.date && activity.date !== today) return false;
        
        // For recurring activities, check days_of_week
        if (activity.days_of_week && activity.days_of_week.length > 0) {
          return activity.days_of_week.includes(todayDayOfWeek);
        }
        
        // For non-recurring activities without days_of_week, only show on their specific date
        return activity.date === today;
      })
      .map(activity => ({
        id: activity.id,
        title: activity.title,
        description: activity.description,
        type: 'activity' as const,
        startTime: activity.start_time,
        endTime: activity.end_time,
        isCompleted: todayCompletions.has(activity.id), // Use date-specific completion status
        activityType: activity.activity_type
      }));

    // Add prayer times if available
    const prayerScheduleItems = getPrayerScheduleItems();
    
    // Add gym workouts for today
    const gymScheduleItems = getGymScheduleItems(today);
    
    // Add food/meal items for today
    const foodScheduleItems = getFoodScheduleItems(today);

    const allItems = [...todayActivities, ...prayerScheduleItems, ...gymScheduleItems, ...foodScheduleItems];

    return allItems.sort((a, b) => {
      if (!a.startTime && !b.startTime) return 0;
      if (!a.startTime) return 1;
      if (!b.startTime) return -1;
      return a.startTime.localeCompare(b.startTime);
    });
  };

  const getScheduleForDate = async (dateStr: string): Promise<ScheduleItem[]> => {
    const targetDate = new Date(dateStr);
    const dayOfWeek = targetDate.getDay() || 7; // Convert Sunday (0) to 7
    
    try {
      // Get activities that match this day of week
      const activitiesForDay = dailyActivities.filter(activity => {
        // If activity has a specific date, only show on that date
        if (activity.date && activity.date !== dateStr) return false;
        
        // For recurring activities, check days_of_week
        if (activity.days_of_week && activity.days_of_week.length > 0) {
          return activity.days_of_week.includes(dayOfWeek);
        }
        
        // For non-recurring activities without days_of_week, only show on their specific date
        return activity.date === dateStr;
      });

      // Get completion status for this specific date
      const { data: completions } = await supabase
        .from('activity_completions')
        .select('activity_id')
        .eq('completion_date', dateStr);

      const completionIds = new Set(completions?.map(c => c.activity_id) || []);

      const activities = activitiesForDay.map(activity => ({
        id: activity.id,
        title: activity.title,
        description: activity.description,
        type: 'activity' as const,
        startTime: activity.start_time,
        endTime: activity.end_time,
        isCompleted: completionIds.has(activity.id),
        activityType: activity.activity_type
      }));

      // Add prayer times for this date
      const prayerItems = getPrayerScheduleItems();
      
      // Add gym workouts for this date
      const gymItems = getGymScheduleItems(dateStr);
      
      // Add food/meal items for this date
      const foodItems = getFoodScheduleItems(dateStr);
      
      const allItems = [...activities, ...prayerItems, ...gymItems, ...foodItems];

      return allItems.sort((a, b) => {
        if (!a.startTime && !b.startTime) return 0;
        if (!a.startTime) return 1;
        if (!b.startTime) return -1;
        return a.startTime.localeCompare(b.startTime);
      });
    } catch (error) {
      console.error('Error loading activities for date:', error);
      return [];
    }
  };

  const value: ScheduleContextType = {
    dailyActivities,
    isLoading,
    addActivity,
    updateActivity,
    deleteActivity,
    getTodaySchedule,
    getScheduleForDate,
    toggleActivityCompletion
  };

  return (
    <ScheduleContext.Provider value={value}>
      {children}
    </ScheduleContext.Provider>
  );
};

export const useSchedule = () => {
  const context = useContext(ScheduleContext);
  if (context === undefined) {
    throw new Error('useSchedule must be used within a ScheduleProvider');
  }
  return context;
};