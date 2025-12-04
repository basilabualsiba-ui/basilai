import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Edit, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { useState, useEffect } from "react";
import { DreamCompletionDialog } from "./dream-completion-dialog";
import { DreamDetailDialog } from "./dream-detail-dialog";
import { useDreams } from "@/contexts/DreamsContext";
import { DreamMetadata } from "@/hooks/useDreamProgress";

interface Dream {
  id: string;
  title: string;
  description?: string;
  type: string;
  priority: string;
  status: string;
  progress_percentage: number;
  estimated_cost?: number;
  target_date?: string;
  completed_at?: string;
  location?: string;
  rating?: number;
}

interface DreamCardProps {
  dream: Dream;
  onEdit?: () => void;
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return 'destructive';
    case 'medium': return 'default';
    case 'low': return 'secondary';
    default: return 'default';
  }
};

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    general: 'General',
    travel: 'Travel',
    adventure: 'Adventure',
    career: 'Career',
    personal: 'Personal',
    creative: 'Creative',
  };
  return labels[type] || type;
};

export const DreamCard = ({ dream, onEdit }: DreamCardProps) => {
  const [showCompletion, setShowCompletion] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [metadata, setMetadata] = useState<DreamMetadata | null>(null);
  const { deleteDream } = useDreams();

  useEffect(() => {
    const stored = localStorage.getItem(`dream_${dream.id}_meta`);
    if (stored) {
      setMetadata(JSON.parse(stored));
    }
  }, [dream.id, dream.progress_percentage]);

  const handleComplete = () => {
    if (dream.status === 'completed') return;
    setShowCompletion(true);
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this dream?')) {
      await deleteDream(dream.id);
    }
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === 'kg') return `${value.toFixed(1)} kg`;
    return `${unit}${value.toFixed(0)}`;
  };

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setShowDetail(true)}>
        <CardHeader>
          <div className="flex items-end justify-between mb-2">
            <Badge variant="outline">{getTypeLabel(dream.type)}</Badge>
            {metadata?.type === 'weight' && metadata.direction && (
              <Badge variant={metadata.direction === 'gain' ? 'default' : 'secondary'} className="flex items-center gap-1">
                {metadata.direction === 'gain' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {metadata.direction === 'gain' ? 'Gain' : 'Loss'}
              </Badge>
            )}
          </div>
          <CardTitle className="text-xl">{dream.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {dream.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {dream.description}
            </p>
          )}
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{dream.progress_percentage}%</span>
            </div>
            {metadata && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Now: {formatValue(metadata.current, metadata.unit)}</span>
                <span>Goal: {formatValue(metadata.target, metadata.unit)}</span>
              </div>
            )}
            <Progress value={dream.progress_percentage} />
            {metadata && metadata.remaining > 0 && (
              <p className="text-xs text-center font-medium text-primary">
                {metadata.direction === 'gain' ? '+' : '-'}{formatValue(metadata.remaining, metadata.unit)} to go
              </p>
            )}
          </div>

          {dream.estimated_cost && (
            <p className="text-sm text-muted-foreground">
              💰 Estimated: ${dream.estimated_cost.toFixed(2)}
            </p>
          )}

          {dream.target_date && (
            <p className="text-sm text-muted-foreground">
              📅 Target: {new Date(dream.target_date).toLocaleDateString()}
            </p>
          )}

          {dream.location && (
            <p className="text-sm text-muted-foreground">
              📍 {dream.location}
            </p>
          )}

          {dream.status === 'completed' && dream.completed_at && (
            <div className="pt-2 border-t border-border">
              <p className="text-sm text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                Completed {new Date(dream.completed_at).toLocaleDateString()}
                {dream.rating && ` • ${dream.rating}⭐`}
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
            {dream.status !== 'completed' && (
              <Button
                variant="default"
                size="sm"
                onClick={handleComplete}
                className="flex-1 gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Mark Complete
              </Button>
            )}
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <DreamCompletionDialog
        open={showCompletion}
        onOpenChange={setShowCompletion}
        dreamId={dream.id}
        dreamTitle={dream.title}
      />
      
      <DreamDetailDialog
        dreamId={dream.id}
        open={showDetail}
        onOpenChange={setShowDetail}
      />
    </>
  );
};
