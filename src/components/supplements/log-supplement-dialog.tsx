import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSupplement } from '@/contexts/SupplementContext';
import { Pill } from 'lucide-react';

interface LogSupplementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: string;
}

export function LogSupplementDialog({ open, onOpenChange, selectedDate }: LogSupplementDialogProps) {
  const { supplements, logSupplement } = useSupplement();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    supplement_id: '',
    doses: '1',
    notes: '',
  });

  const selectedSupplement = supplements.find(s => s.id === form.supplement_id);

  const handleSubmit = async () => {
    if (!form.supplement_id || !form.doses) return;
    
    setIsSubmitting(true);
    await logSupplement(
      form.supplement_id, 
      parseFloat(form.doses), 
      selectedDate,
      form.notes || undefined
    );
    
    setForm({ supplement_id: '', doses: '1', notes: '' });
    setIsSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-supplements/30 bg-gradient-to-br from-background via-background to-supplements/5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-supplements/20">
              <Pill className="h-4 w-4 text-supplements" />
            </div>
            Log Supplement
          </DialogTitle>
        </DialogHeader>
        
        {supplements.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Pill className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No supplements added yet</p>
            <p className="text-sm">Add a supplement first to start logging</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Supplement</Label>
              <Select value={form.supplement_id} onValueChange={(v) => setForm({ ...form, supplement_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplement" />
                </SelectTrigger>
                <SelectContent>
                  {supplements.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <span>{s.name}</span>
                        <span className="text-muted-foreground text-xs">
                          ({s.remaining_doses} {s.dose_unit}s left)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>
                Doses taken {selectedSupplement && `(${selectedSupplement.dose_unit}s)`}
              </Label>
              <Input
                type="number"
                value={form.doses}
                onChange={(e) => setForm({ ...form, doses: e.target.value })}
                min="0.5"
                step="0.5"
                className="focus:border-supplements focus:ring-supplements/30"
              />
            </div>
            
            <div>
              <Label>Notes (optional)</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="e.g., After workout"
                className="focus:border-supplements focus:ring-supplements/30"
              />
            </div>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!form.supplement_id || !form.doses || isSubmitting || supplements.length === 0}
            className="bg-supplements hover:bg-supplements/90 text-white"
          >
            Log
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
