// Assistant Message Component

import { cn } from '@/lib/utils';
import type { AssistantMessage as MessageType } from '@/types/assistant';

interface AssistantMessageProps {
  message: MessageType;
}

export function AssistantMessage({ message }: AssistantMessageProps) {
  const isUser = message.type === 'user';

  return (
    <div
      className={cn(
        'flex w-full',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-3',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-muted text-foreground rounded-bl-md'
        )}
      >
        {/* Message content with markdown-like formatting */}
        <div className="text-sm whitespace-pre-wrap">
          {formatMessage(message.content)}
        </div>

        {/* Query badge */}
        {message.queryUsed && !isUser && (
          <div className="mt-2 pt-2 border-t border-border/30">
            <span className="text-xs text-muted-foreground/70">
              📊 {message.queryUsed}
            </span>
          </div>
        )}

        {/* Timestamp */}
        <div
          className={cn(
            'text-[10px] mt-1',
            isUser ? 'text-primary-foreground/60' : 'text-muted-foreground/60'
          )}
        >
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
}

// Format message with basic markdown
function formatMessage(content: string): React.ReactNode {
  // Split by lines
  const lines = content.split('\n');
  
  return lines.map((line, i) => {
    // Bold text
    let formatted = line.replace(/\*\*(.+?)\*\*/g, (_, text) => `⟨b⟩${text}⟨/b⟩`);
    
    // Convert back to React elements
    const parts = formatted.split(/⟨\/?b⟩/);
    const elements: React.ReactNode[] = [];
    
    let isBold = false;
    for (let j = 0; j < parts.length; j++) {
      if (parts[j]) {
        if (isBold) {
          elements.push(<strong key={`${i}-${j}`}>{parts[j]}</strong>);
        } else {
          elements.push(parts[j]);
        }
      }
      isBold = !isBold;
    }
    
    return (
      <span key={i}>
        {elements}
        {i < lines.length - 1 && <br />}
      </span>
    );
  });
}

// Format timestamp
function formatTime(date: Date): string {
  return date.toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
