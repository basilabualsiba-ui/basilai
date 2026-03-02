import { useMemo } from "react";
import { BentoCard } from "./bento-grid";
import { Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFinancial } from "@/contexts/FinancialContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Sparkline } from "@/components/ui/sparkline";
import { AnimatedNumber } from "@/components/ui/animated-number";

export function FinanceCard() {
  const navigate = useNavigate();
  const { accounts, transactions } = useFinancial();
  const { getRate, getCurrencySymbol } = useCurrency();

  const totalBalance = accounts.reduce((sum, acc) => {
    const rate = getRate(acc.currency, 'ILS');
    return sum + (acc.amount * rate);
  }, 0);

  // Last 7 days spending for sparkline
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

  return (
    <BentoCard 
      className="sm:col-span-2 lg:col-span-2 group"
      onClick={() => navigate('/financial')}
    >
      <div className="flex items-center gap-3 mb-3">
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

      {spendingTrend.some(v => v > 0) && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Last 7 days spending</p>
          <Sparkline data={spendingTrend} color="wallet" height={32} />
        </div>
      )}
    </BentoCard>
  );
}
