import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2, Shirt } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ClothingItem } from '@/pages/Closet';

interface ClothesGridProps {
  clothes: ClothingItem[];
  onUpdate: () => void;
  isLoading: boolean;
}

const typeLabels: Record<string, string> = {
  jacket: '🧥 Jacket', shoes: '👟 Shoes', socks: '🧦 Socks', jeans: '👖 Jeans',
  shorts: '🩳 Shorts', tshirt: '👕 T-Shirt', shirt: '👔 Shirt', hoodie: '🧥 Hoodie',
  sweater: '🧶 Sweater', coat: '🧥 Coat', other: '👗 Other',
};

export const ClothesGrid = ({ clothes, onUpdate, isLoading }: ClothesGridProps) => {
  const { toast } = useToast();

  const moveToLaundry = async (id: string) => {
    try {
      const { error } = await supabase.from('clothing_items').update({ status: 'laundry_basket' }).eq('id', id);
      if (error) throw error;
      onUpdate();
      toast({ title: "Moved to laundry basket" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    try {
      const { error } = await supabase.from('clothing_items').delete().eq('id', id);
      if (error) throw error;
      onUpdate();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48 rounded-2xl" />)}
      </div>
    );
  }

  if (clothes.length === 0) {
    return (
      <Card className="border-border/30">
        <CardContent className="p-8 text-center">
          <Shirt className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">Your closet is empty. Add some clothes!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {clothes.map(item => (
        <Card key={item.id} className="border-border/30 overflow-hidden">
          <div className="relative aspect-square bg-muted/30">
            {item.image ? (
              <img src={item.image} alt={item.name || 'Clothing'} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Shirt className="h-12 w-12 text-muted-foreground/30" />
              </div>
            )}
            {item.color && (
              <div className="absolute top-2 left-2 w-5 h-5 rounded-full border-2 border-background shadow-sm"
                style={{ backgroundColor: item.color }} />
            )}
          </div>
          <CardContent className="p-3">
            <h3 className="text-sm font-semibold text-foreground truncate">{item.name || typeLabels[item.type] || item.type}</h3>
            <p className="text-xs text-muted-foreground capitalize">{item.pattern}</p>
            <div className="flex gap-1 mt-2">
              <Button variant="outline" size="sm" className="flex-1 text-xs rounded-lg h-7"
                onClick={() => moveToLaundry(item.id)}>🧺 Laundry</Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive"
                onClick={() => deleteItem(item.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
