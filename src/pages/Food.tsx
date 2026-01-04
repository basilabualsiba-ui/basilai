import { useState } from 'react';
import { useFood } from '@/contexts/FoodContext';
import { Button } from '@/components/ui/button';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ArrowLeft, Apple, Utensils, Calendar, CalendarCheck, Salad } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from '@/components/ui/skeleton';
import { useSound } from '@/hooks/useSound';

// Food components
import { FoodsList } from '@/components/food/foods-list';
import { MealsList } from '@/components/food/meals-list';
import { MealPlanner } from '@/components/food/meal-planner';
import { FoodSidebar } from '@/components/food/food-sidebar';

const foodItems = [
  { title: "Foods", value: "foods", icon: Apple },
  { title: "Meals", value: "meals", icon: Utensils },
  { title: "Planner", value: "planner", icon: Calendar }
];

const Food = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('foods');
  const [showTodaysMeals, setShowTodaysMeals] = useState(false);
  const { click } = useSound();

  const handleTabChange = (tab: string) => {
    click();
    setActiveTab(tab);
  };

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background flex w-full">
        {/* Header with Gradient */}
        <header className="absolute top-0 left-0 right-0 z-50 border-b border-border/30 bg-gradient-to-r from-card/95 via-card/90 to-card/95 backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-transparent to-red-500/5 pointer-events-none" />
          <div className="container mx-auto px-4 py-4 flex items-center justify-between relative">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => { click(); navigate("/"); }} 
                className="hover:bg-orange-500/10 hover:text-orange-500 transition-all duration-300 rounded-xl"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500 via-orange-600 to-red-500 shadow-lg shadow-orange-500/25">
                    <Salad className="h-5 w-5 text-white" />
                  </div>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 opacity-40 blur-lg -z-10" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                    Food Tracker
                  </h1>
                  <p className="text-xs text-muted-foreground">Eat healthy, live well</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  click();
                  setShowTodaysMeals(!showTodaysMeals);
                  if (!showTodaysMeals) {
                    setActiveTab('planner');
                  }
                }}
                className={`flex items-center gap-2 rounded-xl border-border/50 transition-all duration-300 ${
                  showTodaysMeals 
                    ? 'bg-orange-500/10 text-orange-500 border-orange-500/30 shadow-sm shadow-orange-500/10' 
                    : 'hover:bg-orange-500/5 hover:border-orange-500/20'
                }`}
                title="Today's Meals"
              >
                <CalendarCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Today's Meals</span>
              </Button>
              <SidebarTrigger className="hover:bg-orange-500/10 hidden md:flex rounded-xl" />
            </div>
          </div>
        </header>

        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <FoodSidebar activeTab={activeTab} onTabChange={handleTabChange} />
        </div>

        {/* Main Content with Animation */}
        <main className="flex-1 pt-24 pb-24 md:pb-6 px-4 md:px-6">
          <div className="animate-fade-in">
            {activeTab === 'foods' && <FoodsList />}
            {activeTab === 'meals' && <MealsList />}
            {activeTab === 'planner' && <MealPlanner showTodaysView={showTodaysMeals} onBackFromToday={() => setShowTodaysMeals(false)} />}
          </div>
        </main>

        {/* Mobile Bottom Tabs with Glow */}
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
          <div className="absolute inset-x-0 -top-6 h-6 bg-gradient-to-t from-background to-transparent pointer-events-none" />
          <div className="bg-card/95 backdrop-blur-xl border-t border-border/30">
            <div className="grid grid-cols-3 h-16">
              {foodItems.map((item) => (
                <button
                  key={item.value}
                  onClick={() => handleTabChange(item.value)}
                  className={`relative flex flex-col items-center justify-center gap-1 transition-all duration-300 ${
                    activeTab === item.value
                      ? 'text-orange-500'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {activeTab === item.value && (
                    <div className="absolute inset-0 bg-orange-500/10 rounded-t-2xl" />
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
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-orange-500 rounded-full" />
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

const FoodWithLoading = () => {
  const { isLoading } = useFood();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500 via-orange-600 to-red-500 shadow-xl shadow-orange-500/30 animate-pulse">
              <Salad className="h-8 w-8 text-white" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 opacity-50 blur-xl animate-pulse-glow" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-48 mx-auto" />
            <Skeleton className="h-3 w-32 mx-auto" />
          </div>
        </div>
      </div>
    );
  }
  
  return <Food />;
};

export default function FoodWithAuth() {
  return <FoodWithLoading />;
}
