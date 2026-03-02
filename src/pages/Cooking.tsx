import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, ChefHat, Plus, Search, UtensilsCrossed, Import } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSound } from '@/hooks/useSound';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RecipeList } from '@/components/cooking/recipe-list';
import { MyIngredients } from '@/components/cooking/my-ingredients';
import { AddRecipeDialog } from '@/components/cooking/add-recipe-dialog';
import { CookingMode } from '@/components/cooking/cooking-mode';
import { ImportRecipeDialog } from '@/components/cooking/import-recipe-dialog';

export interface Recipe {
  id: string;
  name: string;
  image?: string;
  category: string;
  tools: string[];
  total_time: number;
  video_url?: string;
  created_at: string;
  ingredients: { id: string; name: string; quantity: string }[];
  steps: { id: string; step_number: number; instruction: string; tool?: string; timer_minutes?: number }[];
}

const Cooking = () => {
  const navigate = useNavigate();
  const { click } = useSound();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [userIngredients, setUserIngredients] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [cookingRecipe, setCookingRecipe] = useState<Recipe | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [recipesRes, ingredientsRes, userIngRes] = await Promise.all([
        supabase.from('recipes').select('*').order('created_at', { ascending: false }),
        supabase.from('recipe_ingredients').select('*'),
        supabase.from('user_ingredients').select('*'),
      ]);
      
      const stepsRes = await supabase.from('recipe_steps').select('*').order('step_number');

      const recipesData = (recipesRes.data || []).map((r: any) => ({
        ...r,
        tools: r.tools || [],
        ingredients: (ingredientsRes.data || []).filter((i: any) => i.recipe_id === r.id),
        steps: (stepsRes.data || []).filter((s: any) => s.recipe_id === r.id),
      }));

      setRecipes(recipesData);
      setUserIngredients((userIngRes.data || []).map((i: any) => i.name.toLowerCase()));
    } catch (error) {
      console.error('Error loading cooking data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (cookingRecipe) {
    return <CookingMode recipe={cookingRecipe} onExit={() => setCookingRecipe(null)} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/20 bg-background/95 backdrop-blur-2xl">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => { click(); navigate("/"); }} className="rounded-xl h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 shadow-lg">
                <ChefHat className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Smart Cooking</h1>
                <p className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase">Recipes & meals</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setIsImportOpen(true)} className="rounded-xl">
              <Import className="h-4 w-4 mr-1" /> Import
            </Button>
            <Button size="sm" onClick={() => setIsAddOpen(true)} className="rounded-xl">
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        </div>
      </header>

      <main className="pt-20 pb-6 px-4">
        <Tabs defaultValue="recipes" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="recipes">
              <UtensilsCrossed className="h-4 w-4 mr-2" /> Recipes
            </TabsTrigger>
            <TabsTrigger value="ingredients">
              <Search className="h-4 w-4 mr-2" /> My Ingredients
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recipes" className="space-y-4">
            <Input
              placeholder="Search recipes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-xl"
            />
            <RecipeList 
              recipes={recipes.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()))}
              userIngredients={userIngredients}
              onCook={(recipe) => setCookingRecipe(recipe)}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="ingredients">
            <MyIngredients 
              ingredients={userIngredients} 
              onUpdate={loadData}
            />
          </TabsContent>
        </Tabs>
      </main>

      <AddRecipeDialog open={isAddOpen} onOpenChange={setIsAddOpen} onAdded={loadData} />
      <ImportRecipeDialog open={isImportOpen} onOpenChange={setIsImportOpen} onImported={loadData} />
    </div>
  );
};

export default Cooking;
