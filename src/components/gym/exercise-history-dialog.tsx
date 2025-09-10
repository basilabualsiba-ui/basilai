import { useState, useEffect } from 'react';
import { useGym } from '@/contexts/GymContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, TrendingUp, Dumbbell } from 'lucide-react';
import { format } from 'date-fns';

interface ExerciseHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: any;
}

export function ExerciseHistoryDialog({ open, onOpenChange, exercise }: ExerciseHistoryDialogProps) {
  const { exerciseSets, workoutSessions } = useGym();
  const [historySessions, setHistorySessions] = useState<any[]>([]);

  useEffect(() => {
    if (!open || !exercise) return;

    // Get all exercise sets for this exercise
    const exerciseSetHistory = exerciseSets
      .filter(set => set.exercise_id === exercise.id && set.completed_at)
      .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime());

    // Group sets by session
    const sessionGroups = new Map();
    
    exerciseSetHistory.forEach(set => {
      if (!sessionGroups.has(set.session_id)) {
        const session = workoutSessions.find(s => s.id === set.session_id);
        if (session) {
          sessionGroups.set(set.session_id, {
            session,
            sets: []
          });
        }
      }
      
      const group = sessionGroups.get(set.session_id);
      if (group) {
        group.sets.push(set);
      }
    });

    // Convert to array and sort by most recent session
    const sessions = Array.from(sessionGroups.values())
      .sort((a, b) => {
        const dateA = new Date(a.session.completed_at || a.session.started_at || a.session.created_at);
        const dateB = new Date(b.session.completed_at || b.session.started_at || b.session.created_at);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5); // Show last 5 sessions

    // Sort sets within each session by set number
    sessions.forEach(sessionGroup => {
      sessionGroup.sets.sort((a, b) => a.set_number - b.set_number);
    });

    setHistorySessions(sessions);
  }, [open, exercise, exerciseSets, workoutSessions]);

  if (!exercise) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Exercise History
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Exercise Info */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              {exercise.photo_url ? (
                <img 
                  src={exercise.photo_url} 
                  alt={exercise.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <Dumbbell className="h-6 w-6 text-primary" />
              )}
            </div>
            <div>
              <h3 className="font-medium text-foreground">{exercise.name}</h3>
              <Badge variant="outline" className="text-xs">
                {exercise.muscle_group}
              </Badge>
            </div>
          </div>

          {/* History */}
          <ScrollArea className="max-h-96">
            <div className="space-y-4">
              {historySessions.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">No previous sessions found</p>
                  <p className="text-sm text-muted-foreground">Complete a workout to see history</p>
                </div>
              ) : (
                historySessions.map((sessionGroup, sessionIndex) => {
                  const session = sessionGroup.session;
                  const sets = sessionGroup.sets;
                  const sessionDate = session.completed_at || session.started_at || session.created_at;
                  
                  return (
                    <div key={session.id} className="border border-border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">
                            {format(new Date(sessionDate), 'MMM dd, yyyy')}
                          </span>
                        </div>
                        <Badge variant={sessionIndex === 0 ? "default" : "secondary"} className="text-xs">
                          {sessionIndex === 0 ? 'Latest' : `${sessionIndex + 1} sessions ago`}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        {sets.map((set, setIndex) => (
                          <div key={set.id} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Set {set.set_number}</span>
                            <div className="flex items-center gap-4">
                              <span className="font-mono text-foreground">
                                {set.reps} reps
                              </span>
                              <span className="font-mono text-foreground">
                                {set.weight}kg
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {session.total_duration_minutes && (
                        <div className="mt-2 pt-2 border-t border-border">
                          <span className="text-xs text-muted-foreground">
                            Workout duration: {session.total_duration_minutes} minutes
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}