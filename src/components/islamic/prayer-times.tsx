import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, MapPin } from 'lucide-react';
import { usePrayerNotifications } from '@/contexts/PrayerContext';
import { Geolocation } from '@capacitor/geolocation';

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

interface PrayerInfo {
  name: string;
  time: string;
  emoji: string;
  arabicName: string;
}

export const PrayerTimes = () => {
  const [currentPrayer, setCurrentPrayer] = useState<string>('');
  const [nextPrayer, setNextPrayer] = useState<PrayerInfo | null>(null);
  const { prayerTimes, loading, fetchPrayerTimes, getNextPrayerTime } = usePrayerNotifications();

  useEffect(() => {
    if (prayerTimes) {
      updateCurrentPrayer();
      const interval = setInterval(updateCurrentPrayer, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [prayerTimes]);

  const fetchNewPrayerTimes = async () => {
    await fetchPrayerTimes();
  };

  const prayers: Array<{ key: keyof PrayerTime; name: string; emoji: string; arabicName: string }> = [
    { key: 'fajr', name: 'Fajr', emoji: '🌅', arabicName: 'الفجر' },
    { key: 'dhuhr', name: 'Dhuhr', emoji: '☀️', arabicName: 'الظهر' },
    { key: 'asr', name: 'Asr', emoji: '🌇', arabicName: 'العصر' },
    { key: 'maghrib', name: 'Maghrib', emoji: '🌆', arabicName: 'المغرب' },
    { key: 'isha', name: 'Isha', emoji: '🌙', arabicName: 'العشاء' },
  ];

  const updateCurrentPrayer = () => {
    if (!prayerTimes) return;

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);

    let current = '';
    let next: PrayerInfo | null = null;

    for (let i = 0; i < prayers.length; i++) {
      const prayer = prayers[i];
      const prayerTime = prayerTimes[prayer.key] as string;
      
      if (currentTime >= prayerTime) {
        current = prayer.name;
      } else {
        next = {
          name: prayer.name,
          time: prayerTime,
          emoji: prayer.emoji,
          arabicName: prayer.arabicName
        };
        break;
      }
    }

    // If we're past Isha, next prayer is tomorrow's Fajr
    if (!next && current === 'Isha') {
      next = {
        name: 'Fajr',
        time: prayerTimes.fajr,
        emoji: '🌅',
        arabicName: 'الفجر'
      };
    }

    setCurrentPrayer(current);
    setNextPrayer(next);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Prayer Times
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading prayer times...</div>
        </CardContent>
      </Card>
    );
  }

  if (!prayerTimes) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Prayer Times
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 space-y-4">
            <div>Unable to load prayer times</div>
            <Button onClick={fetchNewPrayerTimes} disabled={loading}>
              {loading ? 'Loading...' : 'Retry'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Prayer Times
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {prayerTimes.city}, {prayerTimes.country}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {nextPrayer && (
          <div className="p-3 bg-primary/10 rounded-lg">
            <div className="text-sm text-muted-foreground">Next Prayer</div>
            <div className="flex items-center justify-between">
              <span className="font-semibold">
                {nextPrayer.emoji} {nextPrayer.name} ({nextPrayer.arabicName})
              </span>
              <Badge variant="outline">{formatTime(nextPrayer.time)}</Badge>
            </div>
          </div>
        )}
        
        <div className="space-y-2">
          {prayers.map((prayer) => {
            const time = prayerTimes[prayer.key] as string;
            const isCurrent = currentPrayer === prayer.name;
            
            return (
              <div
                key={prayer.key}
                className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                  isCurrent ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{prayer.emoji}</span>
                  <div>
                    <div className="font-medium">{prayer.name}</div>
                    <div className="text-sm text-muted-foreground">{prayer.arabicName}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono">{formatTime(time)}</div>
                  {isCurrent && (
                    <Badge variant="default" className="text-xs">Current</Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};