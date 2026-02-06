// Assistant Message Component - supports text, tables, and action buttons

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { AssistantMessage as MessageType } from '@/types/assistant';
import type { ActionButton } from '@/services/LocalAssistant';

interface AssistantMessageProps {
  message: MessageType;
  actionButtons?: ActionButton[];
  onActionClick?: (action: string, data?: any) => void;
}

export function AssistantMessage({ message, actionButtons, onActionClick }: AssistantMessageProps) {
  const isUser = message.type === 'user';

  return (
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-3',
          isUser ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted text-foreground rounded-bl-md'
        )}
      >
        {/* Message content */}
        <div className="text-sm whitespace-pre-wrap">{formatMessage(message.content)}</div>

        {/* Table data */}
        {message.tableData && (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  {message.tableData.headers.map((h, i) => (
                    <th key={i} className="border border-border/30 p-1 bg-background/20 font-semibold text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {message.tableData.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j} className="border border-border/30 p-1 max-w-[120px] truncate">{cell ?? '-'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Action buttons */}
        {actionButtons && actionButtons.length > 0 && !isUser && (
          <div className="mt-3 flex flex-wrap gap-2">
            {actionButtons.map((btn) => (
              <Button
                key={btn.id}
                size="sm"
                variant={btn.action === 'confirm' ? 'default' : btn.action === 'ask_ai' ? 'secondary' : 'outline'}
                className="text-xs"
                onClick={() => onActionClick?.(btn.action, btn.data)}
              >
                {btn.label}
              </Button>
            ))}
          </div>
        )}

        {/* Query badge */}
        {message.queryUsed && !isUser && (
          <div className="mt-2 pt-2 border-t border-border/30">
            <span className="text-xs text-muted-foreground/70">📊 {message.queryUsed}</span>
          </div>
        )}

        {/* Timestamp */}
        <div className={cn('text-[10px] mt-1', isUser ? 'text-primary-foreground/60' : 'text-muted-foreground/60')}>
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
}

function formatMessage(content: string): React.ReactNode {
  const lines = content.split('\n');
  return lines.map((line, i) => {
    let formatted = line.replace(/\*\*(.+?)\*\*/g, (_, text) => `⟨b⟩${text}⟨/b⟩`);
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

function formatTime(date: Date): string {
  return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
}
