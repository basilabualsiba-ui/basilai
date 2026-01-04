import { useState, useEffect } from 'react';
import { useGym } from '@/contexts/GymContext';
import { Button } from '@/components/ui/button';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ArrowLeft, Dumbbell, Calendar, Target, TrendingUp, Users, Play, BarChart3, Flame } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Skeleton } from '@/components/ui/skeleton';
import { useSound } from '@/hooks/useSound';

// Gym components
import { ExercisesList } from '@/components/gym/exercises-list';
import { WorkoutsList } from '@/components/gym/workouts-list';
import { WorkoutPlanner } from '@/components/gym/workout-planner';
import { WorkoutTracker } from '@/components/gym/workout-tracker';
import { GymSidebar } from '@/components/gym/gym-sidebar';
import { MuscleGroups } from '@/components/gym/muscle-groups';
import { WorkoutFlow } from '@/components/gym/workout-flow';
import { GymActivityStats } from '@/components/gym/gym-activity-stats';

const gymItems = [
  { title: "Exercises", value: "exercises", icon: Dumbbell },
  { title: "Workouts", value: "workouts", icon: Target },
  { title: "Planner", value: "planner", icon: Calendar },
  { title: "Stats", value: "activity-stats", icon: BarChart3 }
];

const Gym = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('exercises');
  const { click } = useSound();

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  const handleTabChange = (tab: string) => {
    click();
    setActiveTab(tab);
  };

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background flex w-full">
        {/* Header with Gradient */}
        <header className="absolute top-0 left-0 right-0 z-50 border-b border-border/30 bg-gradient-to-r from-card/95 via-card/90 to-card/95 backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-transparent to-emerald-500/5 pointer-events-none" />
          <div className="container mx-auto px-4 py-4 flex items-center justify-between relative">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => { click(); navigate("/"); }} 
                className="hover:bg-green-500/10 hover:text-green-500 transition-all duration-300 rounded-xl"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500 via-green-600 to-emerald-600 shadow-lg shadow-green-500/25">
                    <Dumbbell className="h-5 w-5 text-white" />
                  </div>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 opacity-40 blur-lg -z-10" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                    Gym Tracker
                  </h1>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Flame className="h-3 w-3 text-orange-500" />
                    Stay consistent
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleTabChange('workout')} 
                className={`flex items-center gap-2 rounded-xl border-border/50 transition-all duration-300 ${
                  activeTab === 'workout' 
                    ? 'bg-green-500/10 text-green-500 border-green-500/30 shadow-sm shadow-green-500/10' 
                    : 'hover:bg-green-500/5 hover:border-green-500/20'
                }`}
              >
                <Play className="h-4 w-4" />
                <span className="hidden sm:inline">Workout</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleTabChange('muscle-groups')} 
                className={`flex items-center gap-2 rounded-xl border-border/50 transition-all duration-300 ${
                  activeTab === 'muscle-groups' 
                    ? 'bg-green-500/10 text-green-500 border-green-500/30 shadow-sm shadow-green-500/10' 
                    : 'hover:bg-green-500/5 hover:border-green-500/20'
                }`}
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Muscle Groups</span>
              </Button>
              <SidebarTrigger className="hover:bg-green-500/10 hidden md:flex rounded-xl" />
            </div>
          </div>
        </header>

        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <GymSidebar activeTab={activeTab} onTabChange={handleTabChange} />
        </div>

        {/* Main Content with Animation */}
        <main className="flex-1 md:pt-24 md:pb-6 md:px-6 pt-20 pb-20 px-4 overflow-y-auto">
          <div className="h-full animate-fade-in">
            {activeTab === 'exercises' && <ExercisesList />}
            {activeTab === 'workouts' && <WorkoutsList />}
            {activeTab === 'planner' && <WorkoutPlanner />}
            {activeTab === 'tracker' && <WorkoutTracker />}
            {activeTab === 'muscle-groups' && <MuscleGroups />}
            {activeTab === 'workout' && <WorkoutFlow onBack={() => handleTabChange('exercises')} />}
            {activeTab === 'activity-stats' && <GymActivityStats />}
          </div>
        </main>

        {/* Mobile Bottom Tabs with Glow */}
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
          <div className="absolute inset-x-0 -top-6 h-6 bg-gradient-to-t from-background to-transparent pointer-events-none" />
          <div className="bg-card/95 backdrop-blur-xl border-t border-border/30">
            <div className="grid grid-cols-4 h-16">
              {gymItems.map(item => (
                <button 
                  key={item.value} 
                  onClick={() => handleTabChange(item.value)} 
                  className={`relative flex flex-col items-center justify-center gap-1 transition-all duration-300 ${
                    activeTab === item.value 
                      ? 'text-green-500' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {activeTab === item.value && (
                    <div className="absolute inset-0 bg-green-500/10 rounded-t-2xl" />
                  )}
                  <div className={`relative z-10 transition-transform duration-300 ${
                    activeTab === item.value ? 'scale-110' : ''
                  }`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className={`relative z-10 text-xs font-medium transition-all duration-300 ${
                    activeTab === item.value ? 'font-semibold' : ''
                  }`}>
                    {item.title}
                  </span>
                  {activeTab === item.value && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-green-500 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

const GymWithLoading = () => {
  const { isLoading } = useGym();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-green-500 via-green-600 to-emerald-600 shadow-xl shadow-green-500/30 animate-pulse">
              <Dumbbell className="h-8 w-8 text-white" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 opacity-50 blur-xl animate-pulse-glow" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-48 mx-auto" />
            <Skeleton className="h-3 w-32 mx-auto" />
          </div>
        </div>
      </div>
    );
  }
  
  return <Gym />;
};

export default function GymWithAuth() {
  return <GymWithLoading />;
}
