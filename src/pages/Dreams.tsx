import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Search, Sparkles, Star, Target, Plus, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
  const [showAddDialog, setShowAddDialog] = useState(false);
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
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-dreams/5">
      {/* Header with Gradient - Dreams Pink Theme */}
      <header className="border-b border-border/20 bg-gradient-to-r from-background/95 via-background/90 to-background/95 backdrop-blur-2xl sticky top-0 z-50">
        <div className="absolute inset-0 bg-gradient-to-r from-dreams/5 via-transparent to-dreams/5 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-dreams/30 to-transparent" />
        <div className="container mx-auto px-4 py-3 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => { click(); navigate("/"); }}
                className="hover:bg-dreams/10 hover:text-dreams transition-all duration-300 rounded-xl h-9 w-9"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="relative group">
                  <div className="p-2.5 rounded-2xl bg-gradient-to-br from-dreams via-pink-600 to-rose-500 shadow-lg shadow-dreams/30 transition-transform duration-300 group-hover:scale-105">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-dreams to-rose-500 opacity-50 blur-xl -z-10 group-hover:opacity-70 transition-opacity" />
                </div>
                <div>
                  <h1 className="text-lg font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
                    Dreams & Goals
                  </h1>
                  <p className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase">Chase your aspirations</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 pb-24 animate-fade-in">
        {/* Stats Bar */}
        <div className="flex items-center gap-3 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-dreams/10 to-rose-500/10 border border-dreams/20 shrink-0 shadow-sm">
            <div className="p-1 rounded-lg bg-dreams/20">
              <Target className="h-3.5 w-3.5 text-dreams" />
            </div>
            <span className="text-sm font-semibold">{dreams.length} Dreams</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 shrink-0 shadow-sm">
            <div className="p-1 rounded-lg bg-blue-500/20">
              <Sparkles className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <span className="text-sm font-semibold">{inProgressCount} Active</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 shrink-0 shadow-sm">
            <div className="p-1 rounded-lg bg-green-500/20">
              <Star className="h-3.5 w-3.5 text-green-500" />
            </div>
            <span className="text-sm font-semibold">{completedCount} Done</span>
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
              className="pl-10 rounded-xl border-border/40 bg-card/50 backdrop-blur-sm focus:border-dreams/50 focus:ring-dreams/20 h-11"
            />
          </div>
          <Select value={filterType} onValueChange={(v) => { click(); setFilterType(v); }}>
            <SelectTrigger className="w-full sm:w-40 rounded-xl border-border/40 bg-card/50 backdrop-blur-sm h-11">
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
            <SelectTrigger className="w-full sm:w-40 rounded-xl border-border/40 bg-card/50 backdrop-blur-sm h-11">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-3 p-4 rounded-2xl bg-card/50 border border-border/30">
                <Skeleton className="h-40 w-full rounded-xl" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredDreams.length === 0 ? (
          <div className="text-center py-20">
            <div className="relative inline-block mb-6">
              <div className="p-8 rounded-3xl bg-gradient-to-br from-dreams/10 to-rose-500/10 border border-dreams/20 shadow-xl">
                <Target className="h-16 w-16 text-dreams" />
              </div>
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-dreams to-rose-500 opacity-20 blur-2xl -z-10" />
            </div>
            <p className="text-muted-foreground mb-6 text-lg max-w-md mx-auto">
              {dreams.length === 0 ? "No dreams yet. Start by adding your first dream!" : "No dreams match your filters."}
            </p>
            {dreams.length === 0 && (
              <Button 
                onClick={() => setShowAddDialog(true)}
                className="bg-dreams hover:bg-dreams/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Dream
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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

      {/* FAB for adding dreams */}
      <Button
        onClick={() => { click(); setShowAddDialog(true); }}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-br from-dreams to-rose-500 hover:from-dreams/90 hover:to-rose-500/90 shadow-lg shadow-dreams/30 z-50"
        size="icon"
      >
        <Plus className="h-6 w-6 text-white" />
      </Button>

      <AddDreamDialog 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog} 
      />
    </div>
  );
};

export default Dreams;
