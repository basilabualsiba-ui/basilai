import { useState } from "react";
import { Logo } from "@/components/ui/logo";
import { SettingsDialog } from "@/components/ui/settings-dialog";
import { Button } from "@/components/ui/button";
import { Settings, User, MessageCircle, LayoutDashboard, Sparkles } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSound } from "@/hooks/useSound";
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
  const { click, swoosh } = useSound();

  const handleToggleView = () => {
    swoosh();
    setShowChat(!showChat);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Enhanced Header */}
      <header className="border-b border-border/30 bg-gradient-to-r from-card/95 via-card/90 to-card/95 backdrop-blur-xl sticky top-0 z-50">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/3 via-transparent to-accent/3 pointer-events-none" />
        <div className="container mx-auto px-4 py-3 relative">
          <div className="flex items-center justify-between">
            <Logo size="md" />
            
            <div className="flex items-center gap-2">
              {/* Toggle Button with Animation */}
              <Button
                variant={showChat ? "default" : "outline"}
                size="sm"
                onClick={handleToggleView}
                className={cn(
                  "gap-2 rounded-xl transition-all duration-300",
                  showChat 
                    ? "bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/25" 
                    : "border-border/50 hover:border-primary/30 hover:bg-primary/5"
                )}
              >
                {showChat ? (
                  <>
                    <LayoutDashboard className="h-4 w-4" />
                    {!isMobile && "Dashboard"}
                  </>
                ) : (
                  <>
                    <MessageCircle className="h-4 w-4" />
                    {!isMobile && "Roz"}
                  </>
                )}
              </Button>

              {/* Enhanced User Profile */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-secondary/80 to-secondary/50 border border-border/30 transition-all duration-300 hover:border-primary/30 hover:shadow-sm">
                {!isMobile && (
                  <span className="text-sm font-medium text-foreground">Basil</span>
                )}
                <div className="relative">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center shadow-lg shadow-primary/25">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
                </div>
              </div>

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

      {/* Main Content - Flip between Dashboard and Chat */}
      <main className="container mx-auto px-4 py-6">
        <div className={cn(
          "transition-all duration-500 ease-in-out",
          showChat ? "opacity-0 hidden" : "opacity-100 animate-fade-in"
        )}>
          {/* Dashboard View */}
          <div className="space-y-4">
            <BentoGrid>
              <TodayAgendaCard />
              <FinanceCard />
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
          <div className="h-[calc(100vh-120px)] rounded-2xl border border-border/30 overflow-hidden bg-gradient-to-b from-card/80 to-card/50 backdrop-blur-sm shadow-xl">
            <ChatInterface />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
