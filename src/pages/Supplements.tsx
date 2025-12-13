import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Pill, Calendar, List } from 'lucide-react';
import { SupplementProvider, useSupplement } from '@/contexts/SupplementContext';
import { SupplementList } from '@/components/supplements/supplement-list';
import { SupplementCalendar } from '@/components/supplements/supplement-calendar';
import { LowStockAlert } from '@/components/supplements/low-stock-alert';
import { cn } from '@/lib/utils';

type TabType = 'calendar' | 'supplements';

function SupplementsContent() {
  const { isLoading } = useSupplement();
  const [activeTab, setActiveTab] = useState<TabType>('calendar');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Pill className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold">Supplement Tracker</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        <LowStockAlert />
        
        {activeTab === 'calendar' ? (
          <SupplementCalendar />
        ) : (
          <SupplementList />
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t">
        <div className="flex">
          <button
            onClick={() => setActiveTab('calendar')}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-3 transition-colors",
              activeTab === 'calendar' ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Calendar className="h-5 w-5" />
            <span className="text-xs">Calendar</span>
          </button>
          <button
            onClick={() => setActiveTab('supplements')}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-3 transition-colors",
              activeTab === 'supplements' ? "text-primary" : "text-muted-foreground"
            )}
          >
            <List className="h-5 w-5" />
            <span className="text-xs">Supplements</span>
          </button>
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
