import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Shirt, Plus, Sparkles, WashingMachine, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSound } from '@/hooks/useSound';
import { ClothesGrid } from '@/components/closet/clothes-grid';
import { OutfitSuggestion } from '@/components/closet/outfit-suggestion';
import { LaundrySystem } from '@/components/closet/laundry-system';
import { ShoppingList } from '@/components/closet/shopping-list';
import { AddClothingDialog } from '@/components/closet/add-clothing-dialog';

export interface ClothingItem {
  id: string;
  name: string;
  image: string;
  type: string;
  color: string;
  pattern: string;
  status: string;
  last_worn?: string;
  created_at: string;
}

const Closet = () => {
  const navigate = useNavigate();
  const { click } = useSound();
  const [clothes, setClothes] = useState<ClothingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);

  useEffect(() => { loadClothes(); }, []);

  const loadClothes = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase.from('clothing_items').select('*').order('created_at', { ascending: false });
      setClothes((data || []) as ClothingItem[]);
    } catch (error) {
      console.error('Error loading clothes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const closetItems = clothes.filter(c => c.status === 'closet');
  const laundryItems = clothes.filter(c => c.status === 'laundry_basket');
  const washingItems = clothes.filter(c => c.status === 'washing_machine');

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/20 bg-background/95 backdrop-blur-2xl">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => { click(); navigate("/"); }} className="rounded-xl h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
                <Shirt className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Smart Closet</h1>
                <p className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase">{closetItems.length} items</p>
              </div>
            </div>
          </div>
          <Button size="sm" onClick={() => setIsAddOpen(true)} className="rounded-xl">
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      </header>

      <main className="pt-20 pb-6 px-4">
        <Tabs defaultValue="closet" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="closet"><Shirt className="h-4 w-4" /></TabsTrigger>
            <TabsTrigger value="outfits"><Sparkles className="h-4 w-4" /></TabsTrigger>
            <TabsTrigger value="laundry"><WashingMachine className="h-4 w-4" /></TabsTrigger>
            <TabsTrigger value="shopping"><ShoppingCart className="h-4 w-4" /></TabsTrigger>
          </TabsList>

          <TabsContent value="closet">
            <ClothesGrid clothes={closetItems} onUpdate={loadClothes} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="outfits">
            <OutfitSuggestion clothes={closetItems} />
          </TabsContent>

          <TabsContent value="laundry">
            <LaundrySystem 
              laundryItems={laundryItems} 
              washingItems={washingItems}
              closetItems={closetItems}
              onUpdate={loadClothes}
            />
          </TabsContent>

          <TabsContent value="shopping">
            <ShoppingList />
          </TabsContent>
        </Tabs>
      </main>

      <AddClothingDialog open={isAddOpen} onOpenChange={setIsAddOpen} onAdded={loadClothes} />
    </div>
  );
};

export default Closet;
