import { GymStats } from "@/components/gym/gym-stats";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const GymStatsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/gym")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Gym
            </Button>
            <Logo size="md" />
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <h2 className="text-sm font-medium text-foreground">Body Stats</h2>
              <p className="text-lg font-bold text-primary">Track Your Progress</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <GymStats />
      </main>
    </div>
  );
};

export default GymStatsPage;
