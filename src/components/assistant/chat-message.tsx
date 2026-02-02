import { cn } from "@/lib/utils";
import { User, Zap, Database, Sparkles, Volume2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { RozAvatar } from "./roz-avatar";

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  source?: 'local' | 'cached' | 'ai';
  onSelectOption?: (option: string) => void;
  onSpeak?: (content: string) => void;
  isSpeaking?: boolean;
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
      const parts = line.split('|');
      const label = parts[0].trim();
      const description = parts[1]?.trim() || '';
      return { label, description };
    })
    .filter(opt => opt.label.length > 0);
  
  return { text, options };
}

// Parse bullet options from markdown-style lists
function parseBulletOptions(content: string): { text: string; options: string[] } {
  const lines = content.split('\n');
  const options: string[] = [];
  const textLines: string[] = [];
  
  for (const line of lines) {
    const bulletMatch = line.match(/^[•\-\*]\s*(.+)$/);
    if (bulletMatch) {
      const option = bulletMatch[1].trim();
      // Skip if it looks like a data line (contains : or numbers)
      if (!option.includes(':') && !option.match(/\d+\s*₪/)) {
        options.push(option);
      } else {
        textLines.push(line);
      }
    } else {
      textLines.push(line);
    }
  }
  
  return { text: textLines.join('\n'), options };
}

export function ChatMessage({ role, content, timestamp, source, onSelectOption, onSpeak, isSpeaking }: ChatMessageProps) {
  const isUser = role === 'user';
  
  // Parse options from content
  const { text: parsedText, options: tagOptions } = isUser ? { text: content, options: [] } : parseOptions(content);
  const { text: finalText, options: bulletOptions } = isUser ? { text: parsedText, options: [] } : parseBulletOptions(parsedText);
  
  // Combine both types of options
  const allOptions = [
    ...tagOptions.map(o => o.label),
    ...bulletOptions
  ];

  const getSourceIcon = () => {
    if (isUser || !source) return null;
    switch (source) {
      case 'local':
        return <Zap className="w-3 h-3 text-amber-500" />;
      case 'cached':
        return <Database className="w-3 h-3 text-sky-500" />;
      case 'ai':
        return <Sparkles className="w-3 h-3 text-purple-500" />;
      default:
        return null;
    }
  };

  const getSourceLabel = () => {
    if (isUser || !source) return null;
    switch (source) {
      case 'local': return 'فوري ⚡';
      case 'cached': return 'محفوظ';
      case 'ai': return 'ذكاء';
      default: return null;
    }
  };

  return (
    <div className={cn(
      "flex gap-3 animate-fade-in",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      {/* Avatar */}
      {isUser ? (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
          <User className="w-4 h-4" />
        </div>
      ) : (
        <RozAvatar size="sm" isSpeaking={isSpeaking} />
      )}

      {/* Message Bubble */}
      <div className={cn(
        "max-w-[85%] space-y-1",
        isUser ? "items-end" : "items-start"
      )}>
        <div className={cn(
          "px-4 py-3 rounded-2xl",
          isUser 
            ? "bg-primary text-primary-foreground rounded-tl-sm" 
            : "bg-card border border-rose-200/30 rounded-tr-sm shadow-sm"
        )}>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{finalText}</p>
          
          {/* Interactive Option Bubbles */}
          {allOptions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/50">
              {allOptions.map((option, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectOption?.(option)}
                  className="bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20 hover:border-rose-500/50 text-foreground transition-all"
                >
                  {option}
                </Button>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer with source and time */}
        <div className={cn(
          "flex items-center gap-2 px-2",
          isUser ? "justify-end" : "justify-start"
        )}>
          {getSourceIcon()}
          {getSourceLabel() && (
            <span className="text-[10px] text-muted-foreground/70">{getSourceLabel()}</span>
          )}
          <p className="text-xs text-muted-foreground">
            {format(timestamp, 'HH:mm')}
          </p>
          
          {/* Speak button for assistant messages */}
          {!isUser && onSpeak && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-muted-foreground hover:text-rose-500"
              onClick={() => onSpeak(content)}
            >
              <Volume2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
