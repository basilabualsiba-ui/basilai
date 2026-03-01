import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, Apple } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface MyIngredientsProps {
  ingredients: string[];
  onUpdate: () => void;
}

export const MyIngredients = ({ ingredients, onUpdate }: MyIngredientsProps) => {
  const [newIngredient, setNewIngredient] = useState('');
  const { toast } = useToast();

  const addIngredient = async () => {
    if (!newIngredient.trim()) return;
    try {
      const { error } = await supabase.from('user_ingredients').insert([{ name: newIngredient.trim() }]);
      if (error) throw error;
      setNewIngredient('');
      onUpdate();
      toast({ title: "Added", description: `${newIngredient.trim()} added to your ingredients` });
    } catch (err) {
      toast({ title: "Error", description: "Failed to add ingredient", variant: "destructive" });
    }
  };

  const removeIngredient = async (name: string) => {
    try {
      const { error } = await supabase.from('user_ingredients').delete().ilike('name', name);
      if (error) throw error;
      onUpdate();
    } catch (err) {
      toast({ title: "Error", description: "Failed to remove ingredient", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/30">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Apple className="h-4 w-4 text-primary" />
            Available Ingredients ({ingredients.length})
          </h3>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Add ingredient..."
              value={newIngredient}
              onChange={(e) => setNewIngredient(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addIngredient()}
              className="rounded-xl"
            />
            <Button onClick={addIngredient} size="sm" className="rounded-xl">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {ingredients.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Add ingredients you have at home to see which recipes you can make!
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {ingredients.map((ing) => (
                <Badge key={ing} variant="secondary" className="pl-3 pr-1 py-1 flex items-center gap-1">
                  {ing}
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0 hover:bg-destructive/20"
                    onClick={() => removeIngredient(ing)}>
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
