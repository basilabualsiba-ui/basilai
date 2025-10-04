import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Play, Image as ImageIcon, Dumbbell } from 'lucide-react';

interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
  side_muscle_groups?: string[];
  instructions?: string;
  difficulty_level?: string;
  equipment?: string;
  video_url?: string;
  photo_url?: string;
}

interface ExerciseInfoDialogProps {
  exercise: Exercise | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExerciseInfoDialog({ exercise, open, onOpenChange }: ExerciseInfoDialogProps) {
  if (!exercise) return null;

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-success/20 text-success border-success/30';
      case 'intermediate': return 'bg-warning/20 text-warning border-warning/30';
      case 'advanced': return 'bg-destructive/20 text-destructive border-destructive/30';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            {exercise.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Exercise Overview Card */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Basic Info Badges */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{exercise.muscle_group}</Badge>
                {exercise.side_muscle_groups?.map(sideGroup => (
                  <Badge key={sideGroup} variant="secondary" className="text-xs">
                    {sideGroup}
                  </Badge>
                ))}
                <Badge className={getDifficultyColor(exercise.difficulty_level || 'beginner')}>
                  {exercise.difficulty_level || 'beginner'}
                </Badge>
                {exercise.equipment && (
                  <Badge variant="outline">{exercise.equipment}</Badge>
                )}
              </div>

              {/* Target Muscle Groups */}
              <div>
                <h4 className="font-medium mb-2">Target Muscle Groups</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{exercise.muscle_group}</Badge>
                  {exercise.side_muscle_groups?.map(muscle => (
                    <Badge key={muscle} variant="outline" className="text-xs">
                      {muscle} <span className="text-muted-foreground ml-1">(Side)</span>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Equipment Section */}
              {exercise.equipment && (
                <div>
                  <h4 className="font-medium mb-2">Equipment Needed</h4>
                  <Badge variant="outline">{exercise.equipment}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Media Section */}
          {(exercise.photo_url || exercise.video_url) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ImageIcon className="h-5 w-5" />
                  Media
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {exercise.photo_url && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Photo</span>
                      </div>
                      <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                        <img 
                          src={exercise.photo_url} 
                          alt={exercise.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {exercise.video_url && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Play className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Video Tutorial</span>
                      </div>
                      <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                        {exercise.video_url.includes('youtube.com') || exercise.video_url.includes('youtu.be') ? (
                          <iframe
                            src={exercise.video_url.includes('youtube.com/watch?v=') 
                              ? exercise.video_url.replace('watch?v=', 'embed/').replace('&', '?')
                              : exercise.video_url.includes('youtu.be/') 
                              ? exercise.video_url.replace('youtu.be/', 'youtube.com/embed/')
                              : exercise.video_url
                            }
                            className="w-full h-full"
                            allowFullScreen
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            title={`${exercise.name} exercise video`}
                            frameBorder="0"
                          />
                        ) : (
                          <video
                            src={exercise.video_url}
                            className="w-full h-full object-cover"
                            controls
                            preload="metadata"
                            onError={(e) => {
                              console.log('Error loading video:', e);
                            }}
                          >
                            Your browser does not support the video tag.
                          </video>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          {exercise.instructions && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Dumbbell className="h-5 w-5" />
                  Instructions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/20 p-4 rounded-lg">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                    {exercise.instructions}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}