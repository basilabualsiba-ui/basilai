import { useState } from 'react';
import { useFood } from '@/contexts/FoodContext';
import { Button } from '@/components/ui/button';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ArrowLeft, Apple, Utensils, Calendar, CalendarCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";


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
  

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background flex w-full">
        {/* Header */}
        <header className="absolute top-0 left-0 right-0 z-50 border-b border-border/50 bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="hover:bg-muted">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-gradient-accent">
                  <Apple className="h-5 w-5 text-primary" />
                </div>
                <h1 className="text-xl font-bold text-foreground">Food Tracker</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Today's meals button */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setShowTodaysMeals(!showTodaysMeals);
                  if (!showTodaysMeals) {
                    setActiveTab('planner'); // Switch to planner to show the meal view
                  }
                }}
                className={`flex items-center gap-2 ${showTodaysMeals ? 'bg-primary/10 text-primary' : ''}`}
                title="Today's Meals"
              >
                <CalendarCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Today's Meals</span>
              </Button>
              {/* Desktop sidebar trigger */}
              <SidebarTrigger className="hover:bg-muted hidden md:flex" />
            </div>
          </div>
        </header>

        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <FoodSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* Main Content */}
        <main className="flex-1 pt-20 pb-20 md:pb-6 p-6">
          {activeTab === 'foods' && <FoodsList />}
          {activeTab === 'meals' && <MealsList />}
          {activeTab === 'planner' && <MealPlanner showTodaysView={showTodaysMeals} onBackFromToday={() => setShowTodaysMeals(false)} />}
        </main>

        {/* Mobile Bottom Tabs */}
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card border-t border-border">
          <div className="grid grid-cols-3 h-16">
            {foodItems.map((item) => (
              <button
                key={item.value}
                onClick={() => setActiveTab(item.value)}
                className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                  activeTab === item.value
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.title}</span>
              </button>
            ))}
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Apple className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
          <h2 className="text-2xl font-bold mb-4">Loading your food data...</h2>
        </div>
      </div>
    );
  }
  
  return <Food />;
};

export default function FoodWithAuth() {
  return <FoodWithLoading />;
}