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
import { ArrowLeft, CreditCard, PieChart, Calendar, TrendingUp, Target, Wallet, Sparkles } from "lucide-react";
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
      <div className="min-h-screen bg-background flex w-full">
        {/* Header with Gradient */}
        <header className="absolute top-0 left-0 right-0 z-50 border-b border-border/30 bg-gradient-to-r from-card/95 via-card/90 to-card/95 backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 pointer-events-none" />
          <div className="container mx-auto px-4 py-4 flex items-center justify-between relative">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => { click(); navigate("/"); }} 
                className="hover:bg-primary/10 hover:text-primary transition-all duration-300 rounded-xl"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary via-primary to-accent shadow-lg shadow-primary/25">
                    <Wallet className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-accent opacity-40 blur-lg -z-10" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                    Wallet
                  </h1>
                  <p className="text-xs text-muted-foreground">Manage your finances</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleTabChange('budget')}
                className={`flex items-center gap-2 rounded-xl border-border/50 transition-all duration-300 ${
                  activeTab === 'budget' 
                    ? 'bg-primary/10 text-primary border-primary/30 shadow-sm shadow-primary/10' 
                    : 'hover:bg-primary/5 hover:border-primary/20'
                }`}
              >
                <PieChart className="h-4 w-4" />
                <span className="hidden sm:inline">Budget</span>
              </Button>
              <CurrencyRatesDialog isActive={false} />
              <SidebarTrigger className="hover:bg-primary/10 hidden md:flex rounded-xl" />
            </div>
          </div>
        </header>

        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <FinancialSidebar activeTab={activeTab} onTabChange={handleTabChange} />
        </div>

        {/* Main Content with Animation */}
        <main className="flex-1 pt-24 pb-24 md:pb-6 px-4 md:px-6">
          <div className="animate-fade-in">
            {activeTab === 'accounts' && <AccountsOverview />}
            {activeTab === 'budget' && <BudgetCategories />}
            {activeTab === 'transactions' && <TransactionCalendar />}
            {activeTab === 'goals' && <GoalsOverview />}
            {activeTab === 'stats' && <StatsOverview />}
          </div>
        </main>

        {/* Mobile Bottom Tabs with Glow */}
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
          <div className="absolute inset-x-0 -top-6 h-6 bg-gradient-to-t from-background to-transparent pointer-events-none" />
          <div className="bg-card/95 backdrop-blur-xl border-t border-border/30">
            <div className="grid grid-cols-4 h-16">
              {financialItems.map((item) => (
                <button
                  key={item.value}
                  onClick={() => handleTabChange(item.value)}
                  className={`relative flex flex-col items-center justify-center gap-1 transition-all duration-300 ${
                    activeTab === item.value
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {activeTab === item.value && (
                    <div className="absolute inset-0 bg-primary/10 rounded-t-2xl" />
                  )}
                  <div className={`relative z-10 transition-transform duration-300 ${
                    activeTab === item.value ? 'scale-110' : ''
                  }`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className={`relative z-10 text-xs font-medium transition-all duration-300 ${
                    activeTab === item.value ? 'font-semibold' : ''
                  }`}>
                    {item.title}
                  </span>
                  {activeTab === item.value && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                  )}
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-primary via-primary to-accent shadow-xl shadow-primary/30 animate-pulse">
              <Wallet className="h-8 w-8 text-primary-foreground" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-accent opacity-50 blur-xl animate-pulse-glow" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-48 mx-auto" />
            <Skeleton className="h-3 w-32 mx-auto" />
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
