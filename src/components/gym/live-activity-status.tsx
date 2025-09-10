import { useLiveActivity } from '@/hooks/useLiveActivity';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Smartphone, Timer, Calendar } from 'lucide-react';

export function LiveActivityStatus() {
  const { isActive, currentData } = useLiveActivity();

  if (!isActive || !currentData) {
    return null;
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="mb-4 border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500/20">
            <Smartphone className="h-5 w-5 text-green-600" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                📱 Live Activity Active
              </Badge>
              {currentData.restTime && (
                <Badge variant="outline" className="border-orange-200 text-orange-700 dark:border-orange-800 dark:text-orange-400">
                  <Timer className="h-3 w-3 mr-1" />
                  Rest: {currentData.restTime}s
                </Badge>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{formatTime(currentData.elapsedTime)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">
                  Exercise {currentData.exerciseIndex + 1} of {currentData.totalExercises}
                </span>
              </div>
            </div>
            
            <div className="mt-2">
              <p className="text-sm font-medium text-foreground truncate">
                {currentData.currentExercise}
              </p>
              
              {currentData.nextEvent && currentData.nextEvent.timeUntil > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Next: {currentData.nextEvent.title} in {currentData.nextEvent.timeUntil}min
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-3 text-xs text-muted-foreground">
          💡 Check your iPhone lock screen for live workout updates
        </div>
      </CardContent>
    </Card>
  );
}