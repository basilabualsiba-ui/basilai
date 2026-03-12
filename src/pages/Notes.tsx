import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, StickyNote, Plus, Check, Trash2, Clock, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Note {
  id: string;
  content: string;
  is_done: boolean;
  done_at: string | null;
  created_at: string;
}

type Tab = "pending" | "done";

export default function Notes() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("pending");
  const [newText, setNewText] = useState("");
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("notes")
      .select("*")
      .order("created_at", { ascending: false });
    setNotes(data || []);
    setLoading(false);
  }

  // All mutations use optimistic updates — local state changes instantly,
  // DB write fires in background. No round-trip before UI updates.

  async function addNote() {
    const text = newText.trim();
    if (!text) return;
    setSaving(true);

    const tempId   = `temp-${Date.now()}`;
    const tempNote: Note = {
      id: tempId, content: text,
      is_done: false, done_at: null,
      created_at: new Date().toISOString(),
    };

    // Instant UI — close form, show note immediately
    setNotes(prev => [tempNote, ...prev]);
    setNewText(""); setAdding(false); setSaving(false);

    // Background DB write — swap temp with real row when done
    const { data } = await supabase.from("notes").insert({ content: text }).select().single();
    if (data) {
      setNotes(prev => prev.map(n => n.id === tempId ? data : n));
    }
  }

  async function markDone(id: string) {
    const ts = new Date().toISOString();
    setNotes(prev => prev.map(n => n.id === id ? { ...n, is_done: true, done_at: ts } : n));
    await supabase.from("notes").update({ is_done: true, done_at: ts }).eq("id", id);
  }

  async function markUndone(id: string) {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, is_done: false, done_at: null } : n));
    await supabase.from("notes").update({ is_done: false, done_at: null }).eq("id", id);
  }

  async function deleteNote(id: string) {
    setNotes(prev => prev.filter(n => n.id !== id));
    await supabase.from("notes").delete().eq("id", id);
  }

  const pending = notes
    .filter(n => !n.is_done)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const done = notes
    .filter(n => n.is_done)
    .sort((a, b) => new Date(b.done_at || b.created_at).getTime() - new Date(a.done_at || a.created_at).getTime());

  const displayed = tab === "pending" ? pending : done;

  function formatDate(d: string) {
    return format(new Date(d), "MMM d, yyyy · h:mm a");
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500">
            <StickyNote className="h-4 w-4 text-white" />
          </div>
          <h1 className="text-base font-bold">Notes</h1>
        </div>
        <button
          onClick={() => { setAdding(true); setTimeout(() => inputRef.current?.focus(), 100); }}
          className="p-2 rounded-xl hover:bg-muted transition-colors"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-4 pb-2 flex gap-2">
        {(["pending", "done"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === t
                ? t === "pending"
                  ? "bg-amber-500 text-white"
                  : "bg-green-600 text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {t === "pending" ? `To Do (${pending.length})` : `Done (${done.length})`}
          </button>
        ))}
      </div>

      {/* Add note inline form */}
      {adding && (
        <div className="mx-4 mb-3 rounded-2xl border border-amber-400/40 bg-amber-500/5 p-3">
          <textarea
            ref={inputRef}
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addNote(); }
              if (e.key === "Escape") { setAdding(false); setNewText(""); }
            }}
            placeholder="What do you need to do?"
            rows={3}
            className="w-full bg-transparent text-sm resize-none focus:outline-none placeholder:text-muted-foreground/50"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => { setAdding(false); setNewText(""); }}
              className="px-3 py-1.5 rounded-xl text-xs text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={addNote}
              disabled={!newText.trim() || saving}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-amber-500 disabled:opacity-40 transition-all active:scale-95"
            >
              {saving ? "Saving..." : "Add"}
            </button>
          </div>
        </div>
      )}

      {/* Notes list */}
      <div className="px-4 space-y-3">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
          ))
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="p-5 rounded-3xl bg-muted">
              {tab === "pending"
                ? <StickyNote className="h-10 w-10 text-amber-400" />
                : <CheckCircle2 className="h-10 w-10 text-green-500" />
              }
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {tab === "pending" ? "No pending notes" : "Nothing completed yet"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {tab === "pending" ? "Tap + to add something" : "Complete a note to see it here"}
              </p>
            </div>
          </div>
        ) : (
          displayed.map(note => (
            <div
              key={note.id}
              className={`rounded-2xl border p-4 transition-all ${
                note.is_done
                  ? "bg-green-500/5 border-green-500/20"
                  : "bg-card border-border"
              }`}
            >
              {/* Content */}
              <p className={`text-sm leading-relaxed mb-3 ${note.is_done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                {note.content}
              </p>

              {/* Dates row */}
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-3">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Added {formatDate(note.created_at)}
                </span>
                {note.is_done && note.done_at && (
                  <>
                    <span className="text-muted-foreground/30">·</span>
                    <span className="flex items-center gap-1 text-green-500">
                      <CheckCircle2 className="h-3 w-3" />
                      Done {formatDate(note.done_at)}
                    </span>
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {!note.is_done ? (
                  <button
                    onClick={() => markDone(note.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-all active:scale-95"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Mark Done
                  </button>
                ) : (
                  <button
                    onClick={() => markUndone(note.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-all active:scale-95"
                  >
                    Undo
                  </button>
                )}
                <button
                  onClick={() => deleteNote(note.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all active:scale-95 ml-auto"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* FAB — quick add */}
      {!adding && (
        <button
          onClick={() => { setAdding(true); setTab("pending"); setTimeout(() => inputRef.current?.focus(), 100); }}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full text-white shadow-xl flex items-center justify-center transition-all active:scale-90 hover:brightness-110"
          style={{ background: "linear-gradient(135deg,#f59e0b,#ea580c)" }}
        >
          <Plus className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}
