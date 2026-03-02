import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFinancial } from '@/contexts/FinancialContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Area, AreaChart, LineChart, Line } from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Layers,
  BarChart3,
  PiggyBank
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

const COLORS = ['hsl(var(--wallet))', '#10B981', '#06B6D4', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#84CC16'];
const SUBCATEGORY_COLORS = ['#8B5CF6', '#06B6D4', '#F59E0B', '#EF4444', '#10B981', '#F97316', '#84CC16', '#EC4899'];

type ChartView = 'income-expenses' | 'savings' | 'net-worth';

export const StatsOverview = () => {
  const { transactions, categories, accounts } = useFinancial();
  const { getRate } = useCurrency();
  const [dataView, setDataView] = useState<'category' | 'subcategory'>('category');
  const [chartView, setChartView] = useState<ChartView>('income-expenses');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [netWorthSnapshots, setNetWorthSnapshots] = useState<{month: number; year: number; total_amount: number}[]>([]);

  // Load net worth snapshots
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('net_worth_snapshots')
        .select('month, year, total_amount')
        .order('year')
        .order('month');
      setNetWorthSnapshots(data || []);
    })();
  }, []);

  // Auto-snapshot current month net worth
  useEffect(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const totalNetWorth = accounts.reduce((sum, acc) => {
      const rate = getRate(acc.currency, 'ILS');
      return sum + (acc.amount * rate);
    }, 0);

    if (accounts.length > 0 && totalNetWorth !== 0) {
      supabase
        .from('net_worth_snapshots')
        .upsert({ month: currentMonth, year: currentYear, total_amount: Math.round(totalNetWorth) }, { onConflict: 'month,year' })
        .then(() => {
          // Refresh snapshots
          supabase
            .from('net_worth_snapshots')
            .select('month, year, total_amount')
            .order('year')
            .order('month')
            .then(({ data }) => setNetWorthSnapshots(data || []));
        });
    }
  }, [accounts, getRate]);

  const allSubcategories = categories.flatMap(cat => cat.subcategories);

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
      else setSelectedMonth(m => m - 1);
    } else {
      if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
      else setSelectedMonth(m => m + 1);
    }
  };

  const monthName = new Date(selectedYear, selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [transactions, selectedMonth, selectedYear]);

  const categoryData = useMemo(() => {
    const data = categories
      .filter(cat => cat.type === 'expense')
      .map(category => {
        const total = filteredTransactions
          .filter(t => t.categoryId === category.id && t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);
        return { name: category.name, value: total, percentage: 0, icon: category.icon };
      })
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);

    const totalExpense = data.reduce((sum, item) => sum + item.value, 0);
    data.forEach(item => { item.percentage = totalExpense > 0 ? Math.round((item.value / totalExpense) * 100) : 0; });
    return data;
  }, [categories, filteredTransactions]);

  const subcategoryData = useMemo(() => {
    const data = allSubcategories
      .map(sub => {
        const total = filteredTransactions
          .filter(t => t.subcategoryId === sub.id && t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);
        const cat = categories.find(c => c.id === sub.categoryId);
        return { name: sub.name, categoryName: cat?.name || '', value: total, percentage: 0 };
      })
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);

    const total = data.reduce((sum, item) => sum + item.value, 0);
    data.forEach(item => { item.percentage = total > 0 ? Math.round((item.value / total) * 100) : 0; });
    return data;
  }, [allSubcategories, filteredTransactions, categories]);

  const currentData = dataView === 'category' ? categoryData : subcategoryData;
  const currentColors = dataView === 'category' ? COLORS : SUBCATEGORY_COLORS;

  const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? Math.round((netBalance / totalIncome) * 100) : 0;

  // Monthly trend data (last 6 months)
  const monthlyData = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const mName = date.toLocaleDateString('en-US', { month: 'short' });
      const monthExpenses = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear() && t.type === 'expense';
      }).reduce((sum, t) => sum + t.amount, 0);
      const monthIncome = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear() && t.type === 'income';
      }).reduce((sum, t) => sum + t.amount, 0);
      data.push({ month: mName, expenses: monthExpenses, income: monthIncome, savings: monthIncome - monthExpenses });
    }
    return data;
  }, [transactions]);

  // Net worth chart data
  const netWorthChartData = useMemo(() => {
    return netWorthSnapshots.map(s => ({
      month: new Date(s.year, s.month - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      amount: Number(s.total_amount),
    }));
  }, [netWorthSnapshots]);

  // Total savings (exclude Aug 2025)
  const totalSavings = useMemo(() => {
    const monthlyMap = new Map<string, { income: number; expense: number }>();
    transactions.forEach(t => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!monthlyMap.has(key)) monthlyMap.set(key, { income: 0, expense: 0 });
      const entry = monthlyMap.get(key)!;
      if (t.type === 'income') entry.income += t.amount;
      else if (t.type === 'expense') entry.expense += t.amount;
    });
    let total = 0;
    monthlyMap.forEach((val, key) => {
      // Exclude Aug 2025 (month index 7)
      if (key === '2025-7') return;
      total += val.income - val.expense;
    });
    return total;
  }, [transactions]);

  // Current net worth
  const currentNetWorth = useMemo(() => {
    return accounts.reduce((sum, acc) => {
      const rate = getRate(acc.currency, 'ILS');
      return sum + (acc.amount * rate);
    }, 0);
  }, [accounts, getRate]);

  return (
    <div className="space-y-4 pb-6">
      {/* Month Navigator */}
      <div className="flex items-center justify-between px-2">
        <Button variant="ghost" size="icon" onClick={() => navigateMonth('prev')} className="h-9 w-9 rounded-xl hover:bg-wallet/10 hover:text-wallet">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-bold text-foreground">{monthName}</h2>
        <Button variant="ghost" size="icon" onClick={() => navigateMonth('next')} className="h-9 w-9 rounded-xl hover:bg-wallet/10 hover:text-wallet">
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-wallet/10 via-wallet/5 to-transparent border-wallet/20 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-xl bg-wallet/20"><ArrowUpRight className="h-4 w-4 text-wallet" /></div>
              <TrendingUp className="h-4 w-4 text-wallet/60" />
            </div>
            <p className="text-xs text-muted-foreground font-medium mb-1">Income</p>
            <p className="text-xl font-bold text-foreground">₪{totalIncome.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-destructive/10 via-destructive/5 to-transparent border-destructive/20 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-xl bg-destructive/20"><ArrowDownRight className="h-4 w-4 text-destructive" /></div>
              <TrendingDown className="h-4 w-4 text-destructive/60" />
            </div>
            <p className="text-xs text-muted-foreground font-medium mb-1">Expenses</p>
            <p className="text-xl font-bold text-foreground">₪{totalExpenses.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className={`bg-gradient-to-br ${netBalance >= 0 ? 'from-wallet/10 via-wallet/5' : 'from-destructive/10 via-destructive/5'} to-transparent border-border/30 overflow-hidden`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-xl ${netBalance >= 0 ? 'bg-wallet/20' : 'bg-destructive/20'}`}>
                <Wallet className={`h-4 w-4 ${netBalance >= 0 ? 'text-wallet' : 'text-destructive'}`} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground font-medium mb-1">Net Balance</p>
            <p className={`text-xl font-bold ${netBalance >= 0 ? 'text-wallet' : 'text-destructive'}`}>
              {netBalance >= 0 ? '+' : ''}₪{netBalance.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-border/30 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-xl bg-primary/20"><BarChart3 className="h-4 w-4 text-primary" /></div>
            </div>
            <p className="text-xs text-muted-foreground font-medium mb-1">Savings Rate</p>
            <p className={`text-xl font-bold ${savingsRate >= 0 ? 'text-wallet' : 'text-destructive'}`}>{savingsRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Total Savings & Net Worth Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-wallet/10 via-wallet/5 to-transparent border-wallet/20 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-xl bg-wallet/20"><PiggyBank className="h-4 w-4 text-wallet" /></div>
            </div>
            <p className="text-xs text-muted-foreground font-medium mb-1">Total Savings</p>
            <p className={`text-lg font-bold ${totalSavings >= 0 ? 'text-wallet' : 'text-destructive'}`}>
              ₪{Math.round(totalSavings).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-border/30 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-xl bg-primary/20"><Wallet className="h-4 w-4 text-primary" /></div>
            </div>
            <p className="text-xs text-muted-foreground font-medium mb-1">Net Worth</p>
            <p className="text-lg font-bold text-foreground">₪{Math.round(currentNetWorth).toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Spending Breakdown */}
      {currentData.length > 0 && (
        <Card className="border-border/30 bg-card/50 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-wallet" />
                Spending Breakdown
              </h3>
              <div className="flex bg-muted/50 rounded-lg p-0.5">
                <Button variant="ghost" size="sm" onClick={() => setDataView('category')}
                  className={`h-7 px-3 text-xs rounded-md ${dataView === 'category' ? 'bg-wallet text-white hover:bg-wallet/90' : 'hover:bg-muted'}`}>
                  Category
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDataView('subcategory')}
                  className={`h-7 px-3 text-xs rounded-md ${dataView === 'subcategory' ? 'bg-wallet text-white hover:bg-wallet/90' : 'hover:bg-muted'}`}>
                  Subcategory
                </Button>
              </div>
            </div>
            <div className="h-48 w-full mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={currentData.slice(0, 6)} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                    {currentData.slice(0, 6).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={currentColors[index % currentColors.length]} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`₪${value.toLocaleString()}`, 'Amount']}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {currentData.slice(0, 6).map((entry, index) => (
                <div key={entry.name} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: currentColors[index % currentColors.length] }} />
                    <span className="text-sm font-medium text-foreground">{entry.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{entry.percentage}%</span>
                    <span className="text-sm font-semibold text-foreground">₪{entry.value.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {currentData.length === 0 && (
        <Card className="border-border/30 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-wallet/10 flex items-center justify-center mx-auto mb-3">
              <Layers className="h-6 w-6 text-wallet" />
            </div>
            <p className="text-sm text-muted-foreground">No expenses recorded for this month</p>
          </CardContent>
        </Card>
      )}

      {/* Switchable Chart */}
      <Card className="border-border/30 bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-wallet" />
              Trends
            </h3>
            <div className="flex bg-muted/50 rounded-lg p-0.5">
              {([
                { key: 'income-expenses', label: 'I/E' },
                { key: 'savings', label: 'Savings' },
                { key: 'net-worth', label: 'Net Worth' },
              ] as { key: ChartView; label: string }[]).map(({ key, label }) => (
                <Button key={key} variant="ghost" size="sm" onClick={() => setChartView(key)}
                  className={`h-7 px-2 text-[10px] rounded-md ${chartView === key ? 'bg-wallet text-white hover:bg-wallet/90' : 'hover:bg-muted'}`}>
                  {label}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartView === 'income-expenses' ? (
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--wallet))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--wallet))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => `₪${value.toLocaleString()}`}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                  <Legend wrapperStyle={{ paddingTop: '12px' }} iconType="circle" iconSize={8} />
                  <Area type="monotone" dataKey="income" stroke="hsl(var(--wallet))" strokeWidth={2} fill="url(#incomeGradient)" name="Income" />
                  <Area type="monotone" dataKey="expenses" stroke="hsl(var(--destructive))" strokeWidth={2} fill="url(#expenseGradient)" name="Expenses" />
                </AreaChart>
              ) : chartView === 'savings' ? (
                <BarChart data={monthlyData} barGap={4}>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => `₪${value.toLocaleString()}`}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                  <Bar dataKey="savings" fill="hsl(var(--wallet))" radius={[6, 6, 0, 0]} name="Monthly Savings" />
                </BarChart>
              ) : (
                <LineChart data={netWorthChartData}>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => `₪${value.toLocaleString()}`}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                  <Line type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: 'hsl(var(--primary))' }} name="Net Worth" />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
