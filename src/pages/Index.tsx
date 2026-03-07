import { Logo } from "@/components/ui/logo";
import { SettingsDialog } from "@/components/ui/settings-dialog";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { useEffect } from 'react';
import { useSound } from "@/hooks/useSound";
import { useWeather } from "@/hooks/useWeather";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { useEffect } from 'react';
import { initPush } from '@/services/PushService';
// Dashboard Components
import { BentoGrid } from "@/components/dashboard/bento-grid";
import { FinanceCard } from "@/components/dashboard/finance-card";
import { TodayAgendaCard } from "@/components/dashboard/today-agenda-card";
import { GymCard } from "@/components/dashboard/gym-card";
import { SupplementsCard } from "@/components/dashboard/supplements-card";
import { DreamsCardNew } from "@/components/dashboard/dreams-card-new";
import { WeightStatsCard } from "@/components/dashboard/weight-stats-card";
import { TVCard } from "@/components/dashboard/tv-card";
import { GamesCard } from "@/components/dashboard/games-card";
import { SoccerCard } from "@/components/dashboard/soccer-card";

const Index = () => {
  const { click } = useSound();
  const { weather, icon, condition, isLoading: weatherLoading } = useWeather();

  // Register Web Push subscription (background notifications)
  useEffect(() => { initPush().catch(console.error); }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/30 bg-gradient-to-r from-card/95 via-card/90 to-card/95 backdrop-blur-xl sticky top-0 z-50">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/3 via-transparent to-accent/3 pointer-events-none" />
        <div className="container mx-auto px-4 py-3 relative">
          <div className="flex items-center justify-between">
            <Logo size="md" />
            
            <div className="flex items-center gap-2">
              {/* Weather in header */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-secondary/80 to-secondary/50 border border-border/30 transition-all duration-300 hover:border-primary/30 hover:shadow-sm">
                    <span className="text-lg">{icon}</span>
                    <span className="text-sm font-semibold text-foreground">
                      {weather?.temperature ?? '--'}°
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-4" align="end">
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Jenin, Palestine</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-foreground">{weather?.temperature ?? '--'}°</span>
                      <span className="text-xl">{icon}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{condition}</p>
                    <p className="text-xs text-muted-foreground">
                      H: {weather?.high ?? '--'}° L: {weather?.low ?? '--'}°
                    </p>
                  </div>
                </PopoverContent>
              </Popover>

              <SettingsDialog>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 rounded-xl hover:bg-primary/10 transition-all duration-300"
                  onClick={() => click()}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </SettingsDialog>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Dashboard */}
      <main className="container mx-auto px-4 py-6">
        <div className="space-y-4">
          {/* Custom responsive grid */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {/* Soccer card: full width on desktop, 2-cols on tablet, 1-col on mobile */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-4">
              <SoccerCard />
            </div>
            {/* Remaining cards: 4-per-row desktop, 2-per-row tablet, 1-per-row mobile */}
            {/* Weight comes right after Gym */}
            <TodayAgendaCard />
            <FinanceCard />
            <GymCard />
            <WeightStatsCard />
            <TVCard />
            <GamesCard />
            <SupplementsCard />
            <DreamsCardNew />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
