import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useDreams } from "@/contexts/DreamsContext";
import { Calendar, DollarSign, MapPin, Target, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface DreamDetailDialogProps {
  dreamId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DreamDetailDialog = ({ dreamId, open, onOpenChange }: DreamDetailDialogProps) => {
  const { dreams } = useDreams();
  const dream = dreams.find(d => d.id === dreamId);

  if (!dream) return null;

  const similarDreams = dreams.filter(d => 
    d.id !== dreamId && 
    (d.type === dream.type || d.priority === dream.priority)
  );

  const completedSimilar = similarDreams.filter(d => d.status === 'completed');
  const inProgressSimilar = similarDreams.filter(d => d.status === 'in_progress');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{dream.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {dream.cover_image_url && (
            <img 
              src={dream.cover_image_url} 
              alt={dream.title}
              className="w-full h-48 object-cover rounded-lg"
            />
          )}

          <div className="flex gap-2">
            <Badge variant={dream.priority === 'high' ? 'destructive' : dream.priority === 'medium' ? 'default' : 'secondary'}>
              {dream.priority}
            </Badge>
            <Badge variant="outline">{dream.type}</Badge>
            <Badge variant={dream.status === 'completed' ? 'default' : 'secondary'}>
              {dream.status.replace('_', ' ')}
            </Badge>
          </div>

          {dream.description && (
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground">{dream.description}</p>
            </div>
          )}

          {dream.why_important && (
            <div>
              <h3 className="font-semibold mb-2">Why This Matters</h3>
              <p className="text-muted-foreground">{dream.why_important}</p>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Progress</span>
              </div>
              <span className="text-sm font-bold">{dream.progress_percentage}%</span>
            </div>
            <Progress value={dream.progress_percentage} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {dream.target_date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Target Date</p>
                  <p className="text-sm font-medium">{new Date(dream.target_date).toLocaleDateString()}</p>
                </div>
              </div>
            )}
            {dream.estimated_cost && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Estimated Cost</p>
                  <p className="text-sm font-medium">${dream.estimated_cost.toFixed(2)}</p>
                </div>
              </div>
            )}
            {dream.location && (
              <div className="flex items-center gap-2 col-span-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="text-sm font-medium">{dream.location}</p>
                </div>
              </div>
            )}
          </div>

          {similarDreams.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4" />
                <h3 className="font-semibold">Similar Dreams</h3>
              </div>
              <div className="space-y-2">
                <Card>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-green-600">{completedSimilar.length}</p>
                        <p className="text-xs text-muted-foreground">Completed</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-600">{inProgressSimilar.length}</p>
                        <p className="text-xs text-muted-foreground">In Progress</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <div className="text-xs text-muted-foreground">
                  You have {similarDreams.length} similar {dream.type} dreams.
                  {completedSimilar.length > 0 && ` You've already achieved ${completedSimilar.length} of them!`}
                </div>
              </div>
            </div>
          )}

          {dream.status === 'completed' && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Completion Details</h3>
              {dream.completed_at && (
                <p className="text-sm text-muted-foreground mb-2">
                  Completed on {new Date(dream.completed_at).toLocaleDateString()}
                </p>
              )}
              {dream.rating && (
                <p className="text-sm mb-2">Rating: {dream.rating}⭐</p>
              )}
              {dream.completion_notes && (
                <div className="mb-2">
                  <p className="text-sm font-medium">Notes:</p>
                  <p className="text-sm text-muted-foreground">{dream.completion_notes}</p>
                </div>
              )}
              {dream.lessons_learned && (
                <div>
                  <p className="text-sm font-medium">Lessons Learned:</p>
                  <p className="text-sm text-muted-foreground">{dream.lessons_learned}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
