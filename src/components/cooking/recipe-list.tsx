import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, ChefHat, AlertTriangle, Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { Recipe } from '@/pages/Cooking';

interface RecipeListProps {
  recipes: Recipe[];
  userIngredients: string[];
  onCook: (recipe: Recipe) => void;
  isLoading: boolean;
}

const getIngredientMatch = (recipe: Recipe, userIngredients: string[]) => {
  if (recipe.ingredients.length === 0) return { canCook: true, missing: [] };
  const missing = recipe.ingredients.filter(
    ing => !userIngredients.some(ui => ing.name.toLowerCase().includes(ui) || ui.includes(ing.name.toLowerCase()))
  );
  return { canCook: missing.length === 0, missing };
};

const categoryEmoji: Record<string, string> = { meal: '🍽️', drink: '🥤', dessert: '🍰' };

export const RecipeList = ({ recipes, userIngredients, onCook, isLoading }: RecipeListProps) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <Card className="border-border/30">
        <CardContent className="p-8 text-center">
          <ChefHat className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">No recipes yet. Add your first recipe!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {recipes.map(recipe => {
        const match = getIngredientMatch(recipe, userIngredients);
        return (
          <Card key={recipe.id} className="border-border/30 overflow-hidden hover:border-primary/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span>{categoryEmoji[recipe.category] || '🍽️'}</span>
                    <h3 className="font-semibold text-foreground truncate">{recipe.name}</h3>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-[10px]">
                      <Clock className="h-3 w-3 mr-1" />
                      {recipe.total_time} min
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {recipe.ingredients.length} ingredients
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {recipe.steps.length} steps
                    </Badge>
                  </div>
                  {match.canCook ? (
                    <div className="flex items-center gap-1 text-xs text-green-500">
                      <Check className="h-3 w-3" /> Ready to cook!
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-amber-500">
                      <AlertTriangle className="h-3 w-3" /> Missing: {match.missing.map(m => m.name).join(', ')}
                    </div>
                  )}
                </div>
                <Button size="sm" onClick={() => onCook(recipe)} className="rounded-xl shrink-0">
                  Cook
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
