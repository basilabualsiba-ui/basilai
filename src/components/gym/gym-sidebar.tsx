import { Dumbbell, Calendar, Target, TrendingUp, Users, Play, BarChart3 } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const gymItems = [
  { title: "Exercises", value: "exercises", icon: Dumbbell },
  { title: "Workouts", value: "workouts", icon: Target },
  { title: "Workout Planner", value: "planner", icon: Calendar },
  { title: "Activity Stats", value: "activity-stats", icon: BarChart3 }
];

interface GymSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function GymSidebar({ activeTab, onTabChange }: GymSidebarProps) {
  const { state, setOpenMobile, isMobile } = useSidebar();
  
  const handleTabChange = (value: string) => {
    onTabChange(value);
    // Close sidebar on mobile when item is selected
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const getNavCls = (value: string) => 
    activeTab === value 
      ? "bg-primary/10 text-primary font-medium border-r-2 border-primary hover:bg-primary/10" 
      : "text-foreground hover:bg-muted/50 hover:text-primary transition-colors";

  return (
    <Sidebar className={`${state === "collapsed" ? "w-14" : "w-60"} bg-card border-border mt-16`} collapsible="icon">
      <SidebarContent className="bg-card pt-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {gymItems.map((item) => (
                <SidebarMenuItem key={item.value}>
                  <SidebarMenuButton
                    onClick={() => handleTabChange(item.value)}
                    className={getNavCls(item.value)}
                  >
                    <item.icon className="h-4 w-4" />
                    {state === "expanded" && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}