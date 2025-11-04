import { useState, useEffect } from 'react';
import { useGym } from '@/contexts/GymContext';
import { Button } from '@/components/ui/button';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ArrowLeft, Dumbbell, Calendar, Target, TrendingUp, Users, Play, BarChart3 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

// Gym components (will be created next)
import { ExercisesList } from '@/components/gym/exercises-list';
import { WorkoutsList } from '@/components/gym/workouts-list';
import { WorkoutPlanner } from '@/components/gym/workout-planner';
import { WorkoutTracker } from '@/components/gym/workout-tracker';
import { GymSidebar } from '@/components/gym/gym-sidebar';
import { MuscleGroups } from '@/components/gym/muscle-groups';
import { WorkoutFlow } from '@/components/gym/workout-flow';
const gymItems = [{
  title: "Exercises",
  value: "exercises",
  icon: Dumbbell
}, {
  title: "Workouts",
  value: "workouts",
  icon: Target
}, {
  title: "Planner",
  value: "planner",
  icon: Calendar
}];
const Gym = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('exercises');
  const [previousTab, setPreviousTab] = useState<string>('planner');

  // Handle navigation from Schedule page
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  // Track previous tab for back navigation
  const handleTabChange = (newTab: string) => {
    setPreviousTab(activeTab);
    setActiveTab(newTab);
  };

  // Check if we should show back button (for secondary views)
  const showBackButton = ['workout', 'muscle-groups', 'tracker'].includes(activeTab);
  return <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background flex w-full">
        {/* Header */}
        <header className="absolute top-0 left-0 right-0 z-50 border-b border-border/50 bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {showBackButton ? (
                <Button variant="ghost" size="icon" onClick={() => setActiveTab(previousTab)} className="hover:bg-muted">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              ) : (
                <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="hover:bg-muted">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-gradient-accent">
                  <Dumbbell className="h-5 w-5 text-primary" />
                </div>
                <h1 className="text-xl font-bold text-foreground">Gym Tracker</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleTabChange('workout')} className={`flex items-center gap-2 ${activeTab === 'workout' ? 'bg-primary/10 text-primary' : ''}`}>
                <Play className="h-4 w-4" />
                <span className="hidden sm:inline">Workout</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleTabChange('muscle-groups')} className={`flex items-center gap-2 ${activeTab === 'muscle-groups' ? 'bg-primary/10 text-primary' : ''}`}>
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Muscle Groups</span>
              </Button>
              
              {/* Desktop sidebar trigger */}
              <SidebarTrigger className="hover:bg-muted hidden md:flex" />
            </div>
          </div>
        </header>

        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <GymSidebar activeTab={activeTab} onTabChange={handleTabChange} />
        </div>

        {/* Main Content */}
        <main className="flex-1 md:pt-20 md:pb-6 md:p-6 pt-16 pb-16 px-4 overflow-y-auto">
          <div className="h-full">
            {activeTab === 'exercises' && <ExercisesList />}
            {activeTab === 'workouts' && <WorkoutsList />}
            {activeTab === 'planner' && <WorkoutPlanner />}
            {activeTab === 'tracker' && <WorkoutTracker />}
            {activeTab === 'muscle-groups' && <MuscleGroups />}
            {activeTab === 'workout' && <WorkoutFlow onBack={() => setActiveTab(previousTab)} />}
          </div>
        </main>

        {/* Mobile Bottom Tabs */}
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card border-t border-border">
          <div className="grid grid-cols-3 h-16">
            {gymItems.map(item => <button key={item.value} onClick={() => handleTabChange(item.value)} className={`flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === item.value ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}>
                <item.icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.title}</span>
              </button>)}
          </div>
        </div>
      </div>
    </SidebarProvider>;
};
const GymWithLoading = () => {
  const {
    isLoading
  } = useGym();
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Dumbbell className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
          <h2 className="text-2xl font-bold mb-4">Loading your gym data...</h2>
        </div>
      </div>;
  }
  return <Gym />;
};
export default function GymWithAuth() {
  return <GymWithLoading />;
}