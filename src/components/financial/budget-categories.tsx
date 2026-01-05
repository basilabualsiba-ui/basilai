import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronDown, PiggyBank, Plus, TrendingUp, TrendingDown } from "lucide-react";
import { Utensils, ShoppingCart, Plane, Sparkles, User, ShoppingBag, Car, MoreHorizontal, CreditCard, Briefcase } from "lucide-react";
import { useFinancial } from "@/contexts/FinancialContext";
import { AddCategoryDialog } from "./add-category-dialog";
import { AddTransactionDialog } from "./add-transaction-dialog";
import { EditCategoryDialog } from "./edit-category-dialog";
import { useLongPress } from "@/hooks/use-long-press";

export const BudgetCategories = () => {
  const { categories, getTransactionsByCategory } = useFinancial();
  const [editingCategory, setEditingCategory] = useState<any>(null);

  const getIconComponent = (iconName: string) => {
    const iconMap: { [key: string]: any } = {
      Utensils, ShoppingCart, Plane, Sparkles, User, ShoppingBag, 
      Car, MoreHorizontal, CreditCard, Briefcase
    };
    return iconMap[iconName] || Utensils;
  };

  // Get current month and year
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // Helper function to filter transactions by current month
  const getCurrentMonthTransactions = (categoryId: string) => {
    return getTransactionsByCategory(categoryId).filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate.getMonth() + 1 === currentMonth && 
             transactionDate.getFullYear() === currentYear;
    });
  };

  const expenseCategories = categories.filter(cat => cat.type === 'expense');
  const incomeCategories = categories.filter(cat => cat.type === 'income');

  const totalExpense = expenseCategories.reduce((sum, cat) => 
    sum + getCurrentMonthTransactions(cat.id).reduce((catSum, t) => catSum + (t.type === 'expense' ? t.amount : 0), 0), 0);
  const totalIncome = incomeCategories.reduce((sum, cat) => 
    sum + getCurrentMonthTransactions(cat.id).reduce((catSum, t) => catSum + (t.type === 'income' ? t.amount : 0), 0), 0);

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="relative overflow-hidden border border-red-500/20 bg-gradient-to-br from-red-500/10 via-card to-card">
          <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-red-500/15">
                <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Expenses</span>
            </div>
            <p className="text-2xl font-bold text-red-500">₪{totalExpense.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border border-green-500/20 bg-gradient-to-br from-green-500/10 via-card to-card">
          <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-green-500/15">
                <TrendingUp className="h-3.5 w-3.5 text-green-500" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Income</span>
            </div>
            <p className="text-2xl font-bold text-green-500">₪{totalIncome.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Expense Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-500/10">
              <TrendingDown className="h-4 w-4 text-red-500" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Expense Categories</h3>
          </div>
          <AddCategoryDialog defaultType="expense" />
        </div>

        <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
          {expenseCategories.map((category) => {
            const IconComponent = getIconComponent(category.icon);
            const categoryTotal = getCurrentMonthTransactions(category.id).reduce((sum, t) => sum + (t.type === 'expense' ? t.amount : 0), 0);
            
            const longPressHandlers = useLongPress({
              onLongPress: () => setEditingCategory(category),
              onClick: () => {}
            });

            return (
              <div key={category.id} {...longPressHandlers}>
                <AddTransactionDialog 
                  defaultType="expense" 
                  defaultCategoryId={category.id}
                  trigger={
                    <Card className="group relative overflow-hidden border border-border/40 hover:border-red-500/30 hover:shadow-lg hover:shadow-red-500/10 transition-all duration-300 cursor-pointer bg-card/50 backdrop-blur-sm">
                      <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <CardContent className="p-4 text-center relative z-10">
                        <div className="inline-flex p-3.5 rounded-2xl bg-gradient-to-br from-red-500/15 to-orange-500/10 mb-3 group-hover:from-red-500/25 group-hover:to-orange-500/15 transition-all shadow-sm">
                          <IconComponent className="h-6 w-6 text-red-500" />
                        </div>
                        <h4 className="font-semibold text-foreground mb-0.5 text-sm">{category.name}</h4>
                        <p className="text-lg font-bold text-foreground">₪{categoryTotal.toLocaleString()}</p>
                      </CardContent>
                    </Card>
                  }
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Income Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-green-500/10">
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Income Categories</h3>
          </div>
          <AddCategoryDialog defaultType="income" />
        </div>

        <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
          {incomeCategories.map((category) => {
            const IconComponent = getIconComponent(category.icon);
            const categoryTotal = getCurrentMonthTransactions(category.id).reduce((sum, t) => sum + (t.type === 'income' ? t.amount : 0), 0);
            
            const longPressHandlers = useLongPress({
              onLongPress: () => setEditingCategory(category),
              onClick: () => {}
            });

            return (
              <div key={category.id} {...longPressHandlers}>
                <AddTransactionDialog 
                  defaultType="income" 
                  defaultCategoryId={category.id}
                  trigger={
                    <Card className="group relative overflow-hidden border border-border/40 hover:border-green-500/30 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300 cursor-pointer bg-card/50 backdrop-blur-sm">
                      <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <CardContent className="p-4 text-center relative z-10">
                        <div className="inline-flex p-3.5 rounded-2xl bg-gradient-to-br from-green-500/15 to-emerald-500/10 mb-3 group-hover:from-green-500/25 group-hover:to-emerald-500/15 transition-all shadow-sm">
                          <IconComponent className="h-6 w-6 text-green-500" />
                        </div>
                        <h4 className="font-semibold text-foreground mb-0.5 text-sm">{category.name}</h4>
                        <p className="text-lg font-bold text-foreground">₪{categoryTotal.toLocaleString()}</p>
                      </CardContent>
                    </Card>
                  }
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Category Dialog */}
      {editingCategory && (
        <EditCategoryDialog
          category={editingCategory}
          open={!!editingCategory}
          onOpenChange={(open) => !open && setEditingCategory(null)}
        />
      )}
    </div>
  );
};
