import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { useDreams } from "@/contexts/DreamsContext";
import { Plus, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddDreamDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  editDreamId?: string;
}

export const AddDreamDialog = ({ open: controlledOpen, onOpenChange, editDreamId }: AddDreamDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen;
  
  const { addDream, updateDream, dreams } = useDreams();
  const [createFinancialGoal, setCreateFinancialGoal] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    target_date: '',
    estimated_cost: '',
    location: '',
    type: '',
    priority: 'medium',
  });

  const isEditMode = !!editDreamId;

  // Load dream data for edit mode
  useEffect(() => {
    if (editDreamId && open) {
      const dream = dreams.find(d => d.id === editDreamId);
      if (dream) {
        setFormData({
          title: dream.title,
          description: dream.description || '',
          target_date: dream.target_date || '',
          estimated_cost: dream.estimated_cost ? String(dream.estimated_cost) : '',
          location: dream.location || '',
          type: dream.type || '',
          priority: dream.priority || 'medium',
        });
      }
    } else if (!editDreamId) {
      setFormData({ title: '', description: '', target_date: '', estimated_cost: '', location: '', type: '', priority: 'medium' });
    }
  }, [editDreamId, open, dreams]);

  const detectDreamType = (title: string, description: string): string => {
    const text = `${title} ${description}`.toLowerCase();
    if (text.match(/visit|travel|trip|country|city|landmark|destination|explore|journey|vacation|tour/)) return 'travel';
    if (text.match(/kg|weight|fitness|workout|gym|exercise|habit|overcome|learn|skill|fear|health|meditation|yoga/)) return 'personal';
    if (text.match(/business|career|job|certification|course|startup|company|promotion|degree|study|training/)) return 'career';
    if (text.match(/skydiving|marathon|climbing|adventure|sport|race|hiking|diving|surfing|extreme/)) return 'adventure';
    if (text.match(/marry|wedding|kids|child|family|relationship|friend|reconnect|parent/)) return 'creative';
    return 'general';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditMode && editDreamId) {
        // Update existing dream
        await updateDream(editDreamId, {
          title: formData.title,
          description: formData.description || undefined,
          target_date: formData.target_date || undefined,
          estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : undefined,
          location: formData.location || undefined,
          type: formData.type || detectDreamType(formData.title, formData.description),
          priority: formData.priority,
        });
        toast.success('Dream updated!');
        setOpen(false);
        return;
      }

      setIsGeneratingImage(true);
      const detectedType = detectDreamType(formData.title, formData.description);
      
      let coverImageUrl: string | undefined;
      try {
        const { data: imageData } = await supabase.functions.invoke('generate-dream-image', {
          body: { prompt: `${formData.title}. ${formData.description}` }
        });
        if (imageData?.image) coverImageUrl = imageData.image;
      } catch (err) {
        console.error('Failed to generate image:', err);
        toast.error('Could not generate image, but dream will still be created');
      }

      const dreamData = {
        ...formData,
        type: formData.type || detectedType,
        priority: formData.priority || 'medium',
        estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : undefined,
        target_date: formData.target_date || undefined,
        cover_image_url: coverImageUrl,
      };
      
      await addDream(dreamData);
      setIsGeneratingImage(false);

      if (createFinancialGoal && formData.estimated_cost) {
        const targetAmount = parseFloat(formData.estimated_cost);
        const { data: existingCategories } = await supabase
          .from('categories').select('id').eq('name', 'Dream Savings').eq('type', 'expense').single();
        let categoryId = existingCategories?.id;
        if (!categoryId) {
          const { data: newCategory } = await supabase
            .from('categories').insert({ name: 'Dream Savings', type: 'expense', icon: 'Sparkles' }).select().single();
          categoryId = newCategory?.id;
        }
        if (categoryId && formData.target_date) {
          const targetDate = new Date(formData.target_date);
          await supabase.from('budgets').insert({
            category_id: categoryId, amount: targetAmount,
            month: targetDate.getMonth() + 1, year: targetDate.getFullYear()
          });
        }
      }

      setFormData({ title: '', description: '', target_date: '', estimated_cost: '', location: '', type: '', priority: 'medium' });
      setCreateFinancialGoal(false);
      setOpen(false);
    } catch (error) {
      console.error('Error saving dream:', error);
      setIsGeneratingImage(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button className="gap-2 bg-dreams hover:bg-dreams/90 text-white"><Plus className="h-4 w-4" /> Add Dream</Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-dreams/30 bg-gradient-to-br from-background via-background to-dreams/5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-dreams/20"><Sparkles className="h-4 w-4 text-dreams" /></div>
            {isEditMode ? 'Edit Dream' : 'Add New Dream'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="What's your dream?" required className="focus:border-dreams focus:ring-dreams/30" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your dream..." rows={3} className="focus:border-dreams focus:ring-dreams/30" />
            <p className="text-xs text-muted-foreground">💡 Leave category empty to let AI auto-detect it</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger className="focus:border-dreams focus:ring-dreams/30">
                  <SelectValue placeholder="Auto-detect" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="travel">Travel</SelectItem>
                  <SelectItem value="adventure">Adventure</SelectItem>
                  <SelectItem value="career">Career</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="creative">Creative</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Importance</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                <SelectTrigger className="focus:border-dreams focus:ring-dreams/30">
                  <SelectValue placeholder="Medium" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">🔴 High</SelectItem>
                  <SelectItem value="medium">🟡 Medium</SelectItem>
                  <SelectItem value="low">🟢 Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target_date">Target Date</Label>
              <Input id="target_date" type="date" value={formData.target_date}
                onChange={(e) => setFormData({ ...formData, target_date: e.target.value })} className="focus:border-dreams focus:ring-dreams/30" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimated_cost">Estimated Cost</Label>
              <Input id="estimated_cost" type="number" step="0.01" value={formData.estimated_cost}
                onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })} placeholder="0.00" className="focus:border-dreams focus:ring-dreams/30" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location (if applicable)</Label>
            <Input id="location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Paris, France" className="focus:border-dreams focus:ring-dreams/30" />
          </div>

          {formData.estimated_cost && !isEditMode && (
            <div className="flex items-center justify-between p-4 border border-dreams/20 rounded-lg bg-dreams/5">
              <div className="space-y-1">
                <Label htmlFor="create-goal" className="text-base">Create Financial Savings Goal</Label>
                <p className="text-sm text-muted-foreground">Track your savings progress towards this dream in the Financial app</p>
              </div>
              <Switch id="create-goal" checked={createFinancialGoal} onCheckedChange={setCreateFinancialGoal} />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isGeneratingImage} className="bg-dreams hover:bg-dreams/90 text-white">
              {isGeneratingImage ? (
                <><Sparkles className="h-4 w-4 mr-2 animate-spin" /> Generating Dream Image...</>
              ) : isEditMode ? (
                'Update Dream'
              ) : (
                <><Plus className="h-4 w-4 mr-2" /> Add Dream</>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
