import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Compass, Navigation } from 'lucide-react';
import { Geolocation } from '@capacitor/geolocation';
import { useToast } from '@/hooks/use-toast';

interface QiblaData {
  latitude: number;
  longitude: number;
  direction: number;
}

interface ExtendedDeviceOrientationEvent extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}

export const QiblaCompass = () => {
  const [qiblaData, setQiblaData] = useState<QiblaData | null>(null);
  const [deviceHeading, setDeviceHeading] = useState<number>(0);
  const [orientationSupported, setOrientationSupported] = useState(false);
  const [orientationPermission, setOrientationPermission] = useState<'granted' | 'denied' | 'default'>('default');
  const [isLoading, setIsLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkPermissions();
    return () => {
      // Cleanup any device orientation listeners
      if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
        window.removeEventListener('deviceorientation', handleDeviceOrientation);
      }
    };
  }, []);

  const checkPermissions = async () => {
    try {
      const permission = await Geolocation.checkPermissions();
      const hasLocationPermission = permission.location === 'granted';
      setHasPermission(hasLocationPermission);
      
      // Automatically find Qibla direction if permission is already granted
      if (hasLocationPermission) {
        await findQiblaDirection();
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const requestPermissions = async () => {
    try {
      // Try Capacitor request; on web this may be a no-op
      try {
        const permission = await Geolocation.requestPermissions();
        setHasPermission((permission as any).location === 'granted');
      } catch (err) {
        console.warn('Capacitor requestPermissions failed, trying web geolocation');
        // Fallback by attempting to get a position which will prompt on web
        await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!('geolocation' in navigator)) return reject(new Error('Geolocation not supported'));
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
        });
        setHasPermission(true);
      }
      if (hasPermission) {
        await findQiblaDirection();
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      toast({
        title: "Permission Error",
        description: "Unable to request location permission",
        variant: "destructive"
      });
    }
  };

  const findQiblaDirection = async () => {
    setIsLoading(true);
    try {
      // Get current location
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });

      const { latitude, longitude } = position.coords;

      // Fetch Qibla direction from Aladhan API
      const response = await fetch(`https://api.aladhan.com/v1/qibla/${latitude}/${longitude}`);
      if (!response.ok) {
        throw new Error('Failed to fetch Qibla direction');
      }

      const data = await response.json();
      const direction = data.data.direction;

      const qiblaInfo = {
        latitude,
        longitude,
        direction: parseFloat(direction)
      };

      setQiblaData(qiblaInfo);

      // Start device orientation tracking if available
      startOrientationTracking();

      toast({
        title: "Qibla Direction Found",
        description: `Qibla is ${Math.round(direction)}° from North`,
      });

    } catch (error) {
      console.error('Error finding Qibla direction:', error);
      toast({
        title: "Error",
        description: "Unable to determine Qibla direction. Please check your location settings.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const requestOrientationPermission = async () => {
    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      // Check if we're on iOS and need to request permission
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        try {
          const permission = await (DeviceOrientationEvent as any).requestPermission();
          setOrientationPermission(permission);
          if (permission === 'granted') {
            setOrientationSupported(true);
            window.addEventListener('deviceorientation', handleDeviceOrientation, true);
            toast({
              title: "Compass Enabled",
              description: "Device orientation access granted. The compass will now show live direction.",
            });
          } else {
            toast({
              title: "Permission Denied",
              description: "Device orientation access denied. The compass will show static direction only.",
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error('Error requesting device orientation permission:', error);
          setOrientationPermission('denied');
        }
      } else {
        // For non-iOS browsers, directly add the listener
        setOrientationSupported(true);
        setOrientationPermission('granted');
        window.addEventListener('deviceorientation', handleDeviceOrientation, true);
      }
    }
  };

  const startOrientationTracking = () => {
    // Check if orientation is supported
    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      setOrientationSupported(true);
      
      // For iOS 13+, we need explicit permission
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        // Don't auto-request on iOS, wait for user interaction
        setOrientationPermission('default');
      } else {
        // For other browsers, auto-start
        setOrientationPermission('granted');
        window.addEventListener('deviceorientation', handleDeviceOrientation, true);
      }
    }
  };

  const handleDeviceOrientation = (event: ExtendedDeviceOrientationEvent) => {
    if (event.alpha !== null) {
      // iOS and Android handle orientation differently
      let heading;
      if (typeof (window as any).DeviceOrientationEvent !== 'undefined') {
        // For iOS, we need to handle compass heading differently
        if (event.webkitCompassHeading) {
          // iOS Safari provides webkitCompassHeading
          heading = event.webkitCompassHeading;
        } else if (event.alpha) {
          // Android and other browsers use alpha
          // Convert to 0-360 range and adjust for iOS
          heading = 360 - event.alpha;
        }
      }
      
      if (heading !== undefined) {
        // Normalize to 0-360 range
        heading = heading < 0 ? heading + 360 : heading;
        heading = heading > 360 ? heading - 360 : heading;
        setDeviceHeading(heading);
      }
    }
  };

  const calculateQiblaAngle = () => {
    if (!qiblaData) return 0;
    
    // Calculate relative angle between device heading and Qibla direction
    let angle = qiblaData.direction - deviceHeading;
    
    // Normalize to -180 to 180 range
    while (angle > 180) angle -= 360;
    while (angle < -180) angle += 360;
    
    return angle;
  };

  const getDirectionText = (angle: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(angle / 45) % 8;
    return directions[index < 0 ? index + 8 : index];
  };

  const getCompassColor = (angle: number) => {
    const absAngle = Math.abs(angle);
    if (absAngle <= 5) return 'text-green-500';
    if (absAngle <= 15) return 'text-yellow-500';
    return 'text-primary';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Compass className="h-5 w-5 text-primary" />
          Qibla Compass
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!hasPermission && (
          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              Location permission is required to determine Qibla direction
            </p>
            <Button onClick={requestPermissions} disabled={isLoading}>
              {isLoading ? 'Finding Direction...' : 'Enable Location'}
            </Button>
          </div>
        )}

        {hasPermission && !qiblaData && (
          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              Find the direction to Mecca (Kaaba) from your current location
            </p>
            <Button onClick={findQiblaDirection} disabled={isLoading}>
              {isLoading ? 'Finding Direction...' : 'Find Qibla Direction'}
            </Button>
          </div>
        )}

        {qiblaData && (
          <div className="space-y-6">
            {/* Compass Display */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative w-48 h-48 mx-auto">
                {/* Compass Base - Static */}
                <div className="absolute inset-0 rounded-full border-4 border-border bg-background shadow-lg">
                  {/* North Marker */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1">
                    <div className="w-2 h-8 bg-red-500 rounded-b"></div>
                    <div className="text-xs font-bold text-center mt-1">N</div>
                  </div>
                  
                  {/* Cardinal Direction Markers */}
                  <div className="absolute top-1/2 right-0 transform translate-x-1 -translate-y-1/2">
                    <div className="w-4 h-1 bg-muted rounded"></div>
                    <div className="text-xs font-bold text-center">E</div>
                  </div>
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1">
                    <div className="text-xs font-bold text-center mb-1">S</div>
                    <div className="w-2 h-4 bg-muted rounded-t"></div>
                  </div>
                  <div className="absolute top-1/2 left-0 transform -translate-x-1 -translate-y-1/2">
                    <div className="w-4 h-1 bg-muted rounded"></div>
                    <div className="text-xs font-bold text-center">W</div>
                  </div>
                </div>

                {/* Custom Qibla Arrow with Kaaba */}
                <div 
                  className="absolute inset-0 flex items-center justify-center transition-transform duration-300"
                  style={{ 
                    transform: orientationPermission === 'granted' ? `rotate(${-deviceHeading}deg)` : 'rotate(0deg)'
                  }}
                >
                  <div className="relative">
                    {/* Custom Arrow Shape */}
                    <svg 
                      width="64" 
                      height="64" 
                      viewBox="0 0 64 64" 
                      className={`${getCompassColor(calculateQiblaAngle())}`}
                    >
                      {/* Arrow Body */}
                      <path
                        d="M32 4 L38 28 L32 32 L26 28 Z"
                        fill="currentColor"
                        stroke="currentColor"
                        strokeWidth="1"
                      />
                      {/* Arrow Tail */}
                      <path
                        d="M32 32 L28 58 L32 60 L36 58 Z"
                        fill="currentColor"
                        opacity="0.6"
                      />
                    </svg>
                    {/* Kaaba Icon */}
                    <div className="absolute top-3 left-1/2 transform -translate-x-1/2 text-lg">
                      🕋
                    </div>
                  </div>
                </div>
              </div>

              {/* Direction Info */}
              <div className="text-center space-y-2">
                <div className="text-lg font-semibold">
                  Qibla: {Math.round(qiblaData.direction)}° {getDirectionText(qiblaData.direction)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Current Heading: {Math.round(deviceHeading)}° {getDirectionText(deviceHeading)}
                </div>
                <div className={`text-sm font-medium ${getCompassColor(calculateQiblaAngle())}`}>
                  {Math.abs(calculateQiblaAngle()) <= 5 
                    ? '✅ Pointing towards Qibla!' 
                    : `Turn ${calculateQiblaAngle() > 0 ? 'right' : 'left'} ${Math.abs(Math.round(calculateQiblaAngle()))}°`
                  }
                </div>
              </div>
            </div>

            {/* Location Info */}
            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <div className="font-medium mb-1">Your Location:</div>
              <div className="text-muted-foreground">
                Lat: {qiblaData.latitude.toFixed(6)}, Lng: {qiblaData.longitude.toFixed(6)}
              </div>
            </div>

            {/* Live Direction Controls */}
            {orientationSupported && orientationPermission === 'default' && (
              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                <div className="text-sm font-medium mb-2">Enable Live Compass</div>
                <div className="text-xs text-muted-foreground mb-3">
                  Allow device orientation access for real-time compass updates
                </div>
                <Button 
                  variant="outline" 
                  onClick={requestOrientationPermission}
                  className="w-full"
                >
                  Enable Live Direction
                </Button>
              </div>
            )}

            {orientationPermission === 'denied' && (
              <div className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg">
                <div className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                  Static Direction Only
                </div>
                <div className="text-xs text-yellow-600 dark:text-yellow-400">
                  Device orientation access denied. The compass shows direction but won't update as you move your device.
                </div>
              </div>
            )}

            {/* Refresh Button */}
            <Button 
              variant="outline" 
              onClick={findQiblaDirection} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Updating...' : 'Refresh Location'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};