import { useState } from 'react';
import { useFood } from '@/contexts/FoodContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, Utensils } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AddMealDialog } from './add-meal-dialog';
import { EditMealDialog } from './edit-meal-dialog';
import { MealFoodsDialog } from './meal-foods-dialog';
import { Meal } from '@/contexts/FoodContext';

export function MealsList() {
  const { meals, deleteMeal } = useFood();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [showMealFoods, setShowMealFoods] = useState(false);

  const filteredMeals = meals.filter(meal =>
    meal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (meal.description && meal.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this meal?')) {
      try {
        await deleteMeal(id);
      } catch (error) {
        console.error('Error deleting meal:', error);
      }
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

  const handleMealClick = (meal: Meal) => {
    setSelectedMeal(meal);
    setShowMealFoods(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Meals</h2>
        <Button onClick={() => setIsAddDialogOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Meal
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search meals..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredMeals.map((meal) => (
          <Card 
            key={meal.id} 
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleMealClick(meal)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Utensils className="h-5 w-5 text-primary" />
                    {meal.name}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className={getMealTypeColor(meal.meal_type)}>
                      {meal.meal_type}
                    </Badge>
                    {meal.default_time && (
                      <Badge variant="outline" className="text-xs">
                        {meal.default_time}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingMeal(meal);
                    }}
                    className="h-8 w-8"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(meal.id);
                    }}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {meal.description && (
                <p className="text-sm text-muted-foreground">{meal.description}</p>
              )}

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-muted/50 p-2 rounded">
                  <div className="font-medium text-primary">{meal.total_calories}</div>
                  <div className="text-xs text-muted-foreground">Calories</div>
                </div>
                <div className="bg-muted/50 p-2 rounded">
                  <div className="font-medium text-primary">{meal.total_protein}g</div>
                  <div className="text-xs text-muted-foreground">Protein</div>
                </div>
                <div className="bg-muted/50 p-2 rounded">
                  <div className="font-medium text-primary">{meal.total_carbs}g</div>
                  <div className="text-xs text-muted-foreground">Carbs</div>
                </div>
                <div className="bg-muted/50 p-2 rounded">
                  <div className="font-medium text-primary">{meal.total_fat}g</div>
                  <div className="text-xs text-muted-foreground">Fat</div>
                </div>
              </div>

              <div className="pt-3 border-t border-border/50">
                <p className="text-xs text-muted-foreground text-center">
                  Click to view foods in this meal
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMeals.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {searchTerm ? 'No meals found matching your search.' : 'No meals yet. Create your first meal!'}
          </p>
        </div>
      )}

      <AddMealDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
      {editingMeal && (
        <EditMealDialog
          meal={editingMeal}
          open={!!editingMeal}
          onOpenChange={() => setEditingMeal(null)}
        />
      )}
      <MealFoodsDialog 
        meal={selectedMeal}
        open={showMealFoods}
        onOpenChange={setShowMealFoods}
      />
    </div>
  );
}