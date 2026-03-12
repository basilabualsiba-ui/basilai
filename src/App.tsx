import { useBackgroundNotifications } from "@/hooks/useBackgroundNotifications";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GymProvider } from "./contexts/GymContext";
import { FirstTimePermissions } from "@/components/ui/first-time-permissions";
import { OfflineIndicator } from "@/components/ui/offline-indicator";
import { PrayerNotificationProvider } from "./contexts/PrayerContext";
import { ScheduleProvider } from "./contexts/ScheduleContext";
import { FinancialProvider } from "./contexts/FinancialContext";
import { CurrencyProvider } from "./contexts/CurrencyContext";
import { PrivacyProvider } from "./contexts/PrivacyContext";
import { DreamsProvider } from "./contexts/DreamsContext";
import { SupplementProvider } from "./contexts/SupplementContext";
import { useDreamProgress } from "./hooks/useDreamProgress";
import Index from "./pages/Index";
import Financial from "./pages/Financial";
import Gym from "./pages/Gym";
import Supplements from "./pages/Supplements";
import WeightStats from "./pages/WeightStats";
import GymStatsPage from "./pages/GymStats";
import WorkoutDay from "./pages/WorkoutDay";
import Schedule from "./pages/Schedule";
import Islamic from "./pages/Islamic";
import Dreams from "./pages/Dreams";
import TVTracker from "./pages/TVTracker";
import GamesTracker from "./pages/GamesTracker";
import NotFound from "./pages/NotFound";
import Soccer from "./pages/Soccer";
import Notes from "./pages/Notes";
import Wardrobe from "./pages/Wardrobe";
import Songs from "./pages/Songs";

const queryClient = new QueryClient();

function AppContent() {
  const { scheduleAllNotifications } = useBackgroundNotifications();
  useDreamProgress();
  
  return (
    <BrowserRouter>
      <TooltipProvider>
        <OfflineIndicator />
        <FirstTimePermissions />
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/financial" element={<Financial />} />
          <Route path="/gym" element={<Gym />} />
          <Route path="/gym-stats" element={<GymStatsPage />} />
          <Route path="/workout-day" element={<WorkoutDay />} />
          <Route path="/supplements" element={<Supplements />} />
          <Route path="/weight-stats" element={<WeightStats />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/islamic" element={<Islamic />} />
          <Route path="/dreams" element={<Dreams />} />
          <Route path="/tv-tracker" element={<TVTracker />} />
          <Route path="/games" element={<GamesTracker />} />
          <Route path="/soccer" element={<Soccer />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/wardrobe" element={<Wardrobe />} />
          <Route path="/songs" element={<Songs />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <PrivacyProvider>
      <CurrencyProvider>
        <FinancialProvider>
          <GymProvider>
            <PrayerNotificationProvider>
              <ScheduleProvider>
                <DreamsProvider>
                  <SupplementProvider>
                    <AppContent />
                  </SupplementProvider>
                </DreamsProvider>
              </ScheduleProvider>
            </PrayerNotificationProvider>
          </GymProvider>
        </FinancialProvider>
      </CurrencyProvider>
    </PrivacyProvider>
  </QueryClientProvider>
);

export default App;
