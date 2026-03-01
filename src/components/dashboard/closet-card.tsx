import { useNavigate } from 'react-router-dom';
import { BentoCard } from './bento-grid';
import { Shirt } from 'lucide-react';
import { useSound } from '@/hooks/useSound';

export const ClosetCard = () => {
  const navigate = useNavigate();
  const { click } = useSound();

  return (
    <BentoCard 
      className="col-span-1 sm:col-span-1" 
      onClick={() => { click(); navigate('/closet'); }}
    >
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
          <Shirt className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Smart Closet</h3>
          <p className="text-xs text-muted-foreground">Outfits & laundry</p>
        </div>
      </div>
    </BentoCard>
  );
};
