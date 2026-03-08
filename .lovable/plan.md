

# Plan: Rewrite AssistantBubble to be Fully Local (No Edge Function)

## Problem
The assistant calls a Supabase edge function (`basilix-assistant`) that fails on every question. The user wants everything local — no AI, no edge functions. Additionally:
1. Suggested questions don't get answered
2. Time chips concatenate with previous messages ("كم صرفت بالحشاش هالشهر؟ هالشهر")
3. "وين أكثر مكان صرفت فيه" returns "ما عندي جواب" despite data existing
4. Categories and subcategories are not being queried

## Solution
Rewrite `callAssistant` in `AssistantBubble.tsx` to run **entirely locally** using `supabase.from()` queries. No edge function calls.

## Architecture

```text
User question → detectTimePeriod() → matchIntent() → run Supabase query → format Arabic response
```

### Intent Engine (~20 intents)
Each intent has `keywords[]` and an async `handler(period)` that runs the actual query.

**Financial intents (using categories + subcategories joins):**
- `spending_at_place` — keywords: each subcategory name (حشاش, بستاشيو, etc.) → `transactions` JOIN `subcategories` filtered by name ILIKE
- `spending_by_category` — keywords: each category name (food, طلعات, Grocery, Car, etc.) → `transactions` JOIN `categories` filtered by category name
- `top_spending_places` — "أكثر مكان", "وين صرفت" → GROUP BY subcategory, ORDER BY SUM DESC
- `top_spending_categories` — "أكثر فئة" → GROUP BY category, ORDER BY SUM DESC  
- `total_spending` — "كم صرفت", "مجموع" → SUM of expense transactions
- `daily_average` — "معدل يومي" → SUM / distinct days
- `monthly_comparison` — "قارن", "مقارنة" → current vs previous month
- `most_expensive_month` — "أغلى شهر" → GROUP BY month ORDER BY SUM DESC
- `most_expensive_day` — "أغلى يوم" → GROUP BY day_of_week

**Health intents:**
- `current_weight` — "وزني", "كيلو" → latest from `user_body_stats`
- `workouts_count` — "كم مرة اشتغلت", "تمرين" → COUNT from `workout_sessions`
- `last_workout` — "آخر تمرين" → latest session
- `supplements_today` — "كمالات", "مكملات" → today's `supplement_logs` JOIN `supplements`

**Entertainment intents:**
- `watching_now` — "بتشاهد" → `media` WHERE status='watching'
- `best_movie` — "أحسن فيلم" → `media` WHERE type='movie' ORDER BY user_rating DESC
- `top_game` — "أعلى لعبة" → `games` ORDER BY rating DESC
- `active_dreams` — "أحلام", "أحلامي" → `dreams` WHERE status='in_progress'

**Prayer intents:**
- `prayer_count` — "كم صليت" → COUNT from `prayer_completions`
- `fajr_count` — "فجر" → filtered by prayer_name='fajr'

### Time Period Detection
Parse Arabic time words from the message:
- "هالشهر" → start of current month
- "هالأسبوع" → start of current week (Saturday)
- "الشهر الفائت" → previous month range
- "من البداية" → no filter (all time)
- "اليوم" → today
- "مبارح" → yesterday

If no time word detected and intent needs time → show time clarification chips.

### Chip Click Fix
Store the original question in state. When a time chip is clicked, re-run the intent matcher with the original question + time period — **not** concatenated text. The chip replaces the time context, it doesn't append.

### Fallback
If no intent matches → search `assistant_memory` table by keyword overlap → if still nothing → "ما عندي جواب لهالسؤال بعد"

### Category/Subcategory Coverage
On component mount, fetch all categories and subcategories from Supabase. Use their names as dynamic keywords for the `spending_at_place` and `spending_by_category` intents. This ensures every place and category the user has is recognized.

## File Changes

| File | Change |
|------|--------|
| `src/components/dashboard/AssistantBubble.tsx` | Complete rewrite of `callAssistant` — remove edge function fetch, add local intent engine with ~20 handlers, fix `handleChipClick`, load categories/subcategories dynamically, remove teaching mode |

Single file change. All logic stays in AssistantBubble.tsx.

