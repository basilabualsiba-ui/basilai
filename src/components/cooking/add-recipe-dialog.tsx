import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

const TOOLS = ['oven', 'airfryer', 'stove', 'pan', 'pot', 'mixer', 'knife', 'other'];

interface AddRecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
}

export const AddRecipeDialog = ({ open, onOpenChange, onAdded }: AddRecipeDialogProps) => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('meal');
  const [totalTime, setTotalTime] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [ingredients, setIngredients] = useState<{ name: string; quantity: string }[]>([{ name: '', quantity: '' }]);
  const [steps, setSteps] = useState<{ instruction: string; tool?: string; timerMinutes?: number }[]>([{ instruction: '' }]);
  const [isSaving, setIsSaving] = useState(false);

  const toggleTool = (tool: string) => {
    setSelectedTools(prev => prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool]);
  };

  const addIngredient = () => setIngredients(prev => [...prev, { name: '', quantity: '' }]);
  const removeIngredient = (i: number) => setIngredients(prev => prev.filter((_, idx) => idx !== i));
  const updateIngredient = (i: number, field: string, value: string) => {
    setIngredients(prev => prev.map((ing, idx) => idx === i ? { ...ing, [field]: value } : ing));
  };

  const addStep = () => setSteps(prev => [...prev, { instruction: '' }]);
  const removeStep = (i: number) => setSteps(prev => prev.filter((_, idx) => idx !== i));
  const updateStep = (i: number, field: string, value: any) => {
    setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  };

  const handleSave = async () => {
    if (!name.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    setIsSaving(true);
    try {
      const { data: recipe, error: recipeError } = await supabase.from('recipes').insert([{
        name: name.trim(), category, tools: selectedTools,
        total_time: parseInt(totalTime) || 0, video_url: videoUrl || null,
      }]).select().single();
      if (recipeError) throw recipeError;

      const validIngredients = ingredients.filter(i => i.name.trim());
      if (validIngredients.length > 0) {
        const { error } = await supabase.from('recipe_ingredients').insert(
          validIngredients.map(i => ({ recipe_id: recipe.id, name: i.name.trim(), quantity: i.quantity.trim() || '1' }))
        );
        if (error) throw error;
      }

      const validSteps = steps.filter(s => s.instruction.trim());
      if (validSteps.length > 0) {
        const { error } = await supabase.from('recipe_steps').insert(
          validSteps.map((s, idx) => ({
            recipe_id: recipe.id, step_number: idx + 1, instruction: s.instruction.trim(),
            tool: s.tool || null, timer_minutes: s.timerMinutes || null,
          }))
        );
        if (error) throw error;
      }

      toast({ title: "Recipe added!" });
      onAdded();
      onOpenChange(false);
      // Reset form
      setName(''); setCategory('meal'); setTotalTime(''); setVideoUrl('');
      setSelectedTools([]); setIngredients([{ name: '', quantity: '' }]); setSteps([{ instruction: '' }]);
    } catch (err) {
      toast({ title: "Error", description: "Failed to save recipe", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Add Recipe</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Recipe name" className="rounded-xl" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meal">🍽️ Meal</SelectItem>
                    <SelectItem value="drink">🥤 Drink</SelectItem>
                    <SelectItem value="dessert">🍰 Dessert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Total Time (min)</Label>
                <Input type="number" value={totalTime} onChange={(e) => setTotalTime(e.target.value)} className="rounded-xl" />
              </div>
            </div>

            <div>
              <Label>Video URL (optional)</Label>
              <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="YouTube link" className="rounded-xl" />
            </div>

            <div>
              <Label>Tools</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {TOOLS.map(tool => (
                  <Button key={tool} variant={selectedTools.includes(tool) ? "default" : "outline"} size="sm"
                    onClick={() => toggleTool(tool)} className="rounded-xl text-xs capitalize">
                    {tool}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Ingredients</Label>
                <Button variant="ghost" size="sm" onClick={addIngredient}><Plus className="h-3 w-3 mr-1" /> Add</Button>
              </div>
              {ingredients.map((ing, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <Input placeholder="Ingredient" value={ing.name} onChange={(e) => updateIngredient(i, 'name', e.target.value)} className="rounded-xl flex-1" />
                  <Input placeholder="Qty" value={ing.quantity} onChange={(e) => updateIngredient(i, 'quantity', e.target.value)} className="rounded-xl w-24" />
                  {ingredients.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeIngredient(i)}><Trash2 className="h-3 w-3" /></Button>
                  )}
                </div>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Steps</Label>
                <Button variant="ghost" size="sm" onClick={addStep}><Plus className="h-3 w-3 mr-1" /> Add</Button>
              </div>
              {steps.map((step, i) => (
                <div key={i} className="space-y-2 mb-3 p-3 rounded-xl bg-muted/30 border border-border/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Step {i + 1}</span>
                    {steps.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeStep(i)}><Trash2 className="h-3 w-3" /></Button>
                    )}
                  </div>
                  <Textarea placeholder="Instruction..." value={step.instruction}
                    onChange={(e) => updateStep(i, 'instruction', e.target.value)} className="rounded-xl min-h-[60px]" />
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={step.tool || ''} onValueChange={(v) => updateStep(i, 'tool', v || undefined)}>
                      <SelectTrigger className="rounded-xl text-xs"><SelectValue placeholder="Tool (optional)" /></SelectTrigger>
                      <SelectContent>
                        {TOOLS.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="number" placeholder="Timer (min)" value={step.timerMinutes || ''}
                      onChange={(e) => updateStep(i, 'timerMinutes', parseInt(e.target.value) || undefined)} className="rounded-xl text-xs" />
                  </div>
                </div>
              ))}
            </div>

            <Button onClick={handleSave} disabled={isSaving} className="w-full rounded-xl">
              {isSaving ? 'Saving...' : 'Save Recipe'}
            </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
