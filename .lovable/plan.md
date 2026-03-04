

# Plan: TV Tracker Overhaul, Wallet Stats Fix, Dreams Fix, UI Polish

## 1. TV Tracker — Complete Rewrite (`TVTracker.tsx`)

### Top Toggle
- Replace old tabs with a top toggle: `[ 🎬 Movies | 📺 Series ]`
- Controls which content type is shown in the library

### Bottom Navigation Bar (3 tabs)
- **Library** — shows movies or series based on top toggle
- **Recommendations** — series mode: "What to Watch Next" based on watching progress; movie mode: genre-based from local library
- **Stats** — top genres, total watched, total time spent

### Library UI — Movies
- Remove status buttons (Want to Watch, Watching, Watched)
- Add 👁 Eye icon at far right of each movie title row: outline = not watched, filled = watched
- When tapping Watch, prompt for user rating (1-5 stars)
- Rating displayed in detail page

### Library UI — Series
- Remove all manual status buttons — status is automatic:
  - 0 episodes watched → Want to Watch
  - 1+ but not all → Watching
  - All → Completed
- Progress bar at bottom of poster card
- Series detail: show episode release dates, 🟢 Upcoming badge for future episodes
- When tapping Watch on episode, prompt for user rating

### Episode Dates & Sync Fix
- Add `air_date` column to `episodes` table (migration)
- Add `user_rating` column to both `media` and `episodes` tables
- When adding a series, store `air_date` from TMDb for each episode
- On app start, for series in library: fetch latest season/episode data from TMDb, insert missing seasons/episodes

### Search Bar
- Below toggle: local search that filters library by title

### Stats Page
- Top genres watched (pie chart)
- Total movies/series watched
- Total time spent (sum of runtimes for movies, estimate for series)

### Recommendation Logic (no AI)
- For series in "watching" status: fetch TMDb recommendations for that series
- For movies: use most-watched genres to fetch recommendations
- Filter out items already in library

## 2. DB Migration

```sql
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS air_date date;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS user_rating integer;
ALTER TABLE media ADD COLUMN IF NOT EXISTS user_rating integer;
```

## 3. Wallet Stats Fix — Net Worth Backfill

**Current issue:** Past months have no `net_worth_snapshots` entries, so they show ₪0.

**New calculation for past months (Aug 2025 through current-1):**
- Net Worth of month X = Net Worth of current month (live) - cumulative savings from month X+1 through current month
- Example: Feb 2026 net worth = March 2026 live net worth - March 2026 savings
- This works backwards from the current live balance

**In the I/E chart view:** Add the monthly savings amount (income - expenses) for the selected month as a visible data point.

**Implementation:** Update `stats-overview.tsx` to compute historical net worth using the reverse-savings approach when no snapshot exists.

## 4. Dreams Fixes

### Progress Bar
- The `<Progress>` component in `dream-detail-dialog.tsx` doesn't use the dreams pink color — apply `className` with `[&>div]:bg-gradient-to-r [&>div]:from-pink-500 [&>div]:to-rose-500`

### Similar Dreams
- Current logic matches by type OR priority — too broad. Fix to match by type only, and show the actual similar dream titles instead of just counts.

## 5. Dashboard Card Loading States

Currently `FinanceCard` and `WeightStatsCard` have real data loading (Supabase fetch), while other cards use a fake 400ms timeout. The user wants all cards to show a loading skeleton with the card's logo before content appears.

**New approach for all cards:** Create a custom loading skeleton that shows the card's gradient icon (logo) with a pulsing animation + description text, instead of the generic `SkeletonCard`. Modify `BentoCard` to accept `loadingIcon`, `loadingColor`, and `loadingLabel` props for a branded loading state.

Cards and their colors:
- Prayer: amber (Moon icon)
- Weight: weight/blue (PersonStanding)
- Wallet: wallet/green (Wallet)
- Gym: red (Dumbbell)
- TV: cyan (Tv)
- Supplements: purple (Pill)
- Dreams: pink (Target)

## 6. Inner Page Color Consistency

Verify that all inner pages use their card's gradient colors for headers, icons, and accents. Most are already correct based on my review. No major changes needed.

## 7. Files Summary

| Action | File |
|--------|------|
| Rewrite | `src/pages/TVTracker.tsx` — top toggle, bottom nav, library/recommendations/stats |
| Modify | `src/components/dashboard/bento-grid.tsx` — add branded loading skeleton props |
| Modify | `src/components/dashboard/today-agenda-card.tsx` — use branded loading |
| Modify | `src/components/dashboard/gym-card.tsx` — use branded loading |
| Modify | `src/components/dashboard/supplements-card.tsx` — use branded loading |
| Modify | `src/components/dashboard/dreams-card-new.tsx` — use branded loading |
| Modify | `src/components/dashboard/tv-card.tsx` — use branded loading |
| Modify | `src/components/dashboard/finance-card.tsx` — use branded loading |
| Modify | `src/components/dashboard/weight-stats-card.tsx` — use branded loading |
| Modify | `src/components/financial/stats-overview.tsx` — reverse net worth calc, I/E savings display |
| Modify | `src/components/dreams/dream-detail-dialog.tsx` — progress bar color, similar dreams fix |
| Modify | `src/components/dreams/dream-card.tsx` — progress bar color consistency |
| Migration | Add `air_date`, `user_rating` to episodes; `user_rating` to media |

~13 files modified, 1 migration. No new files needed — TV tracker is a rewrite of existing page.

