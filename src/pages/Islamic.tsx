import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ArrowLeft, Clock, Compass, Moon, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { IslamicSidebar } from '@/components/islamic/islamic-sidebar';
import { PrayerTimes } from '@/components/islamic/prayer-times';
import { QiblaCompass } from '@/components/islamic/qibla-compass';
import { useSound } from '@/hooks/useSound';

const islamicItems = [
  { title: "Prayer Times", value: "prayer-times", icon: Clock },
  { title: "Qibla", value: "qibla", icon: Compass }
];

const Islamic = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('prayer-times');
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
          <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 via-transparent to-cyan-500/5 pointer-events-none" />
          <div className="container mx-auto px-4 py-4 flex items-center justify-between relative">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => { click(); navigate("/"); }} 
                className="hover:bg-teal-500/10 hover:text-teal-500 transition-all duration-300 rounded-xl"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-teal-500 via-teal-600 to-cyan-600 shadow-lg shadow-teal-500/25">
                    <Moon className="h-5 w-5 text-white" />
                  </div>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 opacity-40 blur-lg -z-10" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                    Islamic Dashboard
                  </h1>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-teal-500" />
                    Stay connected
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <SidebarTrigger className="hover:bg-teal-500/10 hidden md:flex rounded-xl" />
            </div>
          </div>
        </header>

        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <IslamicSidebar activeTab={activeTab} onTabChange={handleTabChange} />
        </div>

        {/* Main Content with Animation */}
        <main className="flex-1 pt-24 pb-24 md:pb-6 px-4 md:px-6">
          <div className="animate-fade-in">
            {activeTab === 'prayer-times' && <PrayerTimes />}
            {activeTab === 'qibla' && <QiblaCompass />}
          </div>
        </main>

        {/* Mobile Bottom Tabs with Glow */}
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
          <div className="absolute inset-x-0 -top-6 h-6 bg-gradient-to-t from-background to-transparent pointer-events-none" />
          <div className="bg-card/95 backdrop-blur-xl border-t border-border/30">
            <div className="grid grid-cols-2 h-16">
              {islamicItems.map((item) => (
                <button
                  key={item.value}
                  onClick={() => handleTabChange(item.value)}
                  className={`relative flex flex-col items-center justify-center gap-1 transition-all duration-300 ${
                    activeTab === item.value
                      ? 'text-teal-500'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {activeTab === item.value && (
                    <div className="absolute inset-0 bg-teal-500/10 rounded-t-2xl" />
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
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-teal-500 rounded-full" />
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

export default Islamic;
