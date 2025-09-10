import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ArrowLeft, Clock, Compass } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { IslamicSidebar } from '@/components/islamic/islamic-sidebar';
import { PrayerTimes } from '@/components/islamic/prayer-times';
import { QiblaCompass } from '@/components/islamic/qibla-compass';

const islamicItems = [
  { title: "Prayer Times", value: "prayer-times", icon: Clock },
  { title: "Qibla", value: "qibla", icon: Compass }
];

const Islamic = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('prayer-times');

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
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <h1 className="text-xl font-bold text-foreground">Islamic Dashboard</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Desktop sidebar trigger */}
              <SidebarTrigger className="hover:bg-muted hidden md:flex" />
            </div>
          </div>
        </header>

        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <IslamicSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* Main Content */}
        <main className="flex-1 pt-20 pb-20 md:pb-6 p-6">
          {activeTab === 'prayer-times' && <PrayerTimes />}
          {activeTab === 'qibla' && <QiblaCompass />}
        </main>

        {/* Mobile Bottom Tabs */}
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card border-t border-border">
          <div className="grid grid-cols-2 h-16">
            {islamicItems.map((item) => (
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

export default Islamic;