// Main Assistant Chat Interface

import { useRef, useEffect } from 'react';
import { MessageCircle, X, Settings2, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLocalAssistant } from '@/hooks/useLocalAssistant';
import { AssistantMessage } from './AssistantMessage';
import { AssistantInput } from './AssistantInput';
import { QuerySuggestions } from './QuerySuggestions';
import { cn } from '@/lib/utils';

interface AssistantChatProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export function AssistantChat({ isOpen, onClose, className }: AssistantChatProps) {
  const {
    messages,
    isLoading,
    isInitialized,
    quickActions,
    sendMessage,
    sendAction,
    clearMessages,
  } = useLocalAssistant();

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col bg-background',
        'md:inset-auto md:bottom-4 md:right-4 md:w-[400px] md:h-[600px] md:max-h-[80vh]',
        'md:rounded-2xl md:shadow-2xl md:border md:border-border',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card rounded-t-2xl">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={clearMessages}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2" dir="rtl">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center">
            <span className="text-primary-foreground text-sm">🌹</span>
          </div>
          <div className="text-right">
            <h3 className="font-semibold text-sm">روز</h3>
            <p className="text-xs text-muted-foreground">مساعدتك المحلية</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="py-4 space-y-4" dir="rtl">
          {!isInitialized ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <AssistantMessage 
                  key={message.id} 
                  message={message}
                  actionButtons={index === messages.length - 1 ? message.actionButtons : undefined}
                  onActionClick={sendAction}
                />
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Quick Actions */}
      <QuerySuggestions
        actions={quickActions}
        onSelect={sendMessage}
        disabled={isLoading || !isInitialized}
      />

      {/* Input */}
      <AssistantInput
        onSend={sendMessage}
        isLoading={isLoading}
        disabled={!isInitialized}
      />
    </div>
  );
}

// Floating button to open chat
interface AssistantFloatingButtonProps {
  onClick: () => void;
  isOpen: boolean;
}

export function AssistantFloatingButton({ onClick, isOpen }: AssistantFloatingButtonProps) {
  if (isOpen) return null;

  return (
    <Button
      size="icon"
      className="fixed bottom-4 right-4 z-40 h-14 w-14 rounded-full shadow-lg bg-gradient-to-br from-primary/90 to-primary hover:from-primary hover:to-primary/90"
      onClick={onClick}
    >
      <MessageCircle className="h-6 w-6 text-primary-foreground" />
    </Button>
  );
}
