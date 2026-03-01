import { useNavigate } from 'react-router-dom';
import { BentoCard } from './bento-grid';
import { ChefHat } from 'lucide-react';
import { useSound } from '@/hooks/useSound';

export const CookingCard = () => {
  const navigate = useNavigate();
  const { click } = useSound();

  return (
    <BentoCard 
      className="col-span-1 sm:col-span-1" 
      onClick={() => { click(); navigate('/cooking'); }}
    >
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 shadow-lg">
          <ChefHat className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Smart Cooking</h3>
          <p className="text-xs text-muted-foreground">Recipes & step-by-step</p>
        </div>
      </div>
    </BentoCard>
  );
};
