

# Full App Refactor — Supabase Storage, No AI (Optional AI)

This is a massive refactor. The key change from the previous plan: all new features store data in **Supabase** (not localStorage), and AI is **optional** (off by default, user can enable).

---

## Phase 1: Delete Assistant + Old Food

### Delete (files to remove)
- `src/components/assistant/` (9 files)
- `src/services/LocalAssistant/` (8 files)
- `src/hooks/useLocalAssistant.ts`
- `src/types/assistant.ts`
- `src/pages/AssistantManager.tsx`
- `supabase/functions/suggest-query/`
- `src/components/food/` (14 files)
- `src/contexts/FoodContext.tsx`
- `src/pages/Food.tsx`
- `src/hooks/useFoodSchedule.ts`

### Clean up
- Remove `AssistantChat`/`AssistantFloatingButton` from `src/pages/Index.tsx`
- Remove `/assistant-manager` route from `src/App.tsx`
- Remove `FoodProvider` from `src/App.tsx`
- Remove food references from schedule components

DB tables (`assistant_queries`, `assistant_synonyms`, `assistant_pending_queries`, `food_items`, `meals`, `meal_foods`, `meal_plans`, `meal_plan_meals`, `meal_consumptions`) stay in Supabase (no data loss) but code references are cleaned.

---

## Phase 2: Smart Cooking (Supabase)

### New Supabase Tables

```sql
-- Recipes stored in Supabase
CREATE TABLE recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  image text,
  category text NOT NULL DEFAULT 'meal', -- meal/drink/dessert
  tools text[] DEFAULT '{}',
  total_time integer DEFAULT 0,
  video_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity text NOT NULL
);

CREATE TABLE recipe_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE,
  step_number integer NOT NULL,
  instruction text NOT NULL,
  tool text,
  timer_minutes integer,
);

-- User's available ingredients
CREATE TABLE user_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

RLS: permissive for all operations (no auth, matching existing app pattern).

### New Files
| File | Purpose |
|------|---------|
| `src/contexts/CookingContext.tsx` | CRUD via Supabase for recipes, ingredients |
| `src/pages/Cooking.tsx` | Main page with tabs |
| `src/components/cooking/recipe-list.tsx` | Browse recipes with ingredient match |
| `src/components/cooking/add-recipe-dialog.tsx` | Manual add form |
| `src/components/cooking/import-recipe-dialog.tsx` | URL/text paste with local parsing |
| `src/components/cooking/recipe-detail.tsx` | Full recipe view |
| `src/components/cooking/cooking-mode.tsx` | Step-by-step with timers |
| `src/components/cooking/my-ingredients.tsx` | Manage available ingredients |
| `src/components/cooking/cooking-timer.tsx` | Countdown timer |
| `src/components/dashboard/cooking-card.tsx` | Dashboard card |

### Cooking Mode
- Full-screen step-by-step, one step at a time
- Progress bar, tool icons, countdown timers for oven/airfryer/stove
- "Meal Ready ✅" on completion

### Import (Local Parsing Only, No AI)
- **URL**: Fetch HTML, extract JSON-LD Recipe schema or parse DOM
- **Text**: Regex-based ingredient/step detection
- Missing data → user fills manually
- **Optional AI toggle**: If user enables AI in settings, can use edge function to parse recipes better

---

## Phase 3: Smart Closet + Laundry (Supabase)

### New Supabase Tables

```sql
CREATE TABLE clothing_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  image text, -- URL from Supabase storage (wardrobe bucket exists)
  type text NOT NULL, -- jacket/shoes/socks/jeans/shorts/tshirt/shirt/hoodie/sweater/coat/other
  color text, -- hex
  pattern text DEFAULT 'plain', -- plain/striped/patterned
  status text DEFAULT 'closet', -- closet/laundry_basket/washing_machine
  last_worn timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE saved_outfits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  item_ids uuid[] NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE shopping_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  price numeric,
  is_purchased boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

### Storage
Use existing `wardrobe` bucket for clothing images.

### New Files
| File | Purpose |
|------|---------|
| `src/contexts/ClosetContext.tsx` | CRUD via Supabase |
| `src/pages/Closet.tsx` | Main page with tabs: Closet, Outfits, Laundry, Shopping |
| `src/components/closet/clothes-grid.tsx` | Grid view of clothes |
| `src/components/closet/add-clothing-dialog.tsx` | Upload + auto-detect color |
| `src/components/closet/outfit-suggestion.tsx` | Rule-based outfit generator |
| `src/components/closet/laundry-system.tsx` | State machine: closet→basket→machine→closet |
| `src/components/closet/shopping-list.tsx` | Shopping list CRUD |
| `src/components/closet/color-extractor.ts` | Canvas-based dominant color |
| `src/components/dashboard/closet-card.tsx` | Dashboard card |

### Color Extraction (Local, No AI)
- Canvas pixel sampling → simple k-means clustering → dominant color

### Background Removal (Local)
- Corner-pixel sampling → make similar colors transparent

### Outfit Suggestion (Rule-Based, No AI)
- Pick top + bottom + shoes + optional layer
- Rules: no duplicate types, valid layering
- Weather-aware (see Phase 4)
- **Optional AI toggle**: If enabled, can suggest smarter combinations

### Laundry Flow
- Move items between states via buttons
- Washing machine timer → auto-return to closet on completion

---

## Phase 4: Weather Widget

### New Files
| File | Purpose |
|------|---------|
| `src/hooks/useWeather.ts` | Open-Meteo API for Jenin (free, no key) |
| `src/components/dashboard/weather-card.tsx` | Dashboard widget |

- API: `https://api.open-meteo.com/v1/forecast?latitude=32.46&longitude=35.30&current_weather=true&daily=temperature_2m_max,temperature_2m_min`
- Cache response in localStorage for 1 hour
- Show: current temp, high/low, weather icon
- Feed into closet outfit suggestions

---

## Phase 5: Financial Rework

### Remove Goals Tab
- Delete `src/components/financial/goals-overview.tsx`
- Change bottom nav from 4 tabs to 3: Accounts, Transactions, Stats
- Remove `Target` import and goals references from `Financial.tsx`

### Add to Stats Page (`stats-overview.tsx`)
1. **Monthly Savings Card**: Income - Expenses per month (skip first month as baseline)
2. **Net Worth Card**: Sum of all `accounts.amount` (with currency conversion via `currency_ratios`)
3. **Monthly Savings Chart**: Bar chart showing savings trend over time

No new tables needed — computed from existing `transactions` and `accounts` data.

---

## Phase 6: Dashboard Updates

### Update `src/pages/Index.tsx`
- Remove Assistant floating button and chat
- Add `WeatherCard`, `CookingCard`, `ClosetCard` to BentoGrid

### Update `src/App.tsx`
- Remove FoodProvider, assistant imports
- Add routes: `/cooking`, `/closet`

---

## AI as Optional Feature

A settings toggle "Enable External AI" stored in `user_preferences` table. When enabled:
- Recipe import can use AI for better parsing
- Closet can get smarter outfit suggestions
- Everything works without AI by default

No AI edge functions created unless user explicitly enables — keeps the app fully functional offline with rule-based logic.

---

## Implementation Order

1. Delete assistant files + old food files + clean imports
2. DB migration: create cooking + closet + shopping tables
3. Create CookingContext + Cooking page + all cooking components
4. Create ClosetContext + Closet page + all closet components
5. Create weather hook + weather card
6. Rework financial stats (remove goals, add savings/net worth)
7. Update dashboard with new cards + routes

~25 new files, ~10 deleted, ~5 modified.

