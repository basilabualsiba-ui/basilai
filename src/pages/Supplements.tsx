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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500 via-purple-600 to-violet-600 shadow-xl shadow-purple-500/30 animate-pulse">
              <Pill className="h-8 w-8 text-white" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-500 opacity-50 blur-xl animate-pulse-glow" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-48 mx-auto" />
            <Skeleton className="h-3 w-32 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header with Gradient */}
      <div className="sticky top-0 z-50 border-b border-border/30 bg-gradient-to-r from-card/95 via-card/90 to-card/95 backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-violet-500/5 pointer-events-none" />
        <div className="flex items-center justify-between p-4 relative">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => click()}
                className="hover:bg-purple-500/10 hover:text-purple-500 transition-all duration-300 rounded-xl"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 via-purple-600 to-violet-600 shadow-lg shadow-purple-500/25">
                  <Pill className="h-5 w-5 text-white" />
                </div>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 opacity-40 blur-lg -z-10" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                  Supplements
                </h1>
                <p className="text-xs text-muted-foreground">
                  {supplements.length} supplements tracked
                </p>
              </div>
            </div>
          </div>
          {lowStockCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-medium">
              <AlertTriangle className="h-3 w-3" />
              {lowStockCount} low
            </div>
          )}
        </div>
      </div>

      {/* Content with Animation */}
      <div className="p-4 space-y-4 animate-fade-in">
        <LowStockAlert />
        
        {activeTab === 'calendar' ? (
          <SupplementCalendar />
        ) : (
          <SupplementList />
        )}
      </div>

      {/* Bottom Navigation with Glow */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="absolute inset-x-0 -top-6 h-6 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        <div className="bg-card/95 backdrop-blur-xl border-t border-border/30">
          <div className="flex">
            <button
              onClick={() => handleTabChange('calendar')}
              className={cn(
                "relative flex-1 flex flex-col items-center gap-1 py-4 transition-all duration-300",
                activeTab === 'calendar' ? "text-purple-500" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {activeTab === 'calendar' && (
                <div className="absolute inset-0 bg-purple-500/10 rounded-t-2xl" />
              )}
              <div className={`relative z-10 transition-transform duration-300 ${activeTab === 'calendar' ? 'scale-110' : ''}`}>
                <Calendar className="h-5 w-5" />
              </div>
              <span className={`relative z-10 text-xs font-medium ${activeTab === 'calendar' ? 'font-semibold' : ''}`}>
                Calendar
              </span>
              {activeTab === 'calendar' && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-purple-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => handleTabChange('supplements')}
              className={cn(
                "relative flex-1 flex flex-col items-center gap-1 py-4 transition-all duration-300",
                activeTab === 'supplements' ? "text-purple-500" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {activeTab === 'supplements' && (
                <div className="absolute inset-0 bg-purple-500/10 rounded-t-2xl" />
              )}
              <div className={`relative z-10 transition-transform duration-300 ${activeTab === 'supplements' ? 'scale-110' : ''}`}>
                <List className="h-5 w-5" />
              </div>
              <span className={`relative z-10 text-xs font-medium ${activeTab === 'supplements' ? 'font-semibold' : ''}`}>
                Supplements
              </span>
              {activeTab === 'supplements' && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-purple-500 rounded-full" />
              )}
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
