import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePrayerSchedule } from '@/hooks/usePrayerSchedule';
import { useNotifications } from '@/hooks/useNotifications';
import { usePrayerNotifications } from './PrayerContext';
import { useGymSchedule } from '@/hooks/useGymSchedule';

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
  dayOfWeek?: number;
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
  const { scheduleWorkoutReminder, schedulePrayerReminder } = useNotifications();
  const { notificationSettings } = usePrayerNotifications();
  const { getGymScheduleItems } = useGymSchedule(dailyActivities);

  useEffect(() => {
    loadActivities();
    loadTodayCompletions();
  }, []);

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
      toast({ title: "Error", description: "Failed to load activities", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const scheduleNotifications = async () => {
    const todaySchedule = getTodaySchedule();
    const now = new Date();
    const currentTimeStr = now.toTimeString().slice(0, 5);

    const upcomingItems = todaySchedule.filter(item => {
      if (!item.startTime) return false;
      return item.startTime > currentTimeStr;
    });

    const itemsToNotify = upcomingItems.slice(0, 3);

    for (const item of itemsToNotify) {
      if (!item.startTime) continue;

      if (item.type === 'prayer') {
        const prayerKey = item.title.toLowerCase().replace(' prayer', '');
        const prayerSettings = notificationSettings[prayerKey];
        if (!prayerSettings?.enabled) continue;
        
        const [hours, minutes] = item.startTime.split(':').map(Number);
        const itemDate = new Date(now);
        itemDate.setHours(hours, minutes - prayerSettings.reminderMinutes, 0, 0);
        
        if (itemDate > now) {
          try {
            await schedulePrayerReminder(item.title.replace(' Prayer', ''), itemDate);
          } catch (error) {
            console.error('Error scheduling prayer notification for', item.title, error);
          }
        }
      } else {
        const [hours, minutes] = item.startTime.split(':').map(Number);
        const itemDate = new Date(now);
        itemDate.setHours(hours, minutes - 15, 0, 0);

        if (itemDate > now) {
          try {
            await scheduleWorkoutReminder(`Activity: ${item.title}`, itemDate);
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
      toast({ title: "Success", description: "Activity added successfully" });
    } catch (error) {
      console.error('Error adding activity:', error);
      toast({ title: "Error", description: "Failed to add activity", variant: "destructive" });
    }
  };

  const updateActivity = async (id: string, updates: Partial<DailyActivity>) => {
    try {
      if ('is_completed' in updates) {
        const currentDate = new Date().toISOString().split('T')[0];
        await toggleActivityCompletion(id, currentDate, updates.is_completed || false);
        return;
      }
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
      toast({ title: "Error", description: "Failed to update activity", variant: "destructive" });
    }
  };

  const toggleActivityCompletion = async (activityId: string, date: string, isCompleted: boolean) => {
    try {
      if (isCompleted) {
        const { error } = await supabase
          .from('activity_completions')
          .insert([{ activity_id: activityId, completion_date: date }]);
        if (error && error.code !== '23505') throw error;
      } else {
        const { error } = await supabase
          .from('activity_completions')
          .delete()
          .eq('activity_id', activityId)
          .eq('completion_date', date);
        if (error) throw error;
      }

      const today = new Date().toISOString().split('T')[0];
      if (date === today) {
        setTodayCompletions(prev => {
          const newSet = new Set(prev);
          if (isCompleted) { newSet.add(activityId); } else { newSet.delete(activityId); }
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
      toast({ title: "Success", description: "Activity deleted successfully" });
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast({ title: "Error", description: "Failed to delete activity", variant: "destructive" });
    }
  };

  const getTodaySchedule = (): ScheduleItem[] => {
    const today = new Date().toISOString().split('T')[0];
    const todayDayOfWeek = new Date().getDay() || 7;
    
    const todayActivities = dailyActivities
      .filter(activity => {
        if (activity.date && activity.date !== today) return false;
        if (activity.days_of_week && activity.days_of_week.length > 0) {
          return activity.days_of_week.includes(todayDayOfWeek);
        }
        return activity.date === today;
      })
      .map(activity => ({
        id: activity.id,
        title: activity.title,
        description: activity.description,
        type: 'activity' as const,
        startTime: activity.start_time,
        endTime: activity.end_time,
        isCompleted: todayCompletions.has(activity.id),
        activityType: activity.activity_type
      }));

    const prayerScheduleItems = getPrayerScheduleItems();
    const gymScheduleItems = getGymScheduleItems(today);

    const allItems = [...todayActivities, ...prayerScheduleItems, ...gymScheduleItems];

    return allItems.sort((a, b) => {
      if (!a.startTime && !b.startTime) return 0;
      if (!a.startTime) return 1;
      if (!b.startTime) return -1;
      return a.startTime.localeCompare(b.startTime);
    });
  };

  const getScheduleForDate = async (dateStr: string): Promise<ScheduleItem[]> => {
    const targetDate = new Date(dateStr);
    const dayOfWeek = targetDate.getDay() || 7;
    
    try {
      const activitiesForDay = dailyActivities.filter(activity => {
        if (activity.date && activity.date !== dateStr) return false;
        if (activity.days_of_week && activity.days_of_week.length > 0) {
          return activity.days_of_week.includes(dayOfWeek);
        }
        return activity.date === dateStr;
      });

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

      const prayerItems = getPrayerScheduleItems();
      const gymItems = getGymScheduleItems(dateStr);
      
      const allItems = [...activities, ...prayerItems, ...gymItems];

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
    dailyActivities, isLoading, addActivity, updateActivity, deleteActivity,
    getTodaySchedule, getScheduleForDate, toggleActivityCompletion
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
