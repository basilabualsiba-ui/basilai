import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, TestTube, Clock, Calendar } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { usePrayerNotifications } from '@/contexts/PrayerContext';

export const NotificationSettings = () => {
  const { 
    isInitialized, 
    permissionGranted, 
    sendTestNotification,
    scheduleWorkoutReminder,
    scheduleMealReminder 
  } = useNotifications();
  
  const { notificationSettings, updateNotificationSettings } = usePrayerNotifications();
  
  const [settings, setSettings] = useState({
    workoutReminders: true,
    mealReminders: true,
    budgetAlerts: true,
    dailySummary: true,
    prayerReminders: true
  });

  const handleSettingChange = (key: keyof typeof settings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    
    // If prayer reminders are toggled, update all prayer notification settings
    if (key === 'prayerReminders') {
      const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
      prayers.forEach(prayer => {
        const currentSettings = notificationSettings[prayer];
        updateNotificationSettings(prayer, {
          ...currentSettings,
          enabled: value
        });
      });
    }
  };

  const scheduleTestWorkout = async () => {
    const testTime = new Date();
    testTime.setMinutes(testTime.getMinutes() + 1); // 1 minute from now
    await scheduleWorkoutReminder('Test Workout', testTime);
  };

  const scheduleTestMeal = async () => {
    const testTime = new Date();
    testTime.setMinutes(testTime.getMinutes() + 2); // 2 minutes from now
    await scheduleMealReminder('lunch', testTime);
  };

  if (!isInitialized) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Settings
          </CardTitle>
          <CardDescription>
            Initializing notifications...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notification Settings
        </CardTitle>
        <CardDescription>
          {permissionGranted 
            ? "Manage your notification preferences" 
            : "Notifications are disabled. Enable them in your device settings."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Permission Status */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span className="font-medium">Notification Permission</span>
          </div>
          <div className={`px-2 py-1 rounded text-sm ${
            permissionGranted 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}>
            {permissionGranted ? 'Granted' : 'Denied'}
          </div>
        </div>

        {/* Test Notifications */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <TestTube className="w-4 h-4" />
            Test Notifications
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={sendTestNotification}
              disabled={!permissionGranted}
            >
              Send Test
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={scheduleTestWorkout}
              disabled={!permissionGranted}
              className="flex items-center gap-1"
            >
              <Clock className="w-3 h-3" />
              Workout (1m)
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={scheduleTestMeal}
              disabled={!permissionGranted}
              className="flex items-center gap-1"
            >
              <Calendar className="w-3 h-3" />
              Meal (2m)
            </Button>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="space-y-4">
          <h4 className="font-medium">Notification Types</h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="workout-reminders" className="flex flex-col gap-1">
                <span>Workout Reminders</span>
                <span className="text-sm text-muted-foreground">
                  Get notified when it's time to work out
                </span>
              </Label>
              <Switch
                id="workout-reminders"
                checked={settings.workoutReminders}
                onCheckedChange={(checked) => handleSettingChange('workoutReminders', checked)}
                disabled={!permissionGranted}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="meal-reminders" className="flex flex-col gap-1">
                <span>Meal Reminders</span>
                <span className="text-sm text-muted-foreground">
                  Reminders to log your meals
                </span>
              </Label>
              <Switch
                id="meal-reminders"
                checked={settings.mealReminders}
                onCheckedChange={(checked) => handleSettingChange('mealReminders', checked)}
                disabled={!permissionGranted}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="budget-alerts" className="flex flex-col gap-1">
                <span>Budget Alerts</span>
                <span className="text-sm text-muted-foreground">
                  Alerts when approaching budget limits
                </span>
              </Label>
              <Switch
                id="budget-alerts"
                checked={settings.budgetAlerts}
                onCheckedChange={(checked) => handleSettingChange('budgetAlerts', checked)}
                disabled={!permissionGranted}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="prayer-reminders" className="flex flex-col gap-1">
                <span>Prayer Time</span>
                <span className="text-sm text-muted-foreground">
                  Notifications for all prayer times
                </span>
              </Label>
              <Switch
                id="prayer-reminders"
                checked={settings.prayerReminders}
                onCheckedChange={(checked) => handleSettingChange('prayerReminders', checked)}
                disabled={!permissionGranted}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="daily-summary" className="flex flex-col gap-1">
                <span>Daily Summary</span>
                <span className="text-sm text-muted-foreground">
                  End-of-day activity summary
                </span>
              </Label>
              <Switch
                id="daily-summary"
                checked={settings.dailySummary}
                onCheckedChange={(checked) => handleSettingChange('dailySummary', checked)}
                disabled={!permissionGranted}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};