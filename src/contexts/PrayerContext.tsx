import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/hooks/useNotifications';

interface PrayerTime {
  id: string;
  date: string;
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  sunrise: string;
  sunset: string;
  city: string;
  country: string;
}

interface PrayerNotificationSettings {
  enabled: boolean;
  reminderMinutes: number;
}

interface PrayerNotificationContextType {
  prayerTimes: PrayerTime | null;
  loading: boolean;
  notificationSettings: Record<string, PrayerNotificationSettings>;
  updateNotificationSettings: (prayer: string, settings: PrayerNotificationSettings) => void;
  fetchPrayerTimes: () => Promise<void>;
  schedulePrayerNotifications: () => Promise<void>;
  getNextPrayerTime: () => { name: string; time: string; emoji: string } | null;
}

const PrayerNotificationContext = createContext<PrayerNotificationContextType | undefined>(undefined);

const PRAYER_STORAGE_KEY = 'prayer_notification_settings';
const NOTIFICATIONS_SCHEDULED_KEY = 'prayer_notifications_scheduled_date';

export const PrayerNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationSettings, setNotificationSettings] = useState<Record<string, PrayerNotificationSettings>>({
    fajr: { enabled: true, reminderMinutes: 15 },
    dhuhr: { enabled: true, reminderMinutes: 15 },
    asr: { enabled: true, reminderMinutes: 15 },
    maghrib: { enabled: true, reminderMinutes: 15 },
    isha: { enabled: true, reminderMinutes: 15 },
  });

  const { toast } = useToast();
  const { schedulePrayerReminder } = useNotifications();

  const prayers = [
    { key: 'fajr', name: 'Fajr', emoji: '🌅', arabicName: 'الفجر' },
    { key: 'dhuhr', name: 'Dhuhr', emoji: '☀️', arabicName: 'الظهر' },
    { key: 'asr', name: 'Asr', emoji: '🌇', arabicName: 'العصر' },
    { key: 'maghrib', name: 'Maghrib', emoji: '🌆', arabicName: 'المغرب' },
    { key: 'isha', name: 'Isha', emoji: '🌙', arabicName: 'العشاء' },
  ];

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem(PRAYER_STORAGE_KEY);
    if (savedSettings) {
      setNotificationSettings(JSON.parse(savedSettings));
    }
  }, []);

  // Save settings to localStorage
  const updateNotificationSettings = (prayer: string, settings: PrayerNotificationSettings) => {
    const newSettings = { ...notificationSettings, [prayer]: settings };
    setNotificationSettings(newSettings);
    localStorage.setItem(PRAYER_STORAGE_KEY, JSON.stringify(newSettings));
  };

  const fetchPrayerTimes = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('prayer_times')
        .select('*')
        .eq('date', today)
        .maybeSingle();

      if (error) {
        console.error('Error fetching prayer times:', error);
        return;
      }

      if (data) {
        setPrayerTimes(data);
      } else {
        // No prayer times found for today, fetch them from API
        await fetchPrayerTimesFromAPI();
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrayerTimesFromAPI = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-prayer-times', {
        body: {
          city: 'Ramallah',
          country: 'Palestine'
        }
      });

      if (error) {
        console.error('Error fetching from API:', error);
        toast({
          title: "Error",
          description: "Failed to fetch prayer times. Please try again.",
          variant: "destructive"
        });
        return;
      }

      if (data?.success && data?.data) {
        setPrayerTimes(data.data);
        toast({
          title: "Prayer times updated",
          description: "Prayer times have been loaded successfully."
        });
      }
    } catch (error) {
      console.error('Error calling edge function:', error);
      toast({
        title: "Error",
        description: "Failed to fetch prayer times. Please check your internet connection.",
        variant: "destructive"
      });
    }
  };

  const schedulePrayerNotifications = async () => {
    if (!prayerTimes) return;

    const today = new Date().toDateString();
    
    prayers.forEach(async (prayer) => {
      const settings = notificationSettings[prayer.key];
      if (settings.enabled) {
        // Parse prayer time and create Date object
        const [hours, minutes] = prayerTimes[prayer.key as keyof PrayerTime].toString().split(':');
        const prayerTime = new Date();
        prayerTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        // Create reminder time (15 minutes before)
        const reminderTime = new Date(prayerTime.getTime() - 15 * 60 * 1000);
        
        // Only schedule if reminder time is in the future
        const now = new Date();
        if (reminderTime > now) {
          try {
            await schedulePrayerReminder(prayer.name, reminderTime);
          } catch (error) {
            console.error(`Failed to schedule ${prayer.name} reminder:`, error);
          }
        }
      }
    });
  };


  const getNextPrayerTime = () => {
    if (!prayerTimes) return null;

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);

    for (const prayer of prayers) {
      const prayerTime = prayerTimes[prayer.key as keyof PrayerTime] as string;
      
      if (currentTime < prayerTime) {
        return {
          name: prayer.name,
          time: prayerTime,
          emoji: prayer.emoji
        };
      }
    }

    // If we're past all prayers today, next is tomorrow's Fajr
    return {
      name: 'Fajr',
      time: prayerTimes.fajr,
      emoji: '🌅'
    };
  };

  // Load prayer times on mount
  useEffect(() => {
    fetchPrayerTimes();
  }, []);

  // Schedule notifications when prayer times are loaded or settings change
  useEffect(() => {
    if (prayerTimes) {
      schedulePrayerNotifications();
    }
  }, [prayerTimes, notificationSettings]);

  const value: PrayerNotificationContextType = {
    prayerTimes,
    loading,
    notificationSettings,
    updateNotificationSettings,
    fetchPrayerTimes,
    schedulePrayerNotifications,
    getNextPrayerTime
  };

  return (
    <PrayerNotificationContext.Provider value={value}>
      {children}
    </PrayerNotificationContext.Provider>
  );
};

export const usePrayerNotifications = () => {
  const context = useContext(PrayerNotificationContext);
  if (context === undefined) {
    throw new Error('usePrayerNotifications must be used within a PrayerNotificationProvider');
  }
  return context;
};