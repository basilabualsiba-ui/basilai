import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, Pill, AlertTriangle, Trash2, RefreshCw, Edit, Sparkles } from 'lucide-react';
import { useSupplement, Supplement } from '@/contexts/SupplementContext';
import { AddSupplementDialog } from './add-supplement-dialog';
import { RefillSupplementDialog } from './refill-supplement-dialog';
import { EditSupplementDialog } from './edit-supplement-dialog';
import { useSound } from '@/hooks/useSound';
import { cn } from '@/lib/utils';

export function SupplementList() {
  const { supplements, deleteSupplement } = useSupplement();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [refillingSupplement, setRefillingSupplement] = useState<Supplement | null>(null);
  const [editingSupplement, setEditingSupplement] = useState<Supplement | null>(null);
  const { click, success, error } = useSound();

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this supplement?')) {
      await deleteSupplement(id);
      success();
    }
  };

  const getStockStatus = (supplement: Supplement) => {
    if (supplement.remaining_doses === 0) return { label: 'Empty', variant: 'destructive' as const, color: 'text-red-500' };
    if (supplement.remaining_doses <= supplement.warning_threshold) return { label: 'Low Stock', variant: 'secondary' as const, color: 'text-amber-500' };
    return { label: 'In Stock', variant: 'default' as const, color: 'text-green-500' };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">My Supplements</h2>
          <p className="text-sm text-muted-foreground">{supplements.length} tracked</p>
        </div>
        <Button 
          size="sm" 
          onClick={() => { click(); setShowAddDialog(true); }}
          className="rounded-xl bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 shadow-lg shadow-purple-500/25"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {supplements.length === 0 ? (
        <Card className="p-8 text-center border-dashed border-2 border-purple-500/20 bg-purple-500/5">
          <div className="relative inline-block mb-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-violet-500/20">
              <Pill className="h-12 w-12 text-purple-500" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-500 opacity-20 blur-xl -z-10" />
          </div>
          <p className="text-muted-foreground mb-4">No supplements added yet</p>
          <Button 
            onClick={() => { click(); setShowAddDialog(true); }}
            className="rounded-xl bg-gradient-to-r from-purple-500 to-violet-500"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Add Your First Supplement
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {supplements.map((supplement, index) => {
            const status = getStockStatus(supplement);
            const progressPercent = supplement.total_doses > 0 
              ? (supplement.remaining_doses / supplement.total_doses) * 100 
              : 0;
            
            const isLowStock = supplement.remaining_doses <= supplement.warning_threshold;
            const isEmpty = supplement.remaining_doses === 0;
            
            return (
              <Card 
                key={supplement.id} 
                className={cn(
                  "p-4 border-border/50 transition-all duration-300 hover:shadow-lg animate-fade-in",
                  isLowStock && !isEmpty && "border-amber-500/30 bg-amber-500/5",
                  isEmpty && "border-red-500/30 bg-red-500/5",
                  !isLowStock && !isEmpty && "hover:border-purple-500/30"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2.5 rounded-xl transition-all duration-300",
                      isEmpty 
                        ? "bg-red-500/10" 
                        : isLowStock 
                          ? "bg-amber-500/10 animate-pulse" 
                          : "bg-purple-500/10"
                    )}>
                      <Pill className={cn(
                        "h-5 w-5",
                        isEmpty 
                          ? "text-red-500" 
                          : isLowStock 
                            ? "text-amber-500" 
                            : "text-purple-500"
                      )} />
                    </div>
                    <div>
                      <h3 className="font-semibold">{supplement.name}</h3>
                      {supplement.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">{supplement.description}</p>
                      )}
                    </div>
                  </div>
                  <Badge 
                    variant={status.variant} 
                    className={cn(
                      "flex items-center gap-1 rounded-lg",
                      isEmpty && "bg-red-500/10 text-red-500 border-red-500/30",
                      isLowStock && !isEmpty && "bg-amber-500/10 text-amber-500 border-amber-500/30",
                      !isLowStock && !isEmpty && "bg-green-500/10 text-green-500 border-green-500/30"
                    )}
                  >
                    {(isLowStock || isEmpty) && (
                      <AlertTriangle className="h-3 w-3" />
                    )}
                    {status.label}
                  </Badge>
                </div>
                
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Remaining</span>
                    <span className="font-semibold">
                      {supplement.remaining_doses} / {supplement.total_doses} {supplement.dose_unit}s
                    </span>
                  </div>
                  <div className="w-full h-2.5 overflow-hidden rounded-full bg-secondary/50">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-700 ease-out",
                        isEmpty 
                          ? "bg-gradient-to-r from-red-500 to-red-400 shadow-[0_0_10px_hsl(0_84%_60%/0.4)]" 
                          : isLowStock 
                            ? "bg-gradient-to-r from-amber-500 to-amber-400 shadow-[0_0_10px_hsl(38_92%_50%/0.4)]" 
                            : "bg-gradient-to-r from-purple-500 to-violet-400 shadow-[0_0_10px_hsl(270_80%_60%/0.4)]"
                      )}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => { click(); setRefillingSupplement(supplement); }}
                    className="flex-1 rounded-xl border-border/50 hover:bg-purple-500/10 hover:text-purple-500 hover:border-purple-500/30"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Refill
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => { click(); setEditingSupplement(supplement); }}
                    className="rounded-xl hover:bg-purple-500/10 hover:text-purple-500"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    className="rounded-xl text-destructive hover:text-destructive hover:bg-red-500/10"
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
