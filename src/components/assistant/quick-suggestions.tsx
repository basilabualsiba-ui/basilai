import { Button } from "@/components/ui/button";
import { 
  Wallet, 
  Dumbbell, 
  Pill, 
  Target, 
  Moon, 
  TrendingUp,
  Calendar,
  ListChecks
} from "lucide-react";

interface QuickSuggestionsProps {
  onSelect: (message: string) => void;
}

const suggestions = [
  {
    icon: Wallet,
    label: "Today's spending",
    message: "How much did I spend today?",
  },
  {
    icon: TrendingUp,
    label: "Monthly summary",
    message: "Give me a summary of my spending this month",
  },
  {
    icon: Dumbbell,
    label: "Next workout",
    message: "When is my next workout scheduled?",
  },
  {
    icon: Pill,
    label: "Low supplements",
    message: "Which supplements are running low?",
  },
  {
    icon: Target,
    label: "Dream progress",
    message: "Show me my dream progress",
  },
  {
    icon: Moon,
    label: "Prayer times",
    message: "What are today's prayer times?",
  },
  {
    icon: Calendar,
    label: "Daily summary",
    message: "Give me a summary of today",
  },
  {
    icon: ListChecks,
    label: "Trainer sessions",
    message: "How many trainer sessions until my next payment?",
  },
];

export function QuickSuggestions({ onSelect }: QuickSuggestionsProps) {
  return (
    <div className="p-4 space-y-3">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
        Quick Actions
      </p>
      <div className="grid grid-cols-2 gap-2">
        {suggestions.map((suggestion, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => onSelect(suggestion.message)}
            className="justify-start gap-2 h-auto py-2.5 px-3 text-left bg-secondary/50 border-border hover:bg-secondary hover:border-primary/50 transition-all"
          >
            <suggestion.icon className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-xs truncate">{suggestion.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
