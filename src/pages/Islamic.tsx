import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, Compass, Moon, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { IslamicSidebar } from '@/components/islamic/islamic-sidebar';
import { PrayerTimes } from '@/components/islamic/prayer-times';
import { QiblaCompass } from '@/components/islamic/qibla-compass';
import { ModuleIntroScreen } from '@/components/ui/module-intro-screen';
import { useModuleIntro } from '@/hooks/use-module-intro';
import { useSound } from '@/hooks/useSound';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

const islamicItems = [
  { title: "Prayer Times", value: "prayer-times", icon: Clock },
  { title: "Qibla", value: "qibla", icon: Compass }
];

const Islamic = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('prayer-times');
  const { click } = useSound();
  const showIntro = useModuleIntro(900);

  const handleTabChange = (tab: string) => {
    click();
    setActiveTab(tab);
  };

  if (showIntro) {
    return <ModuleIntroScreen icon={Moon} title="Islamic Dashboard" subtitle="Stay connected" theme="agenda" />;
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-amber-500/5 flex w-full">
        {/* Header with Amber/Gold Theme */}
        <header className="absolute top-0 left-0 right-0 z-50 border-b border-border/20 bg-gradient-to-r from-background/95 via-background/90 to-background/95 backdrop-blur-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-yellow-500/5 pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
          <div className="container mx-auto px-4 py-3 flex items-center justify-between relative">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => { click(); navigate("/"); }} 
                className="hover:bg-amber-500/10 hover:text-amber-500 transition-all duration-300 rounded-xl h-9 w-9"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="relative group">
                  <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 shadow-lg shadow-amber-500/30 transition-transform duration-300 group-hover:scale-105">
                    <Moon className="h-5 w-5 text-white" />
                  </div>
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-500 opacity-50 blur-xl -z-10 group-hover:opacity-70 transition-opacity" />
                </div>
                <div>
                  <h1 className="text-lg font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
                    Islamic Dashboard
                  </h1>
                  <p className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase flex items-center gap-1">
                    <Sparkles className="h-2.5 w-2.5 text-amber-500" />
                    Stay connected
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <SidebarTrigger className="hover:bg-amber-500/10 hidden md:flex rounded-xl" />
            </div>
          </div>
        </header>

        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <IslamicSidebar activeTab={activeTab} onTabChange={handleTabChange} />
        </div>

        {/* Main Content */}
        <main className="flex-1 pt-16 pb-24 md:pb-6 px-4 md:px-6">
          <div className="animate-fade-in">
            {activeTab === 'prayer-times' && <PrayerTimes />}
            {activeTab === 'qibla' && <QiblaCompass />}
          </div>
        </main>

        {/* Mobile Bottom Tabs - Wallet-style glass */}
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
          <div className="absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none" />
          <div className="bg-background/80 backdrop-blur-2xl border-t border-border/20 shadow-2xl shadow-black/10">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
            <div className="grid grid-cols-2 h-16 px-2">
              {islamicItems.map((item) => (
                <button
                  key={item.value}
                  onClick={() => handleTabChange(item.value)}
                  className={`relative flex flex-col items-center justify-center gap-0.5 transition-all duration-300 rounded-2xl mx-1 ${
                    activeTab === item.value
                      ? 'text-amber-500'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {activeTab === item.value && (
                    <>
                      <div className="absolute inset-1 bg-gradient-to-b from-amber-500/15 to-amber-500/5 rounded-xl" />
                      <div className="absolute top-1 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent rounded-full" />
                    </>
                  )}
                  <div className={`relative z-10 transition-all duration-300 ${
                    activeTab === item.value ? 'scale-110 -translate-y-0.5' : ''
                  }`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className={`relative z-10 text-[10px] font-medium transition-all duration-300 ${
                    activeTab === item.value ? 'font-semibold' : ''
                  }`}>
                    {item.title}
                  </span>
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
