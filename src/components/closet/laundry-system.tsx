import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Timer, ArrowRight, Shirt } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ClothingItem } from '@/pages/Closet';

interface LaundrySystemProps {
  laundryItems: ClothingItem[];
  washingItems: ClothingItem[];
  closetItems: ClothingItem[];
  onUpdate: () => void;
}

export const LaundrySystem = ({ laundryItems, washingItems, closetItems, onUpdate }: LaundrySystemProps) => {
  const { toast } = useToast();
  const [washTimer, setWashTimer] = useState<number | null>(null);
  const [isWashing, setIsWashing] = useState(false);

  // Timer
  useEffect(() => {
    if (!isWashing || washTimer === null || washTimer <= 0) return;
    const interval = setInterval(() => {
      setWashTimer(prev => {
        if (prev === null || prev <= 1) {
          setIsWashing(false);
          finishWashing();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isWashing, washTimer]);

  const moveToWashing = async (id: string) => {
    try {
      const { error } = await supabase.from('clothing_items').update({ status: 'washing_machine' }).eq('id', id);
      if (error) throw error;
      onUpdate();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const moveAllToWashing = async () => {
    if (laundryItems.length === 0) return;
    try {
      const ids = laundryItems.map(i => i.id);
      const { error } = await supabase.from('clothing_items').update({ status: 'washing_machine' }).in('id', ids);
      if (error) throw error;
      onUpdate();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const startWashing = () => {
    if (washingItems.length === 0) {
      toast({ title: "No items in washing machine" });
      return;
    }
    setWashTimer(45 * 60); // 45 minutes
    setIsWashing(true);
    toast({ title: "Washing started! ⏳" });
  };

  const finishWashing = async () => {
    try {
      const ids = washingItems.map(i => i.id);
      if (ids.length > 0) {
        const { error } = await supabase.from('clothing_items').update({ status: 'closet' }).in('id', ids);
        if (error) throw error;
      }
      onUpdate();
      toast({ title: "Washing done! 🎉", description: "Items moved back to closet" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const moveBackToCloset = async (id: string) => {
    try {
      const { error } = await supabase.from('clothing_items').update({ status: 'closet' }).eq('id', id);
      if (error) throw error;
      onUpdate();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      {/* Laundry Basket */}
      <Card className="border-border/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              🧺 Laundry Basket ({laundryItems.length})
            </h3>
            {laundryItems.length > 0 && (
              <Button size="sm" variant="outline" onClick={moveAllToWashing} className="rounded-xl text-xs">
                Move all to washer <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
          {laundryItems.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">No dirty clothes</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {laundryItems.map(item => (
                <Badge key={item.id} variant="secondary" className="flex items-center gap-1 cursor-pointer"
                  onClick={() => moveToWashing(item.id)}>
                  {item.name || item.type}
                  <ArrowRight className="h-3 w-3" />
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Washing Machine */}
      <Card className="border-border/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              🫧 Washing Machine ({washingItems.length})
            </h3>
            {!isWashing && washingItems.length > 0 && (
              <Button size="sm" onClick={startWashing} className="rounded-xl text-xs">
                <Timer className="h-3 w-3 mr-1" /> Start Wash
              </Button>
            )}
          </div>
          
          {isWashing && washTimer !== null && (
            <div className="text-center py-4">
              <div className="text-3xl font-mono font-bold text-primary mb-2">
                {formatTime(washTimer)}
              </div>
              <p className="text-xs text-muted-foreground">Washing in progress...</p>
              <Button onClick={finishWashing} variant="ghost" size="sm" className="mt-2 text-xs">
                Finish Early
              </Button>
            </div>
          )}

          {!isWashing && washingItems.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-3">Add items from the laundry basket</p>
          )}

          {!isWashing && washingItems.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {washingItems.map(item => (
                <Badge key={item.id} variant="outline" className="cursor-pointer"
                  onClick={() => moveBackToCloset(item.id)}>
                  {item.name || item.type}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
