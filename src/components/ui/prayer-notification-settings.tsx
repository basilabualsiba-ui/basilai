import { usePrayerNotifications } from '@/contexts/PrayerContext';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const PrayerNotificationSettings = () => {
  const { notificationSettings, updateNotificationSettings } = usePrayerNotifications();

  const prayers = [
    { key: 'fajr', name: 'Fajr', emoji: '🌅', arabicName: 'الفجر' },
    { key: 'dhuhr', name: 'Dhuhr', emoji: '☀️', arabicName: 'الظهر' },
    { key: 'asr', name: 'Asr', emoji: '🌇', arabicName: 'العصر' },
    { key: 'maghrib', name: 'Maghrib', emoji: '🌆', arabicName: 'المغرب' },
    { key: 'isha', name: 'Isha', emoji: '🌙', arabicName: 'العشاء' },
  ];

  const reminderOptions = [
    { value: 5, label: '5 minutes before' },
    { value: 10, label: '10 minutes before' },
    { value: 15, label: '15 minutes before' },
    { value: 20, label: '20 minutes before' },
    { value: 30, label: '30 minutes before' },
  ];

  const allEnabled = prayers.every((p) => notificationSettings[p.key].enabled);
  const reminderMinutes = notificationSettings['fajr']?.reminderMinutes ?? 10;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div className="flex items-center gap-3">
          <span className="text-lg">🕌</span>
          <div>
            <Label className="font-medium">Prayer Time</Label>
            <div className="text-sm text-muted-foreground">مواقيت الصلاة</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={reminderMinutes.toString()}
            onValueChange={(value) => {
              const minutes = parseInt(value);
              prayers.forEach((p) => {
                const current = notificationSettings[p.key];
                updateNotificationSettings(p.key, {
                  ...current,
                  reminderMinutes: minutes,
                });
              });
            }}
            disabled={!allEnabled}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {reminderOptions.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Switch
            checked={allEnabled}
            onCheckedChange={(enabled) => {
              prayers.forEach((p) => {
                const current = notificationSettings[p.key];
                updateNotificationSettings(p.key, {
                  ...current,
                  enabled,
                });
              });
            }}
          />
        </div>
      </div>
    </div>
  );
};