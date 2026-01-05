import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Pill, Calendar, List, AlertTriangle } from 'lucide-react';
import { SupplementProvider, useSupplement } from '@/contexts/SupplementContext';
import { SupplementList } from '@/components/supplements/supplement-list';
import { SupplementCalendar } from '@/components/supplements/supplement-calendar';
import { LowStockAlert } from '@/components/supplements/low-stock-alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useSound } from '@/hooks/useSound';
import { cn } from '@/lib/utils';

type TabType = 'calendar' | 'supplements';

function SupplementsContent() {
  const { isLoading, supplements } = useSupplement();
  const [activeTab, setActiveTab] = useState<TabType>('calendar');
  const { click } = useSound();

  const lowStockCount = supplements.filter(s => s.remaining_doses <= s.warning_threshold).length;

  const handleTabChange = (tab: TabType) => {
    click();
    setActiveTab(tab);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-background to-supplements/5">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="p-5 rounded-3xl bg-gradient-to-br from-supplements via-purple-600 to-violet-600 shadow-2xl shadow-supplements/40 animate-pulse">
              <Pill className="h-10 w-10 text-white" />
            </div>
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-supplements to-violet-500 opacity-60 blur-2xl animate-pulse" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 mx-auto" />
            <Skeleton className="h-3 w-24 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-supplements/5 pb-24">
      {/* Header with Gradient - Supplements Purple Theme */}
      <div className="fixed top-0 left-0 right-0 z-50 border-b border-border/20 bg-gradient-to-r from-background/95 via-background/90 to-background/95 backdrop-blur-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-supplements/5 via-transparent to-supplements/5 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-supplements/30 to-transparent" />
        <div className="flex items-center justify-between p-4 relative">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => click()}
                className="hover:bg-supplements/10 hover:text-supplements transition-all duration-300 rounded-xl h-9 w-9"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="relative group">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-supplements via-purple-600 to-violet-600 shadow-lg shadow-supplements/30 transition-transform duration-300 group-hover:scale-105">
                  <Pill className="h-5 w-5 text-white" />
                </div>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-supplements to-violet-500 opacity-50 blur-xl -z-10 group-hover:opacity-70 transition-opacity" />
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
                  Supplements
                </h1>
                <p className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase">
                  {supplements.length} tracked
                </p>
              </div>
            </div>
          </div>
          {lowStockCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/30 text-amber-600 text-xs font-semibold animate-pulse">
              <AlertTriangle className="h-3.5 w-3.5" />
              {lowStockCount} low
            </div>
          )}
        </div>
      </div>

      {/* Content with Animation */}
      <div className="p-4 space-y-4 pt-24 animate-fade-in max-w-2xl mx-auto">
        <LowStockAlert />
        
        {activeTab === 'calendar' ? (
          <SupplementCalendar />
        ) : (
          <SupplementList />
        )}
      </div>

      {/* Bottom Navigation with Glass Effect - Supplements Purple Theme */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        <div className="bg-background/80 backdrop-blur-2xl border-t border-border/20 shadow-2xl shadow-black/10">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-supplements/30 to-transparent" />
          <div className="flex max-w-md mx-auto">
            <button
              onClick={() => handleTabChange('calendar')}
              className={cn(
                "relative flex-1 flex flex-col items-center gap-0.5 py-4 transition-all duration-300 rounded-2xl mx-2 my-1",
                activeTab === 'calendar' ? "text-supplements" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {activeTab === 'calendar' && (
                <>
                  <div className="absolute inset-1 bg-gradient-to-b from-supplements/15 to-supplements/5 rounded-xl" />
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-transparent via-supplements to-transparent rounded-full" />
                </>
              )}
              <div className={`relative z-10 transition-all duration-300 ${activeTab === 'calendar' ? 'scale-110 -translate-y-0.5' : ''}`}>
                <Calendar className="h-5 w-5" />
              </div>
              <span className={`relative z-10 text-[10px] font-medium ${activeTab === 'calendar' ? 'font-semibold' : ''}`}>
                Calendar
              </span>
            </button>
            <button
              onClick={() => handleTabChange('supplements')}
              className={cn(
                "relative flex-1 flex flex-col items-center gap-0.5 py-4 transition-all duration-300 rounded-2xl mx-2 my-1",
                activeTab === 'supplements' ? "text-supplements" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {activeTab === 'supplements' && (
                <>
                  <div className="absolute inset-1 bg-gradient-to-b from-supplements/15 to-supplements/5 rounded-xl" />
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-transparent via-supplements to-transparent rounded-full" />
                </>
              )}
              <div className={`relative z-10 transition-all duration-300 ${activeTab === 'supplements' ? 'scale-110 -translate-y-0.5' : ''}`}>
                <List className="h-5 w-5" />
              </div>
              <span className={`relative z-10 text-[10px] font-medium ${activeTab === 'supplements' ? 'font-semibold' : ''}`}>
                Supplements
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Supplements() {
  return (
    <SupplementProvider>
      <SupplementsContent />
    </SupplementProvider>
  );
}
