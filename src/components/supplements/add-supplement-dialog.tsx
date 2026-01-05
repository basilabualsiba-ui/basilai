import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSupplement } from '@/contexts/SupplementContext';
import { Plus } from 'lucide-react';

interface AddSupplementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DOSE_UNITS = [
  { value: 'scoop', label: 'Scoop' },
  { value: 'pill', label: 'Pill' },
  { value: 'capsule', label: 'Capsule' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'ml', label: 'ml' },
  { value: 'serving', label: 'Serving' },
];

export function AddSupplementDialog({ open, onOpenChange }: AddSupplementDialogProps) {
  const { addSupplement } = useSupplement();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    dose_unit: 'scoop',
    total_doses: '',
    warning_threshold: '5',
  });

  const handleSubmit = async () => {
    if (!form.name || !form.total_doses) return;
    
    setIsSubmitting(true);
    const totalDoses = parseFloat(form.total_doses);
    
    await addSupplement({
      name: form.name,
      description: form.description || null,
      dose_unit: form.dose_unit,
      total_doses: totalDoses,
      remaining_doses: totalDoses,
      warning_threshold: parseFloat(form.warning_threshold) || 5,
    });
    
    setForm({
      name: '',
      description: '',
      dose_unit: 'scoop',
      total_doses: '',
      warning_threshold: '5',
    });
    setIsSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-supplements/30 bg-gradient-to-br from-background via-background to-supplements/5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-supplements/20">
              <Plus className="h-4 w-4 text-supplements" />
            </div>
            Add Supplement
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Whey Protein"
              className="focus:border-supplements focus:ring-supplements/30"
            />
          </div>
          
          <div>
            <Label>Description (optional)</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g., Chocolate flavor"
              className="focus:border-supplements focus:ring-supplements/30"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Dose Unit</Label>
              <Select value={form.dose_unit} onValueChange={(v) => setForm({ ...form, dose_unit: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOSE_UNITS.map(unit => (
                    <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Total {form.dose_unit}s</Label>
              <Input
                type="number"
                value={form.total_doses}
                onChange={(e) => setForm({ ...form, total_doses: e.target.value })}
                placeholder="e.g., 30"
                className="focus:border-supplements focus:ring-supplements/30"
              />
            </div>
          </div>
          
          <div>
            <Label>Low Stock Warning (remaining {form.dose_unit}s)</Label>
            <Input
              type="number"
              value={form.warning_threshold}
              onChange={(e) => setForm({ ...form, warning_threshold: e.target.value })}
              placeholder="e.g., 5"
              className="focus:border-supplements focus:ring-supplements/30"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!form.name || !form.total_doses || isSubmitting} className="bg-supplements hover:bg-supplements/90 text-white">
            Add Supplement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
