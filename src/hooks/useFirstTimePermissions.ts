import { useState, useEffect } from 'react';
import { NotificationService } from '@/services/NotificationService';
import { Geolocation } from '@capacitor/geolocation';
import { useToast } from '@/hooks/use-toast';

interface PermissionStatus {
  notifications: 'granted' | 'denied' | 'prompt';
  location: 'granted' | 'denied' | 'prompt';
  hasPrompted: boolean;
}

const STORAGE_KEY = 'app_permissions_status';

export const useFirstTimePermissions = () => {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>({
    notifications: 'prompt',
    location: 'prompt',
    hasPrompted: false
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();

  // Load saved permission status
  useEffect(() => {
    const savedStatus = localStorage.getItem(STORAGE_KEY);
    if (savedStatus) {
      setPermissionStatus(JSON.parse(savedStatus));
    }
    setIsInitialized(true);
  }, []);

  // Save permission status to localStorage
  const savePermissionStatus = (status: PermissionStatus) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(status));
    setPermissionStatus(status);
  };

  // Check if this is the first time opening the app
  const isFirstTime = !permissionStatus.hasPrompted;

  // Request initial permissions on first app startup
  const requestInitialPermissions = async () => {
    if (permissionStatus.hasPrompted) return;

    const notificationService = NotificationService.getInstance();
    let notificationGranted = false;
    let locationGranted = false;

    // Request notification permission
    try {
      notificationGranted = await notificationService.initialize();
    } catch (error) {
      console.error('Failed to request notification permission:', error);
    }

    // Request location permission
    try {
      await Geolocation.requestPermissions();
      const position = await Geolocation.getCurrentPosition({ 
        enableHighAccuracy: true, 
        timeout: 10000 
      });
      locationGranted = !!position;
    } catch (error) {
      // Fallback to web geolocation
      try {
        await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!('geolocation' in navigator)) return reject(new Error('Geolocation not supported'));
          navigator.geolocation.getCurrentPosition(resolve, reject, { 
            enableHighAccuracy: true, 
            timeout: 10000 
          });
        });
        locationGranted = true;
      } catch (fallbackError) {
        console.error('Failed to get location:', fallbackError);
      }
    }

    // Update permission status
    const newStatus: PermissionStatus = {
      notifications: notificationGranted ? 'granted' : 'denied',
      location: locationGranted ? 'granted' : 'denied',
      hasPrompted: true
    };

    savePermissionStatus(newStatus);

    // Show one-time reminder if permissions were denied
    if (!notificationGranted || !locationGranted) {
      const deniedServices = [];
      if (!notificationGranted) deniedServices.push('notifications');
      if (!locationGranted) deniedServices.push('location');
      
      toast({
        title: "⚙️ Enable Features",
        description: `Enable ${deniedServices.join(' and ')} in Settings for the best experience`,
        duration: 5000,
      });
    }

    return { notificationGranted, locationGranted };
  };

  // Update individual permission status
  const updatePermissionStatus = (type: 'notifications' | 'location', granted: boolean) => {
    const newStatus = {
      ...permissionStatus,
      [type]: granted ? 'granted' : 'denied'
    };
    savePermissionStatus(newStatus);
  };

  return {
    isFirstTime,
    isInitialized,
    permissionStatus,
    requestInitialPermissions,
    updatePermissionStatus
  };
};