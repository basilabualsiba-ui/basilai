import { useState } from 'react';
import { FinancialProvider, useFinancial } from '@/contexts/FinancialContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { PrivacyProvider } from '@/contexts/PrivacyContext';
import { Button } from '@/components/ui/button';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AccountsOverview } from '@/components/financial/accounts-overview';
import { StatsOverview } from '@/components/financial/stats-overview';
import { TransactionCalendar } from '@/components/financial/transaction-calendar';
import { BudgetCategories } from '@/components/financial/budget-categories';
import { GoalsOverview } from '@/components/financial/goals-overview';
import { FinancialSidebar } from '@/components/financial/financial-sidebar';
import { ArrowLeft, CreditCard, PieChart, Calendar, TrendingUp, Target, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CurrencyRatesDialog } from '@/components/financial/currency-rates-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useSound } from '@/hooks/useSound';

const financialItems = [
  { title: "Accounts", value: "accounts", icon: CreditCard },
  { title: "Transactions", value: "transactions", icon: Calendar },
  { title: "Goals", value: "goals", icon: Target },
  { title: "Stats", value: "stats", icon: TrendingUp }
];

const Financial = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('accounts');
  const { click } = useSound();

  const handleTabChange = (tab: string) => {
    click();
    setActiveTab(tab);
  };

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 flex w-full">
        {/* Header with Gradient */}
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/20 bg-gradient-to-r from-background/95 via-background/90 to-background/95 backdrop-blur-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-teal-500/5 pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
          <div className="container mx-auto px-4 py-3 flex items-center justify-between relative">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => { click(); navigate("/"); }} 
                className="hover:bg-emerald-500/10 hover:text-emerald-500 transition-all duration-300 rounded-xl h-9 w-9"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="relative group">
                  <div className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 shadow-lg shadow-emerald-500/30 transition-transform duration-300 group-hover:scale-105">
                    <Wallet className="h-5 w-5 text-white" />
                  </div>
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 opacity-50 blur-xl -z-10 group-hover:opacity-70 transition-opacity" />
                </div>
                <div>
                  <h1 className="text-lg font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
                    Wallet
                  </h1>
                  <p className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase">Manage finances</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleTabChange('budget')}
                className={`flex items-center gap-2 rounded-xl border-border/40 h-8 text-xs font-medium transition-all duration-300 ${
                  activeTab === 'budget' 
                    ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/40 shadow-sm shadow-emerald-500/10' 
                    : 'hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-600'
                }`}
              >
                <PieChart className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Budget</span>
              </Button>
              <CurrencyRatesDialog isActive={false} />
              <SidebarTrigger className="hover:bg-emerald-500/10 hidden md:flex rounded-xl" />
            </div>
          </div>
        </header>

        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <FinancialSidebar activeTab={activeTab} onTabChange={handleTabChange} />
        </div>

        {/* Main Content with Animation */}
        <main className="flex-1 pt-20 pb-24 md:pb-6 px-4 md:px-6">
          <div className="animate-fade-in max-w-6xl mx-auto">
            {activeTab === 'accounts' && <AccountsOverview />}
            {activeTab === 'budget' && <BudgetCategories />}
            {activeTab === 'transactions' && <TransactionCalendar />}
            {activeTab === 'goals' && <GoalsOverview />}
            {activeTab === 'stats' && <StatsOverview />}
          </div>
        </main>

        {/* Mobile Bottom Tabs with Glass Effect */}
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
          <div className="absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none" />
          <div className="bg-background/80 backdrop-blur-2xl border-t border-border/20 shadow-2xl shadow-black/10">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
            <div className="grid grid-cols-4 h-16 px-2">
              {financialItems.map((item) => (
                <button
                  key={item.value}
                  onClick={() => handleTabChange(item.value)}
                  className={`relative flex flex-col items-center justify-center gap-0.5 transition-all duration-300 rounded-2xl mx-1 ${
                    activeTab === item.value
                      ? 'text-emerald-600'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {activeTab === item.value && (
                    <>
                      <div className="absolute inset-1 bg-gradient-to-b from-emerald-500/15 to-emerald-500/5 rounded-xl" />
                      <div className="absolute top-1 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent rounded-full" />
                    </>
                  )}
                  <div className={`relative z-10 transition-all duration-300 ${
                    activeTab === item.value ? 'scale-110 -translate-y-0.5' : ''
                  }`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className={`relative z-10 text-[10px] font-medium transition-all duration-300 ${
                    activeTab === item.value ? 'font-semibold' : ''
                  }`}>
                    {item.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

const FinancialWithLoading = () => {
  const { isLoading } = useFinancial();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-background to-emerald-500/5">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 shadow-2xl shadow-emerald-500/40 animate-pulse">
              <Wallet className="h-10 w-10 text-white" />
            </div>
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-500 opacity-60 blur-2xl animate-pulse" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 mx-auto" />
            <Skeleton className="h-3 w-24 mx-auto" />
          </div>
        </div>
      </div>
    );
  }
  
  return <Financial />;
};

export default function FinancialWithAuth() {
  return (
    <PrivacyProvider>
      <CurrencyProvider>
        <FinancialProvider>
          <FinancialWithLoading />
        </FinancialProvider>
      </CurrencyProvider>
    </PrivacyProvider>
  );
}
