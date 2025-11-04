import { Logo } from "@/components/ui/logo";
import { StatsOverview } from "@/components/dashboard/stats-overview";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { DreamsCard } from "@/components/dashboard/dreams-card";
import { SettingsDialog } from "@/components/ui/settings-dialog";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Settings, User, Scale, Calendar, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
const Index = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <Logo size="md" />
            
            {/* Navigation Actions */}
            <div className="flex items-center gap-1 sm:gap-3">
              {/* Quick Action Buttons */}
              <div className="flex items-center gap-1 sm:gap-2">
                <Button
                  variant="ghost"
                  size={isMobile ? "sm" : "default"}
                  onClick={() => navigate("/weight-stats")}
                  className="flex items-center gap-1.5 px-2 sm:px-3"
                >
                  <Scale className="h-4 w-4 flex-shrink-0" />
                  {!isMobile && <span className="text-sm">Weight</span>}
                </Button>
                <Button
                  variant="ghost"
                  size={isMobile ? "sm" : "default"}
                  onClick={() => navigate("/schedule")}
                  className="flex items-center gap-1.5 px-2 sm:px-3"
                >
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  {!isMobile && <span className="text-sm">Schedule</span>}
                </Button>
                <Button
                  variant="ghost"
                  size={isMobile ? "sm" : "default"}
                  onClick={() => navigate("/islamic")}
                  className="flex items-center gap-1.5 px-2 sm:px-3"
                >
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  {!isMobile && <span className="text-sm">Islamic</span>}
                </Button>
              </div>
              
              {/* User Profile */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="text-left hover:bg-accent/50 px-2 sm:px-3 py-2 h-auto"
                  >
                    <div className="flex items-center gap-2">
                      {!isMobile && (
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Welcome back</p>
                          <p className="text-sm font-semibold text-foreground">Basil</p>
                        </div>
                      )}
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    </div>
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-auto p-0 mr-2 sm:mr-4" 
                  align="end"
                  sideOffset={8}
                >
                  <div className="p-4 space-y-3">
                    <div className="text-center border-b border-border pb-3">
                      <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mb-2">
                        <User className="h-6 w-6 text-primary-foreground" />
                      </div>
                      <p className="font-semibold text-foreground">Basil Abualsiba</p>
                      <p className="text-xs text-muted-foreground">Personal Dashboard</p>
                    </div>
                    <SettingsDialog>
                      <Button variant="outline" size="sm" className="w-full flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Settings
                      </Button>
                    </SettingsDialog>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Stats Overview */}
        <StatsOverview />

        {/* Dreams Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DreamsCard />
        </div>

        {/* Recent Activity */}
        <RecentActivity />
      </main>
    </div>;
};
export default Index;