import { useState, useEffect } from 'react';
import { useGym } from '@/contexts/GymContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Dumbbell, Calendar, Target, BarChart3, Flame, Play } from "lucide-react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useSound } from '@/hooks/useSound';
import { ModuleIntroScreen } from '@/components/ui/module-intro-screen';
import { FloatingActionButton } from '@/components/ui/floating-action-button';

// Gym components
import { ExercisesList } from '@/components/gym/exercises-list';
import { WorkoutsList } from '@/components/gym/workouts-list';
import { WorkoutPlanner } from '@/components/gym/workout-planner';
import { WorkoutTracker } from '@/components/gym/workout-tracker';
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
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('exercises');
  const { click } = useSound();

  useEffect(() => {
    if (location.state?.activeTab) setActiveTab(location.state.activeTab);
    const action = searchParams.get('action');
    if (action === 'start') setActiveTab('workout');
  }, [location.state, searchParams]);

  const handleTabChange = (tab: string) => { click(); setActiveTab(tab); };

  const handleStartWorkout = () => { click(); setActiveTab('workout'); navigate('/gym?action=start'); };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-gym/5 flex flex-col w-full">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/20 bg-gradient-to-r from-background/95 via-background/90 to-background/95 backdrop-blur-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-gym/5 via-transparent to-gym/5 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gym/30 to-transparent" />
        <div className="container mx-auto px-4 py-3 flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => { click(); navigate("/"); }} className="hover:bg-gym/10 hover:text-gym transition-all duration-300 rounded-xl h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="relative group">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-gym via-red-600 to-rose-600 shadow-lg shadow-gym/30 transition-transform duration-300 group-hover:scale-105">
                  <Dumbbell className="h-5 w-5 text-white" />
                </div>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-gym to-rose-500 opacity-50 blur-xl -z-10 group-hover:opacity-70 transition-opacity" />
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">Gym</h1>
                <p className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase flex items-center gap-1">
                  <Flame className="h-2.5 w-2.5 text-gym" /> Stay consistent
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-16 pb-20 px-4 overflow-y-auto">
        <div className="h-full animate-fade-in max-w-6xl mx-auto">
          {activeTab === 'exercises' && <ExercisesList />}
          {activeTab === 'workouts' && <WorkoutsList />}
          {activeTab === 'planner' && <WorkoutPlanner />}
          {activeTab === 'tracker' && <WorkoutTracker />}
          {activeTab === 'muscle-groups' && <MuscleGroups />}
          {activeTab === 'workout' && <WorkoutFlow onBack={() => handleTabChange('exercises')} />}
          {activeTab === 'activity-stats' && <GymActivityStats />}
        </div>
      </main>

      {/* FAB for starting workout */}
      <FloatingActionButton onClick={handleStartWorkout} className="bg-gradient-to-br from-gym to-rose-600 text-white shadow-gym/40 hover:opacity-90">
        <Play className="h-6 w-6" />
      </FloatingActionButton>

      {/* Bottom Nav - Wallet style */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        <div className="bg-background/80 backdrop-blur-2xl border-t border-border/20 shadow-2xl shadow-black/10">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gym/30 to-transparent" />
          <div className="grid grid-cols-4 h-16 px-2">
            {gymItems.map(item => (
              <button key={item.value} onClick={() => handleTabChange(item.value)}
                className={`relative flex flex-col items-center justify-center gap-0.5 transition-all duration-300 rounded-2xl mx-1 ${activeTab === item.value ? 'text-gym' : 'text-muted-foreground hover:text-foreground'}`}>
                {activeTab === item.value && (
                  <>
                    <div className="absolute inset-1 bg-gradient-to-b from-gym/15 to-gym/5 rounded-xl" />
                    <div className="absolute top-1 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r from-transparent via-gym to-transparent rounded-full" />
                  </>
                )}
                <div className={`relative z-10 transition-all duration-300 ${activeTab === item.value ? 'scale-110 -translate-y-0.5' : ''}`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <span className={`relative z-10 text-[10px] font-medium transition-all duration-300 ${activeTab === item.value ? 'font-semibold' : ''}`}>{item.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const GymWithLoading = () => {
  const { isLoading } = useGym();
  if (isLoading) return <ModuleIntroScreen icon={Dumbbell} title="Gym" subtitle="Loading your workouts" theme="gym" />;
  return <Gym />;
};

export default function GymWithAuth() {
  return <GymWithLoading />;
}
