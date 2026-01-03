import { useState } from "react";
import { Logo } from "@/components/ui/logo";
import { SettingsDialog } from "@/components/ui/settings-dialog";
import { Button } from "@/components/ui/button";
import { Settings, User, MessageCircle, LayoutDashboard } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

// Dashboard Components
import { BentoGrid } from "@/components/dashboard/bento-grid";
import { FinanceCard } from "@/components/dashboard/finance-card";
import { TodayAgendaCard } from "@/components/dashboard/today-agenda-card";
import { GymCard } from "@/components/dashboard/gym-card";
import { SupplementsCard } from "@/components/dashboard/supplements-card";
import { DreamsCardNew } from "@/components/dashboard/dreams-card-new";
import { WeightStatsCard } from "@/components/dashboard/weight-stats-card";

// Chat Component
import { ChatInterface } from "@/components/assistant/chat-interface";

const Index = () => {
  const [showChat, setShowChat] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Logo size="md" />
            
            <div className="flex items-center gap-2">
              {/* Toggle Button */}
              <Button
                variant={showChat ? "default" : "outline"}
                size="sm"
                onClick={() => setShowChat(!showChat)}
                className="gap-2"
              >
                {showChat ? (
                  <>
                    <LayoutDashboard className="h-4 w-4" />
                    {!isMobile && "Dashboard"}
                  </>
                ) : (
                  <>
                    <MessageCircle className="h-4 w-4" />
                    {!isMobile && "Assistant"}
                  </>
                )}
              </Button>

              {/* User Profile */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50 transition-all hover:border-primary/30">
                {!isMobile && (
                  <span className="text-sm font-medium text-foreground">Basil</span>
                )}
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-primary">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
              </div>

              <SettingsDialog>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Settings className="h-4 w-4" />
                </Button>
              </SettingsDialog>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Flip between Dashboard and Chat */}
      <main className="container mx-auto px-4 py-6">
        <div className={cn(
          "transition-all duration-500 ease-in-out",
          showChat ? "opacity-0 hidden" : "opacity-100 animate-fade-in"
        )}>
          {/* Dashboard View */}
          <div className="space-y-4">
            <BentoGrid>
              <FinanceCard />
              <TodayAgendaCard />
              <GymCard />
              <SupplementsCard />
              <WeightStatsCard />
              <DreamsCardNew />
            </BentoGrid>
          </div>
        </div>

        <div className={cn(
          "transition-all duration-500 ease-in-out",
          showChat ? "opacity-100 animate-fade-in" : "opacity-0 hidden"
        )}>
          {/* Chat View */}
          <div className="h-[calc(100vh-120px)] rounded-2xl border border-border overflow-hidden bg-card/50 backdrop-blur-sm">
            <ChatInterface />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
