// Pending Queries Manager - Review AI-suggested queries

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Edit, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { queryLibrary } from '@/services/LocalAssistant/QueryLibrary';
import type { PendingQuery } from '@/types/assistant';

interface PendingQueriesManagerProps {
  onApproved?: () => void;
}

export function PendingQueriesManager({ onApproved }: PendingQueriesManagerProps) {
  const [pending, setPending] = useState<PendingQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => { loadPending(); }, []);

  const loadPending = async () => {
    setLoading(true);
    const data = await queryLibrary.getPendingQueries();
    setPending(data);
    setLoading(false);
  };

  const approve = async (id: string) => {
    setProcessing(id);
    const result = await queryLibrary.approvePendingQuery(id);
    if (result) {
      toast.success('تمت الموافقة ✅');
      onApproved?.();
    } else {
      toast.error('خطأ في الموافقة');
    }
    setProcessing(null);
    loadPending();
  };

  const reject = async (id: string) => {
    setProcessing(id);
    await queryLibrary.rejectPendingQuery(id);
    toast.success('تم الرفض');
    setProcessing(null);
    loadPending();
  };

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="animate-spin h-5 w-5" /></div>;

  return (
    <div className="space-y-3" dir="rtl">
      {pending.length === 0 && (
        <p className="text-center text-muted-foreground text-sm py-4">لا توجد اقتراحات معلقة</p>
      )}
      {pending.map(pq => {
        const sq = pq.suggested_query;
        return (
          <Card key={pq.id}>
            <CardContent className="py-3 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-sm">{sq.query_name || 'بدون اسم'}</h4>
                  <p className="text-xs text-muted-foreground">{sq.purpose}</p>
                </div>
                <Badge variant="outline">{sq.category}</Badge>
              </div>

              {sq.trigger_patterns && (
                <div className="flex flex-wrap gap-1">
                  {sq.trigger_patterns.map((p: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-xs">{p}</Badge>
                  ))}
                </div>
              )}

              {pq.suggestion_reason && (
                <p className="text-xs text-muted-foreground bg-muted p-2 rounded">{pq.suggestion_reason}</p>
              )}

              {sq.query_config && (
                <div className="text-xs font-mono bg-muted p-2 rounded">
                  جدول: {sq.query_config.table}
                  {sq.query_config.aggregation && ` | ${sq.query_config.aggregation.type}(${sq.query_config.aggregation.column})`}
                </div>
              )}

              {sq.explanation && (
                <p className="text-xs text-muted-foreground">{sq.explanation}</p>
              )}

              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => approve(pq.id)} 
                  disabled={processing === pq.id}
                >
                  {processing === pq.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                  موافقة
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive" 
                  onClick={() => reject(pq.id)}
                  disabled={processing === pq.id}
                >
                  <X className="h-3 w-3 mr-1" /> رفض
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
