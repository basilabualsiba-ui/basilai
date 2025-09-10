import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronDown, PiggyBank, Plus } from "lucide-react";
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

  const expenseCategories = categories.filter(cat => cat.type === 'expense');
  const incomeCategories = categories.filter(cat => cat.type === 'income');
  return <div className="space-y-6">
      {/* Header */}
      

      {/* Expense Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-foreground">Expense</h3>
            <AddCategoryDialog defaultType="expense" />
          </div>
          <span className="text-lg font-medium text-accent">
            ₪{expenseCategories.reduce((sum, cat) => sum + getTransactionsByCategory(cat.id).reduce((catSum, t) => catSum + (t.type === 'expense' ? t.amount : 0), 0), 0).toLocaleString()}
          </span>
        </div>

        <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
          {expenseCategories.map((category) => {
            const IconComponent = getIconComponent(category.icon);
            const categoryTotal = getTransactionsByCategory(category.id).reduce((sum, t) => sum + (t.type === 'expense' ? t.amount : 0), 0);
            
            const longPressHandlers = useLongPress({
              onLongPress: () => setEditingCategory(category),
              onClick: () => {
                // Open transaction dialog by setting the trigger's click behavior
              }
            });

            return (
              <div key={category.id} {...longPressHandlers}>
                <AddTransactionDialog 
                  defaultType="expense" 
                  defaultCategoryId={category.id}
                  trigger={
                    <Card className="border-0 hover:shadow-card transition-shadow cursor-pointer bg-card">
                      <CardContent className="p-4 text-center">
                        <div className="inline-flex p-3 rounded-full bg-gradient-accent mb-3">
                          <IconComponent className="h-6 w-6 text-primary" />
                        </div>
                        <h4 className="font-medium text-foreground mb-1">{category.name}</h4>
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
            <h3 className="text-lg font-semibold text-foreground">Income</h3>
            <AddCategoryDialog defaultType="income" />
          </div>
          <span className="text-lg font-medium text-accent">
            ₪{incomeCategories.reduce((sum, cat) => sum + getTransactionsByCategory(cat.id).reduce((catSum, t) => catSum + (t.type === 'income' ? t.amount : 0), 0), 0).toLocaleString()}
          </span>
        </div>

        <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
          {incomeCategories.map((category) => {
            const IconComponent = getIconComponent(category.icon);
            const categoryTotal = getTransactionsByCategory(category.id).reduce((sum, t) => sum + (t.type === 'income' ? t.amount : 0), 0);
            
            const longPressHandlers = useLongPress({
              onLongPress: () => setEditingCategory(category),
              onClick: () => {
                // Open transaction dialog by setting the trigger's click behavior
              }
            });

            return (
              <div key={category.id} {...longPressHandlers}>
                <AddTransactionDialog 
                  defaultType="income" 
                  defaultCategoryId={category.id}
                  trigger={
                    <Card className="border-0 hover:shadow-card transition-shadow cursor-pointer bg-card">
                      <CardContent className="p-4 text-center">
                        <div className="inline-flex p-3 rounded-full bg-gradient-accent mb-3">
                          <IconComponent className="h-6 w-6 text-primary" />
                        </div>
                        <h4 className="font-medium text-foreground mb-1">{category.name}</h4>
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
    </div>;
};