import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Loader2 } from 'lucide-react';
import { Geolocation } from '@capacitor/geolocation';
import { useToast } from '@/hooks/use-toast';

export const LocationTracker = () => {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const getCurrentLocation = async () => {
    setIsLoading(true);
    try {
      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });
      
      const { latitude, longitude } = coordinates.coords;
      setLocation({ latitude, longitude });
      
      toast({
        title: "Location found",
        description: "Successfully retrieved your current location",
      });
    } catch (error) {
      console.error('Error getting location:', error);
      toast({
        title: "Location error",
        description: "Could not retrieve your location. Please check permissions.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Location Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={getCurrentLocation} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Getting Location...
            </>
          ) : (
            <>
              <MapPin className="mr-2 h-4 w-4" />
              Get Current Location
            </>
          )}
        </Button>
        
        {location && (
          <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
            <div className="text-sm font-medium text-muted-foreground">Current Coordinates:</div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Latitude:</span>
                <span className="font-mono text-sm">{location.latitude.toFixed(6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Longitude:</span>
                <span className="font-mono text-sm">{location.longitude.toFixed(6)}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};