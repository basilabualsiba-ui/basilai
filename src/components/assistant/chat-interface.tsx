import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { QuickSuggestions } from "./quick-suggestions";
import { RozAvatar } from "./roz-avatar";
import { useAssistant } from "@/hooks/useAssistant";
import { useVoiceChat } from "@/hooks/useVoiceChat";
import { Trash2, Settings, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";

export function ChatInterface() {
  const { messages, isLoading, sendMessage, clearMessages } = useAssistant();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const lastMessageRef = useRef<string | null>(null);

  const { 
    isListening, 
    isSpeaking, 
    isSupported,
    toggleListening, 
    speak,
    stopSpeaking
  } = useVoiceChat({
    onTranscript: (text) => {
      if (text.trim()) {
        sendMessage(text);
      }
    },
    onError: (error) => {
      toast.error(error);
    }
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-speak new assistant messages if enabled
  useEffect(() => {
    if (autoSpeak && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant' && lastMessage.content !== lastMessageRef.current) {
        lastMessageRef.current = lastMessage.content;
        speak(lastMessage.content);
      }
    }
  }, [messages, autoSpeak, speak]);

  // Handle option selection from bubbles
  const handleSelectOption = (option: string) => {
    sendMessage(option);
  };

  // Handle message speak
  const handleSpeak = (content: string) => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      speak(content);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background" dir="rtl">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-l from-rose-500/10 via-pink-500/5 to-transparent">
        <div className="flex items-center gap-3">
          <RozAvatar size="md" isThinking={isLoading} isSpeaking={isSpeaking} />
          <div>
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              روز
              <span className="text-xs font-normal text-muted-foreground bg-rose-500/10 px-2 py-0.5 rounded-full">
                مساعدتك الشخصية
              </span>
            </h2>
            <p className="text-xs text-muted-foreground">
              {isLoading ? "🤔 بفكر..." : isListening ? "🎤 بسمعك..." : isSpeaking ? "🔊 بحكي..." : "بلهجة جنينية 🇵🇸"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Auto-speak toggle */}
          {isSupported && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAutoSpeak(!autoSpeak)}
              className={autoSpeak ? "text-rose-500" : "text-muted-foreground"}
              title={autoSpeak ? "إيقاف الرد الصوتي التلقائي" : "تفعيل الرد الصوتي التلقائي"}
            >
              {autoSpeak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
          )}
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearMessages}
              className="text-muted-foreground hover:text-destructive"
              title="مسح المحادثة"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 py-8">
            <RozAvatar size="xl" />
            <div className="space-y-2 max-w-sm">
              <h3 className="text-lg font-semibold text-foreground">
                أهلين! أنا روز 🌹
              </h3>
              <p className="text-sm text-muted-foreground">
                مساعدتك الشخصية بلهجة جنينية. بقدر أساعدك بالمصاريف، الجيم، الصلاة، وكل إشي تاني!
              </p>
              <p className="text-xs text-muted-foreground/70">
                💡 علميني أوامر جديدة بقولك "تعلم: لما أقول..."
              </p>
            </div>
            <QuickSuggestions onSelect={sendMessage} />
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
                timestamp={message.timestamp}
                source={message.source}
                onSelectOption={handleSelectOption}
                onSpeak={isSupported ? handleSpeak : undefined}
                isSpeaking={isSpeaking}
              />
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <RozAvatar size="sm" isThinking />
                <div className="bg-card border border-border rounded-2xl rounded-tr-sm px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-rose-500/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-rose-500/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-rose-500/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <ChatInput 
        onSend={sendMessage} 
        isLoading={isLoading}
        placeholder="احكيلي شو بدك..."
        isListening={isListening}
        onToggleVoice={isSupported ? toggleListening : undefined}
      />
    </div>
  );
}
