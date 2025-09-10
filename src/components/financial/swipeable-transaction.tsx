import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Trash2, Wallet, PiggyBank, CreditCard, Banknote, Building2, Landmark, Car, Home, ShoppingCart, Coffee, Gamepad2, Gift, Plane, Music, BookOpen, Camera, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLongPress } from "@/hooks/use-long-press";
import * as Icons from "lucide-react";
interface Transaction {
  date: string;
  amount: string;
  type: string;
  category: string;
  subcategory?: string;
  time: string;
  created_at: string;
  isExpense: boolean;
  isTransfer?: boolean;
  description?: string;
  account?: {
    name: string;
    icon: string;
    type: string;
  };
  categories?: {
    name: string;
    icon: string;
  };
}
interface SwipeableTransactionProps {
  transaction: Transaction;
  onEdit?: () => void;
  onDelete?: () => void;
}
export const SwipeableTransaction = ({
  transaction,
  onEdit,
  onDelete
}: SwipeableTransactionProps) => {
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);

  // Function to get account icon
  const getAccountIcon = (iconName: string) => {
    // Check if it's a URL (custom icon)
    if (iconName && iconName.startsWith('http')) {
      return ({ className }: { className?: string }) => (
        <img src={iconName} alt="Account Icon" className={`${className} object-cover rounded`} />
      );
    }
    
    // Built-in icons mapping
    const iconMap: { [key: string]: LucideIcon } = {
      Wallet,
      PiggyBank,
      CreditCard,
      DollarSign,
      Banknote,
      Building2,
      Landmark,
      Car,
      Home,
      ShoppingCart,
      Coffee,
      Gamepad2,
      Gift,
      Plane,
      Music,
      BookOpen,
      Camera
    };
    
    return iconMap[iconName] || Wallet;
  };
  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    currentX.current = e.touches[0].clientX;
    const diff = startX.current - currentX.current;

    // Only allow swiping left (positive diff)
    if (diff > 0 && diff <= 80) {
      setSwipeOffset(diff);
    } else if (diff <= 0) {
      setSwipeOffset(0);
    }
  };
  const handleTouchEnd = () => {
    setIsDragging(false);

    // If swiped more than 40px, show actions
    if (swipeOffset > 40) {
      setSwipeOffset(80);
      setIsSwipeActive(true);
    } else {
      setSwipeOffset(0);
      setIsSwipeActive(false);
    }
  };
  const handleMouseDown = (e: React.MouseEvent) => {
    startX.current = e.clientX;
    setIsDragging(true);
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    currentX.current = e.clientX;
    const diff = startX.current - currentX.current;
    if (diff > 0 && diff <= 80) {
      setSwipeOffset(diff);
    } else if (diff <= 0) {
      setSwipeOffset(0);
    }
  };
  const handleMouseUp = () => {
    setIsDragging(false);
    if (swipeOffset > 40) {
      setSwipeOffset(80);
      setIsSwipeActive(true);
    } else {
      setSwipeOffset(0);
      setIsSwipeActive(false);
    }
  };
  const closeSwipe = () => {
    setSwipeOffset(0);
    setIsSwipeActive(false);
  };
  return <div className="relative overflow-hidden rounded-lg">
      {/* Delete Action Button */}
      <div className="absolute right-0 top-0 h-full flex z-10">
        <Button onClick={() => {
        onDelete?.();
        closeSwipe();
      }} className="h-full px-8 rounded-none bg-red-600 hover:bg-red-700 text-white flex items-center gap-2">
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>

      {/* Transaction Card */}
      <Card className={cn("cursor-pointer hover:shadow-card transition-all duration-200 select-none relative z-20", isDragging ? "transition-none" : "")} style={{
      transform: `translateX(-${swipeOffset}px)`
    }} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onClick={isSwipeActive ? closeSwipe : onEdit}>
        <CardContent className="p-4 group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Account Icon */}
              {transaction.account && (() => {
                const IconComponent = getAccountIcon(transaction.account.icon);
                return transaction.account.icon && transaction.account.icon.startsWith('http') ? (
                  <div className="w-10 h-10 rounded-full overflow-hidden shadow-sm">
                    <IconComponent className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className={`p-2 rounded-full ${
                    transaction.account.type === 'cash' ? 'bg-green-100 text-green-600' : 
                    transaction.account.type === 'bank' ? 'bg-blue-100 text-blue-600' : 
                    'bg-purple-100 text-purple-600'
                  }`}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                );
              })()}
              
              <div>
                <p className="font-medium text-foreground">
                  {transaction.date}
                </p>
                <p className="text-sm text-muted-foreground" dir="auto">
                  {transaction.isTransfer ? transaction.description || "Transfer" : transaction.subcategory ? `${transaction.category} ${transaction.subcategory}` : transaction.category}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className={`font-bold ${
                  transaction.isTransfer 
                    ? (transaction.description?.toLowerCase().includes('transfer from') ? 'text-green-600' : 'text-red-500')
                    : transaction.isExpense ? 'text-red-500' : 'text-green-600'
                }`}>
                  {transaction.type} {transaction.amount}
                </p>
                <p className="text-sm text-muted-foreground">
                  {transaction.time}
                </p>
              </div>
              {/* Desktop hover delete button */}
              <Button onClick={e => {
              e.stopPropagation();
              onDelete?.();
            }} variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/20 hidden md:flex">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>;
};