import { Button } from "@/components/ui/button";
import { 
  Wallet, 
  Dumbbell, 
  Pill, 
  Target, 
  Moon, 
  TrendingUp,
  Calendar,
  HelpCircle
} from "lucide-react";

interface QuickSuggestionsProps {
  onSelect: (message: string) => void;
}

const suggestions = [
  {
    icon: Wallet,
    label: "مصاريف اليوم",
    message: "كم صرفت اليوم؟",
  },
  {
    icon: TrendingUp,
    label: "مصاريف الشهر",
    message: "أعطيني ملخص مصاريف هالشهر",
  },
  {
    icon: Moon,
    label: "مواقيت الصلاة",
    message: "شو مواقيت الصلاة اليوم؟",
  },
  {
    icon: Dumbbell,
    label: "تمرين اليوم",
    message: "شو تمريني اليوم؟",
  },
  {
    icon: Pill,
    label: "المكملات",
    message: "شو المكملات اللي لازم آخذها؟",
  },
  {
    icon: Target,
    label: "أحلامي",
    message: "ورجيني تقدمي بأحلامي",
  },
  {
    icon: Calendar,
    label: "جدول اليوم",
    message: "شو جدولي اليوم؟",
  },
  {
    icon: HelpCircle,
    label: "شو بتعرفي؟",
    message: "شو بتقدري تعمليلي؟",
  },
];

export function QuickSuggestions({ onSelect }: QuickSuggestionsProps) {
  return (
    <div className="p-4 space-y-3 w-full max-w-md">
      <p className="text-xs text-muted-foreground font-medium text-center">
        جربي تسأليني عن:
      </p>
      <div className="grid grid-cols-2 gap-2">
        {suggestions.map((suggestion, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => onSelect(suggestion.message)}
            className="justify-start gap-2 h-auto py-2.5 px-3 text-right bg-rose-500/5 border-rose-500/20 hover:bg-rose-500/10 hover:border-rose-500/40 transition-all"
          >
            <suggestion.icon className="h-4 w-4 text-rose-500 flex-shrink-0" />
            <span className="text-xs truncate">{suggestion.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
