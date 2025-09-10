import { useLongPress } from '@/hooks/use-long-press';

interface Subcategory {
  id: string;
  name: string;
}

interface SubcategoryButtonProps {
  subcategory: Subcategory;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
}

export const SubcategoryButton = ({ 
  subcategory, 
  isSelected, 
  onSelect, 
  onEdit 
}: SubcategoryButtonProps) => {
  const longPressHandlers = useLongPress({
    onLongPress: onEdit,
    onClick: onSelect
  });

  return (
    <button
      key={subcategory.id}
      {...longPressHandlers}
      onClick={(e) => {
        e.stopPropagation();
        longPressHandlers.onClick();
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        longPressHandlers.onMouseDown();
      }}
      onTouchStart={(e) => {
        e.stopPropagation();
        longPressHandlers.onTouchStart();
      }}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
        isSelected
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
      }`}
    >
      {subcategory.name}
    </button>
  );
};