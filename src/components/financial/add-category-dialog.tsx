import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFinancial } from '@/contexts/FinancialContext';
import { Plus, Utensils, ShoppingBag, Car, Plane, Home, Briefcase, Heart, Gamepad2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const CATEGORY_ICONS = [
  { name: 'Utensils', icon: Utensils },
  { name: 'ShoppingBag', icon: ShoppingBag },
  { name: 'Car', icon: Car },
  { name: 'Plane', icon: Plane },
  { name: 'Home', icon: Home },
  { name: 'Briefcase', icon: Briefcase },
  { name: 'Heart', icon: Heart },
  { name: 'Gamepad2', icon: Gamepad2 }
];

export const AddCategoryDialog = ({ trigger, defaultType }: { trigger?: React.ReactNode; defaultType?: 'income' | 'expense' }) => {
  const { addCategory } = useFinancial();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: defaultType || 'expense' as 'income' | 'expense',
    icon: 'Utensils'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast({
        title: "Error",
        description: "Please enter a category name",
        variant: "destructive"
      });
      return;
    }

    addCategory({
      name: formData.name,
      type: formData.type,
      icon: formData.icon
    });

    toast({
      title: "Success",
      description: "Category added successfully"
    });

    setOpen(false);
    setFormData({
      name: '',
      type: defaultType || 'expense',
      icon: 'Utensils'
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="icon" className="bg-wallet hover:bg-wallet/90 text-white">
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md border-wallet/30 bg-gradient-to-br from-background via-background to-wallet/5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-wallet/20">
              <Plus className="h-4 w-4 text-wallet" />
            </div>
            Add New Category
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Category Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Food & Dining"
              required
              className="focus:border-wallet focus:ring-wallet/30"
            />
          </div>

          <div>
            <Label htmlFor="type">Type</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value: 'income' | 'expense') => setFormData(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Icon</Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {CATEGORY_ICONS.map(({ name, icon: Icon }) => (
                <Button
                  key={name}
                  type="button"
                  variant={formData.icon === name ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, icon: name }))}
                  className={`h-12 flex flex-col gap-1 ${formData.icon === name ? 'bg-wallet hover:bg-wallet/90 text-white' : 'hover:bg-wallet/10 hover:text-wallet hover:border-wallet/30'}`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs">{name}</span>
                </Button>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full bg-wallet hover:bg-wallet/90 text-white">
            Add Category
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};