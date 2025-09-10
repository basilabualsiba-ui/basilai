import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFinancial } from '@/contexts/FinancialContext';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Calendar, TrendingDown, Target } from 'lucide-react';
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];
const SUBCATEGORY_COLORS = ['#8B5CF6', '#06B6D4', '#F59E0B', '#EF4444', '#10B981', '#F97316', '#84CC16', '#EC4899'];
export const StatsOverview = () => {
  const {
    transactions,
    categories
  } = useFinancial();
  const [viewType, setViewType] = useState<'month' | 'dateRange'>('month');
  const [dataView, setDataView] = useState<'category' | 'subcategory'>('category');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Get all subcategories from categories
  const allSubcategories = categories.flatMap(cat => cat.subcategories);

  // Filter transactions based on selected period
  const filteredTransactions = transactions.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    if (viewType === 'month') {
      return transactionDate.getMonth() === selectedMonth - 1 && transactionDate.getFullYear() === selectedYear;
    } else {
      if (!startDate || !endDate) return true;
      const start = new Date(startDate);
      const end = new Date(endDate);
      return transactionDate >= start && transactionDate <= end;
    }
  });

  // Calculate spending by category for filtered period
  const categoryData = categories.filter(cat => cat.type === 'expense').map(category => {
    const total = filteredTransactions.filter(t => t.categoryId === category.id && t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    return {
      name: category.name,
      value: total,
      percentage: 0,
      categoryName: undefined as string | undefined,
      fullName: category.name
    };
  }).filter(item => item.value > 0);
  const totalExpense = categoryData.reduce((sum, item) => sum + item.value, 0);
  categoryData.forEach(item => {
    item.percentage = Math.round(item.value / totalExpense * 100);
  });

  // Calculate spending by subcategory for filtered period
  const subcategoryData = allSubcategories.map(subcategory => {
    const total = filteredTransactions.filter(t => t.subcategoryId === subcategory.id && t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const category = categories.find(cat => cat.id === subcategory.categoryId);
    return {
      name: subcategory.name,
      categoryName: category?.name || 'Unknown',
      value: total,
      fullName: `${subcategory.name} (${category?.name})`,
      percentage: 0
    };
  }).filter(item => item.value > 0).sort((a, b) => b.value - a.value);
  const totalSubcategoryExpense = subcategoryData.reduce((sum, item) => sum + item.value, 0);
  subcategoryData.forEach(item => {
    item.percentage = Math.round(item.value / totalSubcategoryExpense * 100);
  });

  // Select data based on current view
  const currentData = dataView === 'category' ? categoryData : subcategoryData;
  const currentColors = dataView === 'category' ? COLORS : SUBCATEGORY_COLORS;

  // Find most spent item based on current view
  const mostSpentItem = currentData.length > 0 ? currentData[0] : null;

  // Monthly spending trend (last 6 months)
  const monthlyData = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthName = date.toLocaleDateString('en-US', {
      month: 'short'
    });
    const monthExpenses = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate.getMonth() === date.getMonth() && transactionDate.getFullYear() === date.getFullYear() && t.type === 'expense';
    }).reduce((sum, t) => sum + t.amount, 0);
    const monthIncome = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate.getMonth() === date.getMonth() && transactionDate.getFullYear() === date.getFullYear() && t.type === 'income';
    }).reduce((sum, t) => sum + t.amount, 0);
    monthlyData.push({
      month: monthName,
      expenses: monthExpenses,
      income: monthIncome
    });
  }
  const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpenses;
  return <div className="space-y-6">
      {/* Date Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filter Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex gap-2 mb-4">
              <Button variant={viewType === 'month' ? 'default' : 'outline'} onClick={() => setViewType('month')}>
                Monthly View
              </Button>
              <Button variant={viewType === 'dateRange' ? 'default' : 'outline'} onClick={() => setViewType('dateRange')}>
                Date Range
              </Button>
            </div>
            
            <div className="flex gap-2 mb-4">
              <Button variant={dataView === 'category' ? 'default' : 'outline'} onClick={() => setDataView('category')}>
                Categories
              </Button>
              <Button variant={dataView === 'subcategory' ? 'default' : 'outline'} onClick={() => setDataView('subcategory')}>
                Subcategories
              </Button>
            </div>
            
            {viewType === 'month' ? <div className="flex gap-2">
                <Input type="number" min={1} max={12} value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} placeholder="Month" className="w-20" />
                <Input type="number" min={2020} max={2030} value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} placeholder="Year" className="w-24" />
              </div> : <div className="flex gap-2">
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} placeholder="Start Date" />
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} placeholder="End Date" />
              </div>}
          </div>
        </CardContent>
      </Card>

      {/* Top Spending Insight - Merged */}
      

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Period Income</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">₪{totalIncome.toLocaleString()}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Period Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-500">₪{totalExpenses.toLocaleString()}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              ₪{netBalance.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Merged Charts - Category or Subcategory */}
      {currentData.length > 0 && <Card>
          <CardHeader>
            <CardTitle>Spending by {dataView === 'category' ? 'Category' : 'Subcategory'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Pie Chart */}
              <div className="h-80 w-full flex justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={currentData.slice(0, 8)} 
                      cx="50%" 
                      cy="50%" 
                      outerRadius={80} 
                      fill="#8884d8" 
                      dataKey="value"
                    >
                      {currentData.slice(0, 8).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={currentColors[index % currentColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={value => [`₪${value.toLocaleString()}`, 'Amount']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Legend */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                {currentData
                  .slice(0, 8)
                  .sort((a, b) => b.value - a.value)
                  .map((entry, index) => {
                    const total = currentData.reduce((sum, item) => sum + item.value, 0);
                    const percentage = ((entry.value / total) * 100).toFixed(1);
                    const originalIndex = currentData.findIndex(item => item.name === entry.name);
                    return (
                      <div key={entry.name} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/30">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: currentColors[originalIndex % currentColors.length] }}
                          />
                          <span className="truncate text-xs font-medium">{entry.name}</span>
                        </div>
                        <div className="text-xs font-semibold text-primary">
                          {percentage}% (₪{entry.value.toLocaleString()})
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </CardContent>
        </Card>}



      {/* Monthly Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Income vs Expenses (6 Month Trend)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={value => `₪${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="income" fill="#10B981" name="Income" />
                <Bar dataKey="expenses" fill="#EF4444" name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>;
};