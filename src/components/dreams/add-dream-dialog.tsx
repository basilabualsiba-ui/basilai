import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useDreams } from "@/contexts/DreamsContext";
import { Plus } from "lucide-react";

const dreamTypes = [
  { value: 'general', label: 'General' },
  { value: 'travel', label: 'Places to Visit' },
  { value: 'adventure', label: 'Adventures to Do' },
  { value: 'career', label: 'Career Goals' },
  { value: 'personal', label: 'Personal Growth' },
  { value: 'creative', label: 'Creative Projects' },
];

const priorities = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export const AddDreamDialog = () => {
  const [open, setOpen] = useState(false);
  const { addDream } = useDreams();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'general',
    priority: 'medium',
    why_important: '',
    target_date: '',
    estimated_cost: '',
    location: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDream({
        ...formData,
        estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : undefined,
        target_date: formData.target_date || undefined,
      });
      setFormData({
        title: '',
        description: '',
        type: 'general',
        priority: 'medium',
        why_important: '',
        target_date: '',
        estimated_cost: '',
        location: '',
      });
      setOpen(false);
    } catch (error) {
      console.error('Error adding dream:', error);
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dreamTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority *</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((priority) => (
                    <SelectItem key={priority.value} value={priority.value}>
                      {priority.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Dream</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
