import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSupplement, Supplement } from '@/contexts/SupplementContext';

interface EditSupplementDialogProps {
  supplement: Supplement;
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

export function EditSupplementDialog({ supplement, open, onOpenChange }: EditSupplementDialogProps) {
  const { updateSupplement } = useSupplement();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: supplement.name,
    description: supplement.description || '',
    dose_unit: supplement.dose_unit,
    warning_threshold: supplement.warning_threshold.toString(),
  });

  useEffect(() => {
    setForm({
      name: supplement.name,
      description: supplement.description || '',
      dose_unit: supplement.dose_unit,
      warning_threshold: supplement.warning_threshold.toString(),
    });
  }, [supplement]);

  const handleSubmit = async () => {
    if (!form.name) return;
    
    setIsSubmitting(true);
    await updateSupplement(supplement.id, {
      name: form.name,
      description: form.description || null,
      dose_unit: form.dose_unit,
      warning_threshold: parseFloat(form.warning_threshold) || 5,
    });
    
    setIsSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Supplement</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          
          <div>
            <Label>Description (optional)</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
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
              <Label>Low Stock Warning</Label>
              <Input
                type="number"
                value={form.warning_threshold}
                onChange={(e) => setForm({ ...form, warning_threshold: e.target.value })}
              />
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!form.name || isSubmitting}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
