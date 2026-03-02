import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link, FileText, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ParsedRecipe {
  name: string;
  ingredients: { name: string; quantity: string }[];
  steps: { step_number: number; instruction: string; tool?: string; timer_minutes?: number }[];
  total_time?: number;
  category: string;
  tools: string[];
}

interface ImportRecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

const TOOL_KEYWORDS = ['oven', 'airfryer', 'air fryer', 'stove', 'microwave', 'blender', 'mixer', 'grill', 'toaster', 'pan', 'pot', 'wok'];

function parseIngredientsFromText(text: string): { name: string; quantity: string }[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const ingredients: { name: string; quantity: string }[] = [];
  
  const quantityPattern = /^[\d¼½¾⅓⅔⅛]/;
  const unitPattern = /\b(cup|cups|tbsp|tsp|tablespoon|teaspoon|oz|ounce|lb|pound|g|gram|kg|ml|liter|litre|pinch|dash|handful|clove|cloves|piece|pieces|slice|slices|can|cans|bunch|package|pkg)\b/i;

  for (const line of lines) {
    const cleaned = line.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, '');
    if (quantityPattern.test(cleaned) || unitPattern.test(cleaned)) {
      // Try to split quantity from name
      const match = cleaned.match(/^([\d¼½¾⅓⅔⅛/.\s]+(?:\s*(?:cup|cups|tbsp|tsp|tablespoon|teaspoon|oz|ounce|lb|pound|g|gram|kg|ml|liter|litre|pinch|dash|handful|clove|cloves|piece|pieces|slice|slices|can|cans|bunch|package|pkg)s?)?)\s+(.+)/i);
      if (match) {
        ingredients.push({ quantity: match[1].trim(), name: match[2].trim() });
      } else {
        ingredients.push({ quantity: '1', name: cleaned });
      }
    }
  }
  return ingredients;
}

function parseStepsFromText(text: string): { step_number: number; instruction: string; tool?: string; timer_minutes?: number }[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const steps: { step_number: number; instruction: string; tool?: string; timer_minutes?: number }[] = [];
  let stepNum = 1;

  for (const line of lines) {
    const cleaned = line.replace(/^(step\s*\d+[.:]\s*)/i, '').replace(/^\d+[.)]\s*/, '');
    if (cleaned.length > 20) {
      // Detect tools
      const tool = TOOL_KEYWORDS.find(t => cleaned.toLowerCase().includes(t));
      // Detect timer
      const timerMatch = cleaned.match(/(\d+)\s*(?:minute|min)/i);
      steps.push({
        step_number: stepNum++,
        instruction: cleaned,
        tool: tool || undefined,
        timer_minutes: timerMatch ? parseInt(timerMatch[1]) : undefined,
      });
    }
  }
  return steps;
}

function parseRecipeFromText(text: string): ParsedRecipe {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const name = lines[0] || 'Imported Recipe';
  
  // Try to find sections
  let ingredientSection = '';
  let stepsSection = '';
  const lowerText = text.toLowerCase();
  
  const ingredientStart = lowerText.search(/ingredients?[:\s]/i);
  const stepsStart = lowerText.search(/(instructions?|directions?|steps?|method)[:\s]/i);
  
  if (ingredientStart >= 0 && stepsStart >= 0) {
    ingredientSection = text.slice(ingredientStart, stepsStart);
    stepsSection = text.slice(stepsStart);
  } else {
    // Fallback: first half = ingredients, second half = steps
    const mid = Math.floor(lines.length / 2);
    ingredientSection = lines.slice(1, mid).join('\n');
    stepsSection = lines.slice(mid).join('\n');
  }
  
  const ingredients = parseIngredientsFromText(ingredientSection);
  const steps = parseStepsFromText(stepsSection);
  const tools = [...new Set(steps.filter(s => s.tool).map(s => s.tool!))];
  
  // Detect total time
  const timeMatch = text.match(/(?:total\s*time|prep.*cook.*time)[:\s]*(\d+)\s*(?:min|minute)/i);
  
  return {
    name,
    ingredients: ingredients.length > 0 ? ingredients : [{ name: 'Add ingredients', quantity: '1' }],
    steps: steps.length > 0 ? steps : [{ step_number: 1, instruction: 'Follow the recipe' }],
    total_time: timeMatch ? parseInt(timeMatch[1]) : undefined,
    category: 'meal',
    tools,
  };
}

export const ImportRecipeDialog = ({ open, onOpenChange, onImported }: ImportRecipeDialogProps) => {
  const [mode, setMode] = useState<'url' | 'text'>('text');
  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedRecipe | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleParseText = () => {
    if (!textInput.trim()) return;
    setError(null);
    const result = parseRecipeFromText(textInput);
    setParsed(result);
  };

  const handleParseUrl = async () => {
    if (!urlInput.trim()) return;
    setIsParsing(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('fetch-recipe-url', {
        body: { url: urlInput },
      });
      if (fnError) throw fnError;
      if (data?.html) {
        // Try to find JSON-LD Recipe
        const jsonLdMatch = data.html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
        if (jsonLdMatch) {
          for (const match of jsonLdMatch) {
            try {
              const jsonStr = match.replace(/<\/?script[^>]*>/gi, '');
              const json = JSON.parse(jsonStr);
              const recipe = Array.isArray(json) ? json.find((j: any) => j['@type'] === 'Recipe') : (json['@type'] === 'Recipe' ? json : json['@graph']?.find((j: any) => j['@type'] === 'Recipe'));
              if (recipe) {
                const ingredients = (recipe.recipeIngredient || []).map((ing: string) => {
                  const m = ing.match(/^([\d¼½¾⅓⅔⅛/.\s]+(?:\s*\w+)?)\s+(.+)/);
                  return m ? { quantity: m[1].trim(), name: m[2].trim() } : { quantity: '1', name: ing };
                });
                const steps = (recipe.recipeInstructions || []).map((s: any, i: number) => ({
                  step_number: i + 1,
                  instruction: typeof s === 'string' ? s : s.text || s.name || '',
                  tool: TOOL_KEYWORDS.find(t => (typeof s === 'string' ? s : s.text || '').toLowerCase().includes(t)),
                }));
                setParsed({
                  name: recipe.name || 'Imported Recipe',
                  ingredients,
                  steps,
                  total_time: recipe.totalTime ? parseInt(recipe.totalTime.replace(/\D/g, '')) : undefined,
                  category: 'meal',
                  tools: [...new Set(steps.filter((s: any) => s.tool).map((s: any) => s.tool!))] as string[],
                });
                setIsParsing(false);
                return;
              }
            } catch {}
          }
        }
        // Fallback: parse as text
        const textContent = data.html.replace(/<[^>]+>/g, '\n').replace(/\n{3,}/g, '\n\n');
        setParsed(parseRecipeFromText(textContent));
      } else {
        setError('Could not fetch the URL. Try pasting the recipe text instead.');
      }
    } catch (err) {
      setError('Failed to fetch URL. Try pasting the recipe text instead.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleSave = async () => {
    if (!parsed) return;
    setIsParsing(true);
    try {
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({ name: parsed.name, category: parsed.category, tools: parsed.tools, total_time: parsed.total_time || 0 })
        .select()
        .single();
      if (recipeError) throw recipeError;

      if (parsed.ingredients.length > 0) {
        await supabase.from('recipe_ingredients').insert(
          parsed.ingredients.map(i => ({ recipe_id: recipe.id, name: i.name, quantity: i.quantity }))
        );
      }
      if (parsed.steps.length > 0) {
        await supabase.from('recipe_steps').insert(
          parsed.steps.map(s => ({ recipe_id: recipe.id, step_number: s.step_number, instruction: s.instruction, tool: s.tool, timer_minutes: s.timer_minutes }))
        );
      }

      toast.success('Recipe imported successfully!');
      onImported();
      onOpenChange(false);
      setParsed(null);
      setTextInput('');
      setUrlInput('');
    } catch (err) {
      toast.error('Failed to save recipe');
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Recipe</DialogTitle>
          <DialogDescription>Paste a URL or recipe text to auto-parse</DialogDescription>
        </DialogHeader>

        {!parsed ? (
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'url' | 'text')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="url"><Link className="h-4 w-4 mr-2" /> URL</TabsTrigger>
              <TabsTrigger value="text"><FileText className="h-4 w-4 mr-2" /> Text</TabsTrigger>
            </TabsList>
            <TabsContent value="url" className="space-y-3">
              <Input placeholder="https://example.com/recipe..." value={urlInput} onChange={e => setUrlInput(e.target.value)} />
              <Button onClick={handleParseUrl} disabled={!urlInput.trim() || isParsing} className="w-full">
                {isParsing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Parsing...</> : 'Parse URL'}
              </Button>
            </TabsContent>
            <TabsContent value="text" className="space-y-3">
              <Textarea placeholder="Paste recipe text here... Include ingredients and steps." value={textInput} onChange={e => setTextInput(e.target.value)} rows={10} />
              <Button onClick={handleParseText} disabled={!textInput.trim()} className="w-full">Parse Text</Button>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground">Name</label>
              <Input value={parsed.name} onChange={e => setParsed({ ...parsed, name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Ingredients ({parsed.ingredients.length})</label>
              <div className="space-y-1 max-h-40 overflow-y-auto mt-1">
                {parsed.ingredients.map((ing, i) => (
                  <div key={i} className="flex gap-2 text-sm">
                    <span className="text-muted-foreground w-16 shrink-0">{ing.quantity}</span>
                    <span className="text-foreground">{ing.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Steps ({parsed.steps.length})</label>
              <div className="space-y-1 max-h-40 overflow-y-auto mt-1">
                {parsed.steps.map((step, i) => (
                  <div key={i} className="text-sm">
                    <span className="text-muted-foreground mr-2">{step.step_number}.</span>
                    <span className="text-foreground">{step.instruction}</span>
                    {step.tool && <span className="ml-2 text-xs text-orange-500">🔧 {step.tool}</span>}
                    {step.timer_minutes && <span className="ml-2 text-xs text-blue-500">⏱️ {step.timer_minutes}min</span>}
                  </div>
                ))}
              </div>
            </div>
            {parsed.tools.length > 0 && (
              <div>
                <label className="text-xs text-muted-foreground">Tools: {parsed.tools.join(', ')}</label>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-xl">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {parsed && (
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setParsed(null)}>Back</Button>
            <Button onClick={handleSave} disabled={isParsing}>
              {isParsing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Recipe
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
