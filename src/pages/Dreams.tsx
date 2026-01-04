import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Home, Search, Sparkles, Star, Target, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/ui/logo";
import { useDreams } from "@/contexts/DreamsContext";
import { AddDreamDialog } from "@/components/dreams/add-dream-dialog";
import { DreamCard } from "@/components/dreams/dream-card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useSound } from "@/hooks/useSound";

const Dreams = () => {
  const navigate = useNavigate();
  const { dreams, loading } = useDreams();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const { click } = useSound();

  const filteredDreams = dreams.filter((dream) => {
    const matchesSearch = dream.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dream.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || dream.type === filterType;
    const matchesStatus = filterStatus === "all" || dream.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const completedCount = dreams.filter(d => d.status === 'completed').length;
  const inProgressCount = dreams.filter(d => d.status === 'in_progress').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Gradient */}
      <header className="border-b border-border/30 bg-gradient-to-r from-card/95 via-card/90 to-card/95 backdrop-blur-xl sticky top-0 z-50">
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 via-transparent to-violet-500/5 pointer-events-none" />
        <div className="container mx-auto px-4 py-4 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-pink-500 via-rose-500 to-violet-500 shadow-lg shadow-pink-500/25">
                  <Star className="h-5 w-5 text-white" />
                </div>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-pink-500 to-violet-500 opacity-40 blur-lg -z-10" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                  Dreams & Goals
                </h1>
                <p className="text-xs text-muted-foreground">Chase your aspirations</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AddDreamDialog />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { click(); navigate("/"); }}
                className="hover:bg-pink-500/10 hover:text-pink-500 transition-all duration-300 rounded-xl"
              >
                <Home className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 animate-fade-in">
        {/* Stats Bar */}
        <div className="flex items-center gap-4 mb-6 overflow-x-auto pb-2">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500/10 to-rose-500/10 border border-pink-500/20 shrink-0">
            <Target className="h-4 w-4 text-pink-500" />
            <span className="text-sm font-medium">{dreams.length} Dreams</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 shrink-0">
            <Sparkles className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">{inProgressCount} In Progress</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 shrink-0">
            <Star className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">{completedCount} Achieved</span>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search dreams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl border-border/50 focus:border-pink-500/50 focus:ring-pink-500/20"
            />
          </div>
          <Select value={filterType} onValueChange={(v) => { click(); setFilterType(v); }}>
            <SelectTrigger className="w-full sm:w-40 rounded-xl border-border/50">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="travel">Travel</SelectItem>
              <SelectItem value="adventure">Adventure</SelectItem>
              <SelectItem value="career">Career</SelectItem>
              <SelectItem value="personal">Personal</SelectItem>
              <SelectItem value="creative">Creative</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={(v) => { click(); setFilterStatus(v); }}>
            <SelectTrigger className="w-full sm:w-40 rounded-xl border-border/50">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Dreams Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-48 w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredDreams.length === 0 ? (
          <div className="text-center py-16">
            <div className="relative inline-block mb-4">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-pink-500/10 to-violet-500/10 border border-pink-500/20">
                <Star className="h-12 w-12 text-pink-500" />
              </div>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-pink-500 to-violet-500 opacity-20 blur-xl -z-10" />
            </div>
            <p className="text-muted-foreground mb-4 text-lg">
              {dreams.length === 0 ? "No dreams yet. Start by adding your first dream!" : "No dreams match your filters."}
            </p>
            {dreams.length === 0 && <AddDreamDialog />}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDreams.map((dream, index) => (
              <div 
                key={dream.id} 
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <DreamCard dream={dream} />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dreams;
