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
}

// ── Smart suggestion groups ────────────────────────────────────────────────
const SUGGESTION_GROUPS = [
  {
    label: "💰 مصاريف",
    items: [
      "كم صرفت بالحشاش هالشهر؟",
      "كم صرفت بالطلعات هالشهر؟",
      "وين أكثر مكان صرفت فيه هالشهر؟",
      "كم صرفت مبارح؟",
    ],
  },
  {
    label: "📊 تحليل",
    items: [
      "قارن مصاريفي هالشهر مع الشهر الفائت",
      "شو أغلى شهر صرفته؟",
      "كم معدل صرفي اليومي؟",
      "وين أكثر مكان صرفت فيه من البداية؟",
    ],
  },
  {
    label: "💪 صحة",
    items: [
      "شو وزني هلق؟",
      "كم مرة اشتغلت هالاسبوع؟",
      "شو أحلامي النشطة؟",
    ],
  },
  {
    label: "🕌 صلوات",
    items: [
      "كم صلاة صليت هالشهر؟",
      "كم مرة صليت الفجر هالاسبوع؟",
    ],
  },
];

// ── Time quick-pick buttons ────────────────────────────────────────────────
const TIME_OPTIONS = [
  { label: "هالشهر", value: "هالشهر" },
  { label: "هالأسبوع", value: "هالأسبوع" },
  { label: "الشهر الفائت", value: "الشهر الفائت" },
  { label: "من البداية", value: "من البداية" },
];

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

function MsgBubble({
  msg,
  onTeach,
  onTimePick,
}: {
  msg: Msg;
  onTeach: (q: string) => void;
  onTimePick: (choice: string, context: string) => void;
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
    <div className="flex flex-col items-start mb-3 gap-1.5 max-w-[85%]">
      <div
        className="px-4 py-3 rounded-2xl rounded-tl-sm text-sm text-white/90 leading-relaxed"
        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        {msg.transaction_saved && (
          <span className="inline-flex items-center gap-1 text-green-400 font-bold mr-1">
            <CheckCircle className="h-3.5 w-3.5" />
          </span>
        )}
        {msg.content.split("\n").map((line, i) => (
          <p key={i} className={i > 0 ? "mt-1" : ""}>{line}</p>
        ))}
      </div>

      {/* Time clarification quick picks */}
      {msg.needs_clarification && msg.clarification_type === "time" && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {TIME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onTimePick(opt.value, msg.content)}
              className="text-[11px] px-3 py-1.5 rounded-full font-medium transition-all active:scale-95 flex items-center gap-1"
              style={{
                background: "rgba(200,168,75,0.12)",
                border: "1px solid rgba(200,168,75,0.3)",
                color: "#c8a84b",
              }}
            >
              <Clock className="h-3 w-3" />
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Teaching button */}
      {msg.teaching_mode && msg.original_question && (
        <button
          onClick={() => onTeach(msg.original_question!)}
          className="text-[11px] text-yellow-400/60 hover:text-yellow-400 flex items-center gap-1 transition-colors mt-0.5"
        >
          <BookOpen className="h-3 w-3" />
          علمني كيف أجاوب
        </button>
      )}
    </div>
  );
}

export function AssistantBubble() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "مرحبا بك! أنا Basilix AI 🧠\nاسألني عن مصاريفك، وزنك، صلواتك، أو سجّل مصروف جديد!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeGroup, setActiveGroup] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [teachMode, setTeachMode] = useState<{ question: string } | null>(null);
  const [teachInput, setTeachInput] = useState("");
  const [pulse, setPulse] = useState(true);
  const [lastQuestion, setLastQuestion] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 300); setPulse(false); }
  }, [open]);

  const addMsg = (msg: Omit<Msg, "id">) =>
    setMessages((prev) => [...prev, { ...msg, id: Date.now().toString() + Math.random() }]);

  const getHistory = () =>
    messages.filter((m) => m.id !== "welcome").slice(-12).map((m) => ({ role: m.role, content: m.content }));

  const callAssistant = async (text: string) => {
    if (!text.trim() || loading) return;
    setInput("");
    setShowSuggestions(false);
    setLastQuestion(text.trim());
    addMsg({ role: "user", content: text.trim() });
    setLoading(true);

    try {
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim(), history: getHistory() }),
      });
      const data = await res.json();
      addMsg({
        role: "assistant",
        content: data.reply || "صار خطأ، جرب مرة ثانية",
        teaching_mode: !!data.teaching_mode,
        original_question: data.teaching_mode ? text.trim() : undefined,
        needs_clarification: !!data.needs_clarification,
        clarification_type: data.clarification_type,
        transaction_saved: !!data.transaction_saved,
      });
    } catch {
      addMsg({ role: "assistant", content: "في مشكلة بالاتصال 😕" });
    } finally {
      setLoading(false);
    }
  };

  // When user picks a time option after clarification
  const handleTimePick = (period: string, _context: string) => {
    // Reconstruct question with period from the last user question
    const combined = `${lastQuestion} ${period}`;
    callAssistant(combined);
  };

  const handleTeachSubmit = async () => {
    if (!teachInput.trim() || !teachMode) return;
    setLoading(true);
    try {
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "teach", question: teachMode.question, teaching: teachInput.trim() }),
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
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); callAssistant(input); }
  };

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95"
          style={{
            background: "linear-gradient(135deg,#c8a84b 0%,#8a5e1a 100%)",
            animation: pulse ? "bubblePulse 2s ease-in-out infinite" : "none",
            boxShadow: "0 8px 32px rgba(200,168,75,0.4)",
          }}
        >
          <Sparkles className="h-6 w-6 text-white" />
          <style>{`
            @keyframes bubblePulse {
              0%,100% { box-shadow: 0 0 0 0 rgba(200,168,75,0.5),0 8px 32px rgba(200,168,75,0.3); }
              50% { box-shadow: 0 0 0 14px rgba(200,168,75,0),0 8px 32px rgba(200,168,75,0.3); }
            }
          `}</style>
        </button>
      )}

      {/* Chat Panel */}
      {open && (
        <div
          className="fixed bottom-6 right-6 z-50 flex flex-col rounded-3xl overflow-hidden shadow-2xl"
          style={{
            width: "min(380px, calc(100vw - 24px))",
            height: "min(560px, calc(100vh - 80px))",
            background: "linear-gradient(160deg,#0d1f35 0%,#0a1628 100%)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 25px 80px rgba(0,0,0,0.6),0 0 0 1px rgba(200,168,75,0.12)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-3.5 flex-shrink-0"
            style={{
              background: "linear-gradient(90deg,rgba(200,168,75,0.14) 0%,rgba(200,168,75,0.04) 100%)",
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

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 pt-4 pb-1" style={{ scrollbarWidth: "none" }}>
            {messages.map((msg) => (
              <MsgBubble
                key={msg.id}
                msg={msg}
                onTeach={(q) => { setTeachMode({ question: q }); setTeachInput(""); }}
                onTimePick={handleTimePick}
              />
            ))}

            {/* Suggestion tabs */}
            {showSuggestions && messages.length <= 1 && !loading && (
              <div className="mt-3">
                <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
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
                <div className="flex flex-col gap-1.5">
                  {SUGGESTION_GROUPS[activeGroup].items.map((s) => (
                    <button
                      key={s}
                      onClick={() => callAssistant(s)}
                      className="text-[12px] px-3.5 py-2 rounded-xl text-right text-white/60 hover:text-white hover:bg-white/6 transition-all text-right w-full"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

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

          {/* Teaching Mode */}
          {teachMode && (
            <div
              className="flex-shrink-0 mx-3 mb-2 px-3.5 py-3 rounded-2xl"
              style={{ background: "rgba(200,168,75,0.08)", border: "1px solid rgba(200,168,75,0.22)" }}
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
                <button onClick={() => setTeachMode(null)} className="text-white/30 hover:text-white/60 flex-shrink-0">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Input */}
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
