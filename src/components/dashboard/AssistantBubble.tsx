import { useState, useRef, useEffect } from "react";
import { Send, X, Sparkles, BookOpen, ChevronDown, CheckCircle, Clock } from "lucide-react";

const FN_URL = "https://sfreodzibxmniiccqpcl.supabase.co/functions/v1/basilix-assistant";

type Role = "user" | "assistant";

interface Msg {
  id: string;
  role: Role;
  content: string;
  teaching_mode?: boolean;
  original_question?: string;
  needs_clarification?: boolean;
  clarification_type?: "time" | "transaction";
  transaction_saved?: boolean;
  // Inline quick-reply chips that appear under a bot message
  reply_chips?: string[];
}

// ─── Suggestion groups for the initial panel ────────────────────────────────
const SUGGESTION_GROUPS = [
  {
    label: "💰 مصاريف",
    items: [
      "كم صرفت بالحشاش هالشهر؟",
      "وين أكثر مكان صرفت فيه هالشهر؟",
      "كم صرفت بالطلعات هالشهر؟",
      "قارن مصاريفي هالشهر مع الشهر الفائت",
    ],
  },
  {
    label: "📊 تحليل",
    items: [
      "شو أغلى شهر عندي؟",
      "كم معدل صرفي اليومي؟",
      "وين أكثر مكان صرفت فيه من البداية؟",
      "كيف مصاريفي هالأسبوع؟",
    ],
  },
  {
    label: "💪 صحة وجيم",
    items: [
      "شو وزني هلق وكيف الاتجاه؟",
      "كم مرة اشتغلت هالأسبوع؟",
      "متى آخر تمرين؟",
      "شو كمالاتي اليومية؟",
    ],
  },
  {
    label: "🎮 ترفيه",
    items: [
      "شو بتشاهد هلق؟",
      "شو أحسن فيلم شفته؟",
      "أعلى لعبة قيّمتها؟",
      "شو أحلامي النشطة؟",
    ],
  },
  {
    label: "🕌 صلوات",
    items: [
      "كم صلاة صليت هالشهر؟",
      "كم مرة صليت الفجر هالأسبوع؟",
      "شو نسبة إتمامي للصلوات؟",
    ],
  },
];

// ─── Time quick-pick chips (shown after clarify_time response) ───────────────
const TIME_CHIPS = ["هالشهر", "هالأسبوع", "الشهر الفائت", "من البداية", "اليوم", "مبارح"];

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full bg-yellow-400/60 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

// ─── Single message bubble ───────────────────────────────────────────────────
function MsgBubble({
  msg,
  onChipClick,
  onTeach,
}: {
  msg: Msg;
  onChipClick: (text: string) => void;
  onTeach: (q: string) => void;
}) {
  const isUser = msg.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end mb-3">
        <div
          className="max-w-[78%] px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm text-white font-medium"
          style={{ background: "linear-gradient(135deg,#c8a84b,#a07830)" }}
        >
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start mb-3 gap-2 max-w-[88%]">
      {/* Bot text bubble */}
      <div
        className="px-4 py-3 rounded-2xl rounded-tl-sm text-sm text-white/90 leading-relaxed w-full"
        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        {msg.transaction_saved && (
          <CheckCircle className="inline h-3.5 w-3.5 text-green-400 mr-1 mb-0.5" />
        )}
        {msg.content.split("\n").map((line, i) => (
          <p key={i} className={i > 0 ? "mt-1" : ""}>{line}</p>
        ))}
      </div>

      {/* Time clarification chips */}
      {msg.needs_clarification && msg.clarification_type === "time" && (
        <div className="flex flex-wrap gap-1.5">
          {TIME_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => onChipClick(chip)}
              className="flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-full font-medium transition-all active:scale-95 hover:brightness-110"
              style={{
                background: "rgba(200,168,75,0.12)",
                border: "1px solid rgba(200,168,75,0.35)",
                color: "#c8a84b",
              }}
            >
              <Clock className="h-2.5 w-2.5" />
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Generic inline reply chips (from reply_chips field) */}
      {msg.reply_chips && msg.reply_chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {msg.reply_chips.map((chip) => (
            <button
              key={chip}
              onClick={() => onChipClick(chip)}
              className="text-[11px] px-3 py-1.5 rounded-full font-medium transition-all active:scale-95 hover:brightness-110"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.65)",
              }}
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Teaching button */}
      {msg.teaching_mode && msg.original_question && (
        <button
          onClick={() => onTeach(msg.original_question!)}
          className="flex items-center gap-1 text-[11px] text-yellow-400/55 hover:text-yellow-400 transition-colors"
        >
          <BookOpen className="h-3 w-3" />
          علمني كيف أجاوب
        </button>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export function AssistantBubble() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "مرحبا! أنا Basilix AI 🧠\nاسألني عن مصاريفك، وزنك، أحلامك، ألعابك، مسلسلاتك — أو سجّل مصروف جديد!",
      reply_chips: ["كم صرفت هالشهر؟", "شو وزني هلق؟", "شو بتشاهد هلق؟"],
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeGroup, setActiveGroup] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [teachMode, setTeachMode] = useState<{ question: string } | null>(null);
  const [teachInput, setTeachInput] = useState("");
  const [pulse, setPulse] = useState(true);
  const [lastUserMsg, setLastUserMsg] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) {
      setPulse(false);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  const newId = () => Date.now().toString() + Math.random().toString(36).slice(2);

  const addMsg = (msg: Omit<Msg, "id">) =>
    setMessages((prev) => [...prev, { ...msg, id: newId() }]);

  const getHistory = () =>
    messages
      .filter((m) => m.id !== "welcome")
      .slice(-14)
      .map((m) => ({ role: m.role, content: m.content }));

  // Core: send message to assistant
  const callAssistant = async (text: string) => {
    if (!text.trim() || loading) return;
    const trimmed = text.trim();
    setInput("");
    setShowSuggestions(false);
    setLastUserMsg(trimmed);
    addMsg({ role: "user", content: trimmed });
    setLoading(true);

    try {
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history: getHistory() }),
      });
      const data = await res.json();

      // Build reply chips based on response type
      let chips: string[] | undefined;
      if (data.needs_clarification && data.clarification_type === "transaction") {
        chips = ["من الكاش", "من البنك TNB", "من العرب بنك"];
      }

      addMsg({
        role: "assistant",
        content: data.reply || "صار خطأ، جرب مرة ثانية",
        teaching_mode: !!data.teaching_mode,
        original_question: data.teaching_mode ? trimmed : undefined,
        needs_clarification: !!data.needs_clarification,
        clarification_type: data.clarification_type,
        transaction_saved: !!data.transaction_saved,
        reply_chips: chips,
      });
    } catch {
      addMsg({ role: "assistant", content: "في مشكلة بالاتصال 😕" });
    } finally {
      setLoading(false);
    }
  };

  // When a chip is clicked after clarification
  const handleChipClick = (chip: string) => {
    // Append chip to last user message for context
    const combined = lastUserMsg ? `${lastUserMsg} ${chip}` : chip;
    callAssistant(combined);
  };

  // Teaching submit
  const handleTeachSubmit = async () => {
    if (!teachInput.trim() || !teachMode) return;
    setLoading(true);
    try {
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "teach",
          question: teachMode.question,
          teaching: teachInput.trim(),
        }),
      });
      const data = await res.json();
      addMsg({ role: "assistant", content: data.reply || "تمام! حفظت المعلومة 🧠" });
    } catch {
      addMsg({ role: "assistant", content: "ما قدرت أحفظ، جرب مرة ثانية" });
    } finally {
      setTeachMode(null);
      setTeachInput("");
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      callAssistant(input);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes bubblePulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(200,168,75,0.55), 0 8px 32px rgba(200,168,75,0.3); }
          50%      { box-shadow: 0 0 0 16px rgba(200,168,75,0), 0 8px 32px rgba(200,168,75,0.25); }
        }
        .chat-scroll::-webkit-scrollbar { display: none; }
        .chat-scroll { scrollbar-width: none; }
      `}</style>

      {/* ── Floating button (when closed) ───────────────────────────────────── */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          style={{
            background: "linear-gradient(135deg,#c8a84b 0%,#8a5e1a 100%)",
            animation: pulse ? "bubblePulse 2.2s ease-in-out infinite" : "none",
            boxShadow: "0 8px 32px rgba(200,168,75,0.4)",
          }}
        >
          <Sparkles className="h-6 w-6 text-white" />
        </button>
      )}

      {/* ── Chat panel (when open) ───────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed bottom-6 right-6 z-[9999] flex flex-col rounded-3xl overflow-hidden"
          style={{
            width: "min(400px, calc(100vw - 24px))",
            height: "min(580px, calc(100vh - 80px))",
            background: "linear-gradient(160deg,#0d1f35 0%,#0a1628 100%)",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 25px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(200,168,75,0.13)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-3.5 flex-shrink-0"
            style={{
              background: "linear-gradient(90deg,rgba(200,168,75,0.15) 0%,rgba(200,168,75,0.04) 100%)",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#c8a84b,#8a5e1a)" }}
              >
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-tight">Basilix AI</p>
                <p className="text-[10px] text-white/35">مساعدك الشخصي الذكي</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 pt-4 pb-1 chat-scroll">

            {messages.map((msg) => (
              <MsgBubble
                key={msg.id}
                msg={msg}
                onChipClick={handleChipClick}
                onTeach={(q) => { setTeachMode({ question: q }); setTeachInput(""); }}
              />
            ))}

            {/* Suggestion tabs — only shown on first open before any messages */}
            {showSuggestions && messages.length <= 1 && !loading && (
              <div className="mt-2">
                {/* Tab pills */}
                <div
                  className="flex gap-1.5 mb-2.5 pb-1 overflow-x-auto"
                  style={{ scrollbarWidth: "none" }}
                >
                  {SUGGESTION_GROUPS.map((g, i) => (
                    <button
                      key={g.label}
                      onClick={() => setActiveGroup(i)}
                      className="text-[10px] px-2.5 py-1 rounded-full flex-shrink-0 transition-all font-medium"
                      style={{
                        background: activeGroup === i ? "rgba(200,168,75,0.2)" : "rgba(255,255,255,0.05)",
                        border: `1px solid ${activeGroup === i ? "rgba(200,168,75,0.4)" : "rgba(255,255,255,0.08)"}`,
                        color: activeGroup === i ? "#c8a84b" : "rgba(255,255,255,0.4)",
                      }}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>

                {/* Suggestion items */}
                <div className="flex flex-col gap-1.5">
                  {SUGGESTION_GROUPS[activeGroup].items.map((s) => (
                    <button
                      key={s}
                      onClick={() => callAssistant(s)}
                      className="text-[12px] px-3.5 py-2.5 rounded-xl text-right text-white/65 hover:text-white transition-all w-full"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Typing indicator */}
            {loading && (
              <div
                className="inline-block rounded-2xl rounded-tl-sm mb-2"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                <TypingDots />
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Teaching mode bar */}
          {teachMode && (
            <div
              className="flex-shrink-0 mx-3 mb-2 px-3.5 py-3 rounded-2xl"
              style={{
                background: "rgba(200,168,75,0.08)",
                border: "1px solid rgba(200,168,75,0.22)",
              }}
            >
              <p className="text-[11px] text-yellow-400/75 mb-2">
                📚 علمني للسؤال: <strong>"{teachMode.question}"</strong>
              </p>
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={teachInput}
                  onChange={(e) => setTeachInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleTeachSubmit()}
                  placeholder="اشرح لي كيف أجاوب..."
                  className="flex-1 bg-transparent text-xs text-white placeholder-white/25 outline-none min-w-0"
                />
                <button
                  onClick={handleTeachSubmit}
                  disabled={!teachInput.trim()}
                  className="text-[11px] px-3 py-1.5 rounded-full text-white font-bold disabled:opacity-30 flex-shrink-0"
                  style={{ background: "linear-gradient(135deg,#c8a84b,#8a5e1a)" }}
                >
                  حفظ
                </button>
                <button
                  onClick={() => setTeachMode(null)}
                  className="text-white/30 hover:text-white/60 flex-shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Input bar */}
          {!teachMode && (
            <div
              className="flex-shrink-0 flex items-center gap-2.5 px-4 py-3"
              style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="اسأل أو سجّل مصروف..."
                dir="auto"
                disabled={loading}
                className="flex-1 bg-transparent text-sm text-white placeholder-white/25 outline-none min-w-0"
              />
              <button
                onClick={() => callAssistant(input)}
                disabled={!input.trim() || loading}
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90 disabled:opacity-30"
                style={{ background: "linear-gradient(135deg,#c8a84b,#8a5e1a)" }}
              >
                <Send className="h-4 w-4 text-white" />
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
