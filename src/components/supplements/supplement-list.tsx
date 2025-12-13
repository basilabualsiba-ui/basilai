import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, Pill, AlertTriangle, Trash2, RefreshCw, Edit } from 'lucide-react';
import { useSupplement, Supplement } from '@/contexts/SupplementContext';
import { AddSupplementDialog } from './add-supplement-dialog';
import { RefillSupplementDialog } from './refill-supplement-dialog';
import { EditSupplementDialog } from './edit-supplement-dialog';

export function SupplementList() {
  const { supplements, deleteSupplement } = useSupplement();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [refillingSupplement, setRefillingSupplement] = useState<Supplement | null>(null);
  const [editingSupplement, setEditingSupplement] = useState<Supplement | null>(null);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this supplement?')) {
      await deleteSupplement(id);
    }
  };

  const getStockStatus = (supplement: Supplement) => {
    if (supplement.remaining_doses === 0) return { label: 'Empty', variant: 'destructive' as const };
    if (supplement.remaining_doses <= supplement.warning_threshold) return { label: 'Low Stock', variant: 'secondary' as const };
    return { label: 'In Stock', variant: 'default' as const };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">My Supplements</h2>
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {supplements.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Pill className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No supplements added yet</p>
          <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
            Add Your First Supplement
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {supplements.map(supplement => {
            const status = getStockStatus(supplement);
            const progressPercent = supplement.total_doses > 0 
              ? (supplement.remaining_doses / supplement.total_doses) * 100 
              : 0;
            
            return (
              <Card key={supplement.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Pill className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-medium">{supplement.name}</h3>
                      {supplement.description && (
                        <p className="text-sm text-muted-foreground">{supplement.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={status.variant} className="flex items-center gap-1">
                      {status.label === 'Low Stock' || status.label === 'Empty' ? (
                        <AlertTriangle className="h-3 w-3" />
                      ) : null}
                      {status.label}
                    </Badge>
                  </div>
                </div>
                
                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Remaining</span>
                    <span className="font-medium">
                      {supplement.remaining_doses} / {supplement.total_doses} {supplement.dose_unit}s
                    </span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </div>
                
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setRefillingSupplement(supplement)}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Refill
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => setEditingSupplement(supplement)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(supplement.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <AddSupplementDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
      
      {refillingSupplement && (
        <RefillSupplementDialog 
          supplement={refillingSupplement} 
          open={!!refillingSupplement} 
          onOpenChange={(open) => !open && setRefillingSupplement(null)} 
        />
      )}
      
      {editingSupplement && (
        <EditSupplementDialog 
          supplement={editingSupplement} 
          open={!!editingSupplement} 
          onOpenChange={(open) => !open && setEditingSupplement(null)} 
        />
      )}
    </div>
  );
}
