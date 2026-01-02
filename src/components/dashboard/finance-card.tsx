import { BentoCard } from "./bento-grid";
import { Wallet, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFinancial } from "@/contexts/FinancialContext";
import { useCurrency } from "@/contexts/CurrencyContext";

export function FinanceCard() {
  const navigate = useNavigate();
  const { accounts, transactions } = useFinancial();
  const { getRate, getCurrencySymbol } = useCurrency();

  // Calculate totals
  const totalBalance = accounts.reduce((sum, acc) => {
    const rate = getRate(acc.currency, 'ILS');
    return sum + (acc.amount * rate);
  }, 0);

  // Get today's transactions
  const today = new Date().toISOString().split('T')[0];
  const todayTransactions = transactions.filter(t => String(t.date).split('T')[0] === today);
  const todayExpenses = todayTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const todayIncome = todayTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const formatAmount = (amount: number) => `${getCurrencySymbol('ILS')}${amount.toFixed(0)}`;

  return (
    <BentoCard 
      variant="primary" 
      className="sm:col-span-2 lg:col-span-2"
      onClick={() => navigate('/financial')}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Balance</p>
            <p className="text-2xl font-bold text-foreground">
              {formatAmount(totalBalance)}
            </p>
          </div>
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-success" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Today's Income</p>
            <p className="text-sm font-semibold text-success">+{formatAmount(todayIncome)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-destructive/20 flex items-center justify-center">
            <TrendingDown className="h-4 w-4 text-destructive" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Today's Expenses</p>
            <p className="text-sm font-semibold text-destructive">-{formatAmount(todayExpenses)}</p>
          </div>
        </div>
      </div>
    </BentoCard>
  );
}
