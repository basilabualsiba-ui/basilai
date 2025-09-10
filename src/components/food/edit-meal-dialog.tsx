import { useState, useEffect } from 'react';
import { useFood, Meal } from '@/contexts/FoodContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { MealFoodsManager } from './meal-foods-manager';

interface EditMealDialogProps {
  meal: Meal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditMealDialog({ meal, open, onOpenChange }: EditMealDialogProps) {
  const { updateMeal } = useFood();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'basic' | 'foods'>('basic');
  
  const [formData, setFormData] = useState({
    name: meal.name,
    description: meal.description || '',
    meal_type: meal.meal_type,
    default_time: meal.default_time || '',
  });

  useEffect(() => {
    setFormData({
      name: meal.name,
      description: meal.description || '',
      meal_type: meal.meal_type,
      default_time: meal.default_time || '',
    });
  }, [meal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsLoading(true);
    try {
      await updateMeal(meal.id, formData);
      toast({
        title: "Meal updated",
        description: `${formData.name} has been updated. Now you can edit its foods.`,
      });
      
      // Move to foods step
      setStep('foods');
    } catch (error) {
      console.error('Error updating meal:', error);
      toast({
        title: "Error",
        description: "Failed to update meal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleClose = () => {
    // Reset step when closing
    setStep('basic');
    onOpenChange(false);
  };

  const handleFinish = () => {
    toast({
      title: "Meal updated",
      description: `${formData.name} has been updated successfully with all foods.`,
    });
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 'basic' ? 'Edit Meal' : `Edit Foods in ${formData.name}`}
          </DialogTitle>
          <DialogDescription>
            {step === 'basic' 
              ? 'Update meal information and then edit its foods.'
              : 'Add, remove, or modify food items in your meal. Nutrition will be calculated automatically.'
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="overflow-y-auto flex-1">
          {step === 'basic' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Meal Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Protein Breakfast"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Optional meal description"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="meal_type">Meal Type</Label>
                <Select value={formData.meal_type} onValueChange={(value) => handleInputChange('meal_type', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breakfast">Breakfast</SelectItem>
                    <SelectItem value="lunch">Lunch</SelectItem>
                    <SelectItem value="dinner">Dinner</SelectItem>
                    <SelectItem value="snack">Snack</SelectItem>
                    <SelectItem value="main">Main</SelectItem>
                    <SelectItem value="pre-workout">Pre-workout</SelectItem>
                    <SelectItem value="post-workout">Post-workout</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default_time">Default Time</Label>
                <Input
                  id="default_time"
                  type="time"
                  value={formData.default_time}
                  onChange={(e) => handleInputChange('default_time', e.target.value)}
                />
              </div>
            </form>
          ) : (
            <MealFoodsManager 
              mealId={meal.id} 
              mealName={formData.name}
            />
          )}
        </div>
        
        <DialogFooter>
          {step === 'basic' ? (
            <>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || !formData.name.trim()}
                onClick={handleSubmit}
              >
                {isLoading ? 'Updating...' : 'Update & Edit Foods'}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => setStep('basic')}>
                Back to Meal Info
              </Button>
              <Button onClick={handleFinish}>
                Finish
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}