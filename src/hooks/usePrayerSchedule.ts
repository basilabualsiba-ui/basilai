import { usePrayerNotifications } from '@/contexts/PrayerContext';
import { ScheduleItem } from '@/contexts/ScheduleContext';

export const usePrayerSchedule = () => {
  const { prayerTimes } = usePrayerNotifications();

  const getPrayerScheduleItems = (): ScheduleItem[] => {
    if (!prayerTimes) return [];

    const prayers = [
      { key: 'fajr', name: 'Fajr', emoji: '🌅', arabicName: 'الفجر' },
      { key: 'dhuhr', name: 'Dhuhr', emoji: '☀️', arabicName: 'الظهر' },
      { key: 'asr', name: 'Asr', emoji: '🌇', arabicName: 'العصر' },
      { key: 'maghrib', name: 'Maghrib', emoji: '🌆', arabicName: 'المغرب' },
      { key: 'isha', name: 'Isha', emoji: '🌙', arabicName: 'العشاء' },
    ];

    return prayers.map((prayer, index) => ({
      id: `prayer-${prayer.key}`,
      title: `${prayer.name} Prayer`,
      description: prayer.arabicName,
      type: 'prayer' as const,
      startTime: prayerTimes[prayer.key as keyof typeof prayerTimes] as string,
      isCompleted: false, // Prayers are not completable tasks
      emoji: prayer.emoji
    }));
  };

  return {
    getPrayerScheduleItems
  };
};