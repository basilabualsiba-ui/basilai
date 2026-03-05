import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, Gamepad2, Monitor, Search, Smartphone, Tv, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FloatingActionButton } from "@/components/ui/floating-action-button";
import { ModuleIntroScreen } from "@/components/ui/module-intro-screen";
import { useModuleIntro } from "@/hooks/use-module-intro";
import { useSound } from "@/hooks/useSound";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const platformOptions = ["All", "PC", "PlayStation", "Xbox", "iOS / Mobile"] as const;
type PlatformFilter = (typeof platformOptions)[number];

type GameRow = {
  id: string;
  rawg_id: number;
  slug: string | null;
  name: string;
  image: string | null;
  genres: string[];
  platform: string;
  project_link: string | null;
  user_price_ils: number;
  rating: number | null;
  date_added: string;
};

type RawgResult = {
  id: number;
  slug?: string;
  name: string;
  background_image?: string | null;
  genres?: { name: string }[];
  rating?: number;
  platforms?: { platform: { name: string } }[];
};

const platformIcons = {
  PC: Monitor,
  PlayStation: Tv,
  Xbox: Gamepad2,
  "iOS / Mobile": Smartphone,
  All: Gamepad2,
};

async function rawgProxy(action: string, params: Record<string, string | number>) {
  const { data, error } = await supabase.functions.invoke("rawg-proxy", {
    body: { action, ...params },
  });

  if (error) throw error;
  return data;
}

const GamesTracker = () => {
  const navigate = useNavigate();
  const { click, toggle } = useSound();
  const { toast } = useToast();
  const showIntro = useModuleIntro(950);
  const [games, setGames] = useState<GameRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("All");
  const [showAdd, setShowAdd] = useState(false);
  const [showProject, setShowProject] = useState(false);
  const [projectUrl, setProjectUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<RawgResult[]>([]);
  const [selectedGame, setSelectedGame] = useState<RawgResult | null>(null);
  const [recommendedGames, setRecommendedGames] = useState<RawgResult[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ platform: "PC", projectLink: "", userPriceILS: "" });

  const loadGames = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("games").select("*").order("date_added", { ascending: false });
    if (error) {
      toast({ title: "Error", description: "Failed to load games", variant: "destructive" });
    } else {
      setGames((data as GameRow[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadGames();
  }, []);

  useEffect(() => {
    const loadRecommendations = async () => {
      if (games.length === 0) {
        setRecommendedGames([]);
        return;
      }

      try {
        const unique = new Map<number, RawgResult>();
        for (const game of games.slice(0, 3)) {
          const data = await rawgProxy("suggested", { id: game.rawg_id });
          for (const item of (data.results || []) as RawgResult[]) {
            if (!games.some((existing) => existing.rawg_id === item.id) && !unique.has(item.id)) {
              unique.set(item.id, item);
            }
          }
        }
        setRecommendedGames(Array.from(unique.values()).slice(0, 5));
      } catch (error) {
        console.error(error);
      }
    };

    loadRecommendations();
  }, [games]);

  const filteredGames = useMemo(() => {
    return games.filter((game) => platformFilter === "All" || game.platform === platformFilter);
  }, [games, platformFilter]);

  const handleSearch = async (value: string) => {
    setSearchQuery(value);
    if (value.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const data = await rawgProxy("search", { query: value.trim() });
      setSearchResults((data.results || []).slice(0, 8));
    } catch (error) {
      toast({ title: "Error", description: "RAWG search failed", variant: "destructive" });
    }
    setSearching(false);
  };

  const handleSelectGame = async (gameId: number) => {
    try {
      const data = await rawgProxy("details", { id: gameId });
      setSelectedGame(data as RawgResult);
      toggle();
    } catch (error) {
      toast({ title: "Error", description: "Could not load game details", variant: "destructive" });
    }
  };

  const handleSaveGame = async () => {
    if (!selectedGame) return;
    setSaving(true);

    const payload = {
      rawg_id: selectedGame.id,
      slug: selectedGame.slug || null,
      name: selectedGame.name,
      image: selectedGame.background_image || null,
      genres: (selectedGame.genres || []).map((genre) => genre.name),
      platform: form.platform,
      project_link: form.projectLink || null,
      user_price_ils: Number(form.userPriceILS || 0),
      rating: selectedGame.rating || null,
    };

    const { error } = await supabase.from("games").insert(payload as never);
    setSaving(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Added", description: `${selectedGame.name} saved to your library` });
    setShowAdd(false);
    setSelectedGame(null);
    setSearchQuery("");
    setSearchResults([]);
    setForm({ platform: "PC", projectLink: "", userPriceILS: "" });
    loadGames();
  };

  const openProject = (url: string | null) => {
    if (!url) return;
    click();
    setProjectUrl(url);
    setShowProject(true);
  };

  if (showIntro || loading) {
    return <ModuleIntroScreen icon={Gamepad2} title="My Games Tracker" subtitle="Loading your game library" theme="games" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-card/20 pb-24">
      <header className="sticky top-0 z-50 border-b border-border/20 bg-background/90 backdrop-blur-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-3 relative">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => { click(); navigate("/"); }} className="rounded-xl hover:bg-primary/10 hover:text-primary">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30">
                <Gamepad2 className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">My Games Tracker</h1>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Play, track, revisit</p>
              </div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 rounded-2xl border border-border/40 bg-card/60 p-1">
            {platformOptions.map((platform) => {
              const Icon = platformIcons[platform];
              const active = platformFilter === platform;
              return (
                <button
                  key={platform}
                  onClick={() => { toggle(); setPlatformFilter(platform); }}
                  className={`rounded-xl px-3 py-2 text-xs font-medium transition-all ${active ? "bg-primary text-primary-foreground shadow-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <span className="inline-flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" /> {platform}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="container mx-auto space-y-6 px-4 py-5">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide sm:hidden">
          {platformOptions.map((platform) => {
            const active = platformFilter === platform;
            return (
              <button
                key={platform}
                onClick={() => { toggle(); setPlatformFilter(platform); }}
                className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${active ? "border-primary/40 bg-primary text-primary-foreground" : "border-border/40 bg-card/50 text-muted-foreground"}`}
              >
                {platform}
              </button>
            );
          })}
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Library</h2>
            <Badge variant="outline" className="border-primary/30 text-primary">{filteredGames.length} games</Badge>
          </div>

          {filteredGames.length === 0 ? (
            <Card className="border-border/40 bg-card/50">
              <CardContent className="py-12 text-center">
                <Gamepad2 className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No games added yet for this platform.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredGames.map((game) => (
                <Card key={game.id} className="overflow-hidden border-primary/20 bg-gradient-to-br from-card to-primary/5">
                  <div className="aspect-[16/10] bg-muted/40">
                    {game.image ? (
                      <img src={game.image} alt={game.name} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center"><Gamepad2 className="h-10 w-10 text-muted-foreground" /></div>
                    )}
                  </div>
                  <CardContent className="space-y-3 p-4">
                    <div>
                      <h3 className="line-clamp-1 text-sm font-semibold text-foreground">{game.name}</h3>
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{game.genres.join(" • ") || "No genres"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{game.platform}</Badge>
                      <Badge variant="secondary">₪{Number(game.user_price_ils || 0).toLocaleString()}</Badge>
                    </div>
                    <Button onClick={() => openProject(game.project_link)} className="w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
                      <ExternalLink className="mr-2 h-4 w-4" /> Open Project
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">Recommended Games</h2>
          {recommendedGames.length === 0 ? (
            <Card className="border-border/40 bg-card/50"><CardContent className="py-8 text-sm text-muted-foreground">Add a few games to unlock recommendations.</CardContent></Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {recommendedGames.map((game) => (
                <Card key={game.id} className="overflow-hidden border-border/40 bg-card/50">
                  <div className="aspect-[4/5] bg-muted/40">
                    {game.background_image ? <img src={game.background_image} alt={game.name} loading="lazy" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Gamepad2 className="h-8 w-8 text-muted-foreground" /></div>}
                  </div>
                  <CardContent className="space-y-2 p-3">
                    <p className="line-clamp-1 text-sm font-medium text-foreground">{game.name}</p>
                    <p className="text-xs text-muted-foreground">★ {game.rating?.toFixed(1) || "--"}</p>
                    <Button variant="outline" size="sm" className="w-full rounded-xl" onClick={() => handleSelectGame(game.id)}>View Details</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>

      <FloatingActionButton onClick={() => { click(); setShowAdd(true); }} className="bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-primary/40 hover:opacity-90">
        <span className="text-xl font-semibold">+</span>
      </FloatingActionButton>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-2xl border-primary/20 bg-background/95 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle>Add Game</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={searchQuery} onChange={(e) => handleSearch(e.target.value)} placeholder="Search RAWG games..." className="pl-9" />
              </div>
              {searching && <p className="text-xs text-muted-foreground">Searching…</p>}
              <div className="grid gap-2 max-h-56 overflow-y-auto">
                {searchResults.map((result) => (
                  <button key={result.id} onClick={() => handleSelectGame(result.id)} className="flex items-center gap-3 rounded-2xl border border-border/40 bg-card/50 p-3 text-left hover:border-primary/30">
                    <div className="h-14 w-12 overflow-hidden rounded-lg bg-muted/40">
                      {result.background_image ? <img src={result.background_image} alt={result.name} loading="lazy" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Gamepad2 className="h-4 w-4 text-muted-foreground" /></div>}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{result.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {selectedGame && (
              <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-start gap-3">
                  <div className="h-20 w-16 overflow-hidden rounded-xl bg-muted/40">
                    {selectedGame.background_image ? <img src={selectedGame.background_image} alt={selectedGame.name} loading="lazy" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Gamepad2 className="h-5 w-5 text-muted-foreground" /></div>}
                  </div>
                  <div>
                    <p className="text-base font-semibold text-foreground">{selectedGame.name}</p>
                    <p className="text-xs text-muted-foreground">{(selectedGame.genres || []).map((genre) => genre.name).join(" • ")}</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} className="h-10 rounded-xl border border-border bg-card px-3 text-sm text-foreground">
                    {platformOptions.filter((item) => item !== "All").map((platform) => <option key={platform}>{platform}</option>)}
                  </select>
                  <Input placeholder="Project link" value={form.projectLink} onChange={(e) => setForm({ ...form, projectLink: e.target.value })} />
                  <Input type="number" inputMode="decimal" placeholder="Price paid (ILS)" value={form.userPriceILS} onChange={(e) => setForm({ ...form, userPriceILS: e.target.value })} />
                </div>
                <Button onClick={handleSaveGame} disabled={saving} className="w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">{saving ? "Saving..." : "Save Game"}</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showProject} onOpenChange={setShowProject}>
        <DialogContent className="max-w-5xl border-primary/20 p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/20 px-4 py-3">
            <DialogTitle className="text-base">Project Viewer</DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => setShowProject(false)}><X className="h-4 w-4" /></Button>
          </div>
          {projectUrl && <iframe src={projectUrl} title="Project viewer" className="h-[75vh] w-full bg-background" />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GamesTracker;
