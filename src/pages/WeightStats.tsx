import { GymStats } from "@/components/gym/gym-stats";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Scale } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSound } from "@/hooks/useSound";

const WeightStats = () => {
  const navigate = useNavigate();
  const { click } = useSound();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-weight/5">
      {/* Header - Weight Blue Theme */}
      <header className="border-b border-border/20 bg-gradient-to-r from-background/95 via-background/90 to-background/95 backdrop-blur-xl sticky top-0 z-50">
        <div className="absolute inset-0 bg-gradient-to-r from-weight/5 via-transparent to-weight/5 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-weight/30 to-transparent" />
        <div className="container mx-auto px-4 py-3 flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { click(); navigate("/"); }}
              className="hover:bg-weight/10 hover:text-weight transition-all duration-300 rounded-xl h-9 w-9"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="relative group">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-weight via-blue-600 to-indigo-600 shadow-lg shadow-weight/30 transition-transform duration-300 group-hover:scale-105">
                  <Scale className="h-5 w-5 text-white" />
                </div>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-weight to-indigo-500 opacity-50 blur-xl -z-10 group-hover:opacity-70 transition-opacity" />
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
                  Weight Stats
                </h1>
                <p className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase">Track your progress</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 animate-fade-in">
        <GymStats />
      </main>
    </div>
  );
};

export default WeightStats;
