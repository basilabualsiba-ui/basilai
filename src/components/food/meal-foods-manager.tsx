import { useState, useEffect } from 'react';
import { useFood, MealFood, FoodItem } from '@/contexts/FoodContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Utensils } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface MealFoodsManagerProps {
  mealId: string;
  mealName: string;
}

export function MealFoodsManager({ mealId, mealName }: MealFoodsManagerProps) {
  const { foodItems, getMealFoods, addFoodToMeal, removeFoodFromMeal } = useFood();
  const [mealFoods, setMealFoods] = useState<MealFood[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedFoodId, setSelectedFoodId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [unit, setUnit] = useState<string>('serving');
  const [isLoading, setIsLoading] = useState(false);

  // Get selected food item details
  const selectedFood = foodItems.find(food => food.id === selectedFoodId);
  
  // Reset unit when food selection changes
  useEffect(() => {
    if (selectedFood) {
      setUnit('serving');
    }
  }, [selectedFoodId, selectedFood]);

  useEffect(() => {
    loadMealFoods();
  }, [mealId]);

  const loadMealFoods = async () => {
    try {
      const foods = await getMealFoods(mealId);
      setMealFoods(foods);
    } catch (error) {
      console.error('Error loading meal foods:', error);
    }
  };

  const handleAddFood = async () => {
    if (!selectedFoodId || !quantity || !selectedFood) return;

    setIsLoading(true);
    try {
      // Calculate the actual quantity for the database
      let finalQuantity = parseFloat(quantity);
      let finalUnit = unit;
      
      // If user selected the food's native unit instead of serving, convert to serving ratio
      if (unit !== 'serving' && selectedFood.serving_size && selectedFood.serving_unit === unit) {
        // Store the actual quantity and unit as entered by user
        finalQuantity = parseFloat(quantity);
        finalUnit = unit;
      }
      
      await addFoodToMeal(mealId, selectedFoodId, finalQuantity, finalUnit);
      await loadMealFoods();
      setSelectedFoodId('');
      setQuantity('1');
      setUnit('serving');
      setIsAddDialogOpen(false);
      toast({
        title: "Food added",
        description: "Food item has been added to the meal.",
      });
    } catch (error) {
      console.error('Error adding food to meal:', error);
      toast({
        title: "Error",
        description: "Failed to add food to meal.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate nutrition preview based on selected quantity and unit
  const calculateNutritionPreview = () => {
    if (!selectedFood || !quantity) return null;
    
    let multiplier = parseFloat(quantity);
    
    // If user selected the food's native unit, calculate multiplier relative to serving size
    if (unit !== 'serving' && selectedFood.serving_size && selectedFood.serving_unit === unit) {
      multiplier = parseFloat(quantity) / parseFloat(selectedFood.serving_size);
    }
    
    return {
      calories: selectedFood.calories_per_serving * multiplier,
      protein: selectedFood.protein_per_serving * multiplier,
      carbs: selectedFood.carbs_per_serving * multiplier,
      fat: selectedFood.fat_per_serving * multiplier,
    };
  };

  const handleRemoveFood = async (mealFoodId: string) => {
    if (!confirm('Remove this food from the meal?')) return;

    try {
      await removeFoodFromMeal(mealFoodId);
      await loadMealFoods();
      toast({
        title: "Food removed",
        description: "Food item has been removed from the meal.",
      });
    } catch (error) {
      console.error('Error removing food from meal:', error);
      toast({
        title: "Error",
        description: "Failed to remove food from meal.",
        variant: "destructive",
      });
    }
  };

  const getTotalNutrition = () => {
    return mealFoods.reduce((total, mealFood) => {
      if (!mealFood.food_item) return total;
      
      let multiplier = mealFood.quantity;
      
      // If the unit is not 'serving', calculate the multiplier based on serving size
      if (mealFood.unit !== 'serving' && mealFood.food_item.serving_size && mealFood.food_item.serving_unit === mealFood.unit) {
        multiplier = mealFood.quantity / parseFloat(mealFood.food_item.serving_size);
      }
      
      return {
        calories: total.calories + (mealFood.food_item.calories_per_serving * multiplier),
        protein: total.protein + (mealFood.food_item.protein_per_serving * multiplier),
        carbs: total.carbs + (mealFood.food_item.carbs_per_serving * multiplier),
        fat: total.fat + (mealFood.food_item.fat_per_serving * multiplier),
      };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  };

  const nutrition = getTotalNutrition();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Utensils className="h-5 w-5 text-primary" />
          {mealName} - Foods
        </h3>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Food
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Food to Meal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="food">Food Item</Label>
                <Select value={selectedFoodId} onValueChange={setSelectedFoodId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a food item" />
                  </SelectTrigger>
                  <SelectContent>
                    {foodItems.map((food) => (
                      <SelectItem key={food.id} value={food.id}>
                        {food.name} {food.brand && `(${food.brand})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="unit">Unit</Label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="serving">
                        Serving
                        {selectedFood?.serving_size && selectedFood?.serving_unit && (
                          <span className="text-muted-foreground ml-1">
                            ({selectedFood.serving_size} {selectedFood.serving_unit})
                          </span>
                        )}
                      </SelectItem>
                      {selectedFood?.serving_unit && (
                        <SelectItem value={selectedFood.serving_unit}>
                          {selectedFood.serving_unit.charAt(0).toUpperCase() + selectedFood.serving_unit.slice(1)}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Nutrition Preview */}
              {calculateNutritionPreview() && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Nutrition Preview:</h4>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="text-center">
                      <div className="font-medium">{Math.round(calculateNutritionPreview()!.calories)}</div>
                      <div className="text-muted-foreground">cal</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">{Math.round(calculateNutritionPreview()!.protein)}g</div>
                      <div className="text-muted-foreground">protein</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">{Math.round(calculateNutritionPreview()!.carbs)}g</div>
                      <div className="text-muted-foreground">carbs</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">{Math.round(calculateNutritionPreview()!.fat)}g</div>
                      <div className="text-muted-foreground">fat</div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button onClick={handleAddFood} disabled={isLoading || !selectedFoodId}>
                  {isLoading ? 'Adding...' : 'Add Food'}
                </Button>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Nutrition Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Nutrition Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{Math.round(nutrition.calories)}</div>
              <div className="text-sm text-muted-foreground">Calories</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{Math.round(nutrition.protein)}g</div>
              <div className="text-sm text-muted-foreground">Protein</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{Math.round(nutrition.carbs)}g</div>
              <div className="text-sm text-muted-foreground">Carbs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{Math.round(nutrition.fat)}g</div>
              <div className="text-sm text-muted-foreground">Fat</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Foods List */}
      <div className="space-y-3">
        {mealFoods.map((mealFood) => (
          <Card key={mealFood.id}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-medium">{mealFood.food_item?.name}</h4>
                  {mealFood.food_item?.brand && (
                    <Badge variant="secondary" className="mt-1">
                      {mealFood.food_item.brand}
                    </Badge>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    {mealFood.quantity} {mealFood.unit}
                  </p>
                   {mealFood.food_item && (
                     <div className="grid grid-cols-4 gap-4 mt-2 text-sm">
                       <div>
                         <span className="font-medium">
                           {Math.round((() => {
                             let multiplier = mealFood.quantity;
                             if (mealFood.unit !== 'serving' && mealFood.food_item.serving_size && mealFood.food_item.serving_unit === mealFood.unit) {
                               multiplier = mealFood.quantity / parseFloat(mealFood.food_item.serving_size);
                             }
                             return mealFood.food_item.calories_per_serving * multiplier;
                           })())}
                         </span>
                         <span className="text-muted-foreground"> cal</span>
                       </div>
                       <div>
                         <span className="font-medium">
                           {Math.round((() => {
                             let multiplier = mealFood.quantity;
                             if (mealFood.unit !== 'serving' && mealFood.food_item.serving_size && mealFood.food_item.serving_unit === mealFood.unit) {
                               multiplier = mealFood.quantity / parseFloat(mealFood.food_item.serving_size);
                             }
                             return mealFood.food_item.protein_per_serving * multiplier;
                           })())}g
                         </span>
                         <span className="text-muted-foreground"> protein</span>
                       </div>
                       <div>
                         <span className="font-medium">
                           {Math.round((() => {
                             let multiplier = mealFood.quantity;
                             if (mealFood.unit !== 'serving' && mealFood.food_item.serving_size && mealFood.food_item.serving_unit === mealFood.unit) {
                               multiplier = mealFood.quantity / parseFloat(mealFood.food_item.serving_size);
                             }
                             return mealFood.food_item.carbs_per_serving * multiplier;
                           })())}g
                         </span>
                         <span className="text-muted-foreground"> carbs</span>
                       </div>
                       <div>
                         <span className="font-medium">
                           {Math.round((() => {
                             let multiplier = mealFood.quantity;
                             if (mealFood.unit !== 'serving' && mealFood.food_item.serving_size && mealFood.food_item.serving_unit === mealFood.unit) {
                               multiplier = mealFood.quantity / parseFloat(mealFood.food_item.serving_size);
                             }
                             return mealFood.food_item.fat_per_serving * multiplier;
                           })())}g
                         </span>
                         <span className="text-muted-foreground"> fat</span>
                       </div>
                     </div>
                   )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveFood(mealFood.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {mealFoods.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No foods added to this meal yet.</p>
        </div>
      )}
    </div>
  );
}