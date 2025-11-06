import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { useDreams } from "@/contexts/DreamsContext";
import { Plus, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const AddDreamDialog = () => {
  const [open, setOpen] = useState(false);
  const { addDream } = useDreams();
  const [createFinancialGoal, setCreateFinancialGoal] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    why_important: '',
    target_date: '',
    estimated_cost: '',
    location: '',
  });

  const detectDreamType = (title: string, description: string): string => {
    const text = `${title} ${description}`.toLowerCase();
    
    // Travel & Places
    if (text.match(/visit|travel|trip|country|city|landmark|destination|explore|journey|vacation|tour/)) {
      return 'travel';
    }
    
    // Personal Development
    if (text.match(/kg|weight|fitness|workout|gym|exercise|habit|overcome|learn|skill|fear|health|meditation|yoga/)) {
      return 'personal';
    }
    
    // Career & Learning
    if (text.match(/business|career|job|certification|course|startup|company|promotion|degree|study|training/)) {
      return 'career';
    }
    
    // Adventures & Sports
    if (text.match(/skydiving|marathon|climbing|adventure|sport|race|hiking|diving|surfing|extreme/)) {
      return 'adventure';
    }
    
    // Family & Relationships
    if (text.match(/marry|wedding|kids|child|family|relationship|friend|reconnect|parent/)) {
      return 'creative'; // Using creative as closest match
    }
    
    return 'general';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsGeneratingImage(true);
      
      // Detect dream type using AI logic
      const detectedType = detectDreamType(formData.title, formData.description);
      
      // Generate AI cover image
      let coverImageUrl: string | undefined;
      try {
        const { data: imageData, error: imageError } = await supabase.functions.invoke('generate-dream-image', {
          body: { prompt: `${formData.title}. ${formData.description}` }
        });
        
        if (imageData?.image) {
          coverImageUrl = imageData.image;
        }
      } catch (err) {
        console.error('Failed to generate image:', err);
        toast.error('Could not generate image, but dream will still be created');
      }

      // Create the dream
      const dreamData = {
        ...formData,
        type: detectedType,
        priority: 'medium', // Default priority since we removed the field
        estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : undefined,
        target_date: formData.target_date || undefined,
        cover_image_url: coverImageUrl,
      };
      
      await addDream(dreamData);
      setIsGeneratingImage(false);

      // Create financial goal if requested and estimated cost exists
      if (createFinancialGoal && formData.estimated_cost) {
        const goalName = `${formData.title} - Savings Goal`;
        const targetAmount = parseFloat(formData.estimated_cost);
        
        // Create a category for dream savings if it doesn't exist
        const { data: existingCategories } = await supabase
          .from('categories')
          .select('id')
          .eq('name', 'Dream Savings')
          .eq('type', 'expense')
          .single();

        let categoryId = existingCategories?.id;

        if (!categoryId) {
          const { data: newCategory } = await supabase
            .from('categories')
            .insert({
              name: 'Dream Savings',
              type: 'expense',
              icon: 'Sparkles'
            })
            .select()
            .single();
          
          categoryId = newCategory?.id;
        }

        // Create a budget for tracking savings
        if (categoryId && formData.target_date) {
          const targetDate = new Date(formData.target_date);
          await supabase
            .from('budgets')
            .insert({
              category_id: categoryId,
              amount: targetAmount,
              month: targetDate.getMonth() + 1,
              year: targetDate.getFullYear()
            });
        }
      }

      setFormData({
        title: '',
        description: '',
        why_important: '',
        target_date: '',
        estimated_cost: '',
        location: '',
      });
      setCreateFinancialGoal(false);
      setOpen(false);
    } catch (error) {
      console.error('Error adding dream:', error);
      setIsGeneratingImage(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Dream
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Dream</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="What's your dream?"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your dream..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              💡 AI will automatically categorize your dream based on your description
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="why_important">Why is this important to you?</Label>
            <Textarea
              id="why_important"
              value={formData.why_important}
              onChange={(e) => setFormData({ ...formData, why_important: e.target.value })}
              placeholder="Your motivation..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target_date">Target Date</Label>
              <Input
                id="target_date"
                type="date"
                value={formData.target_date}
                onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimated_cost">Estimated Cost</Label>
              <Input
                id="estimated_cost"
                type="number"
                step="0.01"
                value={formData.estimated_cost}
                onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location (if applicable)</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Paris, France"
            />
          </div>

          {formData.estimated_cost && (
            <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/30">
              <div className="space-y-1">
                <Label htmlFor="create-goal" className="text-base">
                  Create Financial Savings Goal
                </Label>
                <p className="text-sm text-muted-foreground">
                  Track your savings progress towards this dream in the Financial app
                </p>
              </div>
              <Switch
                id="create-goal"
                checked={createFinancialGoal}
                onCheckedChange={setCreateFinancialGoal}
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isGeneratingImage}>
              {isGeneratingImage ? (
                <>
                  <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                  Generating Dream Image...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Dream
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};