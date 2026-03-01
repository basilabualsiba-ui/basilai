import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shuffle, Heart, Shirt } from 'lucide-react';
import { useWeather } from '@/hooks/useWeather';
import { Badge } from '@/components/ui/badge';
import type { ClothingItem } from '@/pages/Closet';

interface OutfitSuggestionProps {
  clothes: ClothingItem[];
}

type ClothingType = string;

const TOPS: ClothingType[] = ['tshirt', 'shirt', 'hoodie', 'sweater'];
const BOTTOMS: ClothingType[] = ['jeans', 'shorts'];
const SHOES_TYPE: ClothingType[] = ['shoes'];
const LAYERS: ClothingType[] = ['jacket', 'coat', 'hoodie', 'sweater'];

const pickRandom = <T,>(arr: T[]): T | null => arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : null;

export const OutfitSuggestion = ({ clothes }: OutfitSuggestionProps) => {
  const { weather, icon, category } = useWeather();
  const [outfit, setOutfit] = useState<{
    top: ClothingItem | null;
    bottom: ClothingItem | null;
    shoes: ClothingItem | null;
    layer: ClothingItem | null;
  }>({ top: null, bottom: null, shoes: null, layer: null });

  const generateOutfit = useCallback(() => {
    const tops = clothes.filter(c => TOPS.includes(c.type));
    const bottoms = clothes.filter(c => BOTTOMS.includes(c.type));
    const shoes = clothes.filter(c => SHOES_TYPE.includes(c.type));
    const layers = clothes.filter(c => LAYERS.includes(c.type));

    let top = pickRandom(tops);
    let bottom = pickRandom(bottoms);
    const shoe = pickRandom(shoes);
    let layer: ClothingItem | null = null;

    // Weather-aware rules
    if (category === 'cold') {
      // Prefer sweater/hoodie as top, add layer
      const warmTops = tops.filter(t => ['hoodie', 'sweater'].includes(t.type));
      if (warmTops.length > 0) top = pickRandom(warmTops);
      layer = pickRandom(layers.filter(l => l.id !== top?.id));
      // Prefer jeans over shorts
      const warmBottoms = bottoms.filter(b => b.type === 'jeans');
      if (warmBottoms.length > 0) bottom = pickRandom(warmBottoms);
    } else if (category === 'hot') {
      const lightTops = tops.filter(t => t.type === 'tshirt');
      if (lightTops.length > 0) top = pickRandom(lightTops);
      const lightBottoms = bottoms.filter(b => b.type === 'shorts');
      if (lightBottoms.length > 0) bottom = pickRandom(lightBottoms);
    } else if (category === 'mild') {
      // Optionally add light layer
      if (Math.random() > 0.5) {
        layer = pickRandom(layers.filter(l => l.id !== top?.id));
      }
    } else if (category === 'rainy') {
      layer = pickRandom(layers.filter(l => ['jacket', 'coat'].includes(l.type)));
    }

    // Prevent duplicate types (e.g., hoodie top + hoodie layer)
    if (layer && top && layer.type === top.type) layer = null;

    setOutfit({ top, bottom, shoes: shoe, layer });
  }, [clothes, category]);

  const items = [outfit.layer, outfit.top, outfit.bottom, outfit.shoes].filter(Boolean) as ClothingItem[];

  return (
    <div className="space-y-4">
      {/* Weather info */}
      <Card className="border-border/30">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{icon}</span>
            <div>
              <p className="text-sm font-semibold text-foreground">{weather?.temperature ?? '--'}°C</p>
              <p className="text-xs text-muted-foreground capitalize">{category} weather</p>
            </div>
          </div>
          <Button onClick={generateOutfit} className="rounded-xl">
            <Shuffle className="h-4 w-4 mr-2" /> Suggest Outfit
          </Button>
        </CardContent>
      </Card>

      {/* Outfit display */}
      {items.length > 0 ? (
        <Card className="border-border/30">
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-4">
              {/* Top + Layer */}
              <div className="flex gap-3 justify-center">
                {outfit.layer && (
                  <OutfitItem item={outfit.layer} label="Layer" />
                )}
                {outfit.top && (
                  <OutfitItem item={outfit.top} label="Top" />
                )}
              </div>
              {/* Bottom + Shoes */}
              <div className="flex gap-3 justify-center">
                {outfit.bottom && (
                  <OutfitItem item={outfit.bottom} label="Bottom" />
                )}
                {outfit.shoes && (
                  <OutfitItem item={outfit.shoes} label="Shoes" />
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-4 justify-center">
              <Button onClick={generateOutfit} variant="outline" className="rounded-xl">
                <Shuffle className="h-4 w-4 mr-2" /> Shuffle
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/30">
          <CardContent className="p-8 text-center">
            <Shirt className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">Press "Suggest Outfit" to get a weather-smart recommendation!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const OutfitItem = ({ item, label }: { item: ClothingItem; label: string }) => (
  <div className="flex flex-col items-center gap-1">
    <div className="w-28 h-28 rounded-xl bg-muted/30 border border-border/30 overflow-hidden">
      {item.image ? (
        <img src={item.image} alt={item.name || label} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Shirt className="h-8 w-8 text-muted-foreground/30" />
        </div>
      )}
    </div>
    <Badge variant="outline" className="text-[10px]">{label}</Badge>
  </div>
);
