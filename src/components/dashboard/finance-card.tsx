import { useState, useMemo } from "react";
import { BentoCard } from "./bento-grid";
import { Wallet, TrendingUp, TrendingDown, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFinancial } from "@/contexts/FinancialContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Button } from "@/components/ui/button";
import { Sparkline } from "@/components/ui/sparkline";
import { AnimatedNumber } from "@/components/ui/animated-number";

export function FinanceCard() {
  const navigate = useNavigate();
  const { accounts, transactions } = useFinancial();
  const { getRate, getCurrencySymbol } = useCurrency();

  // Calculate totals
  const totalBalance = accounts.reduce((sum, acc) => {
    const rate = getRate(acc.currency, 'ILS');
    return sum + (acc.amount * rate);
  }, 0);

  // Get current month transactions only
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const monthTransactions = transactions.filter(t => {
    const transactionDate = String(t.date).split('T')[0];
    return transactionDate >= monthStart;
  });
  
  const monthlyExpenses = monthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const monthlyIncome = monthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  // Calculate last 7 days spending for sparkline
  const spendingTrend = useMemo(() => {
    const last7Days: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayExpenses = transactions
        .filter(t => t.type === 'expense' && String(t.date).split('T')[0] === dateStr)
        .reduce((sum, t) => sum + t.amount, 0);
      last7Days.push(dayExpenses);
    }
    return last7Days;
  }, [transactions]);

  const currencySymbol = getCurrencySymbol('ILS');

  const handleCardClick = () => {
    navigate('/financial');
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate('/financial?tab=transactions');
  };

  return (
    <BentoCard 
      className="sm:col-span-2 lg:col-span-2 group"
      onClick={handleCardClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-wallet/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Wallet className="h-6 w-6 text-wallet" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Balance</p>
            <p className="text-2xl font-bold text-foreground">
              {currencySymbol}
              <AnimatedNumber 
                value={totalBalance} 
                formatValue={(v) => Math.round(v).toLocaleString()}
              />
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-wallet hover:bg-wallet/10"
          onClick={handleAddClick}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Sparkline */}
      {spendingTrend.some(v => v > 0) && (
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-1">Last 7 days spending</p>
          <Sparkline data={spendingTrend} color="wallet" height={32} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-success" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">This Month Income</p>
            <p className="text-sm font-semibold text-success">
              +{currencySymbol}
              <AnimatedNumber 
                value={monthlyIncome} 
                formatValue={(v) => Math.round(v).toLocaleString()}
              />
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-destructive/20 flex items-center justify-center">
            <TrendingDown className="h-4 w-4 text-destructive" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">This Month Expenses</p>
            <p className="text-sm font-semibold text-destructive">
              -{currencySymbol}
              <AnimatedNumber 
                value={monthlyExpenses} 
                formatValue={(v) => Math.round(v).toLocaleString()}
              />
            </p>
          </div>
        </div>
      </div>
    </BentoCard>
  );
}
