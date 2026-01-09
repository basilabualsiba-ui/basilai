import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { QuickSuggestions } from "./quick-suggestions";
import { useAssistant } from "@/hooks/useAssistant";
import { Bot, Trash2, Sparkles } from "lucide-react";

export function ChatInterface() {
  const { messages, isLoading, sendMessage, clearMessages } = useAssistant();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle option selection from bubbles
  const handleSelectOption = (option: string) => {
    sendMessage(option);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Personal Assistant</h2>
            <p className="text-xs text-muted-foreground">
              {isLoading ? "Thinking..." : "Ask me anything about your data"}
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={clearMessages}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 py-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-primary/30">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
            <div className="space-y-2 max-w-sm">
              <h3 className="text-lg font-semibold text-foreground">
                Hi Basil! How can I help?
              </h3>
              <p className="text-sm text-muted-foreground">
                I can help you track expenses, check workouts, manage supplements, and much more. I also remember your preferences!
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
                onSelectOption={handleSelectOption}
              />
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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
        placeholder="Ask about finances, workouts, supplements..."
      />
    </div>
  );
}
