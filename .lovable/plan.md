

# Comprehensive App Update Plan

This plan covers UI redesign, bug fixes, financial features, and recipe import -- prioritized as requested.

---

## Priority 1: Dashboard UI Redesign

### 1A. Simplify cards to match Cooking/Closet minimal style

**Gym, Supplements, Dreams cards** will be redesigned to match the compact `CookingCard`/`ClosetCard` pattern: icon + name + description only. Remove all data (progress rings, streak badges, sparklines, etc.) and quick action buttons.

**Files:** `gym-card.tsx`, `supplements-card.tsx`, `dreams-card-new.tsx`

Each becomes ~20 lines: a BentoCard with a gradient icon, title, and subtitle.

### 1B. Simplify Wallet card

Remove the income/expense section at the bottom. Keep: icon, "Total Balance", sparkline. Remove the `+` button.

**File:** `finance-card.tsx` -- delete lines 102-133 (the grid with income/expenses) and the Plus button.

### 1C. Simplify Weight card

Remove "Last Change" and "Weekly" stats grid. Keep: icon, weight value, sparkline. Remove `+` button. Rename "Current Weight" → "Weight". Change icon from `Scale` to `PersonStanding` or `Activity` (human weight related).

**File:** `weight-stats-card.tsx`

### 1D. Replace Today's Agenda → Prayer card

- Rename to "Prayer", change icon to `Moon` (Islamic)
- Show only next prayer name + time (single line)
- Remove expand/collapse, remove `+` button, remove all schedule items
- On click → navigate to `/islamic` instead of expanding
- Remove `AddActivityDialog` import

**File:** `today-agenda-card.tsx` -- complete rewrite to ~30 lines

### 1E. Card order in BentoGrid

Reorder in `Index.tsx`:
1. Prayer (was TodayAgenda)
2. Weight
3. Wallet (2-col span)
4. Gym
5. Smart Closet
6. Smart Cooking
7. Supplements
8. Dreams

### 1F. Weather → Header (replace profile icon)

Remove the `WeatherCard` from the BentoGrid. Replace the profile icon/name ("Basil" + avatar) in the header with a compact weather display: temperature + icon. On click, show a popover with full weather details (high/low, condition).

**File:** `Index.tsx` -- remove profile section, add weather inline in header

### 1G. Fix loading states for Cooking, Closet, Islamic cards

Currently these cards don't use the `loading` prop on BentoCard. They render immediately (no async data). The issue is they may not have the module-specific glow color. Ensure consistent card styling with appropriate theme colors:
- Cooking: orange
- Closet: violet/purple
- Islamic/Prayer: use `accent` color (golden)

### 1H. Remove quick action buttons from ALL cards

Delete the `+`, `Play`, etc. buttons from: Gym, Supplements, Dreams, Wallet, Weight cards. Users navigate by clicking the card itself.

---

## Priority 2: iOS Scrolling Input Bug

The video shows that when scrolling down on the financial page and tapping a category/subcategory button, the input doesn't focus properly on iOS Safari.

**Root cause:** iOS Safari has a known issue where `position: fixed` elements (like the Drawer) combined with scroll position cause focus issues. The number pad in `AddTransactionDialog` uses a Drawer.

**Fix in `add-transaction-dialog.tsx`:**
- Add `onOpenChange` handler that scrolls to top before opening
- Or add `document.activeElement?.blur()` before opening
- Add `-webkit-overflow-scrolling: touch` CSS fix
- Ensure the Drawer's content has `touch-action: manipulation` to prevent iOS zoom/focus issues
- Add `inputMode="none"` to the amount display to prevent iOS keyboard from competing with custom number pad

---

## Priority 3: Financial Features

### 3A. New "Browse" tab for category/subcategory transaction filtering

Add a 4th tab to Financial bottom nav: "Browse" (icon: `Search` or `Filter`).

**New file:** `src/components/financial/transaction-browser.tsx`

Features:
- Category dropdown filter
- Subcategory dropdown filter (populated based on selected category)
- Date from / Date to pickers
- Shows filtered transactions list
- Shows total amount at top

**File:** `Financial.tsx` -- add `Browse` to `financialItems`, add tab content

### 3B. Monthly Net Worth Snapshots

Create a new table `net_worth_snapshots` with columns: `id`, `month`, `year`, `total_amount`, `currency`, `created_at`.

Add a mechanism to record snapshots (button in stats or automatic on first visit of new month).

**File:** `stats-overview.tsx` -- add net worth chart section

### 3C. Savings Total (exclude Aug 2025)

Add a "Total Savings" card in stats that sums monthly savings (income - expenses) across all months, excluding August 2025 as baseline.

**File:** `stats-overview.tsx`

### 3D. Replace 6-month chart with switchable chart

Replace the current 6-month AreaChart and bar chart with a single chart section that has toggle buttons:
- "Income vs Expenses" (current area chart)
- "Savings" (bar chart of monthly savings)
- "Net Worth" (line chart of net worth over time)

Remove the separate bar chart section.

**File:** `stats-overview.tsx`

---

## Priority 4: Recipe Import Feature

**Add import tab/button** in `AddRecipeDialog` or as separate dialog.

**New file:** `src/components/cooking/import-recipe-dialog.tsx`

Features:
- Two modes: "Paste URL" and "Paste Text"
- **URL mode:** Fetch page via a CORS proxy or edge function, extract JSON-LD `Recipe` schema, or parse DOM for ingredients/steps
- **Text mode:** Regex-based parsing:
  - Detect ingredient lines (lines with quantities/units)
  - Detect step lines (numbered lines or "Step X" patterns)
  - Detect tool keywords (oven, airfryer, stove, etc.)
- Pre-fill the add recipe form with parsed data
- User reviews and edits before saving
- Show warnings for missing fields

**Edge function** `supabase/functions/fetch-recipe-url/index.ts`: Simple fetch proxy to bypass CORS when importing from URL.

---

## Priority 5: Database Migration

New migration for `net_worth_snapshots` table:

```sql
CREATE TABLE net_worth_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month integer NOT NULL,
  year integer NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(month, year)
);

ALTER TABLE net_worth_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on net_worth_snapshots" ON net_worth_snapshots FOR ALL USING (true) WITH CHECK (true);
```

---

## Files Summary

| Action | File |
|--------|------|
| Rewrite | `src/components/dashboard/today-agenda-card.tsx` → Prayer card |
| Simplify | `src/components/dashboard/gym-card.tsx` |
| Simplify | `src/components/dashboard/supplements-card.tsx` |
| Simplify | `src/components/dashboard/dreams-card-new.tsx` |
| Simplify | `src/components/dashboard/finance-card.tsx` |
| Simplify | `src/components/dashboard/weight-stats-card.tsx` |
| Modify | `src/pages/Index.tsx` (reorder, weather in header) |
| Delete | `src/components/dashboard/weather-card.tsx` (moved to header) |
| Modify | `src/components/financial/stats-overview.tsx` (savings, net worth, chart switcher) |
| Modify | `src/pages/Financial.tsx` (add Browse tab) |
| Create | `src/components/financial/transaction-browser.tsx` |
| Fix | `src/components/financial/add-transaction-dialog.tsx` (iOS bug) |
| Create | `src/components/cooking/import-recipe-dialog.tsx` |
| Modify | `src/pages/Cooking.tsx` (add import button) |
| Create | `supabase/functions/fetch-recipe-url/index.ts` |
| Migration | `net_worth_snapshots` table |
| Modify | `src/integrations/supabase/types.ts` |

