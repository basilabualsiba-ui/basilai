import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const CLOTHING_TYPES = [
  { value: 'jacket', label: '🧥 Jacket' },
  { value: 'shoes', label: '👟 Shoes' },
  { value: 'socks', label: '🧦 Socks' },
  { value: 'jeans', label: '👖 Jeans' },
  { value: 'shorts', label: '🩳 Shorts' },
  { value: 'tshirt', label: '👕 T-Shirt' },
  { value: 'shirt', label: '👔 Shirt' },
  { value: 'hoodie', label: '🧥 Hoodie' },
  { value: 'sweater', label: '🧶 Sweater' },
  { value: 'coat', label: '🧥 Coat' },
  { value: 'other', label: '👗 Other' },
];

const PATTERNS = [
  { value: 'plain', label: 'Plain' },
  { value: 'striped', label: 'Striped' },
  { value: 'patterned', label: 'Patterned' },
];

// Simple dominant color extraction from image
const extractDominantColor = (img: HTMLImageElement): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '#888888';
  
  canvas.width = 50;
  canvas.height = 50;
  ctx.drawImage(img, 0, 0, 50, 50);
  
  const data = ctx.getImageData(0, 0, 50, 50).data;
  let r = 0, g = 0, b = 0, count = 0;
  
  for (let i = 0; i < data.length; i += 16) { // Sample every 4th pixel
    const pr = data[i], pg = data[i + 1], pb = data[i + 2];
    // Skip very light and very dark pixels (background)
    const brightness = (pr + pg + pb) / 3;
    if (brightness > 30 && brightness < 230) {
      r += pr; g += pg; b += pb; count++;
    }
  }
  
  if (count === 0) return '#888888';
  r = Math.round(r / count);
  g = Math.round(g / count);
  b = Math.round(b / count);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

interface AddClothingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
}

export const AddClothingDialog = ({ open, onOpenChange, onAdded }: AddClothingDialogProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('tshirt');
  const [pattern, setPattern] = useState('plain');
  const [color, setColor] = useState('#888888');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);
      
      // Extract color
      const img = new Image();
      img.onload = () => {
        const dominant = extractDominantColor(img);
        setColor(dominant);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!type) { toast({ title: "Select a type", variant: "destructive" }); return; }
    setIsSaving(true);
    try {
      let imageUrl: string | null = null;
      
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('wardrobe')
          .upload(fileName, imageFile);
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage.from('wardrobe').getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from('clothing_items').insert([{
        name: name.trim() || null, image: imageUrl, type, color, pattern, status: 'closet'
      }]);
      if (error) throw error;

      toast({ title: "Clothing added!" });
      onAdded();
      onOpenChange(false);
      setName(''); setType('tshirt'); setPattern('plain'); setColor('#888888');
      setImageFile(null); setImagePreview(null);
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to save", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Clothing</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Image upload */}
          <div className="flex justify-center">
            <div 
              className="w-40 h-40 rounded-2xl bg-muted/30 border-2 border-dashed border-border/50 flex items-center justify-center cursor-pointer overflow-hidden"
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center">
                  <Camera className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">Upload photo</p>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
          </div>

          <div>
            <Label>Name (optional)</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Blue Nike Hoodie" className="rounded-xl" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type *</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CLOTHING_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pattern</Label>
              <Select value={pattern} onValueChange={setPattern}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PATTERNS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Dominant Color</Label>
            <div className="flex items-center gap-3 mt-1">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
              <span className="text-sm text-muted-foreground">{color}</span>
              {imagePreview && <span className="text-xs text-muted-foreground">(auto-detected)</span>}
            </div>
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="w-full rounded-xl">
            {isSaving ? 'Saving...' : 'Add to Closet'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
