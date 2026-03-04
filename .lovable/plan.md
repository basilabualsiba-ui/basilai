

# Plan: Delete Closet/Cooking, Fix Stats, UI Polish, Add TV Tracker

## 1. Delete Smart Closet & Smart Cooking (completely)

**Delete files:**
- `src/components/closet/` (5 files)
- `src/components/cooking/` (5 files)
- `src/pages/Closet.tsx`
- `src/pages/Cooking.tsx`
- `src/components/dashboard/closet-card.tsx`
- `src/components/dashboard/cooking-card.tsx`
- `supabase/functions/fetch-recipe-url/`

**Clean references:**
- `src/App.tsx`: Remove Closet/Cooking imports and routes
- `src/pages/Index.tsx`: Remove ClosetCard/CookingCard from BentoGrid

**Drop Supabase tables** via migration:
```sql
DROP TABLE IF EXISTS recipe_ingredients;
DROP TABLE IF EXISTS recipe_steps;
DROP TABLE IF EXISTS recipes;
DROP TABLE IF EXISTS user_ingredients;
DROP TABLE IF EXISTS clothing_items;
DROP TABLE IF EXISTS saved_outfits;
DROP TABLE IF EXISTS shopping_list;
```

---

## 2. Fix Wallet Stats (Total Savings & Net Worth)

**Current bug:** "Total Savings" sums each month independently. User wants cumulative total savings (running sum).

**Fix in `stats-overview.tsx`:**

- **For completed months** (before current month): 
  - Total Savings for month X = sum of (income - expenses) for all months from start through X, excluding Aug 2025
  - Net Worth for month X = use `net_worth_snapshots` table value (recorded at end of month)
  
- **For current (incomplete) month** (e.g., March 2026):
  - Total Savings = current live calculation (sum all months including current, exclude Aug 2025)  
  - Net Worth = live sum of all account balances

- Update the "Total Savings" and "Net Worth" cards to show the selected month's values (not always current)
- Update the savings trend chart to show cumulative savings per month
- Update net worth trend to show per-month snapshots

---

## 3. UI Fixes

### 3A. Prayer card — match inner colors to card gradient
The prayer card icon uses `from-amber-500 to-yellow-600`. The inner page (`Islamic.tsx`) header should use the same amber/yellow gradient colors for the icon and accents (currently uses generic styling).

### 3B. Weight card & page — match colors
- `WeightStatsCard`: currently uses `text-weight` and `bg-weight/20` — correct
- `WeightStats.tsx` page: rename title from "Weight Stats" to "Weight", change icon from `Scale` to `PersonStanding` to match the card

### 3C. All cards use loading skeleton
Cards that don't fetch data (Prayer, Gym, Supplements, Dreams) should show a brief loading state matching the wallet card pattern. Add a small `useState` loading trick or `loading` prop to BentoCard for consistency.

---

## 4. TV & Series Tracker (TMDB)

### 4A. Store TMDB API key
The TMDB API key is a public/free key. Store it as a Supabase secret and use it in an edge function to avoid exposing it client-side. Or since TMDB keys are public-ish, store as `VITE_TMDB_API_KEY` in code.

**Decision:** Use an edge function `tmdb-proxy` to keep the key server-side and avoid CORS issues.

### 4B. New Supabase tables

```sql
CREATE TABLE media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_id integer NOT NULL,
  type text NOT NULL, -- 'movie' or 'series'
  title text NOT NULL,
  poster_url text,
  rating numeric,
  runtime integer,
  total_seasons integer,
  genres text[] DEFAULT '{}',
  trailer_url text,
  status text DEFAULT 'want_to_watch', -- want_to_watch/watching/watched
  created_at timestamptz DEFAULT now(),
  UNIQUE(tmdb_id, type)
);

CREATE TABLE episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id uuid REFERENCES media(id) ON DELETE CASCADE,
  season_number integer NOT NULL,
  episode_number integer NOT NULL,
  title text,
  watched boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(series_id, season_number, episode_number)
);
```

RLS: permissive for all operations (matching existing pattern).

### 4C. Edge function: `tmdb-proxy`
- Accepts `path` and `query` parameters
- Forwards to TMDB API with the stored API key
- Returns JSON response
- Handles search, details, season, videos endpoints

### 4D. New files

| File | Purpose |
|------|---------|
| `src/pages/TVTracker.tsx` | Main page with tabs: All, Want to Watch, Watching, Watched, Recommendations |
| `src/components/tv/search-media-dialog.tsx` | Search TMDB, show results, add to library |
| `src/components/tv/media-card.tsx` | Poster card with title, rating, status badge |
| `src/components/tv/media-detail-dialog.tsx` | Full details: poster, trailer, episodes, mark watched |
| `src/components/tv/episode-list.tsx` | Season/episode checklist for series |
| `src/components/tv/recommendations.tsx` | Genre-based recommendations from TMDB |
| `src/components/dashboard/tv-card.tsx` | Dashboard card |
| `supabase/functions/tmdb-proxy/index.ts` | TMDB API proxy |

### 4E. Dashboard & routing
- Add `TVTrackerCard` to BentoGrid in Index.tsx
- Add `/tv-tracker` route in App.tsx
- Card order: Prayer, Weight, Wallet, Gym, TV Tracker, Supplements, Dreams

### 4F. Recommendation logic (no AI)
- Query user's `media` table, extract most frequent genres
- Call TMDB `/movie/{id}/recommendations` or `/tv/{id}/recommendations` for top-rated watched items
- Filter out items already in user's database
- Display in "Suggested Next Watch" section

---

## Implementation Order
1. Delete closet & cooking (files + DB migration)
2. Fix wallet stats (cumulative savings, month-specific net worth)
3. UI fixes (prayer colors, weight naming, loading states)
4. Create TV Tracker (DB tables, edge function, UI components, dashboard card)

---

## Technical Notes
- TMDB API key will need to be added as a Supabase secret — will prompt user for it
- ~10 files deleted, ~10 new files created, ~5 files modified
- No AI used anywhere — TMDB API + rule-based recommendations only

