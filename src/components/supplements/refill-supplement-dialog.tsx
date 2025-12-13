import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSupplement, Supplement } from '@/contexts/SupplementContext';

interface RefillSupplementDialogProps {
  supplement: Supplement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RefillSupplementDialog({ supplement, open, onOpenChange }: RefillSupplementDialogProps) {
  const { refillSupplement } = useSupplement();
  const [doses, setDoses] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!doses) return;
    
    setIsSubmitting(true);
    await refillSupplement(supplement.id, parseFloat(doses));
    setDoses('');
    setIsSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Refill {supplement.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Current: {supplement.remaining_doses} {supplement.dose_unit}s remaining
          </p>
          
          <div>
            <Label>Add {supplement.dose_unit}s</Label>
            <Input
              type="number"
              value={doses}
              onChange={(e) => setDoses(e.target.value)}
              placeholder={`How many ${supplement.dose_unit}s to add?`}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!doses || isSubmitting}>
            Refill
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
