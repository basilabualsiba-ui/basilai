import { useState } from 'react';
import { FinancialProvider, useFinancial } from '@/contexts/FinancialContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { PrivacyProvider } from '@/contexts/PrivacyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AccountsOverview } from '@/components/financial/accounts-overview';
import { StatsOverview } from '@/components/financial/stats-overview';
import { TransactionCalendar } from '@/components/financial/transaction-calendar';
import { BudgetCategories } from '@/components/financial/budget-categories';
import { GoalsOverview } from '@/components/financial/goals-overview';

import { FinancialSidebar } from '@/components/financial/financial-sidebar';

import { ArrowLeft, CreditCard, PieChart, Calendar, TrendingUp, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CurrencyRatesDialog } from '@/components/financial/currency-rates-dialog';

const financialItems = [
  { title: "Accounts", value: "accounts", icon: CreditCard },
  { title: "Transactions", value: "transactions", icon: Calendar },
  { title: "Goals", value: "goals", icon: Target },
  { title: "Stats", value: "stats", icon: TrendingUp }
];

const Financial = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('accounts');


  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background flex w-full">
        {/* Header */}
        <header className="absolute top-0 left-0 right-0 z-50 border-b border-border/50 bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="hover:bg-muted">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-gradient-accent">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <h1 className="text-xl font-bold text-foreground">Wallet</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setActiveTab('budget')}
                className={`flex items-center gap-2 ${activeTab === 'budget' ? 'bg-primary/10 text-primary' : ''}`}
              >
                <PieChart className="h-4 w-4" />
                <span className="hidden sm:inline">Budget</span>
              </Button>
              <CurrencyRatesDialog isActive={false} />
              {/* Desktop sidebar trigger */}
              <SidebarTrigger className="hover:bg-muted hidden md:flex" />
            </div>
          </div>
        </header>

        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <FinancialSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* Main Content */}
        <main className="flex-1 pt-20 pb-20 md:pb-6 p-6">
          {activeTab === 'accounts' && <AccountsOverview />}
          {activeTab === 'budget' && <BudgetCategories />}
          {activeTab === 'transactions' && <TransactionCalendar />}
          {activeTab === 'goals' && <GoalsOverview />}
          {activeTab === 'stats' && <StatsOverview />}
        </main>

        {/* Mobile Bottom Tabs */}
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card border-t border-border">
          <div className="grid grid-cols-4 h-16">
            {financialItems.map((item) => (
              <button
                key={item.value}
                onClick={() => setActiveTab(item.value)}
                className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                  activeTab === item.value
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.title}</span>
              </button>
            ))}
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Loading your financial data...</h2>
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