import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Search, Sparkles, Star, Target, Plus, ArrowLeft, Globe, Briefcase, Zap, Palette, User, LayoutGrid, ChevronRight } from "lucide-react";
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

const categoryConfig: Record<string, {
  label: string;
  icon: React.ElementType;
  gradient: string;
  border: string;
  iconBg: string;
  iconColor: string;
  glow: string;
}> = {
  all:       { label: "All Dreams",  icon: LayoutGrid, gradient: "from-dreams/20 via-rose-500/10 to-pink-500/5",       border: "border-dreams/30",     iconBg: "bg-dreams/20",       iconColor: "text-dreams",       glow: "bg-dreams" },
  general:   { label: "General",     icon: Star,        gradient: "from-slate-500/20 via-gray-500/10 to-slate-500/5",   border: "border-slate-400/30",  iconBg: "bg-slate-500/20",    iconColor: "text-slate-500",    glow: "bg-slate-500" },
  travel:    { label: "Travel",      icon: Globe,       gradient: "from-blue-500/20 via-cyan-500/10 to-blue-500/5",     border: "border-blue-400/30",   iconBg: "bg-blue-500/20",     iconColor: "text-blue-500",     glow: "bg-blue-500" },
  adventure: { label: "Adventure",   icon: Zap,         gradient: "from-orange-500/20 via-amber-500/10 to-orange-500/5",border: "border-orange-400/30", iconBg: "bg-orange-500/20",   iconColor: "text-orange-500",   glow: "bg-orange-500" },
  career:    { label: "Career",      icon: Briefcase,   gradient: "from-purple-500/20 via-violet-500/10 to-purple-500/5",border:"border-purple-400/30", iconBg: "bg-purple-500/20",   iconColor: "text-purple-500",   glow: "bg-purple-500" },
  personal:  { label: "Personal",    icon: User,        gradient: "from-pink-500/20 via-rose-500/10 to-pink-500/5",     border: "border-pink-400/30",   iconBg: "bg-pink-500/20",     iconColor: "text-pink-500",     glow: "bg-pink-500" },
  creative:  { label: "Creative",    icon: Palette,     gradient: "from-emerald-500/20 via-teal-500/10 to-emerald-500/5",border:"border-emerald-400/30",iconBg: "bg-emerald-500/20",  iconColor: "text-emerald-500",  glow: "bg-emerald-500" },
};

const Dreams = () => {
  const navigate = useNavigate();
  const { dreams, loading } = useDreams();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editDreamId, setEditDreamId] = useState<string | null>(null);
  const { click } = useSound();
  const showIntro = useModuleIntro(900);

  const completedCount = dreams.filter(d => d.status === 'completed').length;
  const inProgressCount = dreams.filter(d => d.status === 'in_progress').length;

  // All categories that have at least one dream, plus "all"
  const activeCategories = useMemo(() => {
    const used = new Set(dreams.map(d => d.type));
    const base = ["all", ...Object.keys(categoryConfig).filter(k => k !== "all" && used.has(k))];
    // Add any custom types not in config
    dreams.forEach(d => { if (!categoryConfig[d.type] && !base.includes(d.type)) base.push(d.type); });
    return base;
  }, [dreams]);

  const getCategoryCount = (cat: string) =>
    cat === "all" ? dreams.length : dreams.filter(d => d.type === cat).length;

  const filteredDreams = useMemo(() => {
    if (!selectedCategory) return [];
    return dreams.filter(d => {
      const matchesCategory = selectedCategory === "all" || d.type === selectedCategory;
      const matchesSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === "all" || d.status === filterStatus;
      return matchesCategory && matchesSearch && matchesStatus;
    });
  }, [dreams, selectedCategory, searchQuery, filterStatus]);

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
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon"
              onClick={() => {
                click();
                if (selectedCategory) { setSelectedCategory(null); setSearchQuery(""); setFilterStatus("all"); }
                else navigate("/");
              }}
              className="hover:bg-dreams/10 hover:text-dreams transition-all duration-300 rounded-xl h-9 w-9">
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
                  {selectedCategory
                    ? (categoryConfig[selectedCategory]?.label || selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1))
                    : "Dreams & Goals"}
                </h1>
                <p className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase">
                  {selectedCategory ? `${getCategoryCount(selectedCategory)} dreams` : "Chase your aspirations"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 pb-24 animate-fade-in">

        {/* Stats Bar */}
        <div className="flex items-center gap-3 mb-5 overflow-x-auto pb-2 scrollbar-hide">
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

        {/* ── CATEGORY VIEW (no category selected) ── */}
        {!selectedCategory && (
          <>
            {dreams.length === 0 ? (
              <div className="text-center py-20">
                <div className="relative inline-block mb-6">
                  <div className="p-8 rounded-3xl bg-gradient-to-br from-dreams/10 to-rose-500/10 border border-dreams/20 shadow-xl">
                    <Target className="h-16 w-16 text-dreams" />
                  </div>
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-dreams to-rose-500 opacity-20 blur-2xl -z-10" />
                </div>
                <p className="text-muted-foreground mb-6 text-lg max-w-md mx-auto">No dreams yet. Start by adding your first dream!</p>
                <Button onClick={() => setShowAddDialog(true)} className="bg-dreams hover:bg-dreams/90">
                  <Plus className="h-4 w-4 mr-2" /> Add Your First Dream
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeCategories.map(cat => {
                  const cfg = categoryConfig[cat] || {
                    label: cat.charAt(0).toUpperCase() + cat.slice(1),
                    icon: Star,
                    gradient: "from-slate-500/20 to-gray-500/10",
                    border: "border-slate-400/30",
                    iconBg: "bg-slate-500/20",
                    iconColor: "text-slate-500",
                    glow: "bg-slate-500",
                  };
                  const Icon = cfg.icon;
                  const count = getCategoryCount(cat);
                  const catDreams = cat === "all" ? dreams : dreams.filter(d => d.type === cat);
                  const completedInCat = catDreams.filter(d => d.status === 'completed').length;
                  const avgProgress = catDreams.length > 0
                    ? Math.round(catDreams.reduce((s, d) => s + d.progress_percentage, 0) / catDreams.length)
                    : 0;

                  return (
                    <button key={cat} onClick={() => { click(); setSelectedCategory(cat); }}
                      className={`group relative overflow-hidden text-left rounded-2xl border bg-gradient-to-br ${cfg.gradient} ${cfg.border} p-5 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]`}>
                      {/* Glow */}
                      <div className={`absolute -top-10 -right-10 w-32 h-32 ${cfg.glow} opacity-0 group-hover:opacity-10 rounded-full blur-3xl transition-opacity`} />

                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-2xl ${cfg.iconBg}`}>
                          <Icon className={`h-6 w-6 ${cfg.iconColor}`} />
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors mt-1" />
                      </div>

                      <h3 className="text-lg font-bold text-foreground mb-1">{cfg.label}</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {count} dream{count !== 1 ? 's' : ''} · {completedInCat} completed
                      </p>

                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Avg. progress</span>
                          <span className="font-semibold text-foreground">{avgProgress}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-pink-500 to-rose-500 transition-all duration-500 shadow-sm"
                            style={{ width: `${avgProgress}%` }}
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── DREAMS VIEW (category selected) ── */}
        {selectedCategory && (
          <>
            {/* Search + Status filter */}
            <div className="mb-5 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search dreams..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-xl border-border/40 bg-card/50 backdrop-blur-sm focus:border-dreams/50 focus:ring-dreams/20 h-11" />
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

            {filteredDreams.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground text-lg">No dreams in this category yet.</p>
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
          </>
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
