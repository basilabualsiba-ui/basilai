import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, ArrowRightLeft } from "lucide-react";
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

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getDate() === date2.getDate() && date1.getMonth() === date2.getMonth() && date1.getFullYear() === date2.getFullYear();
  };

  const selectedDateTransactions = contextTransactions.filter(trans => isSameDay(trans.date, selectedDate));
  const selectedDateIncome = selectedDateTransactions.filter(trans => trans.type === 'income').reduce((sum, trans) => sum + trans.amount, 0);
  const selectedDateExpense = selectedDateTransactions.filter(trans => trans.type === 'expense').reduce((sum, trans) => sum + trans.amount, 0);
  const selectedDateBalance = selectedDateIncome - selectedDateExpense;

  const filteredTransactions = contextTransactions.filter(trans => isSameDay(trans.date, selectedDate));

  const transactions = filteredTransactions
    .map(trans => {
      const category = categories.find(c => c.id === trans.categoryId);
      const account = accounts.find(a => a.id === trans.accountId);
      const isTransfer = trans.type === 'transfer';
      const subcategoryName = categories
        .flatMap(c => c.subcategories)
        .find(sub => sub.id === trans.subcategoryId)?.name;
      
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
        time: trans.time || trans.date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        date: trans.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        isExpense: trans.type === 'expense',
        isTransfer: isTransfer,
        created_at: trans.date.toISOString(),
        icon: account?.icon
      };
    })
    .sort((a, b) => {
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
      return timeB.localeCompare(timeA);
    });

  const goToPreviousMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    setCurrentMonth(newMonth);
    const newSelectedDate = new Date(newMonth);
    newSelectedDate.setDate(1);
    setSelectedDate(newSelectedDate);
  };

  const goToNextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    setCurrentMonth(newMonth);
    const newSelectedDate = new Date(newMonth);
    newSelectedDate.setDate(1);
    setSelectedDate(newSelectedDate);
  };

  const handleDateClick = (day: number) => {
    if (day > 0 && day <= 31) {
      const newDate = new Date(currentMonth);
      newDate.setDate(day);
      setSelectedDate(newDate);
    }
  };

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

  const getCalendarDays = () => {
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const adjustedStartingDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
    return { daysInMonth, adjustedStartingDay };
  };

  const { daysInMonth, adjustedStartingDay } = getCalendarDays();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={goToPreviousMonth}
          className="rounded-xl hover:bg-emerald-500/10 hover:text-emerald-600 h-9 w-9"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-bold text-lg">{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={goToNextMonth}
          className="rounded-xl hover:bg-emerald-500/10 hover:text-emerald-600 h-9 w-9"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar */}
      <Card className="overflow-hidden border border-border/40 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-0">
          <div className="grid grid-cols-7 gap-0 text-center text-sm">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="p-2.5 border-b border-border/30 text-xs text-muted-foreground font-semibold bg-muted/30">
                {day}
              </div>
            ))}
            
            {Array.from({ length: 42 }, (_, i) => {
              const dayNumber = i - adjustedStartingDay + 1;
              const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
              const dailyData = isCurrentMonth ? getDailyBalance(dayNumber) : { hasTransaction: false, isPositive: false, amount: '' };
              const isSelected = isCurrentMonth && dayNumber === selectedDate.getDate() && currentMonth.getMonth() === selectedDate.getMonth() && currentMonth.getFullYear() === selectedDate.getFullYear();
              const isToday = isCurrentMonth && dayNumber === new Date().getDate() && currentMonth.getMonth() === new Date().getMonth() && currentMonth.getFullYear() === new Date().getFullYear();

              let displayDay = dayNumber;
              if (dayNumber <= 0) {
                const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 0);
                displayDay = prevMonth.getDate() + dayNumber;
              } else if (dayNumber > daysInMonth) {
                displayDay = dayNumber - daysInMonth;
              }

              return (
                <div 
                  key={i} 
                  className={`p-1.5 h-14 border-b border-r border-border/20 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
                    !isCurrentMonth ? 'text-muted-foreground/40' : 'hover:bg-emerald-500/5'
                  } ${isSelected ? 'bg-emerald-500/15 ring-1 ring-emerald-500/40' : ''}`} 
                  onClick={() => handleDateClick(dayNumber)}
                >
                  <span className={`text-xs ${
                    isSelected ? 'font-bold text-emerald-600' : 
                    isToday ? 'font-bold text-foreground bg-emerald-500 text-white rounded-full w-5 h-5 flex items-center justify-center' : ''
                  }`}>
                    {isToday && !isSelected ? displayDay : displayDay}
                  </span>
                  {dailyData.hasTransaction && dailyData.amount && (
                    <div className={`mt-0.5 px-1.5 py-0.5 text-[10px] rounded-full font-semibold ${
                      dailyData.isPositive 
                        ? 'bg-green-500/15 text-green-600' 
                        : 'bg-red-500/15 text-red-500'
                    }`}>
                      {dailyData.amount}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="border border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-3 divide-x divide-border/30">
            <div className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                <span className="text-xs text-muted-foreground font-medium">Income</span>
              </div>
              <p className="text-lg font-bold text-green-500">₪{selectedDateIncome.toLocaleString()}</p>
            </div>
            <div className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                <span className="text-xs text-muted-foreground font-medium">Expense</span>
              </div>
              <p className="text-lg font-bold text-red-500">₪{selectedDateExpense.toLocaleString()}</p>
            </div>
            <div className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">Balance</span>
              </div>
              <p className={`text-lg font-bold ${selectedDateBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {selectedDateBalance >= 0 ? '' : '-'}₪{Math.abs(selectedDateBalance).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <div className="space-y-2">
        {transactions.length === 0 ? (
          <div className="text-center py-10">
            <div className="p-4 rounded-2xl bg-muted/30 inline-block mb-3">
              <ArrowRightLeft className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground text-sm">No transactions for this day</p>
          </div>
        ) : (
          transactions.map((transaction) => (
            <SwipeableTransaction 
              key={transaction.id} 
              transaction={transaction} 
              onEdit={() => {
                const originalTransaction = contextTransactions.find(t => t.id === transaction.id);
                setEditingTransaction({
                  id: transaction.id,
                  amount: parseFloat(transaction.amount.replace(/[^\d.-]/g, '')),
                  type: transaction.type === 'OUT' ? 'expense' : transaction.type === 'IN' ? 'income' : 'transfer',
                  categoryId: transaction.categoryId,
                  subcategoryId: transaction.subcategoryId,
                  accountId: transaction.accountId,
                  description: transaction.description || '',
                  date: originalTransaction?.date || new Date(),
                  time: transaction.time
                });
              }} 
              onDelete={() => {
                deleteTransaction(transaction.id);
                toast.success("Transaction deleted successfully");
              }} 
            />
          ))
        )}
      </div>

      {/* Edit Transaction Dialog */}
      {editingTransaction && (
        <AddTransactionDialog 
          trigger={<div />} 
          editTransaction={editingTransaction} 
          onEditComplete={() => setEditingTransaction(null)} 
        />
      )}
    </div>
  );
};
