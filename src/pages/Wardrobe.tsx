import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Shirt, Plus, Camera, Upload, Search,
  RotateCcw, Wind, Archive, ShoppingBag, Sparkles,
  Trash2, Pencil, MoveRight, Wand2, ScanLine,
  ChevronRight, X, Check, RefreshCw, AlertCircle,
  Timer, WashingMachine, Layers, Hanger
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  smartClosetEngine,
  ClothingType, PatternType, StyleType, SeasonType, LocationType,
  ClothingAnalysis, WardrobeItem, OutfitSuggestion
} from "@/services/SmartClosetVisionEngine";

// ─── Constants ────────────────────────────────────────────────────────────────

type Tab = "wardrobe" | "laundry" | "outfits" | "scanner";
type AddStep = "capture" | "analyzing" | "confirm" | null;

const CLOTHING_TYPES: ClothingType[] = ["T-shirt","Shirt","Hoodie","Jacket","Coat","Pants","Jeans","Shorts","Chinos","Sweatpants","Thobe","Tracksuit"];
const PATTERNS:       PatternType[]  = ["Solid","Striped","Floral","Checkered","Graphic"];
const STYLES:         StyleType[]    = ["Casual","Formal","Sport","Streetwear","Homewear"];
const SEASONS:        SeasonType[]   = ["Summer","Winter","All-Season","Spring/Fall"];
const LOCATIONS:      LocationType[] = ["Closet","Laundry Basket","Washing Machine","Drying"];
const COLORS_LIST = ["Black","White","Gray","Navy","Blue","Red","Green","Brown","Beige","Yellow","Orange","Pink","Purple","Teal"];

const LOCATION_META: Record<LocationType, { icon: typeof Archive; color: string; bg: string; next?: LocationType; nextLabel?: string; needsTimer?: boolean }> = {
  "Closet":          { icon: Archive,       color: "text-green-400",  bg: "bg-green-400/15",  next: "Laundry Basket",  nextLabel: "Send to Laundry" },
  "Laundry Basket":  { icon: ShoppingBag,   color: "text-amber-400",  bg: "bg-amber-400/15",  next: "Washing Machine", nextLabel: "Start Washing", needsTimer: true },
  "Washing Machine": { icon: RotateCcw,     color: "text-blue-400",   bg: "bg-blue-400/15",   next: "Drying",          nextLabel: "Hang to Dry" },
  "Drying":          { icon: Wind,          color: "text-sky-400",    bg: "bg-sky-400/15",    next: "Closet",          nextLabel: "Done — Put Away" },
};

const COLOR_HEX: Record<string, string> = {
  Black:"#1a1a1a",White:"#f5f5f5",Gray:"#888",Navy:"#1a2d6b",Blue:"#3b82f6",
  Red:"#ef4444",Green:"#22c55e",Brown:"#78350f",Beige:"#c8a97a",
  Yellow:"#facc15",Orange:"#f97316",Pink:"#ec4899",Purple:"#a855f7",Teal:"#14b8a6",
};

const STYLE_COLORS: Record<string, string> = {
  Casual:"#f59e0b",Formal:"#6366f1",Sport:"#22c55e",Streetwear:"#a855f7",Homewear:"#64748b",
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Wardrobe() {
  const navigate = useNavigate();
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const scanInputRef   = useRef<HTMLInputElement>(null);

  const [tab,         setTab]         = useState<Tab>("wardrobe");
  const [items,       setItems]       = useState<WardrobeItem[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [locFilter,   setLocFilter]   = useState<LocationType | "All">("All");

  // Wash duration modal
  const [washModalItem, setWashModalItem] = useState<WardrobeItem | null>(null);
  const [washDuration,  setWashDuration]  = useState<number>(60);

  // Add flow
  const [addStep,     setAddStep]     = useState<AddStep>(null);
  const [analysis,    setAnalysis]    = useState<ClothingAnalysis | null>(null);
  const [editForm,    setEditForm]    = useState<Partial<ClothingAnalysis & { brand: string }>>({});
  const [saving,      setSaving]      = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState("");

  // Detail / edit modal
  const [selected,    setSelected]    = useState<WardrobeItem | null>(null);
  const [editMode,    setEditMode]    = useState(false);
  const [editItem,    setEditItem]    = useState<Partial<WardrobeItem>>({});

  // Outfit tab
  const [outfits,     setOutfits]     = useState<OutfitSuggestion[]>([]);
  const [outfitStyle, setOutfitStyle] = useState<StyleType | "All">("All");

  // Scanner tab
  const [scanResult,  setScanResult]  = useState<{ found: WardrobeItem | null; analysis: ClothingAnalysis | null } | null>(null);
  const [scanning,    setScanning]    = useState(false);

  // ── Data loading (initial load only — mutations use optimistic updates) ──────
  async function loadItems() {
    const { data } = await supabase.from("wardrobe").select("*").order("created_at", { ascending: false });
    const mapped = (data || []).map((d: any) => ({
      ...d,
      colors: Array.isArray(d.colors) ? d.colors : [],
      location: (d.location || "Closet") as LocationType,
    }));
    setItems(mapped);
    setLoading(false);
  }

  useEffect(() => { loadItems(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Add flow: handle image capture ──────────────────────────────────────────
  async function handleImageFile(file: File) {
    setAddStep("analyzing");
    setAnalyzeProgress("Reading image...");
    try {
      const dataUrl = await smartClosetEngine.readFileAsDataURL(file);
      setAnalyzeProgress("Preprocessing image (224×224)...");
      await new Promise(r => setTimeout(r, 300));
      setAnalyzeProgress("Removing background...");
      await new Promise(r => setTimeout(r, 300));
      setAnalyzeProgress("Extracting dominant colors...");
      await new Promise(r => setTimeout(r, 300));
      setAnalyzeProgress("Detecting patterns...");
      await new Promise(r => setTimeout(r, 300));
      setAnalyzeProgress("Classifying clothing type...");
      const result = await smartClosetEngine.analyze(dataUrl);
      setAnalysis(result);
      setEditForm({ ...result, brand: "" });
      setAnalyzeProgress("Done!");
      setAddStep("confirm");
    } catch {
      setAddStep("capture");
      setAnalyzeProgress("");
    }
  }

  // ── Save item — OPTIMISTIC ──────────────────────────────────────────────────
  // 1. Close add screen immediately — user sees wardrobe at once
  // 2. Prepend a temp item to local state — appears instantly in the list
  // 3. DB insert fires in background; temp item swapped with real DB row when done
  async function saveItem() {
    if (!analysis) return;
    setSaving(true);

    const payload = {
      image_url:           analysis.processedImageUrl,
      type:                editForm.type    ?? analysis.type,
      pattern:             editForm.pattern ?? analysis.pattern,
      colors:              editForm.colors  ?? analysis.colors,
      style:               editForm.style   ?? analysis.style,
      season:              editForm.season  ?? analysis.season,
      brand:               editForm.brand   ?? null,
      location:            "Closet" as LocationType,
      location_updated_at: new Date().toISOString(),
    };

    // Temp item for instant display
    const tempId   = `temp-${Date.now()}`;
    const tempItem: WardrobeItem = {
      id: tempId, notes: null, worn_count: 0,
      last_worn: null, created_at: new Date().toISOString(),
      ...payload,
    };

    // Instant UI update — no waiting
    setItems(prev => [tempItem, ...prev]);
    setAddStep(null); setAnalysis(null); setEditForm({}); setSaving(false);

    // Background DB write
    const { data } = await supabase.from("wardrobe").insert(payload).select().single();
    if (data) {
      // Swap temp row with real DB row (real UUID etc.)
      setItems(prev => prev.map(i =>
        i.id === tempId
          ? { ...data, colors: Array.isArray(data.colors) ? data.colors : [], location: (data.location || "Closet") as LocationType }
          : i
      ));
    }
  }

  // ── Move item location — OPTIMISTIC ─────────────────────────────────────────
  async function moveLocation(item: WardrobeItem, to: LocationType, washMinutes?: number) {
    const ts = new Date().toISOString();
    const update: any = { location: to, location_updated_at: ts };

    // When starting wash: record start time + duration
    if (to === "Washing Machine" && washMinutes) {
      update.wash_start_time = ts;
      update.wash_duration_minutes = washMinutes;
    }
    // When moving out of washing machine to drying: clear wash timer
    if (to === "Drying") {
      update.wash_start_time = null;
      update.wash_duration_minutes = null;
    }

    // Instant local update
    setItems(prev => prev.map(i =>
      i.id === item.id ? { ...i, ...update } : i
    ));
    if (selected?.id === item.id)
      setSelected(prev => prev ? { ...prev, ...update } : null);
    // Background DB write
    await supabase.from("wardrobe").update(update).eq("id", item.id);
  }

  // ── Trigger wash — open duration picker then move ───────────────────────────
  function triggerStartWash(item: WardrobeItem) {
    setWashModalItem(item);
    setWashDuration(60);
  }

  async function confirmStartWash() {
    if (!washModalItem) return;
    await moveLocation(washModalItem, "Washing Machine", washDuration);
    setWashModalItem(null);
  }

  // ── Delete item — OPTIMISTIC ─────────────────────────────────────────────────
  async function deleteItem(id: string) {
    // Instant local removal
    setItems(prev => prev.filter(i => i.id !== id));
    setSelected(null);
    // Background DB delete
    await supabase.from("wardrobe").delete().eq("id", id);
  }

  // ── Save edit — OPTIMISTIC ───────────────────────────────────────────────────
  async function saveEdit() {
    if (!selected) return;
    // Instant local update
    setItems(prev => prev.map(i => i.id === selected.id ? { ...i, ...editItem } : i));
    setSelected(prev => prev ? { ...prev, ...editItem } : null);
    setEditMode(false);
    // Background DB write
    await supabase.from("wardrobe").update({ ...editItem, updated_at: new Date().toISOString() }).eq("id", selected.id);
  }

  // ── Scanner ─────────────────────────────────────────────────────────────────
  async function handleScan(file: File) {
    setScanning(true);
    setScanResult(null);
    try {
      const dataUrl = await smartClosetEngine.readFileAsDataURL(file);
      const a = await smartClosetEngine.analyze(dataUrl);
      const found = smartClosetEngine.findSimilarItem(a, items);
      setScanResult({ found, analysis: a });
    } catch {
      setScanResult(null);
    }
    setScanning(false);
  }

  // ── Generate outfits ─────────────────────────────────────────────────────────
  function generateOutfits() {
    const generated = smartClosetEngine.generateOutfits(items);
    setOutfits(generated);
  }

  // ─── UI helpers ─────────────────────────────────────────────────────────────
  const filteredItems = locFilter === "All" ? items : items.filter(i => i.location === locFilter);

  const laundryGroups: LocationType[] = ["Laundry Basket","Washing Machine","Drying"];

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: ADD FLOW overlay
  // ═══════════════════════════════════════════════════════════════════════════
  if (addStep) return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <button onClick={() => { setAddStep(null); setAnalysis(null); }} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-bold text-base">
          {addStep === "capture" ? "Add Clothing" : addStep === "analyzing" ? "Analyzing..." : "Confirm Details"}
        </h1>
      </div>

      {/* Capture step */}
      {addStep === "capture" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
          <div className="p-5 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-xl shadow-violet-500/30">
            <Wand2 className="h-12 w-12 text-white" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold mb-1">Smart Closet Vision</h2>
            <p className="text-sm text-muted-foreground">AI will automatically detect type, colors, pattern & style</p>
          </div>
          <div className="w-full max-w-xs space-y-3">
            <button onClick={() => cameraInputRef.current?.click()} className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl border border-border bg-card hover:bg-muted transition-all active:scale-95">
              <Camera className="h-5 w-5 text-primary" />
              <span className="font-medium">Take Photo</span>
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl border border-border bg-card hover:bg-muted transition-all active:scale-95">
              <Upload className="h-5 w-5 text-primary" />
              <span className="font-medium">Upload from Gallery</span>
            </button>
          </div>
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => e.target.files?.[0] && handleImageFile(e.target.files[0])} />
          <input ref={fileInputRef}   type="file" accept="image/*"                       className="hidden" onChange={e => e.target.files?.[0] && handleImageFile(e.target.files[0])} />
        </div>
      )}

      {/* Analyzing step */}
      {addStep === "analyzing" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Wand2 className="h-8 w-8 text-violet-400" />
            </div>
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground mb-1">Running Smart Closet Vision</p>
            <p className="text-sm text-muted-foreground">{analyzeProgress}</p>
          </div>
          {/* Steps */}
          {["Preprocessing (224×224)","Background removal","Color extraction","Pattern detection","Type classification"].map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center ${i < 4 ? "bg-violet-500" : "bg-muted"}`}>
                {i < 4 ? <Check className="h-2.5 w-2.5 text-white" /> : <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />}
              </div>
              <span className={i < 4 ? "text-foreground" : ""}>{s}</span>
            </div>
          ))}
        </div>
      )}

      {/* Confirm step */}
      {addStep === "confirm" && analysis && (
        <div className="flex-1 overflow-y-auto pb-28">
          {/* Image preview */}
          <div className="relative h-52 overflow-hidden" style={{ background: "repeating-conic-gradient(#2a2a35 0% 25%, #1a1a24 0% 50%) 0 0 / 20px 20px" }}>
            <img src={analysis.processedImageUrl} alt="item" className="w-full h-full object-contain" style={{ mixBlendMode: "normal" }} />
            <div className="absolute top-3 right-3 bg-black/60 rounded-xl px-3 py-1 text-xs text-white flex items-center gap-1">
              <Wand2 className="h-3 w-3" />
              {Math.round(analysis.confidence * 100)}% confidence
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Type */}
            <SelectField label="Type" value={editForm.type ?? analysis.type} options={CLOTHING_TYPES}
              onChange={v => setEditForm(p => ({ ...p, type: v as ClothingType }))} />
            {/* Pattern */}
            <SelectField label="Pattern" value={editForm.pattern ?? analysis.pattern} options={PATTERNS}
              onChange={v => setEditForm(p => ({ ...p, pattern: v as PatternType }))} />
            {/* Style */}
            <SelectField label="Style" value={editForm.style ?? analysis.style} options={STYLES}
              onChange={v => setEditForm(p => ({ ...p, style: v as StyleType }))} />
            {/* Season */}
            <SelectField label="Season" value={editForm.season ?? analysis.season} options={SEASONS}
              onChange={v => setEditForm(p => ({ ...p, season: v as SeasonType }))} />
            {/* Colors */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Colors</label>
              <div className="flex flex-wrap gap-2">
                {COLORS_LIST.map(c => {
                  const active = (editForm.colors ?? analysis.colors).includes(c);
                  return (
                    <button key={c} onClick={() => {
                      const cur = editForm.colors ?? analysis.colors;
                      setEditForm(p => ({ ...p, colors: active ? cur.filter(x => x !== c) : [...cur, c].slice(0, 3) }));
                    }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                      <span className="w-3 h-3 rounded-full border border-border/50" style={{ background: COLOR_HEX[c] ?? "#888" }} />
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Brand */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Brand (optional)</label>
              <input value={editForm.brand ?? ""} onChange={e => setEditForm(p => ({ ...p, brand: e.target.value }))}
                placeholder="e.g. Nike, Zara..."
                className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
            </div>
          </div>

          {/* Save button */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
            <button onClick={saveItem} disabled={saving} className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white transition-all active:scale-95 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#8b5cf6,#7c3aed)" }}>
              {saving ? "Saving..." : "Save to Wardrobe"}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: ITEM DETAIL MODAL
  // ═══════════════════════════════════════════════════════════════════════════
  if (selected) {
    const meta = LOCATION_META[selected.location];
    const LocIcon = meta.icon;
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <button onClick={() => { setSelected(null); setEditMode(false); }} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-bold text-base flex-1">{selected.type}</h1>
          {!editMode && (
            <button onClick={() => { setEditMode(true); setEditItem({ type: selected.type as ClothingType, pattern: selected.pattern as PatternType, colors: selected.colors, style: selected.style as StyleType, season: selected.season as SeasonType, brand: selected.brand }); }}
              className="p-2 rounded-xl hover:bg-muted transition-colors">
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto pb-4">
          {/* Image */}
          <div className="h-64 overflow-hidden" style={{ background: "repeating-conic-gradient(#2a2a35 0% 25%, #1a1a24 0% 50%) 0 0 / 20px 20px" }}>
            {selected.image_url
              ? <img src={selected.image_url} alt={selected.type} className="w-full h-full object-contain" />
              : <div className="w-full h-full flex items-center justify-center"><Shirt className="h-16 w-16 text-muted-foreground/30" /></div>
            }
          </div>

          {/* Location badge */}
          <div className={`mx-4 mt-4 flex items-center gap-2 px-4 py-3 rounded-2xl ${meta.bg}`}>
            <LocIcon className={`h-5 w-5 ${meta.color}`} />
            <div className="flex-1">
              <p className={`text-sm font-semibold ${meta.color}`}>Location: {selected.location}</p>
              {selected.location_updated_at && (
                <p className="text-xs text-muted-foreground">
                  Since {format(new Date(selected.location_updated_at), "MMM d, h:mm a")}
                </p>
              )}
            </div>
          </div>

          {/* Edit mode or view mode */}
          <div className="p-4 space-y-4">
            {editMode ? (
              <>
                <SelectField label="Type"    value={editItem.type    ?? selected.type}    options={CLOTHING_TYPES} onChange={v => setEditItem(p => ({ ...p, type: v }))} />
                <SelectField label="Pattern" value={editItem.pattern ?? selected.pattern} options={PATTERNS}       onChange={v => setEditItem(p => ({ ...p, pattern: v }))} />
                <SelectField label="Style"   value={editItem.style   ?? selected.style}   options={STYLES}         onChange={v => setEditItem(p => ({ ...p, style: v }))} />
                <SelectField label="Season"  value={editItem.season  ?? selected.season}  options={SEASONS}        onChange={v => setEditItem(p => ({ ...p, season: v }))} />
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Colors</label>
                  <div className="flex flex-wrap gap-2">
                    {COLORS_LIST.map(c => {
                      const active = (editItem.colors ?? selected.colors).includes(c);
                      return (
                        <button key={c} onClick={() => {
                          const cur = editItem.colors ?? selected.colors;
                          setEditItem(p => ({ ...p, colors: active ? cur.filter(x => x !== c) : [...cur, c].slice(0, 3) }));
                        }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                          <span className="w-3 h-3 rounded-full" style={{ background: COLOR_HEX[c] ?? "#888" }} />
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <input value={editItem.brand ?? ""} onChange={e => setEditItem(p => ({ ...p, brand: e.target.value }))}
                  placeholder="Brand (optional)"
                  className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
                <div className="flex gap-3">
                  <button onClick={() => setEditMode(false)} className="flex-1 py-3 rounded-2xl bg-muted text-sm font-medium">Cancel</button>
                  <button onClick={saveEdit} className="flex-1 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold">Save</button>
                </div>
              </>
            ) : (
              <>
                {/* Attributes */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Type",    value: selected.type },
                    { label: "Pattern", value: selected.pattern },
                    { label: "Style",   value: selected.style },
                    { label: "Season",  value: selected.season },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-card border border-border rounded-xl p-3">
                      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                      <p className="text-sm font-semibold">{value}</p>
                    </div>
                  ))}
                </div>
                {/* Colors */}
                {selected.colors?.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Colors</p>
                    <div className="flex gap-2 flex-wrap">
                      {selected.colors.map(c => (
                        <span key={c} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs bg-card border border-border">
                          <span className="w-3 h-3 rounded-full" style={{ background: COLOR_HEX[c] ?? "#888" }} />
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {selected.brand && <p className="text-sm text-muted-foreground">🏷️ {selected.brand}</p>}

                {/* Move to next location */}
                {meta.next && (
                  <button onClick={() => moveLocation(selected, meta.next!)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl ${meta.bg} ${meta.color} font-medium text-sm transition-all active:scale-95`}>
                    <span>{meta.nextLabel}</span>
                    <MoveRight className="h-4 w-4" />
                  </button>
                )}

                {/* Move to any location */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Move to location</p>
                  <div className="flex flex-wrap gap-2">
                    {LOCATIONS.filter(l => l !== selected.location).map(l => {
                      const m = LOCATION_META[l];
                      const Icon = m.icon;
                      return (
                        <button key={l} onClick={() => moveLocation(selected, l)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium ${m.bg} ${m.color} transition-all active:scale-95`}>
                          <Icon className="h-3.5 w-3.5" />
                          {l}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Create outfit */}
                <button onClick={() => { setSelected(null); setTab("outfits"); generateOutfits(); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-violet-500/10 text-violet-400 text-sm font-medium transition-all active:scale-95">
                  <Sparkles className="h-4 w-4" />
                  Generate Outfit with This Item
                </button>

                {/* Delete */}
                <button onClick={() => deleteItem(selected.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-red-500/10 text-red-400 text-sm font-medium transition-all active:scale-95">
                  <Trash2 className="h-4 w-4" />
                  Delete Item
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: MAIN PAGE
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <div className="p-1.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
            <Shirt className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight">Smart Closet</h1>
            <p className="text-[11px] text-muted-foreground">{items.length} items · {items.filter(i => i.location === "Closet").length} available</p>
          </div>
        </div>
      </div>

      {/* ── WARDROBE TAB ─────────────────────────────────────────────────── */}
      {tab === "wardrobe" && (
        <>
          {/* Location filter */}
          <div className="px-4 pt-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
            {(["All", ...LOCATIONS] as const).map(loc => {
              const isActive = locFilter === loc;
              const meta = loc !== "All" ? LOCATION_META[loc] : null;
              return (
                <button key={loc} onClick={() => setLocFilter(loc)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all
                    ${isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {meta && <meta.icon className="h-3.5 w-3.5" />}
                  {loc === "All" ? `All (${items.length})` : `${loc} (${items.filter(i => i.location === loc).length})`}
                </button>
              );
            })}
          </div>

          {/* Grid */}
          <div className="px-4 grid grid-cols-2 gap-3 pb-4">
            {loading ? (
              [...Array(6)].map((_, i) => <div key={i} className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />)
            ) : filteredItems.length === 0 ? (
              <div className="col-span-2 flex flex-col items-center justify-center py-20 gap-4 text-center">
                <div className="p-5 rounded-3xl bg-muted">
                  <Shirt className="h-10 w-10 text-muted-foreground/40" />
                </div>
                <div>
                  <p className="font-semibold">No items here</p>
                  <p className="text-sm text-muted-foreground mt-1">Add your first clothing item</p>
                </div>
              </div>
            ) : (
              filteredItems.map(item => {
                const meta = LOCATION_META[item.location];
                const LocIcon = meta.icon;
                return (
                  <button key={item.id} onClick={() => setSelected(item)}
                    className="aspect-[3/4] rounded-2xl bg-card border border-border overflow-hidden text-left transition-all active:scale-95 relative group">
                    {item.image_url
                      ? <img src={item.image_url} alt={item.type} className="w-full h-full object-contain" style={{ background: "repeating-conic-gradient(#2a2a35 0% 25%,#1a1a24 0% 50%) 0 0/16px 16px" }} />
                      : (
                        <div className="w-full h-full flex items-center justify-center"
                          style={{ background: item.colors?.[0] ? `${COLOR_HEX[item.colors[0]] ?? "#888"}22` : "rgba(139,92,246,0.08)" }}>
                          <Shirt className="h-12 w-12 text-muted-foreground/20" />
                        </div>
                      )
                    }
                    {/* Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2.5">
                      <p className="text-xs font-semibold text-white truncate">{item.type}</p>
                      <div className={`flex items-center gap-1 mt-0.5`}>
                        <LocIcon className={`h-3 w-3 ${meta.color}`} />
                        <span className={`text-[10px] ${meta.color}`}>{item.location}</span>
                      </div>
                    </div>
                    {/* Color dots */}
                    {item.colors?.length > 0 && (
                      <div className="absolute top-2 right-2 flex gap-1">
                        {item.colors.slice(0, 3).map(c => (
                          <div key={c} className="w-4 h-4 rounded-full border border-white/30 shadow-sm" style={{ background: COLOR_HEX[c] ?? "#888" }} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* FAB */}
          <button onClick={() => setAddStep("capture")}
            className="fixed bottom-20 right-4 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all active:scale-90 z-10"
            style={{ background: "linear-gradient(135deg,#8b5cf6,#7c3aed)", boxShadow: "0 8px 24px rgba(139,92,246,0.5)" }}>
            <Plus className="h-6 w-6 text-white" />
          </button>
        </>
      )}

      {/* ── LAUNDRY TAB ──────────────────────────────────────────────────── */}
      {tab === "laundry" && (
        <div className="px-4 pt-4 space-y-4 pb-4">
          {/* Laundry pipeline — Basket → Machine → Drying → (auto back to Closet) */}
          {(["Laundry Basket","Washing Machine","Drying"] as LocationType[]).map(loc => {
            const meta = LOCATION_META[loc];
            const LocIcon = meta.icon;
            const groupItems = items.filter(i => i.location === loc);
            return (
              <div key={loc} className="rounded-2xl border border-border overflow-hidden">
                {/* Group header */}
                <div className={`flex items-center gap-2 px-4 py-3 ${meta.bg}`}>
                  <LocIcon className={`h-4 w-4 ${meta.color}`} />
                  <span className={`text-sm font-semibold ${meta.color}`}>{loc}</span>
                  {loc === "Washing Machine" && groupItems.length > 0 && groupItems[0].wash_duration_minutes && (
                    <span className="ml-2 flex items-center gap-1 text-[10px] text-blue-300 bg-blue-400/10 px-2 py-0.5 rounded-full">
                      <Timer className="h-3 w-3" />
                      {groupItems[0].wash_duration_minutes}min
                    </span>
                  )}
                  <span className={`ml-auto text-xs ${meta.color} opacity-70`}>{groupItems.length} item{groupItems.length !== 1 ? "s" : ""}</span>
                </div>

                {groupItems.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-muted-foreground">Empty</div>
                ) : (
                  <div className="p-3 flex gap-3 overflow-x-auto no-scrollbar">
                    {groupItems.map(item => (
                      <div key={item.id} className="shrink-0 w-32">
                        <div className="aspect-square rounded-xl bg-muted overflow-hidden mb-2 cursor-pointer" onClick={() => setSelected(item)}>
                          {item.image_url
                            ? <img src={item.image_url} alt={item.type} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center"><Shirt className="h-8 w-8 text-muted-foreground/30" /></div>
                          }
                        </div>
                        <p className="text-xs font-medium truncate mb-1">{item.type}</p>
                        {meta.next && (
                          <button
                            onClick={() => meta.needsTimer ? triggerStartWash(item) : moveLocation(item, meta.next!)}
                            className={`w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-medium ${meta.bg} ${meta.color} transition-all active:scale-95`}>
                            {meta.needsTimer ? <Timer className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            {meta.nextLabel}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Closet items — send to laundry */}
          <div className="rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-green-400/10">
              <Archive className="h-4 w-4 text-green-400" />
              <span className="text-sm font-semibold text-green-400">In Closet</span>
              <span className="ml-auto text-xs text-green-400/70">{items.filter(i => i.location === "Closet").length} items</span>
            </div>
            <div className="p-3 flex gap-3 overflow-x-auto no-scrollbar">
              {items.filter(i => i.location === "Closet").map(item => (
                <div key={item.id} className="shrink-0 w-32">
                  <div className="aspect-square rounded-xl bg-muted overflow-hidden mb-2 cursor-pointer" onClick={() => setSelected(item)}>
                    {item.image_url ? <img src={item.image_url} alt={item.type} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Shirt className="h-8 w-8 text-muted-foreground/30" /></div>}
                  </div>
                  <p className="text-xs font-medium truncate mb-1">{item.type}</p>
                  <button onClick={() => moveLocation(item, "Laundry Basket")}
                    className="w-full py-1.5 rounded-lg text-[11px] font-medium bg-amber-400/15 text-amber-400 transition-all active:scale-95">
                    Send to Laundry
                  </button>
                </div>
              ))}
              {items.filter(i => i.location === "Closet").length === 0 && (
                <p className="text-xs text-muted-foreground py-6 px-4">All items are in the wash cycle</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── OUTFITS TAB ──────────────────────────────────────────────────── */}
      {tab === "outfits" && (
        <div className="px-4 pt-4 pb-4">
          {/* Generate button */}
          <button onClick={generateOutfits}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm text-white mb-4 transition-all active:scale-95"
            style={{ background: "linear-gradient(135deg,#8b5cf6,#7c3aed)" }}>
            <RefreshCw className="h-4 w-4" />
            Generate Outfits
          </button>

          {/* Style filter */}
          {outfits.length > 0 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 pb-1">
              {(["All","Casual","Formal","Sport","Streetwear","Homewear"] as const).map(s => (
                <button key={s} onClick={() => setOutfitStyle(s)}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all
                    ${outfitStyle === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {outfits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
              <div className="p-5 rounded-3xl bg-muted">
                <Sparkles className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <div>
                <p className="font-semibold">No outfits generated yet</p>
                <p className="text-sm text-muted-foreground mt-1">Tap Generate to create outfit suggestions from your closet</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card border border-border rounded-xl px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                Only items in Closet or Ready to Wear are used
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {outfits
                .filter(o => outfitStyle === "All" || o.style === outfitStyle)
                .map(outfit => (
                  <div key={outfit.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                      <div>
                        <p className="text-sm font-semibold">{outfit.description}</p>
                        <span className="text-[11px] px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ background: `${STYLE_COLORS[outfit.style]}22`, color: STYLE_COLORS[outfit.style] }}>
                          {outfit.style}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-3 p-3 overflow-x-auto no-scrollbar">
                      {outfit.items.map(item => (
                        <div key={item.id} className="shrink-0 text-center">
                          <div className="w-20 h-20 rounded-xl bg-muted overflow-hidden mb-1.5 cursor-pointer" onClick={() => setSelected(item)}>
                            {item.image_url
                              ? <img src={item.image_url} alt={item.type} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center"><Shirt className="h-8 w-8 text-muted-foreground/30" /></div>
                            }
                          </div>
                          <p className="text-[11px] text-muted-foreground">{item.type}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              }
            </div>
          )}
        </div>
      )}

      {/* ── SCANNER TAB ──────────────────────────────────────────────────── */}
      {tab === "scanner" && (
        <div className="px-4 pt-6 pb-4">
          <div className="text-center mb-6">
            <div className="inline-flex p-4 rounded-3xl mb-3" style={{ background: "linear-gradient(135deg,rgba(139,92,246,0.15),rgba(124,58,237,0.15))" }}>
              <ScanLine className="h-8 w-8 text-violet-400" />
            </div>
            <h2 className="font-bold text-base mb-1">Clothing Scanner</h2>
            <p className="text-sm text-muted-foreground">Scan a clothing item to look it up in your wardrobe</p>
          </div>

          {/* Scan buttons */}
          <div className="flex gap-3 mb-6">
            <button onClick={() => scanInputRef.current?.setAttribute("capture","environment") || scanInputRef.current?.click()}
              className="flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border border-border bg-card hover:bg-muted transition-all active:scale-95">
              <Camera className="h-6 w-6 text-violet-400" />
              <span className="text-sm font-medium">Scan with Camera</span>
            </button>
            <button onClick={() => { scanInputRef.current?.removeAttribute("capture"); scanInputRef.current?.click(); }}
              className="flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border border-border bg-card hover:bg-muted transition-all active:scale-95">
              <Upload className="h-6 w-6 text-violet-400" />
              <span className="text-sm font-medium">Upload Photo</span>
            </button>
          </div>
          <input ref={scanInputRef} type="file" accept="image/*" className="hidden"
            onChange={e => { if (e.target.files?.[0]) { handleScan(e.target.files[0]); e.target.value = ""; } }} />

          {/* Scanning indicator */}
          {scanning && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-12 h-12 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
              <p className="text-sm text-muted-foreground">Analyzing clothing item...</p>
            </div>
          )}

          {/* Scan result */}
          {scanResult && !scanning && (
            <div>
              {scanResult.found ? (
                <div className="rounded-2xl border border-green-500/30 bg-green-500/5 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-green-500/20">
                    <Check className="h-4 w-4 text-green-400" />
                    <span className="text-sm font-semibold text-green-400">Item Found in Wardrobe</span>
                  </div>
                  <div className="flex gap-4 p-4">
                    <div className="w-24 h-24 rounded-xl bg-muted overflow-hidden shrink-0">
                      {scanResult.found.image_url
                        ? <img src={scanResult.found.image_url} alt="item" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><Shirt className="h-8 w-8 text-muted-foreground/30" /></div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-base mb-1">{scanResult.found.type}</p>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p>Pattern: {scanResult.found.pattern}</p>
                        <p>Style: {scanResult.found.style} · {scanResult.found.season}</p>
                        {scanResult.found.colors?.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {scanResult.found.colors.map(c => (
                              <span key={c} className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: COLOR_HEX[c] ?? "#888" }} />
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Location */}
                      {(() => {
                        const m = LOCATION_META[scanResult.found.location];
                        const Icon = m.icon;
                        return (
                          <div className={`flex items-center gap-1.5 mt-2 px-2 py-1 rounded-lg ${m.bg} w-fit`}>
                            <Icon className={`h-3 w-3 ${m.color}`} />
                            <span className={`text-xs font-medium ${m.color}`}>{scanResult.found.location}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex gap-2 px-4 pb-4">
                    <button onClick={() => setSelected(scanResult.found!)} className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-card border border-border transition-all active:scale-95">
                      View Details
                    </button>
                    {LOCATION_META[scanResult.found.location].next && (
                      <button onClick={() => moveLocation(scanResult.found!, LOCATION_META[scanResult.found!.location].next!)}
                        className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground transition-all active:scale-95">
                        {LOCATION_META[scanResult.found.location].nextLabel}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                    <X className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-muted-foreground">Item Not Found in Wardrobe</span>
                  </div>
                  {scanResult.analysis && (
                    <div className="px-4 py-3 text-xs text-muted-foreground border-b border-border">
                      Detected: <span className="text-foreground font-medium">{scanResult.analysis.type}</span> · {scanResult.analysis.colors.join(", ")} · {scanResult.analysis.pattern}
                    </div>
                  )}
                  <div className="p-4">
                    <button onClick={() => { setScanResult(null); setAddStep("capture"); }}
                      className="w-full py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground transition-all active:scale-95">
                      Add as New Item
                    </button>
                  </div>
                </div>
              )}
              <button onClick={() => setScanResult(null)} className="w-full mt-3 py-2.5 text-sm text-muted-foreground">Scan Another Item</button>
            </div>
          )}
        </div>
      )}

      {/* ── WASH DURATION MODAL ─────────────────────────────────────────────── */}
      {washModalItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card rounded-t-3xl p-6 pb-8 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-400/15 flex items-center justify-center">
                <Timer className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold">Start Washing</h3>
                <p className="text-xs text-muted-foreground">{washModalItem.type} · How long is the cycle?</p>
              </div>
              <button onClick={() => setWashModalItem(null)} className="ml-auto p-2 rounded-xl hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Duration picker */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Wash duration</span>
                <span className="text-2xl font-bold text-blue-400">{washDuration}<span className="text-sm font-normal text-muted-foreground ml-1">min</span></span>
              </div>
              <input type="range" min={15} max={180} step={15} value={washDuration}
                onChange={e => setWashDuration(Number(e.target.value))}
                className="w-full accent-blue-400" />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>15m</span><span>45m</span><span>60m</span><span>90m</span><span>120m</span><span>180m</span>
              </div>
              {/* Quick presets */}
              <div className="flex gap-2 flex-wrap">
                {[30,45,60,90,120].map(m => (
                  <button key={m} onClick={() => setWashDuration(m)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${washDuration === m ? "bg-blue-400/25 text-blue-400" : "bg-muted text-muted-foreground"}`}>
                    {m}min
                  </button>
                ))}
              </div>
            </div>

            <button onClick={confirmStartWash}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white bg-blue-500 active:scale-95 transition-all">
              Start Washing · {washDuration} min
            </button>
          </div>
        </div>
      )}

      {/* ── BOTTOM NAV — matches Financial card style ──────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-20">
        <div className="absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        <div className="bg-background/80 backdrop-blur-2xl border-t border-border/20 shadow-2xl shadow-black/10">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
          <div className="grid grid-cols-4 h-16 px-2">
            {([
              { id: "wardrobe", label: "Wardrobe", icon: Shirt    },
              { id: "laundry",  label: "Laundry",  icon: Wind     },
              { id: "outfits",  label: "Outfits",  icon: Sparkles },
              { id: "scanner",  label: "Scanner",  icon: ScanLine },
            ] as const).map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`relative flex flex-col items-center justify-center gap-0.5 transition-all duration-300 rounded-2xl mx-1 ${tab === t.id ? "text-violet-400" : "text-muted-foreground hover:text-foreground"}`}>
                {tab === t.id && (
                  <>
                    <div className="absolute inset-1 bg-gradient-to-b from-violet-500/15 to-violet-500/5 rounded-xl" />
                    <div className="absolute top-1 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r from-transparent via-violet-400 to-transparent rounded-full" />
                  </>
                )}
                <div className={`relative z-10 transition-all duration-300 ${tab === t.id ? "scale-110 -translate-y-0.5" : ""}`}>
                  <t.icon className="h-5 w-5" />
                </div>
                <span className={`relative z-10 text-[10px] font-medium transition-all duration-300 ${tab === t.id ? "font-semibold" : ""}`}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Reusable select field ────────────────────────────────────────────────────

function SelectField({ label, value, options, onChange }: {
  label: string; value: string; options: readonly string[]; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(o => (
          <button key={o} onClick={() => onChange(o)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all
              ${value === o ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
