import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFinancial } from '@/contexts/FinancialContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Filter } from 'lucide-react';
import { format } from 'date-fns';

export const TransactionBrowser = () => {
  const { transactions, categories } = useFinancial();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  const subcategories = selectedCategory?.subcategories || [];

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (selectedCategoryId !== 'all' && t.categoryId !== selectedCategoryId) return false;
      if (selectedSubcategoryId !== 'all' && t.subcategoryId !== selectedSubcategoryId) return false;
      const tDate = new Date(t.date);
      if (dateFrom && tDate < dateFrom) return false;
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        if (tDate > end) return false;
      }
      return true;
    });
  }, [transactions, selectedCategoryId, selectedSubcategoryId, dateFrom, dateTo]);

  const totalAmount = filteredTransactions.reduce((sum, t) => {
    return sum + (t.type === 'expense' ? -t.amount : t.amount);
  }, 0);

  const totalExpenses = filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-4 pb-6">
      {/* Filters */}
      <Card className="border-border/30 bg-card/50">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="h-4 w-4 text-wallet" />
            <h3 className="text-sm font-semibold text-foreground">Filters</h3>
          </div>

          <Select value={selectedCategoryId} onValueChange={(v) => { setSelectedCategoryId(v); setSelectedSubcategoryId('all'); }}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {subcategories.length > 0 && (
            <Select value={selectedSubcategoryId} onValueChange={setSelectedSubcategoryId}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="All Subcategories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subcategories</SelectItem>
                {subcategories.map(sub => (
                  <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal rounded-xl text-xs h-10">
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {dateFrom ? format(dateFrom, 'MMM d, yyyy') : 'From'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal rounded-xl text-xs h-10">
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {dateTo ? format(dateTo, 'MMM d, yyyy') : 'To'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          {(dateFrom || dateTo || selectedCategoryId !== 'all') && (
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground"
              onClick={() => { setSelectedCategoryId('all'); setSelectedSubcategoryId('all'); setDateFrom(undefined); setDateTo(undefined); }}>
              Clear Filters
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="border-wallet/20 bg-wallet/5">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Income</p>
            <p className="text-sm font-bold text-wallet">₪{totalIncome.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Expenses</p>
            <p className="text-sm font-bold text-destructive">₪{totalExpenses.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-border/30">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Net</p>
            <p className={`text-sm font-bold ${totalAmount >= 0 ? 'text-wallet' : 'text-destructive'}`}>
              ₪{Math.abs(totalAmount).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction List */}
      <Card className="border-border/30 bg-card/50">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-3">{filteredTransactions.length} transactions</p>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredTransactions.map(t => {
              const cat = categories.find(c => c.id === t.categoryId);
              const sub = cat?.subcategories.find(s => s.id === t.subcategoryId);
              return (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {sub?.name || cat?.name || t.description || 'Transaction'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {t.description && ` • ${t.description}`}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold ${t.type === 'expense' ? 'text-destructive' : 'text-wallet'}`}>
                    {t.type === 'expense' ? '-' : '+'}₪{t.amount.toLocaleString()}
                  </span>
                </div>
              );
            })}
            {filteredTransactions.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">No transactions found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
