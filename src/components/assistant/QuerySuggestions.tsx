// Quick Actions / Query Suggestions Component

import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import type { QuickAction } from '@/types/assistant';

interface QuerySuggestionsProps {
  actions: QuickAction[];
  onSelect: (query: string) => void;
  disabled?: boolean;
}

export function QuerySuggestions({ actions, onSelect, disabled }: QuerySuggestionsProps) {
  return (
    <div className="px-3 py-2 border-t border-border/50 bg-muted/30">
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2" dir="rtl">
          {actions.map((action) => (
            <Button
              key={action.id}
              variant="outline"
              size="sm"
              className="shrink-0 h-8 rounded-full border-border/50 bg-background/50 hover:bg-primary/10 hover:border-primary/30"
              onClick={() => onSelect(action.query)}
              disabled={disabled}
            >
              <span className="mr-1.5">{action.icon}</span>
              <span className="text-xs">{action.label}</span>
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

// Inline suggestions for teaching mode
interface InlineSuggestionsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  disabled?: boolean;
}

export function InlineSuggestions({ suggestions, onSelect, disabled }: InlineSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2" dir="rtl">
      {suggestions.map((suggestion, index) => (
        <Button
          key={index}
          variant="secondary"
          size="sm"
          className="h-7 rounded-full text-xs"
          onClick={() => onSelect(suggestion)}
          disabled={disabled}
        >
          {suggestion}
        </Button>
      ))}
    </div>
  );
}
