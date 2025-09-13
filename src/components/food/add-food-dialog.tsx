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
import { useToast } from '@/hooks/use-toast';
import { Search, Loader2 } from 'lucide-react';

// Common nutrition data for simulation with Arabic support
const commonFoods: Record<string, any> = {
  // Proteins
  'chicken breast': { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, sodium: 74, servingSize: '100', servingUnit: 'gram' },
  'صدر دجاج': { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, sodium: 74, servingSize: '100', servingUnit: 'gram' },
  'دجاج': { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, sodium: 74, servingSize: '100', servingUnit: 'gram' },
  'chicken': { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, sodium: 74, servingSize: '100', servingUnit: 'gram' },
  'beef': { calories: 250, protein: 26, carbs: 0, fat: 17, fiber: 0, sugar: 0, sodium: 72, servingSize: '100', servingUnit: 'gram' },
  'لحم بقر': { calories: 250, protein: 26, carbs: 0, fat: 17, fiber: 0, sugar: 0, sodium: 72, servingSize: '100', servingUnit: 'gram' },
  'لحمة': { calories: 250, protein: 26, carbs: 0, fat: 17, fiber: 0, sugar: 0, sodium: 72, servingSize: '100', servingUnit: 'gram' },
  'salmon': { calories: 208, protein: 20, carbs: 0, fat: 12, fiber: 0, sugar: 0, sodium: 93, servingSize: '100', servingUnit: 'gram' },
  'سلمون': { calories: 208, protein: 20, carbs: 0, fat: 12, fiber: 0, sugar: 0, sodium: 93, servingSize: '100', servingUnit: 'gram' },
  'tuna': { calories: 144, protein: 30, carbs: 0, fat: 1, fiber: 0, sugar: 0, sodium: 39, servingSize: '100', servingUnit: 'gram' },
  'تونة': { calories: 144, protein: 30, carbs: 0, fat: 1, fiber: 0, sugar: 0, sodium: 39, servingSize: '100', servingUnit: 'gram' },
  'egg': { calories: 78, protein: 6.5, carbs: 0.6, fat: 5.5, fiber: 0, sugar: 0.6, sodium: 62, servingSize: '50', servingUnit: 'gram' },
  'بيض': { calories: 78, protein: 6.5, carbs: 0.6, fat: 5.5, fiber: 0, sugar: 0.6, sodium: 62, servingSize: '50', servingUnit: 'gram' },
  'بيضة': { calories: 78, protein: 6.5, carbs: 0.6, fat: 5.5, fiber: 0, sugar: 0.6, sodium: 62, servingSize: '50', servingUnit: 'gram' },
  
  // Fruits
  'apple': { calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4, sugar: 10, sodium: 1, servingSize: '100', servingUnit: 'gram' },
  'تفاح': { calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4, sugar: 10, sodium: 1, servingSize: '100', servingUnit: 'gram' },
  'banana': { calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, sugar: 12, sodium: 1, servingSize: '100', servingUnit: 'gram' },
  'موز': { calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, sugar: 12, sodium: 1, servingSize: '100', servingUnit: 'gram' },
  'orange': { calories: 47, protein: 0.9, carbs: 12, fat: 0.1, fiber: 2.4, sugar: 9, sodium: 0, servingSize: '100', servingUnit: 'gram' },
  'برتقال': { calories: 47, protein: 0.9, carbs: 12, fat: 0.1, fiber: 2.4, sugar: 9, sodium: 0, servingSize: '100', servingUnit: 'gram' },
  'grapes': { calories: 69, protein: 0.7, carbs: 18, fat: 0.2, fiber: 0.9, sugar: 16, sodium: 2, servingSize: '100', servingUnit: 'gram' },
  'عنب': { calories: 69, protein: 0.7, carbs: 18, fat: 0.2, fiber: 0.9, sugar: 16, sodium: 2, servingSize: '100', servingUnit: 'gram' },
  'strawberry': { calories: 32, protein: 0.7, carbs: 8, fat: 0.3, fiber: 2, sugar: 4.9, sodium: 1, servingSize: '100', servingUnit: 'gram' },
  'فراولة': { calories: 32, protein: 0.7, carbs: 8, fat: 0.3, fiber: 2, sugar: 4.9, sodium: 1, servingSize: '100', servingUnit: 'gram' },
  'mango': { calories: 60, protein: 0.8, carbs: 15, fat: 0.4, fiber: 1.6, sugar: 14, sodium: 1, servingSize: '100', servingUnit: 'gram' },
  'مانجو': { calories: 60, protein: 0.8, carbs: 15, fat: 0.4, fiber: 1.6, sugar: 14, sodium: 1, servingSize: '100', servingUnit: 'gram' },
  'pineapple': { calories: 50, protein: 0.5, carbs: 13, fat: 0.1, fiber: 1.4, sugar: 10, sodium: 1, servingSize: '100', servingUnit: 'gram' },
  'أناناس': { calories: 50, protein: 0.5, carbs: 13, fat: 0.1, fiber: 1.4, sugar: 10, sodium: 1, servingSize: '100', servingUnit: 'gram' },
  'watermelon': { calories: 30, protein: 0.6, carbs: 8, fat: 0.2, fiber: 0.4, sugar: 6, sodium: 1, servingSize: '100', servingUnit: 'gram' },
  'بطيخ': { calories: 30, protein: 0.6, carbs: 8, fat: 0.2, fiber: 0.4, sugar: 6, sodium: 1, servingSize: '100', servingUnit: 'gram' },
  
  // Vegetables
  'broccoli': { calories: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6, sugar: 1.5, sodium: 33, servingSize: '100', servingUnit: 'gram' },
  'بروكلي': { calories: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6, sugar: 1.5, sodium: 33, servingSize: '100', servingUnit: 'gram' },
  'spinach': { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, sugar: 0.4, sodium: 79, servingSize: '100', servingUnit: 'gram' },
  'سبانخ': { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, sugar: 0.4, sodium: 79, servingSize: '100', servingUnit: 'gram' },
  'carrot': { calories: 41, protein: 0.9, carbs: 10, fat: 0.2, fiber: 2.8, sugar: 4.7, sodium: 69, servingSize: '100', servingUnit: 'gram' },
  'جزر': { calories: 41, protein: 0.9, carbs: 10, fat: 0.2, fiber: 2.8, sugar: 4.7, sodium: 69, servingSize: '100', servingUnit: 'gram' },
  'tomato': { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2, sugar: 2.6, sodium: 5, servingSize: '100', servingUnit: 'gram' },
  'طماطم': { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2, sugar: 2.6, sodium: 5, servingSize: '100', servingUnit: 'gram' },
  'cucumber': { calories: 16, protein: 0.7, carbs: 4, fat: 0.1, fiber: 0.5, sugar: 1.7, sodium: 2, servingSize: '100', servingUnit: 'gram' },
  'خيار': { calories: 16, protein: 0.7, carbs: 4, fat: 0.1, fiber: 0.5, sugar: 1.7, sodium: 2, servingSize: '100', servingUnit: 'gram' },
  'lettuce': { calories: 15, protein: 1.4, carbs: 2.9, fat: 0.2, fiber: 1.3, sugar: 0.8, sodium: 28, servingSize: '100', servingUnit: 'gram' },
  'خس': { calories: 15, protein: 1.4, carbs: 2.9, fat: 0.2, fiber: 1.3, sugar: 0.8, sodium: 28, servingSize: '100', servingUnit: 'gram' },
  'onion': { calories: 40, protein: 1.1, carbs: 9, fat: 0.1, fiber: 1.7, sugar: 4.2, sodium: 4, servingSize: '100', servingUnit: 'gram' },
  'بصل': { calories: 40, protein: 1.1, carbs: 9, fat: 0.1, fiber: 1.7, sugar: 4.2, sodium: 4, servingSize: '100', servingUnit: 'gram' },
  'potato': { calories: 77, protein: 2, carbs: 17, fat: 0.1, fiber: 2.2, sugar: 0.8, sodium: 6, servingSize: '100', servingUnit: 'gram' },
  'بطاطس': { calories: 77, protein: 2, carbs: 17, fat: 0.1, fiber: 2.2, sugar: 0.8, sodium: 6, servingSize: '100', servingUnit: 'gram' },
  
  // Grains & Carbs
  'rice': { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, sugar: 0.1, sodium: 1, servingSize: '100', servingUnit: 'gram' },
  'رز': { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, sugar: 0.1, sodium: 1, servingSize: '100', servingUnit: 'gram' },
  'أرز': { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, sugar: 0.1, sodium: 1, servingSize: '100', servingUnit: 'gram' },
  'bread': { calories: 265, protein: 9, carbs: 49, fat: 3.2, fiber: 2.7, sugar: 5, sodium: 491, servingSize: '100', servingUnit: 'gram' },
  'خبز': { calories: 265, protein: 9, carbs: 49, fat: 3.2, fiber: 2.7, sugar: 5, sodium: 491, servingSize: '100', servingUnit: 'gram' },
  'pasta': { calories: 131, protein: 5, carbs: 25, fat: 1.1, fiber: 1.8, sugar: 0.6, sodium: 6, servingSize: '100', servingUnit: 'gram' },
  'معكرونة': { calories: 131, protein: 5, carbs: 25, fat: 1.1, fiber: 1.8, sugar: 0.6, sodium: 6, servingSize: '100', servingUnit: 'gram' },
  'oats': { calories: 389, protein: 17, carbs: 66, fat: 7, fiber: 11, sugar: 1, sodium: 2, servingSize: '100', servingUnit: 'gram' },
  'شوفان': { calories: 389, protein: 17, carbs: 66, fat: 7, fiber: 11, sugar: 1, sodium: 2, servingSize: '100', servingUnit: 'gram' },
  'quinoa': { calories: 120, protein: 4.4, carbs: 22, fat: 1.9, fiber: 2.8, sugar: 0.9, sodium: 7, servingSize: '100', servingUnit: 'gram' },
  'كينوا': { calories: 120, protein: 4.4, carbs: 22, fat: 1.9, fiber: 2.8, sugar: 0.9, sodium: 7, servingSize: '100', servingUnit: 'gram' },
  
  // Dairy
  'milk': { calories: 42, protein: 3.4, carbs: 5, fat: 1, fiber: 0, sugar: 5, sodium: 44, servingSize: '100', servingUnit: 'ml' },
  'حليب': { calories: 42, protein: 3.4, carbs: 5, fat: 1, fiber: 0, sugar: 5, sodium: 44, servingSize: '100', servingUnit: 'ml' },
  'cheese': { calories: 113, protein: 25, carbs: 1, fat: 1, fiber: 0, sugar: 1, sodium: 515, servingSize: '100', servingUnit: 'gram' },
  'جبنة': { calories: 113, protein: 25, carbs: 1, fat: 1, fiber: 0, sugar: 1, sodium: 515, servingSize: '100', servingUnit: 'gram' },
  'yogurt': { calories: 59, protein: 10, carbs: 3.6, fat: 0.4, fiber: 0, sugar: 3.2, sodium: 36, servingSize: '100', servingUnit: 'gram' },
  'لبن': { calories: 59, protein: 10, carbs: 3.6, fat: 0.4, fiber: 0, sugar: 3.2, sodium: 36, servingSize: '100', servingUnit: 'gram' },
  'زبادي': { calories: 59, protein: 10, carbs: 3.6, fat: 0.4, fiber: 0, sugar: 3.2, sodium: 36, servingSize: '100', servingUnit: 'gram' },
  
  // Nuts & Seeds
  'almonds': { calories: 579, protein: 21, carbs: 22, fat: 50, fiber: 12, sugar: 4, sodium: 1, servingSize: '100', servingUnit: 'gram' },
  'لوز': { calories: 579, protein: 21, carbs: 22, fat: 50, fiber: 12, sugar: 4, sodium: 1, servingSize: '100', servingUnit: 'gram' },
  'walnuts': { calories: 654, protein: 15, carbs: 14, fat: 65, fiber: 7, sugar: 3, sodium: 2, servingSize: '100', servingUnit: 'gram' },
  'جوز': { calories: 654, protein: 15, carbs: 14, fat: 65, fiber: 7, sugar: 3, sodium: 2, servingSize: '100', servingUnit: 'gram' },
  'peanuts': { calories: 567, protein: 26, carbs: 16, fat: 49, fiber: 9, sugar: 4, sodium: 18, servingSize: '100', servingUnit: 'gram' },
  'فول سوداني': { calories: 567, protein: 26, carbs: 16, fat: 49, fiber: 9, sugar: 4, sodium: 18, servingSize: '100', servingUnit: 'gram' },
  
  // Legumes
  'lentils': { calories: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 8, sugar: 2, sodium: 2, servingSize: '100', servingUnit: 'gram' },
  'عدس': { calories: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 8, sugar: 2, sodium: 2, servingSize: '100', servingUnit: 'gram' },
  'chickpeas': { calories: 164, protein: 8, carbs: 27, fat: 2.6, fiber: 8, sugar: 5, sodium: 7, servingSize: '100', servingUnit: 'gram' },
  'حمص': { calories: 164, protein: 8, carbs: 27, fat: 2.6, fiber: 8, sugar: 5, sodium: 7, servingSize: '100', servingUnit: 'gram' },
  'beans': { calories: 127, protein: 9, carbs: 23, fat: 0.5, fiber: 6, sugar: 0.3, sodium: 2, servingSize: '100', servingUnit: 'gram' },
  'فاصوليا': { calories: 127, protein: 9, carbs: 23, fat: 0.5, fiber: 6, sugar: 0.3, sodium: 2, servingSize: '100', servingUnit: 'gram' }
};

const simulateNutritionSearch = async (foodName: string) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Find closest match in common foods (exact match first, then partial match)
  const searchName = foodName.toLowerCase().trim();
  
  // First try exact match
  if (commonFoods[searchName]) {
    const nutrition = commonFoods[searchName];
    return {
      calories_per_serving: nutrition.calories,
      protein_per_serving: nutrition.protein,
      carbs_per_serving: nutrition.carbs,
      fat_per_serving: nutrition.fat,
      fiber_per_serving: nutrition.fiber,
      sugar_per_serving: nutrition.sugar,
      sodium_per_serving: nutrition.sodium,
      serving_size: nutrition.servingSize,
      serving_unit: nutrition.servingUnit
    };
  }
  
  // Then try partial match
  for (const [key, nutrition] of Object.entries(commonFoods)) {
    if (searchName.includes(key) || key.includes(searchName)) {
      return {
        calories_per_serving: nutrition.calories,
        protein_per_serving: nutrition.protein,
        carbs_per_serving: nutrition.carbs,
        fat_per_serving: nutrition.fat,
        fiber_per_serving: nutrition.fiber,
        sugar_per_serving: nutrition.sugar,
        sodium_per_serving: nutrition.sodium,
        serving_size: nutrition.servingSize,
        serving_unit: nutrition.servingUnit
      };
    }
  }
  
  return null;
};

interface AddFoodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddFoodDialog({ open, onOpenChange }: AddFoodDialogProps) {
  const { addFoodItem } = useFood();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    brand: '',
    serving_size: '',
    serving_unit: 'gram',
    calories_per_serving: 0,
    protein_per_serving: 0,
    carbs_per_serving: 0,
    fat_per_serving: 0,
    fiber_per_serving: 0,
    sugar_per_serving: 0,
    sodium_per_serving: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsLoading(true);
    try {
      await addFoodItem(formData);
      toast({
        title: "Food item added",
        description: `${formData.name} has been added to your food list.`,
      });
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        brand: '',
        serving_size: '',
        serving_unit: 'gram',
        calories_per_serving: 0,
        protein_per_serving: 0,
        carbs_per_serving: 0,
        fat_per_serving: 0,
        fiber_per_serving: 0,
        sugar_per_serving: 0,
        sodium_per_serving: 0,
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding food item:', error);
      toast({
        title: "Error",
        description: "Failed to add food item. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const autoFillNutrition = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Enter food name",
        description: "Please enter a food name first to search for nutrition information.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      // Search for nutrition information using a nutrition database or API
      const searchQuery = `${formData.name} nutrition facts calories protein carbs fat fiber sugar sodium per 100g serving`;
      
      // For demo purposes, we'll simulate the search and provide some common nutrition values
      // In a real app, you'd integrate with a nutrition API like USDA FoodData Central or Edamam
      const nutritionData = await simulateNutritionSearch(formData.name.toLowerCase());
      
      if (nutritionData) {
        setFormData(prev => ({
          ...prev,
          ...nutritionData
        }));
        
        toast({
          title: "Nutrition info found",
          description: "Auto-filled nutrition information. Please review and adjust as needed.",
        });
      } else {
        toast({
          title: "No nutrition data found",
          description: "Could not find nutrition information for this food. Please enter manually.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Auto-fill error:', error);
      toast({
        title: "Search failed",
        description: "Could not search for nutrition information. Please try again or enter manually.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Food Item</DialogTitle>
          <DialogDescription>
            Add a new food item with its nutritional information.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <div className="flex gap-2">
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Chicken Breast"
                required
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={autoFillNutrition}
                disabled={isSearching || !formData.name.trim()}
                className="px-3"
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
            {isSearching && (
              <p className="text-sm text-muted-foreground">
                Searching for nutrition information...
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand">Brand</Label>
            <Input
              id="brand"
              value={formData.brand}
              onChange={(e) => handleInputChange('brand', e.target.value)}
              placeholder="e.g., Organic Valley"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Optional description..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="serving_size">Serving Size</Label>
              <Input
                id="serving_size"
                value={formData.serving_size}
                onChange={(e) => handleInputChange('serving_size', e.target.value)}
                placeholder="e.g., 100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serving_unit">Unit</Label>
              <Input
                id="serving_unit"
                value={formData.serving_unit}
                onChange={(e) => handleInputChange('serving_unit', e.target.value)}
                placeholder="e.g., gram, cup, piece"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-sm text-foreground">Nutrition per serving</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="calories">Calories</Label>
                <Input
                  id="calories"
                  type="number"
                  value={formData.calories_per_serving}
                  onChange={(e) => handleInputChange('calories_per_serving', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="protein">Protein (g)</Label>
                <Input
                  id="protein"
                  type="number"
                  value={formData.protein_per_serving}
                  onChange={(e) => handleInputChange('protein_per_serving', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="carbs">Carbs (g)</Label>
                <Input
                  id="carbs"
                  type="number"
                  value={formData.carbs_per_serving}
                  onChange={(e) => handleInputChange('carbs_per_serving', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fat">Fat (g)</Label>
                <Input
                  id="fat"
                  type="number"
                  value={formData.fat_per_serving}
                  onChange={(e) => handleInputChange('fat_per_serving', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fiber">Fiber (g)</Label>
                <Input
                  id="fiber"
                  type="number"
                  value={formData.fiber_per_serving}
                  onChange={(e) => handleInputChange('fiber_per_serving', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sugar">Sugar (g)</Label>
                <Input
                  id="sugar"
                  type="number"
                  value={formData.sugar_per_serving}
                  onChange={(e) => handleInputChange('sugar_per_serving', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sodium">Sodium (mg)</Label>
              <Input
                id="sodium"
                type="number"
                value={formData.sodium_per_serving}
                onChange={(e) => handleInputChange('sodium_per_serving', parseFloat(e.target.value) || 0)}
                min="0"
                step="0.1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.name.trim()}>
              {isLoading ? 'Adding...' : 'Add Food'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}