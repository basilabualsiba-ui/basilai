import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Edit, Trash2, TrendingUp, TrendingDown, Target, Calendar, MapPin, Star as StarIcon } from "lucide-react";
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
    case 'high': return 'bg-red-500/15 text-red-500 border-red-500/30';
    case 'medium': return 'bg-amber-500/15 text-amber-500 border-amber-500/30';
    case 'low': return 'bg-green-500/15 text-green-500 border-green-500/30';
    default: return 'bg-muted text-muted-foreground';
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

const getTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    travel: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30',
    adventure: 'from-orange-500/20 to-amber-500/10 border-orange-500/30',
    career: 'from-purple-500/20 to-violet-500/10 border-purple-500/30',
    personal: 'from-pink-500/20 to-rose-500/10 border-pink-500/30',
    creative: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30',
    general: 'from-slate-500/20 to-gray-500/10 border-slate-500/30',
  };
  return colors[type] || colors.general;
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

  const isCompleted = dream.status === 'completed';

  return (
    <>
      <Card 
        className={`group relative overflow-hidden border hover:shadow-xl transition-all duration-300 cursor-pointer bg-gradient-to-br ${getTypeColor(dream.type)} backdrop-blur-sm`}
        onClick={() => setShowDetail(true)}
      >
        {/* Glow effect */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-pink-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <Badge variant="outline" className="text-xs font-medium">
              {getTypeLabel(dream.type)}
            </Badge>
            <div className="flex items-center gap-1">
              {metadata?.type === 'weight' && metadata.direction && (
                <Badge className={`flex items-center gap-1 text-xs ${
                  metadata.direction === 'gain' 
                    ? 'bg-green-500/15 text-green-600 border-green-500/30' 
                    : 'bg-blue-500/15 text-blue-600 border-blue-500/30'
                }`}>
                  {metadata.direction === 'gain' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {metadata.direction === 'gain' ? 'Gain' : 'Loss'}
                </Badge>
              )}
              <Badge className={`text-xs ${getPriorityColor(dream.priority)}`}>
                {dream.priority}
              </Badge>
            </div>
          </div>
          <CardTitle className="text-lg leading-tight group-hover:text-pink-600 transition-colors">
            {dream.title}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {dream.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {dream.description}
            </p>
          )}
          
          {/* Progress Section */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-pink-500" />
                <span className="text-muted-foreground">Progress</span>
              </div>
              <span className="font-bold text-pink-600">{dream.progress_percentage}%</span>
            </div>
            {metadata && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Current: {formatValue(metadata.current, metadata.unit)}</span>
                <span>Goal: {formatValue(metadata.target, metadata.unit)}</span>
              </div>
            )}
            <div className="relative h-2 rounded-full bg-white/20 overflow-hidden">
              <div 
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                style={{ width: `${dream.progress_percentage}%`, background: 'linear-gradient(to right, #ec4899, #f43f5e, rgba(244,63,94,0.3))' }}
              />
            </div>
            {metadata && metadata.remaining > 0 && (
              <p className="text-xs text-center font-semibold text-pink-600">
                {metadata.direction === 'gain' ? '+' : '-'}{formatValue(metadata.remaining, metadata.unit)} to go
              </p>
            )}
          </div>

          {/* Meta Info */}
          <div className="flex flex-wrap gap-2 text-xs">
            {dream.estimated_cost && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 text-amber-600">
                <span>💰</span>
                <span>${dream.estimated_cost.toFixed(0)}</span>
              </div>
            )}
            {dream.target_date && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/10 text-blue-600">
                <Calendar className="h-3 w-3" />
                <span>{new Date(dream.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
            )}
            {dream.location && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600">
                <MapPin className="h-3 w-3" />
                <span className="truncate max-w-[80px]">{dream.location}</span>
              </div>
            )}
          </div>

          {/* Completed Status */}
          {isCompleted && dream.completed_at && (
            <div className="pt-3 border-t border-border/50">
              <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                <span>Completed {new Date(dream.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                {dream.rating && (
                  <div className="flex items-center gap-0.5 ml-auto">
                    {Array.from({ length: dream.rating }).map((_, i) => (
                      <StarIcon key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
            {!isCompleted && (
              <Button
                size="sm"
                onClick={handleComplete}
                className="flex-1 gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 shadow-lg shadow-pink-500/25 h-9"
              >
                <CheckCircle2 className="h-4 w-4" />
                Complete
              </Button>
            )}
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit} className="rounded-xl h-9 w-9 p-0">
                <Edit className="h-4 w-4" />
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDelete}
              className="rounded-xl h-9 w-9 p-0 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
            >
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
