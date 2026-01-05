import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useFinancial, Category } from '@/contexts/FinancialContext';
import { Trash2, Edit3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Wallet, PiggyBank, CreditCard, Banknote, Building2, Landmark, Car, Home, ShoppingCart, Coffee, Gamepad2, Gift, Plane, Music, BookOpen, Camera } from 'lucide-react';

const CATEGORY_ICONS = [
  { name: 'Wallet', icon: Wallet },
  { name: 'PiggyBank', icon: PiggyBank },
  { name: 'CreditCard', icon: CreditCard },
  { name: 'Banknote', icon: Banknote },
  { name: 'Building2', icon: Building2 },
  { name: 'Landmark', icon: Landmark },
  { name: 'Car', icon: Car },
  { name: 'Home', icon: Home },
  { name: 'ShoppingCart', icon: ShoppingCart },
  { name: 'Coffee', icon: Coffee },
  { name: 'Gamepad2', icon: Gamepad2 },
  { name: 'Gift', icon: Gift },
  { name: 'Plane', icon: Plane },
  { name: 'Music', icon: Music },
  { name: 'BookOpen', icon: BookOpen },
  { name: 'Camera', icon: Camera }
];

interface EditCategoryDialogProps {
  category: Category;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditCategoryDialog = ({ category, open, onOpenChange }: EditCategoryDialogProps) => {
  const { updateCategory, deleteCategory } = useFinancial();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: category.name,
    icon: category.icon,
    type: category.type
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      await updateCategory(category.id, formData);
      toast({
        title: "Success",
        description: "Category updated successfully"
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCategory(category.id);
      toast({
        title: "Success",
        description: "Category deleted successfully"
      });
      setShowDeleteDialog(false);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg border-wallet/30 bg-gradient-to-br from-background via-background to-wallet/5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-wallet/20">
                <Edit3 className="h-5 w-5 text-wallet" />
              </div>
              Edit Category
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
              <Label htmlFor="type">Category Type</Label>
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

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
              <div className="flex-1" />
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-wallet hover:bg-wallet/90 text-white">
                Update Category
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="border-wallet/30">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{category.name}"? This action cannot be undone and will also delete all transactions and budgets associated with this category.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};