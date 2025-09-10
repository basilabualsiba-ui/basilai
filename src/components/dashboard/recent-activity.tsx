import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Clock, Wallet, PiggyBank, CreditCard, Banknote, Building2, Landmark, Car, Home, ShoppingCart, Coffee, Gamepad2, Gift, Plane, Music, BookOpen, Camera } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

export const RecentActivity = () => {
  const { data: transactions } = useQuery({
    queryKey: ['recent-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          categories(name, icon),
          subcategories(name),
          accounts(name, currency, icon)
        `)
        .order('date', { ascending: false })
        .order('time', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    }
  });

  const getAccountIcon = (iconName: string) => {
    // Check if it's a URL (custom icon)
    if (iconName && iconName.startsWith('http')) {
      return ({ className }: { className?: string }) => (
        <img src={iconName} alt="Account Icon" className={`${className} object-cover rounded`} />
      );
    }
    
    // Built-in icons mapping
    const iconMap = {
      'Wallet': Wallet,
      'PiggyBank': PiggyBank,
      'CreditCard': CreditCard,
      'Banknote': Banknote,
      'Building2': Building2,
      'Landmark': Landmark,
      'Car': Car,
      'Home': Home,
      'ShoppingCart': ShoppingCart,
      'Coffee': Coffee,
      'Gamepad2': Gamepad2,
      'Gift': Gift,
      'Plane': Plane,
      'Music': Music,
      'BookOpen': BookOpen,
      'Camera': Camera
    };
    
    return iconMap[iconName as keyof typeof iconMap] || Wallet;
  };

  const activities = transactions?.map(transaction => {
    // Combine date and time for accurate relative time calculation
    const dateTimeString = `${transaction.date}T${transaction.time || '00:00:00'}`;
    const transactionDateTime = new Date(dateTimeString);
    
    return {
      type: transaction.type,
      title: transaction.subcategories?.name || transaction.categories?.name || 'Transaction',
      description: transaction.description || transaction.accounts?.name || '',
      amount: `${transaction.type === 'income' || (transaction.type === 'transfer' && transaction.description?.toLowerCase().includes('transfer from')) ? '+' : '-'}${Math.abs(transaction.amount)} ${transaction.accounts?.currency || 'ILS'}`,
      time: formatDistanceToNow(transactionDateTime, { addSuffix: true }),
      category: transaction.type === 'transfer' ? 'Transfer' : (transaction.categories?.name || 'Other'),
      icon: transaction.categories?.icon || 'DollarSign',
      accountIcon: transaction.accounts?.icon || 'Wallet',
      isPositive: transaction.type === 'income' || (transaction.type === 'transfer' && transaction.description?.toLowerCase().includes('transfer from'))
    };
  }) || [];

  const getCategoryColor = (category: string) => {
    const colors = {
      Food: "bg-orange-500/20 text-orange-300",
      Fitness: "bg-green-500/20 text-green-300",
      Health: "bg-blue-500/20 text-blue-300",
      Work: "bg-purple-500/20 text-purple-300"
    };
    return colors[category as keyof typeof colors] || "bg-gray-500/20 text-gray-300";
  };

  return (
    <Card className="bg-gradient-secondary border-border/50 shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Clock className="h-5 w-5 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div key={index} className="flex items-center space-x-4">
              {(() => {
                const IconComponent = getAccountIcon(activity.accountIcon);
                return activity.accountIcon && activity.accountIcon.startsWith('http') ? (
                  <div className="w-8 h-8 rounded-full overflow-hidden shadow-sm">
                    <IconComponent className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <Avatar className="h-8 w-8 bg-primary/10">
                    <AvatarFallback className="text-xs bg-primary/20 text-primary">
                      <IconComponent className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                );
              })()}
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{activity.title}</p>
                   {activity.amount && (
                     <span className={`text-sm font-medium ${activity.isPositive ? 'text-green-600' : 'text-destructive'}`}>{activity.amount}</span>
                   )}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{activity.description}</p>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${getCategoryColor(activity.category)}`}
                    >
                      {activity.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};