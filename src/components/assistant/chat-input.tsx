import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Mic, MicOff } from "lucide-react";
import { VoiceWave } from "./voice-visualizer";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  placeholder?: string;
  isListening?: boolean;
  onToggleVoice?: () => void;
}

export function ChatInput({ 
  onSend, 
  isLoading, 
  placeholder = "احكيلي شو بدك...",
  isListening = false,
  onToggleVoice
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (input.trim() && !isLoading) {
      onSend(input);
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  return (
    <div className="flex flex-col gap-2 p-4 border-t border-border bg-card/50 backdrop-blur-sm">
      {/* Voice wave indicator */}
      {isListening && (
        <div className="flex items-center justify-center gap-2 py-2 bg-rose-500/10 rounded-lg">
          <VoiceWave isListening={isListening} />
          <span className="text-xs text-rose-500 font-medium">بسمعك... احكي</span>
        </div>
      )}
      
      <div className="flex gap-2 items-end">
        {/* Voice button */}
        {onToggleVoice && (
          <Button
            onClick={onToggleVoice}
            disabled={isLoading}
            size="icon"
            variant={isListening ? "default" : "outline"}
            className={cn(
              "h-11 w-11 rounded-xl flex-shrink-0 transition-all",
              isListening 
                ? "bg-rose-500 hover:bg-rose-600 text-white animate-pulse" 
                : "border-rose-500/30 hover:bg-rose-500/10 hover:border-rose-500/50"
            )}
          >
            {isListening ? (
              <MicOff className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5 text-rose-500" />
            )}
          </Button>
        )}
        
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading || isListening}
          className="min-h-[44px] max-h-[120px] resize-none bg-background border-border focus-visible:ring-rose-500"
          rows={1}
          dir="rtl"
        />
        
        <Button
          onClick={handleSubmit}
          disabled={!input.trim() || isLoading}
          size="icon"
          className="h-11 w-11 rounded-xl bg-rose-500 hover:bg-rose-600 text-white flex-shrink-0"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );
}
