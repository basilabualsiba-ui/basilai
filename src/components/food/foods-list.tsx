import { useState } from 'react';
import { useFood } from '@/contexts/FoodContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AddFoodDialog } from './add-food-dialog';
import { EditFoodDialog } from './edit-food-dialog';
import { FoodItem } from '@/contexts/FoodContext';

export function FoodsList() {
  const { foodItems, deleteFoodItem } = useFood();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingFood, setEditingFood] = useState<FoodItem | null>(null);

  const filteredFoods = foodItems.filter(food =>
    food.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (food.brand && food.brand.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this food item?')) {
      try {
        await deleteFoodItem(id);
      } catch (error) {
        console.error('Error deleting food item:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Food Items</h2>
        <Button onClick={() => setIsAddDialogOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Food
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search food items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredFoods.map((food) => (
          <Card key={food.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{food.name}</CardTitle>
                  {food.brand && (
                    <Badge variant="secondary" className="mt-1">
                      {food.brand}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingFood(food)}
                    className="h-8 w-8"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(food.id)}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {food.description && (
                <p className="text-sm text-muted-foreground">{food.description}</p>
              )}
              
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Serving:</span>
                  <span>{food.serving_size} {food.serving_unit}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-muted/50 p-2 rounded">
                  <div className="font-medium text-primary">{food.calories_per_serving}</div>
                  <div className="text-xs text-muted-foreground">Calories</div>
                </div>
                <div className="bg-muted/50 p-2 rounded">
                  <div className="font-medium text-primary">{food.protein_per_serving}g</div>
                  <div className="text-xs text-muted-foreground">Protein</div>
                </div>
                <div className="bg-muted/50 p-2 rounded">
                  <div className="font-medium text-primary">{food.carbs_per_serving}g</div>
                  <div className="text-xs text-muted-foreground">Carbs</div>
                </div>
                <div className="bg-muted/50 p-2 rounded">
                  <div className="font-medium text-primary">{food.fat_per_serving}g</div>
                  <div className="text-xs text-muted-foreground">Fat</div>
                </div>
              </div>

              {(food.fiber_per_serving > 0 || food.sugar_per_serving > 0 || food.sodium_per_serving > 0) && (
                <div className="pt-2 border-t border-border/50">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {food.fiber_per_serving > 0 && (
                      <div className="text-center">
                        <div className="font-medium">{food.fiber_per_serving}g</div>
                        <div className="text-muted-foreground">Fiber</div>
                      </div>
                    )}
                    {food.sugar_per_serving > 0 && (
                      <div className="text-center">
                        <div className="font-medium">{food.sugar_per_serving}g</div>
                        <div className="text-muted-foreground">Sugar</div>
                      </div>
                    )}
                    {food.sodium_per_serving > 0 && (
                      <div className="text-center">
                        <div className="font-medium">{food.sodium_per_serving}mg</div>
                        <div className="text-muted-foreground">Sodium</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredFoods.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {searchTerm ? 'No food items found matching your search.' : 'No food items yet. Add your first food item!'}
          </p>
        </div>
      )}

      <AddFoodDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
      {editingFood && (
        <EditFoodDialog
          food={editingFood}
          open={!!editingFood}
          onOpenChange={() => setEditingFood(null)}
        />
      )}
    </div>
  );
}