import { useState } from 'react';
import { useFood } from '@/contexts/FoodContext';
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

interface AddMealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddMealDialog({ open, onOpenChange }: AddMealDialogProps) {
  const { addMeal } = useFood();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'basic' | 'foods'>('basic');
  const [createdMeal, setCreatedMeal] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    meal_type: 'main',
    default_time: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsLoading(true);
    try {
      const mealData = {
        name: formData.name,
        description: formData.description,
        meal_type: formData.meal_type,
        default_time: formData.default_time || undefined,
        total_calories: 0,
        total_protein: 0,
        total_carbs: 0,
        total_fat: 0,
      };

      // Create the meal
      const createdMealData = await addMeal(mealData);
      setCreatedMeal(createdMealData);
      
      // Move to foods step
      setStep('foods');
      
      toast({
        title: "Meal created",
        description: `${formData.name} has been created. Now add foods to it.`,
      });
    } catch (error) {
      console.error('Error adding meal:', error);
      toast({
        title: "Error",
        description: "Failed to create meal. Please try again.",
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
    // Reset form and step
    setFormData({
      name: '',
      description: '',
      meal_type: 'main',
      default_time: '',
    });
    setStep('basic');
    setCreatedMeal(null);
    onOpenChange(false);
  };

  const handleFinish = () => {
    toast({
      title: "Meal completed",
      description: `${createdMeal?.name} has been created successfully with all foods.`,
    });
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 'basic' ? 'Create New Meal' : `Add Foods to ${createdMeal?.name}`}
          </DialogTitle>
          <DialogDescription>
            {step === 'basic' 
              ? 'First, create the meal with basic information. Then you can add foods to it.'
              : 'Search and add food items to your meal. Nutrition will be calculated automatically.'
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
              mealId={createdMeal?.id} 
              mealName={createdMeal?.name}
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
                {isLoading ? 'Creating...' : 'Create & Add Foods'}
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