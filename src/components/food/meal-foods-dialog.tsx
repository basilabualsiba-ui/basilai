import { useState, useEffect } from 'react';
import { useFood } from '@/contexts/FoodContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Meal, MealFood } from '@/contexts/FoodContext';
import { Utensils } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface MealFoodsDialogProps {
  meal: Meal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MealFoodsDialog({ meal, open, onOpenChange }: MealFoodsDialogProps) {
  const { getMealFoods } = useFood();
  const [mealFoods, setMealFoods] = useState<MealFood[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (meal && open) {
      loadMealFoods();
    }
  }, [meal, open]);

  const loadMealFoods = async () => {
    if (!meal) return;
    
    console.log('Loading foods for meal:', meal.id, meal.name);
    setLoading(true);
    try {
      const foods = await getMealFoods(meal.id);
      console.log('Loaded meal foods:', foods);
      setMealFoods(foods);
    } catch (error) {
      console.error('Error loading meal foods:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMealTypeColor = (type: string) => {
    switch (type) {
      case 'breakfast': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'lunch': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'dinner': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
      case 'snack': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  if (!meal) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <Utensils className="h-5 w-5 text-primary" />
            {meal.name}
            <Badge variant="secondary" className={`ml-2 ${getMealTypeColor(meal.meal_type)}`}>
              {meal.meal_type}
            </Badge>
            {meal.default_time && (
              <Badge variant="outline" className="text-xs">
                {meal.default_time}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {meal.description || `View nutritional information and foods in this ${meal.meal_type} meal`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Meal Totals */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Nutritional Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-muted/50 p-3 rounded">
                  <div className="font-bold text-lg text-primary">{meal.total_calories}</div>
                  <div className="text-xs text-muted-foreground">Calories</div>
                </div>
                <div className="bg-muted/50 p-3 rounded">
                  <div className="font-bold text-lg text-primary">{meal.total_protein}g</div>
                  <div className="text-xs text-muted-foreground">Protein</div>
                </div>
                <div className="bg-muted/50 p-3 rounded">
                  <div className="font-bold text-lg text-primary">{meal.total_carbs}g</div>
                  <div className="text-xs text-muted-foreground">Carbs</div>
                </div>
                <div className="bg-muted/50 p-3 rounded">
                  <div className="font-bold text-lg text-primary">{meal.total_fat}g</div>
                  <div className="text-xs text-muted-foreground">Fat</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Foods in Meal */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Foods in this meal</h3>
              <span className="text-sm text-muted-foreground">
                {mealFoods.length} {mealFoods.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading foods...</p>
              </div>
            ) : mealFoods.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No foods added to this meal yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {mealFoods.map((mealFood) => (
                  <Card key={mealFood.id} className="border border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground">
                            {mealFood.food_item?.name || 'Unknown Food'}
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {mealFood.quantity} {mealFood.unit}
                            {mealFood.food_item?.brand && (
                              <span className="ml-2">• {mealFood.food_item.brand}</span>
                            )}
                          </p>
                          
                          {mealFood.food_item && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs">
                              <div>
                                <span className="font-medium">
                                  {Math.round((mealFood.food_item.calories_per_serving * mealFood.quantity) / parseFloat(mealFood.food_item.serving_size || '1'))}
                                </span>
                                <span className="text-muted-foreground ml-1">cal</span>
                              </div>
                              <div>
                                <span className="font-medium">
                                  {Math.round((mealFood.food_item.protein_per_serving * mealFood.quantity) / parseFloat(mealFood.food_item.serving_size || '1'))}g
                                </span>
                                <span className="text-muted-foreground ml-1">protein</span>
                              </div>
                              <div>
                                <span className="font-medium">
                                  {Math.round((mealFood.food_item.carbs_per_serving * mealFood.quantity) / parseFloat(mealFood.food_item.serving_size || '1'))}g
                                </span>
                                <span className="text-muted-foreground ml-1">carbs</span>
                              </div>
                              <div>
                                <span className="font-medium">
                                  {Math.round((mealFood.food_item.fat_per_serving * mealFood.quantity) / parseFloat(mealFood.food_item.serving_size || '1'))}g
                                </span>
                                <span className="text-muted-foreground ml-1">fat</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}