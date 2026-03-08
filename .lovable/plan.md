

# Fix Account Balance Display in Assistant

## Problem
The `icon` field in accounts stores Lucide icon names (e.g., "Wallet", "PiggyBank", "CreditCard") or image URLs, not emojis. The assistant displays these raw strings like `Wallet Cash: 500 ILS` instead of using proper emojis.

## Solution
Add an icon-name-to-emoji mapping function and use it in the `account_balances` handler (and anywhere else accounts are displayed).

### Changes in `AssistantBubble.tsx`

1. **Add helper function** (near `fmtNum`):
```typescript
function iconToEmoji(icon: string): string {
  const map: Record<string, string> = {
    Wallet: "👛", PiggyBank: "🐷", CreditCard: "💳",
    Banknote: "💵", Building2: "🏢", Landmark: "🏛️",
    Car: "🚗", Home: "🏠", ShoppingCart: "🛒",
    Coffee: "☕", Gamepad2: "🎮", Gift: "🎁",
    Plane: "✈️", Music: "🎵", BookOpen: "📖", Camera: "📷"
  };
  if (!icon || icon.startsWith("http")) return "💰";
  return map[icon] || "💰";
}
```

2. **Update `account_balances` handler** (lines 687-692):
   - Replace `${specificAcc.icon || "💰"}` → `${iconToEmoji(specificAcc.icon)}`
   - Replace `${a.icon || "💰"}` → `${iconToEmoji(a.icon)}`

3. **Update any other handlers** that reference account icons (e.g., `most_used_account`, `last_transaction_by_account` if they show account icons).

Result: "👛 Cash: 500 ILS" instead of "Wallet Cash: 500 ILS"

