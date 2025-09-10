import { useBackgroundNotifications } from "@/hooks/useBackgroundNotifications";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GymProvider } from "./contexts/GymContext";
import { FoodProvider } from "./contexts/FoodContext";
import { FirstTimePermissions } from "@/components/ui/first-time-permissions";
import { PrayerNotificationProvider } from "./contexts/PrayerContext";

import { ScheduleProvider } from "./contexts/ScheduleContext";
import { FinancialProvider } from "./contexts/FinancialContext";
import { CurrencyProvider } from "./contexts/CurrencyContext";
import { PrivacyProvider } from "./contexts/PrivacyContext";
import Index from "./pages/Index";
import Financial from "./pages/Financial";
import Gym from "./pages/Gym";
import Food from "./pages/Food";
import WeightStats from "./pages/WeightStats";
import WorkoutDay from "./pages/WorkoutDay";
import Schedule from "./pages/Schedule";
import Islamic from "./pages/Islamic";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  const { scheduleAllNotifications } = useBackgroundNotifications();
  
  return (
    <BrowserRouter>
      <TooltipProvider>
        <FirstTimePermissions />
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/financial" element={<Financial />} />
          <Route path="/gym" element={<Gym />} />
          <Route path="/workout-day" element={<WorkoutDay />} />
          <Route path="/food" element={<Food />} />
          <Route path="/weight-stats" element={<WeightStats />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/islamic" element={<Islamic />} />
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
            <FoodProvider>
              <PrayerNotificationProvider>
                <ScheduleProvider>
                  <AppContent />
                </ScheduleProvider>
              </PrayerNotificationProvider>
            </FoodProvider>
          </GymProvider>
        </FinancialProvider>
      </CurrencyProvider>
    </PrivacyProvider>
  </QueryClientProvider>
);

export default App;
