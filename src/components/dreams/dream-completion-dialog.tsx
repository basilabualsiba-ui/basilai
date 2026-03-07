import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useDreams } from "@/contexts/DreamsContext";
import { Calendar, DollarSign, MapPin, Target, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState, useMemo } from "react";
import { DreamMetadata } from "@/hooks/useDreamProgress";

interface DreamDetailDialogProps {
  dreamId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DreamDetailDialog = ({ dreamId, open, onOpenChange }: DreamDetailDialogProps) => {
  const { dreams } = useDreams();
  const [metadata, setMetadata] = useState<DreamMetadata | null>(null);
  const dream = dreams.find(d => d.id === dreamId);

  useEffect(() => {
    if (dream) {
      const stored = localStorage.getItem(`dream_${dream.id}_meta`);
      if (stored) {
        setMetadata(JSON.parse(stored));
      }
    }
  }, [dream?.id, dream?.progress_percentage]);

  if (!dream) return null;

  // Smart related dreams: score each dream on multiple factors
  const relatedDreams = useMemo(() => {
    const keywords = (text: string) =>
      text.toLowerCase().split(/\W+/).filter(w => w.length > 3);

    const dreamWords = new Set([
      ...keywords(dream.title),
      ...keywords(dream.description || ''),
    ]);

    return dreams
      .filter(d => d.id !== dreamId)
      .map(d => {
        let score = 0;
        const reasons: string[] = [];

        // Same category: strong match
        if (d.type === dream.type) { score += 3; reasons.push('Same category'); }

        // Shared keywords in title/description
        const dWords = keywords(d.title + ' ' + (d.description || ''));
        const shared = dWords.filter(w => dreamWords.has(w));
        if (shared.length > 0) { score += Math.min(shared.length, 3); reasons.push('Similar theme'); }

        // Same priority
        if (d.priority === dream.priority) { score += 1; reasons.push('Same importance'); }

        // Both have estimated cost (financial goals)
        if (d.estimated_cost && dream.estimated_cost) { score += 1; reasons.push('Both financial'); }

        // Similar target dates (within 6 months)
        if (d.target_date && dream.target_date) {
          const diff = Math.abs(new Date(d.target_date).getTime() - new Date(dream.target_date).getTime());
          const sixMonths = 1000 * 60 * 60 * 24 * 180;
          if (diff < sixMonths) { score += 1; reasons.push('Similar timeline'); }
        }

        // Same status (both in progress etc)
        if (d.status === dream.status && dream.status !== 'completed') { score += 1; reasons.push('Same status'); }

        return { dream: d, score, reason: reasons[0] || 'Related' };
      })
      .filter(r => r.score >= 2)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [dreams, dreamId, dream]);

  const formatValue = (value: number, unit: string) => {
    if (unit === 'kg') return `${value.toFixed(1)} kg`;
    return `${unit}${value.toFixed(0)}`;
  };

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

          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline">{dream.type}</Badge>
            <Badge variant={dream.status === 'completed' ? 'default' : 'secondary'}>
              {dream.status.replace('_', ' ')}
            </Badge>
            {metadata?.type === 'weight' && metadata.direction && (
              <Badge variant={metadata.direction === 'gain' ? 'default' : 'destructive'} className="flex items-center gap-1">
                {metadata.direction === 'gain' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                Weight {metadata.direction === 'gain' ? 'Gain' : 'Loss'} Goal
              </Badge>
            )}
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

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Progress</span>
              </div>
              <span className="text-sm font-bold">{dream.progress_percentage}%</span>
            </div>
            
            {metadata && (
              <Card className="bg-muted/50">
                <CardContent className="pt-4 pb-3">
                  <div className={`grid ${metadata.starting ? 'grid-cols-3' : 'grid-cols-2'} gap-4 text-center`}>
                    {metadata.starting && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Started At</p>
                        <p className="font-semibold text-muted-foreground">
                          {formatValue(metadata.starting, metadata.unit)}
                        </p>
                      </div>
                    )}
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Current</p>
                      <p className="font-semibold text-primary text-lg">
                        {formatValue(metadata.current, metadata.unit)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Target</p>
                      <p className="font-semibold text-lg">
                        {formatValue(metadata.target, metadata.unit)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <Progress value={dream.progress_percentage} className="h-3 [&>div]:bg-gradient-to-r [&>div]:from-pink-500 [&>div]:to-rose-500" />
            
            {metadata && metadata.remaining > 0 && (
              <p className="text-sm font-medium text-center text-primary">
                {metadata.direction === 'gain' ? '📈 Need to gain ' : '📉 Need to lose '}
                {formatValue(metadata.remaining, metadata.unit)} to reach your goal
              </p>
            )}
            {metadata && metadata.remaining <= 0 && (
              <p className="text-sm font-medium text-center text-green-600">
                🎉 Goal reached! Congratulations!
              </p>
            )}
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

          {relatedDreams.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-pink-500" />
                <h3 className="font-semibold">Related Dreams</h3>
              </div>
              <div className="space-y-2">
                {relatedDreams.map(({ dream: d, reason }) => (
                  <Card key={d.id} className="bg-gradient-to-br from-pink-500/5 to-rose-500/5 border-pink-500/20">
                    <CardContent className="py-3 px-4 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{d.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-muted-foreground capitalize">{d.status.replace('_', ' ')} · {d.progress_percentage}%</p>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-dreams/10 text-dreams font-medium">{reason}</span>
                        </div>
                      </div>
                      {d.status === 'completed' && (
                        <Badge className="bg-emerald-500/15 text-emerald-500 text-xs ml-2">✓</Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
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
