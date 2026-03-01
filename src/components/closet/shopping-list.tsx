import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Check, Trash2, ShoppingCart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ShoppingItem {
  id: string;
  name: string;
  category?: string;
  price?: number;
  is_purchased: boolean;
}

export const ShoppingList = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [newItem, setNewItem] = useState('');
  const [newPrice, setNewPrice] = useState('');

  useEffect(() => { loadItems(); }, []);

  const loadItems = async () => {
    const { data } = await supabase.from('shopping_list').select('*').order('created_at', { ascending: false });
    setItems((data || []) as ShoppingItem[]);
  };

  const addItem = async () => {
    if (!newItem.trim()) return;
    try {
      const { error } = await supabase.from('shopping_list').insert([{
        name: newItem.trim(), price: parseFloat(newPrice) || null
      }]);
      if (error) throw error;
      setNewItem(''); setNewPrice('');
      loadItems();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const togglePurchased = async (id: string, current: boolean) => {
    try {
      const { error } = await supabase.from('shopping_list').update({ is_purchased: !current }).eq('id', id);
      if (error) throw error;
      loadItems();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase.from('shopping_list').delete().eq('id', id);
      if (error) throw error;
      loadItems();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const total = items.filter(i => !i.is_purchased).reduce((sum, i) => sum + (i.price || 0), 0);

  return (
    <div className="space-y-4">
      <Card className="border-border/30">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            Shopping List
            {total > 0 && <span className="text-xs text-muted-foreground ml-auto">Est: ₪{total.toFixed(0)}</span>}
          </h3>
          <div className="flex gap-2 mb-4">
            <Input placeholder="Item name..." value={newItem} onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addItem()} className="rounded-xl flex-1" />
            <Input type="number" placeholder="₪" value={newPrice} onChange={(e) => setNewPrice(e.target.value)}
              className="rounded-xl w-20" />
            <Button onClick={addItem} size="sm" className="rounded-xl"><Plus className="h-4 w-4" /></Button>
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No items in your shopping list</p>
          ) : (
            <div className="space-y-2">
              {items.map(item => (
                <div key={item.id} className={`flex items-center gap-3 p-2 rounded-xl ${item.is_purchased ? 'bg-muted/30 opacity-60' : 'bg-muted/10'}`}>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                    onClick={() => togglePurchased(item.id, item.is_purchased)}>
                    <Check className={`h-4 w-4 ${item.is_purchased ? 'text-green-500' : 'text-muted-foreground'}`} />
                  </Button>
                  <span className={`flex-1 text-sm ${item.is_purchased ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {item.name}
                  </span>
                  {item.price && <span className="text-xs text-muted-foreground">₪{item.price}</span>}
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive"
                    onClick={() => deleteItem(item.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
