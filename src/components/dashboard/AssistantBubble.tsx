import { useState, useRef, useEffect } from "react";
import { Send, X, Sparkles, BookOpen, ChevronDown } from "lucide-react";

const FN_URL = "https://sfreodzibxmniiccqpcl.supabase.co/functions/v1/basilix-assistant";

type Role = "user" | "assistant";
interface Message {
  id: string;
  role: Role;
  content: string;
  teaching_mode?: boolean;
  original_question?: string;
  needs_clarification?: boolean;
}

const SUGGESTIONS = [
  "كم صرفت بالحشاش؟",
  "كم صرفت بالطلعات هاد الشهر؟",
  "وين أكثر مكان صرفت فيه؟",
  "كم صرفت مبارح؟",
  "شو أخر مبالغ مصروفة؟",
  "كم وزني هلق؟",
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

function MessageBubble({ msg, onTeach }: { msg: Message; onTeach: (q: string) => void }) {
  const isUser = msg.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end mb-3">
        <div
          className="max-w-[75%] px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm text-white font-medium"
          style={{ background: "linear-gradient(135deg, #c8a84b, #a07830)" }}
        >
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[80%]">
        <div
          className="px-4 py-3 rounded-2xl rounded-tl-sm text-sm text-white/90 leading-relaxed"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {msg.content.split("\n").map((line, i) => (
            <p key={i} className={i > 0 ? "mt-1" : ""}>
              {line}
            </p>
          ))}
        </div>
        {msg.teaching_mode && msg.original_question && (
          <button
            onClick={() => onTeach(msg.original_question!)}
            className="mt-2 text-[11px] text-yellow-400/70 hover:text-yellow-400 flex items-center gap-1 transition-colors"
          >
            <BookOpen className="h-3 w-3" />
            علمني كيف أجاوب
          </button>
        )}
      </div>
    </div>
  );
}

export function AssistantBubble() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "مرحبا بك! أنا مساعدك الشخصي في Basilix 🧠\nاسألني عن مصاريفك، تمارينك، صلواتك، أو أي شيء في تطبيقك!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [teachMode, setTeachMode] = useState<{ question: string } | null>(null);
  const [teachInput, setTeachInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [pulse, setPulse] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
      setPulse(false);
    }
  }, [open]);

  const send = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
    setShowSuggestions(false);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: msg,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== "welcome")
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch(FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history }),
      });
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + "_r",
          role: "assistant",
          content: data.reply || "صار خطأ، جرب مرة ثانية",
          teaching_mode: data.teaching_mode || false,
          original_question: data.teaching_mode ? msg : undefined,
          needs_clarification: data.needs_clarification || false,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + "_err",
          role: "assistant",
          content: "في مشكلة بالاتصال، جرب مرة ثانية 😕",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleTeach = (question: string) => {
    setTeachMode({ question });
    setTeachInput("");
  };

  const submitTeaching = async () => {
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
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + "_teach",
          role: "assistant",
          content: data.reply || "تمام! خزنت المعلومة 🧠",
        },
      ]);
      setTeachMode(null);
      setTeachInput("");
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + "_terr",
          role: "assistant",
          content: "ما قدرت أخزن المعلومة، جرب مرة ثانية",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Bubble Button */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 ${open ? "hidden" : "flex"}`}
        style={{
          background: "linear-gradient(135deg, #c8a84b 0%, #8a5e1a 100%)",
          boxShadow: pulse
            ? "0 0 0 0 rgba(200,168,75,0.7)"
            : "0 8px 32px rgba(200,168,75,0.4)",
          animation: pulse ? "bubblePulse 2s ease-in-out infinite" : "none",
        }}
      >
        <Sparkles className="h-6 w-6 text-white" />
        <style>{`
          @keyframes bubblePulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(200,168,75,0.6), 0 8px 32px rgba(200,168,75,0.3); }
            50% { box-shadow: 0 0 0 12px rgba(200,168,75,0), 0 8px 32px rgba(200,168,75,0.3); }
          }
        `}</style>
      </button>

      {/* Chat Panel */}
      {open && (
        <div
          className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-24px)] flex flex-col rounded-3xl overflow-hidden shadow-2xl"
          style={{
            height: "520px",
            background: "linear-gradient(160deg, #0d1f35 0%, #0a1628 100%)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 25px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(200,168,75,0.15)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4 flex-shrink-0"
            style={{
              background: "linear-gradient(90deg, rgba(200,168,75,0.15) 0%, rgba(200,168,75,0.05) 100%)",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #c8a84b, #8a5e1a)" }}
              >
                <Sparkles className="h-4.5 w-4.5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Basilix AI</p>
                <p className="text-[10px] text-white/40">مساعدك الشخصي</p>
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
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 scrollbar-thin">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} onTeach={handleTeach} />
            ))}

            {/* Quick Suggestions */}
            {showSuggestions && messages.length === 1 && (
              <div className="mt-2">
                <p className="text-[10px] text-white/30 mb-2 text-center">اقتراحات سريعة</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-[11px] px-3 py-1.5 rounded-full text-yellow-400/70 hover:text-yellow-400 hover:bg-yellow-400/10 transition-all border border-yellow-400/20"
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

          {/* Teaching Mode Banner */}
          {teachMode && (
            <div
              className="flex-shrink-0 px-4 py-3 mx-3 mb-2 rounded-2xl"
              style={{ background: "rgba(200,168,75,0.1)", border: "1px solid rgba(200,168,75,0.25)" }}
            >
              <p className="text-[11px] text-yellow-400/80 mb-1">
                📚 علمني كيف أجاوب على: <span className="font-bold">"{teachMode.question}"</span>
              </p>
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={teachInput}
                  onChange={(e) => setTeachInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitTeaching()}
                  placeholder="اشرح لي كيف أجاوب..."
                  className="flex-1 bg-transparent text-xs text-white placeholder-white/30 outline-none"
                />
                <button
                  onClick={submitTeaching}
                  disabled={!teachInput.trim()}
                  className="text-[11px] px-3 py-1 rounded-full text-white font-bold disabled:opacity-30 transition-all"
                  style={{ background: "linear-gradient(135deg, #c8a84b, #8a5e1a)" }}
                >
                  حفظ
                </button>
                <button
                  onClick={() => setTeachMode(null)}
                  className="text-white/30 hover:text-white/60"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Input */}
          {!teachMode && (
            <div
              className="flex-shrink-0 flex items-center gap-3 px-4 py-3"
              style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                placeholder="اسأل عن أي شيء..."
                dir="auto"
                className="flex-1 bg-transparent text-sm text-white placeholder-white/25 outline-none"
                disabled={loading}
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90 disabled:opacity-30"
                style={{ background: "linear-gradient(135deg, #c8a84b, #8a5e1a)" }}
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
