import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Search, Sparkles, Star, Target, Plus, ArrowLeft, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDreams } from "@/contexts/DreamsContext";
import { AddDreamDialog } from "@/components/dreams/add-dream-dialog";
import { DreamCard } from "@/components/dreams/dream-card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSound } from "@/hooks/useSound";
import { ModuleIntroScreen } from "@/components/ui/module-intro-screen";
import { useModuleIntro } from "@/hooks/use-module-intro";
import { FloatingActionButton } from "@/components/ui/floating-action-button";

const defaultTypes = [
  { label: "All", value: "all" },
  { label: "General", value: "general" },
  { label: "Travel", value: "travel" },
  { label: "Adventure", value: "adventure" },
  { label: "Career", value: "career" },
  { label: "Personal", value: "personal" },
  { label: "Creative", value: "creative" },
];

const Dreams = () => {
  const navigate = useNavigate();
  const { dreams, loading } = useDreams();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editDreamId, setEditDreamId] = useState<string | null>(null);
  const { click } = useSound();
  const showIntro = useModuleIntro(900);

  // Collect unique types from dreams for type chips
  const allTypes = useMemo(() => {
    const custom = dreams.map(d => d.type).filter(t => !defaultTypes.some(dt => dt.value === t));
    const unique = [...new Set(custom)];
    return [...defaultTypes, ...unique.map(t => ({ label: t.charAt(0).toUpperCase() + t.slice(1), value: t }))];
  }, [dreams]);

  const filteredDreams = dreams.filter((dream) => {
    const matchesSearch = dream.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dream.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || dream.type === filterType;
    const matchesStatus = filterStatus === "all" || dream.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const completedCount = dreams.filter(d => d.status === 'completed').length;
  const inProgressCount = dreams.filter(d => d.status === 'in_progress').length;

  if (showIntro || loading) {
    return <ModuleIntroScreen icon={Target} title="Dreams & Goals" subtitle="Chase your aspirations" theme="dreams" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-dreams/5">
      {/* Header */}
      <header className="border-b border-border/20 bg-gradient-to-r from-background/95 via-background/90 to-background/95 backdrop-blur-2xl sticky top-0 z-50">
        <div className="absolute inset-0 bg-gradient-to-r from-dreams/5 via-transparent to-dreams/5 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-dreams/30 to-transparent" />
        <div className="container mx-auto px-4 py-3 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => { click(); navigate("/"); }} className="hover:bg-dreams/10 hover:text-dreams transition-all duration-300 rounded-xl h-9 w-9">
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
                  <h1 className="text-lg font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">Dreams & Goals</h1>
                  <p className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase">Chase your aspirations</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 pb-24 animate-fade-in">
        {/* Stats Bar */}
        <div className="flex items-center gap-3 mb-4 overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-dreams/10 to-rose-500/10 border border-dreams/20 shrink-0 shadow-sm">
            <div className="p-1 rounded-lg bg-dreams/20"><Target className="h-3.5 w-3.5 text-dreams" /></div>
            <span className="text-sm font-semibold">{dreams.length} Dreams</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 shrink-0 shadow-sm">
            <div className="p-1 rounded-lg bg-blue-500/20"><Sparkles className="h-3.5 w-3.5 text-blue-500" /></div>
            <span className="text-sm font-semibold">{inProgressCount} Active</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 shrink-0 shadow-sm">
            <div className="p-1 rounded-lg bg-green-500/20"><Star className="h-3.5 w-3.5 text-green-500" /></div>
            <span className="text-sm font-semibold">{completedCount} Done</span>
          </div>
        </div>

        {/* Type chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4 pb-1">
          {allTypes.map(t => (
            <button key={t.value} onClick={() => { click(); setFilterType(t.value); }}
              className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium border transition-all ${filterType === t.value ? 'border-dreams/40 bg-dreams/15 text-dreams' : 'border-border/40 bg-card/50 text-muted-foreground hover:text-foreground'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Search + Status filter */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search dreams..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 rounded-xl border-border/40 bg-card/50 backdrop-blur-sm focus:border-dreams/50 focus:ring-dreams/20 h-11" />
          </div>
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
        {filteredDreams.length === 0 ? (
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
              <Button onClick={() => setShowAddDialog(true)} className="bg-dreams hover:bg-dreams/90">
                <Plus className="h-4 w-4 mr-2" /> Add Your First Dream
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDreams.map((dream, index) => (
              <div key={dream.id} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                <DreamCard dream={dream} onEdit={() => setEditDreamId(dream.id)} />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* FAB */}
      <FloatingActionButton onClick={() => { click(); setShowAddDialog(true); }} className="bg-gradient-to-br from-dreams to-rose-500 text-white shadow-dreams/30 hover:opacity-90">
        <Plus className="h-6 w-6" />
      </FloatingActionButton>

      <AddDreamDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
      {editDreamId && (
        <AddDreamDialog open={!!editDreamId} onOpenChange={(open) => !open && setEditDreamId(null)} editDreamId={editDreamId} />
      )}
    </div>
  );
};

export default Dreams;

// Need useMemo import
import { useMemo } from "react";
