import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  onSelectOption?: (option: string) => void;
}

interface ParsedOption {
  label: string;
  description: string;
}

// Parse [OPTIONS]...[/OPTIONS] blocks from content
function parseOptions(content: string): { text: string; options: ParsedOption[] } {
  const optionsMatch = content.match(/\[OPTIONS\]([\s\S]*?)\[\/OPTIONS\]/);
  
  if (!optionsMatch) {
    return { text: content, options: [] };
  }
  
  const text = content.replace(/\[OPTIONS\][\s\S]*?\[\/OPTIONS\]/, '').trim();
  const optionsText = optionsMatch[1];
  
  const options = optionsText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      // Handle format: "label|description" or just "label"
      const parts = line.split('|');
      const label = parts[0].trim();
      const description = parts[1]?.trim() || '';
      return { label, description };
    })
    .filter(opt => opt.label.length > 0);
  
  return { text, options };
}

export function ChatMessage({ role, content, timestamp, onSelectOption }: ChatMessageProps) {
  const isUser = role === 'user';
  const { text, options } = isUser ? { text: content, options: [] } : parseOptions(content);

  return (
    <div className={cn(
      "flex gap-3 animate-fade-in",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      {/* Avatar */}
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
        isUser 
          ? "bg-primary text-primary-foreground" 
          : "bg-secondary border border-border"
      )}>
        {isUser ? (
          <User className="w-4 h-4" />
        ) : (
          <Bot className="w-4 h-4 text-primary" />
        )}
      </div>

      {/* Message Bubble */}
      <div className={cn(
        "max-w-[80%] space-y-1",
        isUser ? "items-end" : "items-start"
      )}>
        <div className={cn(
          "px-4 py-3 rounded-2xl",
          isUser 
            ? "bg-primary text-primary-foreground rounded-tr-sm" 
            : "bg-card border border-border rounded-tl-sm"
        )}>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{text}</p>
          
          {/* Interactive Option Bubbles */}
          {options.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/50">
              {options.map((option, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectOption?.(option.label)}
                  className="bg-primary/10 border-primary/30 hover:bg-primary/20 hover:border-primary/50 text-foreground transition-all"
                  title={option.description}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          )}
        </div>
        <p className={cn(
          "text-xs text-muted-foreground px-2",
          isUser ? "text-right" : "text-left"
        )}>
          {format(timestamp, 'HH:mm')}
        </p>
      </div>
    </div>
  );
}
