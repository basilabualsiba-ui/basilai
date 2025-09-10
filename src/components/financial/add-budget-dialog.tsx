import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useFinancial } from '@/contexts/FinancialContext';
import { useToast } from '@/hooks/use-toast';
import { Plus, TrendingUp, Calendar } from 'lucide-react';

export const AddBudgetDialog = () => {
  const { 
    categories, 
    distributeBudgetAcrossCategories, 
    getCategorySpendingDistribution,
    getMonthComparison 
  } = useFinancial();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [totalAmount, setTotalAmount] = useState('');
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
  const [year, setYear] = useState(new Date().getFullYear().toString());

  const handleSubmit = async () => {
    if (!totalAmount || !month || !year) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    const budgetAmount = parseFloat(totalAmount);
    if (isNaN(budgetAmount) || budgetAmount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive"
      });
      return;
    }

    await distributeBudgetAcrossCategories(budgetAmount, parseInt(month), parseInt(year));

    setOpen(false);
    setTotalAmount('');
    setMonth((new Date().getMonth() + 1).toString());
    setYear(new Date().getFullYear().toString());
  };

  const expenseCategories = categories.filter(cat => cat.type === 'expense');
  const distribution = getCategorySpendingDistribution(3);
  const totalHistoricalSpending = Object.values(distribution).reduce((sum, amount) => sum + amount, 0);
  
  const currentMonth = parseInt(month) || new Date().getMonth() + 1;
  const currentYear = parseInt(year) || new Date().getFullYear();
  const monthComparison = getMonthComparison(currentMonth, currentYear);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Budget
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Set Total Monthly Budget</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Month Comparison */}
          {monthComparison.previous > 0 && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Previous Month Comparison</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-muted-foreground">Last month spent</p>
                  <p className="font-semibold">₪{monthComparison.previous.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Current month so far</p>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">₪{monthComparison.current.toLocaleString()}</p>
                    <Badge variant={monthComparison.change > 0 ? "destructive" : "default"} className="text-xs">
                      {monthComparison.change > 0 ? '+' : ''}{monthComparison.change.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Historical Spending Suggestion */}
          {totalHistoricalSpending > 0 && (
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Smart Suggestion</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Based on your average spending over the last 3 months
              </p>
              <p className="text-lg font-bold text-primary">₪{Math.round(totalHistoricalSpending * 1.1).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">+10% buffer included</p>
            </div>
          )}

          <div>
            <Label htmlFor="amount">Total Budget Amount</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter total monthly budget"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              This amount will be automatically distributed across all {expenseCategories.length} expense categories
            </p>
          </div>

          {/* Display selected month info */}
          <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Budget Period</span>
            </div>
            <p className="text-lg font-bold text-primary">
              {new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
            </p>
            {totalAmount && (
              <p className="text-xs text-muted-foreground mt-1">
                Daily budget: ₪{(parseFloat(totalAmount) / new Date(parseInt(year), parseInt(month), 0).getDate()).toFixed(0)}/day
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="month">Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {new Date(0, i).toLocaleString('default', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={handleSubmit} className="w-full">
            Distribute Budget Across Categories
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};