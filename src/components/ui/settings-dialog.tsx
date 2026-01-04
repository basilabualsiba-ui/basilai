import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { Bell, TestTube, Clock, Calendar, Settings, Smartphone, Info, MapPin, Crosshair, Volume2, VolumeX } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useFirstTimePermissions } from '@/hooks/useFirstTimePermissions';
import { useToast } from '@/hooks/use-toast';
import { useSound } from '@/hooks/useSound';
import { Geolocation } from '@capacitor/geolocation';
import { usePrayerNotifications } from '@/contexts/PrayerContext';

interface SettingsDialogProps {
  children: React.ReactNode;
}

export const SettingsDialog = ({ children }: SettingsDialogProps) => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { isEnabled, setEnabled, getVolume, setVolume, click, success } = useSound();
  const {
    isInitialized,
    permissionGranted,
    sendTestNotification,
    scheduleWorkoutReminder,
    scheduleMealReminder,
    checkNotificationPermission,
    enableNotifications
  } = useNotifications();
  const {
    permissionStatus,
    updatePermissionStatus
  } = useFirstTimePermissions();
  
  const { updateNotificationSettings } = usePrayerNotifications();
  
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundVolume, setSoundVolume] = useState(50);
  
  useEffect(() => {
    setSoundEnabled(isEnabled());
    setSoundVolume(getVolume() * 100);
  }, []);
  
  const [settings, setSettings] = useState({
    workoutReminders: true,
    mealReminders: true,
    activityReminders: true,
    prayerReminders: true,
    dailySummary: true
  });

  const handleSettingChange = (key: keyof typeof settings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    
    // If prayer reminders are toggled, update all prayer notification settings
    if (key === 'prayerReminders') {
      const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
      prayers.forEach(prayer => {
        updateNotificationSettings(prayer, { enabled: value, reminderMinutes: 15 });
      });
    }
  };

  const scheduleTestWorkout = async () => {
    const testTime = new Date();
    testTime.setMinutes(testTime.getMinutes() + 1);
    await scheduleWorkoutReminder('Test Workout', testTime);
  };

  const scheduleTestMeal = async () => {
    const testTime = new Date();
    testTime.setMinutes(testTime.getMinutes() + 2);
    await scheduleMealReminder('lunch', testTime);
  };

  const handleCheckNotifications = async () => {
    const granted = await checkNotificationPermission();
    updatePermissionStatus('notifications', granted);
  };

  const handleEnableNotifications = async () => {
    const granted = await enableNotifications();
    updatePermissionStatus('notifications', granted);
  };

  const handleIOSInstructions = () => {
    toast({
      title: "📱 Enable iOS Web App Notifications",
      description: "Add this app to your Home Screen, then enable notifications in Safari settings",
      duration: 6000
    });
  };

  // Check if user is on iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;

  // Location state
  const [coords, setCoords] = useState<{ lat: number; lon: number; } | null>(null);
  
  const checkLocation = async () => {
    try {
      const perm = await Geolocation.checkPermissions();
      // @ts-ignore - different platforms return different shapes
      const status = perm.location || perm.coarseLocation || perm?.locationWhenInUse || 'unknown';
      updatePermissionStatus('location', status === 'granted');
    } catch (e) {
      updatePermissionStatus('location', false);
    }
  };

  const fallbackWebGeolocation = () => new Promise<GeolocationPosition>((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('Geolocation not supported'));
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000
    });
  });

  const enableLocation = async () => {
    try {
      try {
        await Geolocation.requestPermissions();
      } catch (err) {
        console.warn('Capacitor requestPermissions failed, trying web geolocation', err);
      }
      
      let position: GeolocationPosition | null = null;
      try {
        position = (await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000
        })) as any;
      } catch (err) {
        position = (await fallbackWebGeolocation()) as any;
      }
      
      if (position) {
        setCoords({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
        updatePermissionStatus('location', true);
        toast({
          title: 'Location Enabled',
          description: `Lat: ${position.coords.latitude.toFixed(4)}, Lon: ${position.coords.longitude.toFixed(4)}`
        });
      }
    } catch (err: any) {
      updatePermissionStatus('location', false);
      toast({
        title: 'Unable to request location',
        description: err?.message || 'Please allow location in your browser settings',
        variant: 'destructive'
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            App Settings
          </DialogTitle>
          <DialogDescription>
            Manage your app preferences and notification settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* iOS Web App Instructions */}
          {isIOS && (
            <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
              <Smartphone className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">📱 iOS Web App Setup</p>
                  <div className="text-sm space-y-1">
                    {!isStandalone ? (
                      <>
                        <p>1. Tap the Share button in Safari</p>
                        <p>2. Select "Add to Home Screen"</p>
                        <p>3. Open the app from your Home Screen</p>
                        <p>4. Enable notifications when prompted</p>
                      </>
                    ) : (
                      <>
                        <p>✅ App is installed on Home Screen</p>
                        <p>If notifications don't work:</p>
                        <p>• Go to Settings → Safari → Advanced → Website Data</p>
                        <p>• Find and remove this site, then re-add to Home Screen</p>
                      </>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={handleIOSInstructions} className="mt-2">
                    <Info className="h-3 w-3 mr-1" />
                    More Info
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                {!isInitialized 
                  ? "Initializing notifications..." 
                  : permissionGranted 
                    ? "Manage your notification preferences (all notifications sent 15 minutes before)" 
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
                  permissionStatus.notifications === 'granted' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : permissionStatus.notifications === 'denied' 
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                }`}>
                  {permissionStatus.notifications}
                </div>
              </div>

              {/* Notification Control Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleCheckNotifications}>
                  Check Status
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={handleEnableNotifications} 
                  disabled={permissionStatus.notifications === 'granted'}
                >
                  Enable Notifications
                </Button>
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

              {/* Notification Types */}
              <div className="space-y-4">
                <h4 className="font-medium">Notification Types</h4>
                
                <div className="space-y-4">
                  {/* Workout Notifications */}
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">💪</span>
                      <div>
                        <Label className="font-medium">Workout Reminders</Label>
                        <div className="text-sm text-muted-foreground">15 minutes before workout time</div>
                      </div>
                    </div>
                    <Switch 
                      checked={settings.workoutReminders} 
                      onCheckedChange={(checked) => handleSettingChange('workoutReminders', checked)} 
                      disabled={!permissionGranted} 
                    />
                  </div>

                  {/* Meal Notifications */}
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">🍽️</span>
                      <div>
                        <Label className="font-medium">Meal Reminders</Label>
                        <div className="text-sm text-muted-foreground">15 minutes before meal time</div>
                      </div>
                    </div>
                    <Switch 
                      checked={settings.mealReminders} 
                      onCheckedChange={(checked) => handleSettingChange('mealReminders', checked)} 
                      disabled={!permissionGranted} 
                    />
                  </div>

                  {/* Activity Notifications */}
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">📅</span>
                      <div>
                        <Label className="font-medium">Activity Reminders</Label>
                        <div className="text-sm text-muted-foreground">15 minutes before activity time</div>
                      </div>
                    </div>
                    <Switch 
                      checked={settings.activityReminders} 
                      onCheckedChange={(checked) => handleSettingChange('activityReminders', checked)} 
                      disabled={!permissionGranted} 
                    />
                  </div>

                  {/* Prayer Notifications */}
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">🕋</span>
                      <div>
                        <Label className="font-medium">Prayer Reminders</Label>
                        <div className="text-sm text-muted-foreground">15 minutes before prayer times</div>
                      </div>
                    </div>
                    <Switch 
                      checked={settings.prayerReminders} 
                      onCheckedChange={(checked) => handleSettingChange('prayerReminders', checked)} 
                      disabled={!permissionGranted} 
                    />
                  </div>

                  {/* Daily Summary Notifications */}
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">📊</span>
                      <div>
                        <Label className="font-medium">Daily Summary</Label>
                        <div className="text-sm text-muted-foreground">End-of-day activity summary</div>
                      </div>
                    </div>
                    <Switch 
                      checked={settings.dailySummary} 
                      onCheckedChange={(checked) => handleSettingChange('dailySummary', checked)} 
                      disabled={!permissionGranted} 
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Location Settings
              </CardTitle>
              <CardDescription>Enable location access for prayer times and Qibla</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Crosshair className="w-4 h-4" />
                  <span className="font-medium">Location Permission</span>
                </div>
                <div className={`px-2 py-1 rounded text-sm ${
                  permissionStatus.location === 'granted' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : permissionStatus.location === 'denied' 
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                }`}>
                  {permissionStatus.location}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={checkLocation}>
                  Check
                </Button>
                <Button variant="default" size="sm" onClick={enableLocation}>
                  Enable Location
                </Button>
                {coords && (
                  <div className="text-sm text-muted-foreground">
                    Current: {coords.lat.toFixed(4)}, {coords.lon.toFixed(4)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sound Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                Sound Settings
              </CardTitle>
              <CardDescription>
                Control app sound effects and feedback
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Sound Toggle */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-lg">🔊</span>
                  <div>
                    <Label className="font-medium">Sound Effects</Label>
                    <div className="text-sm text-muted-foreground">Play sounds for clicks and actions</div>
                  </div>
                </div>
                <Switch 
                  checked={soundEnabled} 
                  onCheckedChange={(checked) => {
                    setSoundEnabled(checked);
                    setEnabled(checked);
                    if (checked) {
                      setTimeout(() => success(), 100);
                    }
                  }} 
                />
              </div>
              
              {/* Volume Slider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">Volume</Label>
                  <span className="text-sm text-muted-foreground">{Math.round(soundVolume)}%</span>
                </div>
                <Slider
                  value={[soundVolume]}
                  onValueChange={(value) => {
                    setSoundVolume(value[0]);
                    setVolume(value[0] / 100);
                  }}
                  onValueCommit={() => click()}
                  max={100}
                  step={10}
                  disabled={!soundEnabled}
                  className="w-full"
                />
              </div>
              
              {/* Test Sound */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => success()}
                disabled={!soundEnabled}
                className="w-full"
              >
                <Volume2 className="w-4 h-4 mr-2" />
                Test Sound
              </Button>
            </CardContent>
          </Card>

          {/* Additional Settings */}
          <Card>
            <CardHeader>
              <CardTitle>App Preferences</CardTitle>
              <CardDescription>
                General app settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                More settings coming soon...
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};