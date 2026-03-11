import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shirt, Upload, X, Loader2, Sparkles, Tag, Palette, Cloud, Eye, Trash2, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface WardrobeItem {
  id: string;
  image_url: string | null;
  type: string | null;
  pattern: string | null;
  colors: string[];
  season: string | null;
  category: string | null;
  style?: string | null;
  brand: string | null;
  description?: string | null;
  worn_count: number;
  last_worn: string | null;
  created_at: string;
}

interface AnalysisResult {
  type?: string;
  category?: string;
  pattern?: string;
  colors?: string[];
  season?: string;
  style?: string;
  brand?: string;
  description?: string;
  error?: string;
}

const COLOR_MAP: Record<string, string> = {
  black: "#1a1a1a", white: "#f5f5f5", gray: "#888", grey: "#888",
  red: "#e53e3e", blue: "#3182ce", navy: "#1a365d", "navy blue": "#1a365d",
  green: "#38a169", yellow: "#d69e2e", orange: "#dd6b20", purple: "#805ad5",
  pink: "#d53f8c", brown: "#744210", beige: "#c4a882", cream: "#fefcbf",
  "light blue": "#90cdf4", "light gray": "#cbd5e0", "dark green": "#276749",
  "olive green": "#6b7c2b", khaki: "#c3a960", burgundy: "#7b341e",
  teal: "#2c7a7b", mint: "#81e6d9", lavender: "#b794f4", gold: "#d4a017",
};

function getColorHex(color: string): string {
  const lower = color.toLowerCase();
  for (const [key, hex] of Object.entries(COLOR_MAP)) {
    if (lower.includes(key)) return hex;
  }
  return "#888";
}

const CATEGORY_FILTER = ["All", "Tops", "Bottoms", "Outerwear", "Shoes", "Accessories", "Activewear"];

export default function Wardrobe() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [showUpload, setShowUpload] = useState(false);
  const [uploadState, setUploadState] = useState<"idle" | "analyzing" | "editing" | "saving">("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageType, setImageType] = useState("image/jpeg");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [editForm, setEditForm] = useState<Partial<WardrobeItem>>({});
  const [selected, setSelected] = useState<WardrobeItem | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => { loadWardrobe(); }, []);

  async function loadWardrobe() {
    setLoading(true);
    const { data } = await supabase.from("wardrobe").select("*").order("created_at", { ascending: false });
    setItems((data || []).map(d => ({ ...d, colors: Array.isArray(d.colors) ? d.colors : [] })));
    setLoading(false);
  }

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setImageType(file.type);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPreviewUrl(dataUrl);
      const base64 = dataUrl.split(",")[1];
      setImageBase64(base64);
      analyzeImage(base64, file.type);
    };
    reader.readAsDataURL(file);
    setShowUpload(true);
    setUploadState("analyzing");
  }

  async function analyzeImage(base64: string, mimeType: string) {
    setUploadState("analyzing");
    try {
      const res = await fetch("https://sfreodzibxmniiccqpcl.supabase.co/functions/v1/analyze-clothes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType: mimeType }),
      });
      const result: AnalysisResult = await res.json();
      setAnalysis(result);
      setEditForm({
        type: result.type || "",
        category: result.category || "",
        pattern: result.pattern || "Solid",
        colors: result.colors || [],
        season: result.season || "All-Season",
        brand: result.brand || "",
        description: result.description || "",
      });
    } catch {
      setAnalysis({ error: "Analysis failed. Fill in details manually." });
      setEditForm({ type: "", category: "Tops", pattern: "Solid", colors: [], season: "All-Season", brand: "" });
    }
    setUploadState("editing");
  }

  async function saveItem() {
    if (!imageBase64) return;
    setUploadState("saving");

    // Upload image to Supabase storage
    let imageUrl: string | null = null;
    try {
      const fileName = `wardrobe/${Date.now()}.${imageType.split("/")[1] || "jpg"}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("wardrobe")
        .upload(fileName, decode(imageBase64), { contentType: imageType, upsert: false });
      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage.from("wardrobe").getPublicUrl(fileName);
        imageUrl = urlData?.publicUrl || null;
      }
    } catch { /* storage might not be set up */ }

    // Save to DB (use data URL as fallback if storage unavailable)
    const finalUrl = imageUrl || `data:${imageType};base64,${imageBase64.substring(0, 100)}...`;

    const { error } = await supabase.from("wardrobe").insert({
      image_url: imageUrl || null,
      type: editForm.type || null,
      category: editForm.category || null,
      pattern: editForm.pattern || null,
      colors: editForm.colors || [],
      season: editForm.season || null,
      brand: editForm.brand || null,
      notes: editForm.description || null,
      worn_count: 0,
    });

    if (!error) {
      resetUpload();
      loadWardrobe();
    } else {
      setUploadState("editing");
    }
  }

  // Store image as base64 in DB directly (no storage needed for small images)
  async function saveItemWithBase64() {
    if (!imageBase64) return;
    setUploadState("saving");

    const { error } = await supabase.from("wardrobe").insert({
      image_url: previewUrl,  // store data URL directly
      type: editForm.type || null,
      category: editForm.category || null,
      pattern: editForm.pattern || null,
      colors: editForm.colors || [],
      season: editForm.season || null,
      brand: editForm.brand || null,
      notes: editForm.description || null,
      worn_count: 0,
    });

    if (!error) {
      resetUpload();
      loadWardrobe();
    } else {
      alert("خطأ بالحفظ 😕");
      setUploadState("editing");
    }
  }

  function resetUpload() {
    setShowUpload(false);
    setUploadState("idle");
    setPreviewUrl(null);
    setImageBase64(null);
    setAnalysis(null);
    setEditForm({});
  }

  async function deleteItem(id: string) {
    await supabase.from("wardrobe").delete().eq("id", id);
    setSelected(null);
    loadWardrobe();
  }

  async function markWorn(id: string) {
    const item = items.find(i => i.id === id);
    await supabase.from("wardrobe").update({
      worn_count: (item?.worn_count || 0) + 1,
      last_worn: format(new Date(), "yyyy-MM-dd"),
    }).eq("id", id);
    loadWardrobe();
    setSelected(null);
  }

  const filtered = activeFilter === "All" ? items : items.filter(i => i.category === activeFilter);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
            <Shirt className="h-4 w-4 text-white" />
          </div>
          <h1 className="text-base font-bold">My Wardrobe</h1>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{items.length}</span>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
          style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}
        >
          <Upload className="h-4 w-4" />
          Add
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
      />

      {/* Category filters */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
        {CATEGORY_FILTER.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveFilter(cat)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeFilter === cat
                ? "bg-violet-600 text-white"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Wardrobe grid */}
      <div className="px-4">
        {loading ? (
          <div className="grid grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="mt-10 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-muted-foreground/20 rounded-3xl py-16 cursor-pointer"
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const file = e.dataTransfer.files[0]; if (file) handleFile(file); }}
            onClick={() => fileRef.current?.click()}
            style={{ background: dragOver ? "rgba(124,58,237,0.05)" : undefined }}
          >
            <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/20">
              <Shirt className="h-10 w-10 text-violet-500" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">Your wardrobe is empty</p>
              <p className="text-sm text-muted-foreground mt-1">Upload a photo and AI will recognize it</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-violet-500 font-medium">
              <Sparkles className="h-4 w-4" />
              AI-powered recognition
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {filtered.map(item => (
              <button
                key={item.id}
                onClick={() => setSelected(item)}
                className="relative group aspect-square rounded-2xl overflow-hidden bg-muted border border-border hover:border-violet-400 transition-all hover:scale-[1.02] active:scale-95"
              >
                {item.image_url ? (
                  <img src={item.image_url} alt={item.type || "item"} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-500/10 to-purple-600/10">
                    <Shirt className="h-8 w-8 text-violet-400" />
                  </div>
                )}
                {/* Color dots overlay */}
                {item.colors && item.colors.length > 0 && (
                  <div className="absolute bottom-1.5 left-1.5 flex gap-1">
                    {item.colors.slice(0, 3).map((c, i) => (
                      <div key={i} className="w-3 h-3 rounded-full border border-white/60 shadow-sm" style={{ background: getColorHex(c) }} />
                    ))}
                  </div>
                )}
                {/* Type label */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[10px] font-medium text-white truncate">{item.type}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Upload / Analysis Sheet */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="mt-auto bg-background rounded-t-3xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold">
                {uploadState === "analyzing" ? "Analyzing..." : uploadState === "editing" ? "Confirm Details" : "Saving..."}
              </h2>
              {uploadState !== "saving" && (
                <button onClick={resetUpload} className="p-2 rounded-xl hover:bg-muted">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex gap-4 mb-5">
              {/* Image preview */}
              {previewUrl && (
                <div className="w-28 h-28 shrink-0 rounded-2xl overflow-hidden border border-border">
                  <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
                </div>
              )}

              {uploadState === "analyzing" && (
                <div className="flex-1 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                  <p className="text-sm text-muted-foreground">AI is analyzing your clothes...</p>
                  <div className="flex gap-1 text-xs text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                    Detecting type, pattern & colors
                  </div>
                </div>
              )}

              {(uploadState === "editing" || uploadState === "saving") && analysis && (
                <div className="flex-1 space-y-1.5">
                  {/* Type */}
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Type</label>
                    <input
                      className="w-full text-sm bg-muted rounded-xl px-3 py-2 mt-0.5 border border-border focus:outline-none focus:border-violet-400"
                      value={editForm.type || ""}
                      onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))}
                      placeholder="T-Shirt, Jeans..."
                    />
                  </div>
                  {/* Category */}
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Category</label>
                    <select
                      className="w-full text-sm bg-muted rounded-xl px-3 py-2 mt-0.5 border border-border focus:outline-none focus:border-violet-400"
                      value={editForm.category || ""}
                      onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                    >
                      {["Tops","Bottoms","Outerwear","Shoes","Accessories","Activewear"].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {(uploadState === "editing" || uploadState === "saving") && (
              <div className="space-y-3">
                {/* Pattern & Season row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Pattern</label>
                    <select
                      className="w-full text-sm bg-muted rounded-xl px-3 py-2 mt-0.5 border border-border focus:outline-none focus:border-violet-400"
                      value={editForm.pattern || "Solid"}
                      onChange={e => setEditForm(f => ({ ...f, pattern: e.target.value }))}
                    >
                      {["Solid","Striped","Checkered","Floral","Graphic","Camo","Abstract","Geometric","Plain"].map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Season</label>
                    <select
                      className="w-full text-sm bg-muted rounded-xl px-3 py-2 mt-0.5 border border-border focus:outline-none focus:border-violet-400"
                      value={editForm.season || "All-Season"}
                      onChange={e => setEditForm(f => ({ ...f, season: e.target.value }))}
                    >
                      {["All-Season","Summer","Winter","Spring/Fall"].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {/* Colors */}
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Palette className="h-3 w-3" /> Colors detected
                  </label>
                  <div className="flex gap-2 mt-1.5 flex-wrap">
                    {(editForm.colors || []).map((color, i) => (
                      <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs" style={{ borderColor: getColorHex(color), color: getColorHex(color) === "#f5f5f5" ? "#555" : undefined }}>
                        <div className="w-3 h-3 rounded-full border border-white/40" style={{ background: getColorHex(color) }} />
                        {color}
                        <button onClick={() => setEditForm(f => ({ ...f, colors: (f.colors||[]).filter((_,j) => j !== i) }))}>
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      className="px-2.5 py-1.5 rounded-full border border-dashed border-muted-foreground text-xs text-muted-foreground"
                      onClick={() => {
                        const c = prompt("Add color (e.g. navy blue, white)");
                        if (c) setEditForm(f => ({ ...f, colors: [...(f.colors||[]), c] }));
                      }}
                    >+ Add</button>
                  </div>
                </div>

                {/* Brand */}
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Brand (optional)</label>
                  <input
                    className="w-full text-sm bg-muted rounded-xl px-3 py-2 mt-0.5 border border-border focus:outline-none focus:border-violet-400"
                    value={editForm.brand || ""}
                    onChange={e => setEditForm(f => ({ ...f, brand: e.target.value }))}
                    placeholder="Nike, Zara, H&M..."
                  />
                </div>

                {/* Description */}
                {analysis?.description && (
                  <div className="flex gap-2 items-start p-3 rounded-xl text-sm" style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}>
                    <Sparkles className="h-4 w-4 text-violet-400 mt-0.5 shrink-0" />
                    <p className="text-muted-foreground text-xs">{analysis.description}</p>
                  </div>
                )}

                {/* Save button */}
                <button
                  onClick={saveItemWithBase64}
                  disabled={uploadState === "saving" || !editForm.type}
                  className="w-full py-3 rounded-2xl text-white font-semibold text-sm transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}
                >
                  {uploadState === "saving" ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : "Save to Wardrobe"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Item Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => setSelected(null)}>
          <div className="w-full bg-background rounded-t-3xl p-5" onClick={e => e.stopPropagation()}>
            <div className="flex gap-4 mb-4">
              {/* Image */}
              <div className="w-24 h-24 shrink-0 rounded-2xl overflow-hidden border border-border bg-muted">
                {selected.image_url ? (
                  <img src={selected.image_url} alt={selected.type || ""} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Shirt className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-base">{selected.type}</h3>
                <p className="text-xs text-muted-foreground">{selected.category}</p>
                {selected.brand && <p className="text-xs text-violet-500 mt-0.5">{selected.brand}</p>}
                {/* Color swatches */}
                {selected.colors?.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {selected.colors.map((c, i) => (
                      <div key={i} title={c} className="w-5 h-5 rounded-full border border-white/40 shadow-sm" style={{ background: getColorHex(c) }} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tags row */}
            <div className="flex gap-2 flex-wrap mb-4">
              {selected.pattern && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground flex items-center gap-1">
                  <Tag className="h-3 w-3" />{selected.pattern}
                </span>
              )}
              {selected.season && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground flex items-center gap-1">
                  <Cloud className="h-3 w-3" />{selected.season}
                </span>
              )}
              {selected.worn_count > 0 && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground flex items-center gap-1">
                  <Eye className="h-3 w-3" />Worn {selected.worn_count}×
                </span>
              )}
              {selected.last_worn && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />{selected.last_worn}
                </span>
              )}
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => markWorn(selected.id)}
                className="py-2.5 rounded-xl text-sm font-medium text-white transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}
              >
                Wore Today
              </button>
              <button
                onClick={() => deleteItem(selected.id)}
                className="py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all active:scale-95"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper: decode base64 to Uint8Array (for storage upload)
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
