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

// Common nutrition data for simulation - Arabic and English names
const commonFoods: Record<string, any> = {
  // English names
  'chicken breast': { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, sodium: 74, serving_size: '100', serving_unit: 'gram' },
  'apple': { calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4, sugar: 10, sodium: 1, serving_size: '100', serving_unit: 'gram' },
  'banana': { calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, sugar: 12, sodium: 1, serving_size: '100', serving_unit: 'gram' },
  'rice': { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, sugar: 0.1, sodium: 1, serving_size: '100', serving_unit: 'gram' },
  'salmon': { calories: 208, protein: 20, carbs: 0, fat: 12, fiber: 0, sugar: 0, sodium: 93, serving_size: '100', serving_unit: 'gram' },
  'egg': { calories: 78, protein: 6.3, carbs: 0.6, fat: 5.3, fiber: 0, sugar: 0.6, sodium: 62, serving_size: '50', serving_unit: 'gram' },
  'broccoli': { calories: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6, sugar: 1.5, sodium: 33, serving_size: '100', serving_unit: 'gram' },
  'bread': { calories: 265, protein: 9, carbs: 49, fat: 3.2, fiber: 2.7, sugar: 5, sodium: 491, serving_size: '100', serving_unit: 'gram' },
  'milk': { calories: 42, protein: 3.4, carbs: 5, fat: 1, fiber: 0, sugar: 5, sodium: 44, serving_size: '100', serving_unit: 'ml' },
  'oats': { calories: 389, protein: 17, carbs: 66, fat: 7, fiber: 11, sugar: 1, sodium: 2, serving_size: '100', serving_unit: 'gram' },
  
  // Arabic names  
  'دجاج': { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, sodium: 74, serving_size: '100', serving_unit: 'جرام' },
  'صدر دجاج': { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, sodium: 74, serving_size: '100', serving_unit: 'جرام' },
  'تفاح': { calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4, sugar: 10, sodium: 1, serving_size: '100', serving_unit: 'جرام' },
  'موز': { calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, sugar: 12, sodium: 1, serving_size: '100', serving_unit: 'جرام' },
  'أرز': { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, sugar: 0.1, sodium: 1, serving_size: '100', serving_unit: 'جرام' },
  'سلمون': { calories: 208, protein: 20, carbs: 0, fat: 12, fiber: 0, sugar: 0, sodium: 93, serving_size: '100', serving_unit: 'جرام' },
  'بيض': { calories: 78, protein: 6.3, carbs: 0.6, fat: 5.3, fiber: 0, sugar: 0.6, sodium: 62, serving_size: '50', serving_unit: 'جرام' },
  'بيضة': { calories: 78, protein: 6.3, carbs: 0.6, fat: 5.3, fiber: 0, sugar: 0.6, sodium: 62, serving_size: '50', serving_unit: 'جرام' },
  'بروكلي': { calories: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6, sugar: 1.5, sodium: 33, serving_size: '100', serving_unit: 'جرام' },
  'خبز': { calories: 265, protein: 9, carbs: 49, fat: 3.2, fiber: 2.7, sugar: 5, sodium: 491, serving_size: '100', serving_unit: 'جرام' },
  'حليب': { calories: 42, protein: 3.4, carbs: 5, fat: 1, fiber: 0, sugar: 5, sodium: 44, serving_size: '100', serving_unit: 'مل' },
  'شوفان': { calories: 389, protein: 17, carbs: 66, fat: 7, fiber: 11, sugar: 1, sodium: 2, serving_size: '100', serving_unit: 'جرام' }
};

const simulateNutritionSearch = async (foodName: string) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Find closest match in common foods (supports Arabic and English)
  const lowerName = foodName.toLowerCase().trim();
  for (const [key, nutrition] of Object.entries(commonFoods)) {
    if (lowerName.includes(key) || key.includes(lowerName)) {
      return nutrition;
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
        title: "تم إضافة العنصر الغذائي / Food item added",
        description: `تم إضافة ${formData.name} إلى قائمة الطعام / ${formData.name} has been added to your food list.`,
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
        title: "خطأ / Error",
        description: "فشل في إضافة العنصر الغذائي. يرجى المحاولة مرة أخرى / Failed to add food item. Please try again.",
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
        title: "أدخل اسم الطعام / Enter food name",
        description: "يرجى إدخال اسم الطعام أولاً للبحث عن معلومات التغذية / Please enter a food name first to search for nutrition information.",
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
          calories_per_serving: nutritionData.calories,
          protein_per_serving: nutritionData.protein,
          carbs_per_serving: nutritionData.carbs,
          fat_per_serving: nutritionData.fat,
          fiber_per_serving: nutritionData.fiber,
          sugar_per_serving: nutritionData.sugar,
          sodium_per_serving: nutritionData.sodium,
          serving_size: nutritionData.serving_size,
          serving_unit: nutritionData.serving_unit
        }));
        
        toast({
          title: "تم العثور على معلومات التغذية / Nutrition info found",
          description: "تم ملء معلومات التغذية تلقائياً. يرجى المراجعة والتعديل حسب الحاجة / Auto-filled nutrition information. Please review and adjust as needed.",
        });
      } else {
        toast({
          title: "لم يتم العثور على بيانات التغذية / No nutrition data found",
          description: "لا يمكن العثور على معلومات التغذية لهذا الطعام. يرجى الإدخال يدوياً / Could not find nutrition information for this food. Please enter manually.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Auto-fill error:', error);
      toast({
        title: "فشل البحث / Search failed",
        description: "لا يمكن البحث عن معلومات التغذية. يرجى المحاولة مرة أخرى أو الإدخال يدوياً / Could not search for nutrition information. Please try again or enter manually.",
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
          <DialogTitle>إضافة عنصر غذائي / Add Food Item</DialogTitle>
          <DialogDescription>
            أضف عنصراً غذائياً جديداً مع معلوماته الغذائية / Add a new food item with its nutritional information.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">الاسم / Name *</Label>
            <div className="flex gap-2">
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="مثال: صدر دجاج، بيض / e.g., Chicken Breast, Egg"
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
                جاري البحث عن معلومات التغذية... / Searching for nutrition information...
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand">العلامة التجارية / Brand</Label>
            <Input
              id="brand"
              value={formData.brand}
              onChange={(e) => handleInputChange('brand', e.target.value)}
              placeholder="e.g., Organic Valley"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">الوصف / Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="وصف اختياري... / Optional description..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="serving_size">حجم الحصة / Serving Size</Label>
              <Input
                id="serving_size"
                value={formData.serving_size}
                onChange={(e) => handleInputChange('serving_size', e.target.value)}
                placeholder="e.g., 100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serving_unit">الوحدة / Unit</Label>
              <Input
                id="serving_unit"
                value={formData.serving_unit}
                onChange={(e) => handleInputChange('serving_unit', e.target.value)}
                placeholder="مثال: جرام، كوب، قطعة / e.g., gram, cup, piece"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-sm text-foreground">التغذية لكل حصة / Nutrition per serving</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="calories">السعرات / Calories</Label>
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
                <Label htmlFor="protein">البروتين / Protein (g)</Label>
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
                <Label htmlFor="carbs">الكربوهيدرات / Carbs (g)</Label>
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
                <Label htmlFor="fat">الدهون / Fat (g)</Label>
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
                <Label htmlFor="fiber">الألياف / Fiber (g)</Label>
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
                <Label htmlFor="sugar">السكر / Sugar (g)</Label>
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
              <Label htmlFor="sodium">الصوديوم / Sodium (mg)</Label>
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
              إلغاء / Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.name.trim()}>
              {isLoading ? 'جاري الإضافة... / Adding...' : 'إضافة طعام / Add Food'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}