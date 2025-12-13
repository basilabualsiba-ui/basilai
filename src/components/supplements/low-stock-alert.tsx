import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { useSupplement } from '@/contexts/SupplementContext';

export function LowStockAlert() {
  const { getLowStockSupplements } = useSupplement();
  const lowStock = getLowStockSupplements();

  if (lowStock.length === 0) return null;

  return (
    <Card className="p-4 border-destructive/50 bg-destructive/5">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <h3 className="font-semibold text-destructive">Low Stock Alert</h3>
      </div>
      
      <div className="space-y-2">
        {lowStock.map(supplement => (
          <div key={supplement.id} className="flex items-center justify-between">
            <span className="text-sm">{supplement.name}</span>
            <Badge variant={supplement.remaining_doses === 0 ? 'destructive' : 'secondary'}>
              {supplement.remaining_doses === 0 
                ? 'Empty' 
                : `${supplement.remaining_doses} ${supplement.dose_unit}s left`
              }
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}
