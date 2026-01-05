import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSupplement, Supplement } from '@/contexts/SupplementContext';
import { RefreshCw } from 'lucide-react';

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
      <DialogContent className="max-w-sm border-supplements/30 bg-gradient-to-br from-background via-background to-supplements/5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-supplements/20">
              <RefreshCw className="h-4 w-4 text-supplements" />
            </div>
            Refill {supplement.name}
          </DialogTitle>
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
              className="focus:border-supplements focus:ring-supplements/30"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!doses || isSubmitting} className="bg-supplements hover:bg-supplements/90 text-white">
            Refill
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
