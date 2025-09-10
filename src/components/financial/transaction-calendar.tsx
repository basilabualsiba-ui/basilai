import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter } from "lucide-react";
import { SwipeableTransaction } from "./swipeable-transaction";
import { AddTransactionDialog } from "./add-transaction-dialog";
import { toast } from "sonner";
import { useFinancial } from "@/contexts/FinancialContext";
export const TransactionCalendar = () => {
  const {
    transactions: contextTransactions,
    deleteTransaction,
    categories,
    accounts
  } = useFinancial();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [editingTransaction, setEditingTransaction] = useState<any>(null);

  // Helper function to check if two dates are the same day
  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getDate() === date2.getDate() && date1.getMonth() === date2.getMonth() && date1.getFullYear() === date2.getFullYear();
  };

  // Calculate data for selected date (excluding transfers from balance calculation)
  const selectedDateTransactions = contextTransactions.filter(trans => isSameDay(trans.date, selectedDate));
  const selectedDateIncome = selectedDateTransactions.filter(trans => trans.type === 'income').reduce((sum, trans) => sum + trans.amount, 0);
  const selectedDateExpense = selectedDateTransactions.filter(trans => trans.type === 'expense').reduce((sum, trans) => sum + trans.amount, 0);
  const selectedDateBalance = selectedDateIncome - selectedDateExpense;
  const selectedDateData = {
    income: `₪${selectedDateIncome.toLocaleString()}`,
    expense: `₪${selectedDateExpense.toLocaleString()}`,
    balance: `${selectedDateBalance >= 0 ? '' : '-'}₪${Math.abs(selectedDateBalance).toLocaleString()}`
  };


  // Filter transactions for selected date
  const filteredTransactions = contextTransactions.filter(trans => isSameDay(trans.date, selectedDate));

  // Convert filtered transactions to display format and sort by time
  const transactions = filteredTransactions
    .map(trans => {
    const category = categories.find(c => c.id === trans.categoryId);
    const account = accounts.find(a => a.id === trans.accountId);
    const isTransfer = trans.type === 'transfer';

    // Resolve subcategory name
    const subcategoryName = categories
      .flatMap(c => c.subcategories)
      .find(sub => sub.id === trans.subcategoryId)?.name;
    
    // Get correct currency symbol based on account
    const getCurrencySymbol = (currency: string) => {
      switch (currency) {
        case 'USD': return '$';
        case 'EUR': return '€';
        case 'GBP': return '£';
        case 'JPY': return '¥';
        case 'CAD': return 'C$';
        case 'AUD': return 'A$';
        case 'CHF': return 'CHF';
        case 'JOD': return 'JD';
        case 'ILS':
        default: return '₪';
      }
    };
    
    const currencySymbol = getCurrencySymbol(account?.currency || 'ILS');
    
    return {
      ...trans,
      amount: `${currencySymbol}${Math.abs(trans.amount).toLocaleString()}`,
      type: isTransfer ? 'TRANSFER' : trans.type === 'expense' ? 'OUT' : 'IN',
      category: category?.name || 'Unknown',
      subcategory: subcategoryName || undefined,
      account: account ? { name: account.name, icon: account.icon, type: account.type } : undefined,
      time: trans.time || trans.date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      date: trans.date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      }),
      isExpense: trans.type === 'expense',
      isTransfer: isTransfer,
      created_at: trans.date.toISOString(),
      icon: account?.icon
    };
  })
  .sort((a, b) => {
    // Convert time strings to comparable format for sorting (most recent first)
    const timeA = a.time.replace(/(\d+):(\d+)\s*(AM|PM)/, (match, hour, minute, period) => {
      let h = parseInt(hour);
      if (period === 'PM' && h !== 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      return `${h.toString().padStart(2, '0')}:${minute}`;
    });
    const timeB = b.time.replace(/(\d+):(\d+)\s*(AM|PM)/, (match, hour, minute, period) => {
      let h = parseInt(hour);
      if (period === 'PM' && h !== 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      return `${h.toString().padStart(2, '0')}:${minute}`;
    });
    return timeB.localeCompare(timeA); // Descending order (latest first)
  });

  // Handle month navigation
  const goToPreviousMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    setCurrentMonth(newMonth);
    // Update selected date to be in the new month
    const newSelectedDate = new Date(newMonth);
    newSelectedDate.setDate(1);
    setSelectedDate(newSelectedDate);
  };
  const goToNextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    setCurrentMonth(newMonth);
    // Update selected date to be in the new month
    const newSelectedDate = new Date(newMonth);
    newSelectedDate.setDate(1);
    setSelectedDate(newSelectedDate);
  };

  // Handle date click
  const handleDateClick = (day: number) => {
    if (day > 0 && day <= 31) {
      const newDate = new Date(currentMonth);
      newDate.setDate(day);
      setSelectedDate(newDate);
    }
  };
  // Calculate daily balances from actual transactions (excluding transfers)
  const getDailyBalance = (day: number) => {
    const targetDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dayTransactions = contextTransactions.filter(trans => isSameDay(trans.date, targetDate));
    const income = dayTransactions.filter(trans => trans.type === 'income').reduce((sum, trans) => sum + trans.amount, 0);
    const expense = dayTransactions.filter(trans => trans.type === 'expense').reduce((sum, trans) => sum + trans.amount, 0);
    const balance = income - expense;
    return {
      balance,
      hasTransaction: dayTransactions.length > 0,
      amount: balance !== 0 ? `₪${balance.toLocaleString()}` : '',
      isPositive: balance >= 0
    };
  };

  // Get proper calendar layout for current month
  const getCalendarDays = () => {
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const adjustedStartingDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1; // Convert Sunday (0) to 6, Monday (1) to 0, etc.

    return {
      daysInMonth,
      adjustedStartingDay
    };
  };
  const {
    daysInMonth,
    adjustedStartingDay
  } = getCalendarDays();
  return <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-lg">{currentMonth.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
          })}</span>
          <Button variant="ghost" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
      </div>

      {/* Calendar */}
      <Card className="p-0 overflow-hidden">
        <CardContent className="p-0">
          {/* Custom Calendar Grid */}
          <div className="grid grid-cols-7 gap-0 text-center text-sm">
            {/* Header */}
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <div key={day} className="p-3 border-b border-border text-muted-foreground font-medium">
                {day}
              </div>)}
            
            {/* Calendar Days */}
            {Array.from({
            length: 42
          }, (_, i) => {
            const dayNumber = i - adjustedStartingDay + 1;
            const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
            const dailyData = isCurrentMonth ? getDailyBalance(dayNumber) : {
              hasTransaction: false,
              isPositive: false,
              amount: ''
            };
            const isSelected = isCurrentMonth && dayNumber === selectedDate.getDate() && currentMonth.getMonth() === selectedDate.getMonth() && currentMonth.getFullYear() === selectedDate.getFullYear();
            const isToday = isCurrentMonth && dayNumber === new Date().getDate() && currentMonth.getMonth() === new Date().getMonth() && currentMonth.getFullYear() === new Date().getFullYear();

            // Calculate display day for prev/next month
            let displayDay = dayNumber;
            if (dayNumber <= 0) {
              const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 0);
              displayDay = prevMonth.getDate() + dayNumber;
            } else if (dayNumber > daysInMonth) {
              displayDay = dayNumber - daysInMonth;
            }
            return <div key={i} className={`p-3 h-16 border-b border-r border-border flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors ${!isCurrentMonth ? 'text-muted-foreground' : ''} ${isSelected ? 'bg-primary/10 ring-2 ring-primary/30' : ''}`} onClick={() => handleDateClick(dayNumber)}>
                  <span className={`text-sm ${isSelected ? 'font-bold text-primary' : isToday ? 'font-bold text-foreground' : ''}`}>
                    {displayDay}
                  </span>
                  {dailyData.hasTransaction && dailyData.amount && <div className={`mt-1 px-2 py-0.5 text-xs rounded-full font-medium ${dailyData.isPositive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {dailyData.amount}
                    </div>}
                </div>;
          })}
          </div>

          {/* Tooltip */}
          
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Income</p>
              <p className="text-lg font-bold text-green-600">{selectedDateData.income}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Expense</p>
              <p className="text-lg font-bold text-red-500">{selectedDateData.expense}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Balance</p>
              <p className={`text-lg font-bold ${selectedDateBalance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {selectedDateData.balance}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <div className="space-y-2">
        {transactions.map((transaction, index) => <SwipeableTransaction key={transaction.id} transaction={transaction} onEdit={() => {
        // Find the original transaction from context to get proper Date object
        const originalTransaction = contextTransactions.find(t => t.id === transaction.id);
        setEditingTransaction({
          id: transaction.id,
          amount: parseFloat(transaction.amount.replace(/[^\d.-]/g, '')),
          type: transaction.type === 'OUT' ? 'expense' : transaction.type === 'IN' ? 'income' : 'transfer',
          categoryId: transaction.categoryId,
          subcategoryId: transaction.subcategoryId,
          accountId: transaction.accountId,
          description: transaction.description || '',
          date: originalTransaction?.date || new Date(), // Use original Date object
          time: transaction.time
        });
      }} onDelete={() => {
        deleteTransaction(transaction.id);
        toast.success("Transaction deleted successfully");
      }} />)}
      </div>

      {/* Edit Transaction Dialog */}
      {editingTransaction && <AddTransactionDialog trigger={<div />} editTransaction={editingTransaction} onEditComplete={() => setEditingTransaction(null)} />}

      {/* Bottom Navigation */}
      
    </div>;
};