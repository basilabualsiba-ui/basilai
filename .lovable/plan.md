

# Implementation Plan: Remaining Fixes & Consistency Pass

## Summary of what's NOT done from previous plan + new requests

### 1. Islamic (Prayer) — Bottom Nav Redesign
**Current:** Old-style bottom nav with simple `bg-card/95` and no glass/glow effects.
**Target:** Match Wallet pattern exactly — blurred glass, amber top glow line, rounded active tile with gradient, icon scale+lift.

**File:** `src/pages/Islamic.tsx` lines 80-114 — replace bottom nav with Wallet-style pattern using amber theme.

### 2. TV Tracker — Bottom Nav Redesign
**Current:** Simple `bg-card/95 backdrop-blur-xl` bottom nav (lines 793-809).
**Target:** Match Wallet pattern with cyan theme — glass container, top glow line, rounded active tiles.

**File:** `src/pages/TVTracker.tsx` lines 793-809.

### 3. TV Tracker — Move Toggle to Top Bar + Add Status Filters
**Current:** Movies/Series toggle is in the body area (lines 460-469). Add button is in header (lines 413-455).
**Target:** 
- Move Movies/Series toggle to header (replacing the + button position) as a small pill.
- The + becomes a FAB (floating action button).
- Add status filter row where the old toggle was: Movies get "Want to Watch" / "Watched"; Series get "Want to Watch" / "Watching" / "Watched".
- Switching Movies/Series preserves the current bottom tab.

### 4. TV Tracker — Dynamic Search (like Games)
**Current:** Search requires pressing a Search button (lines 423-425).
**Target:** Make search instant/dynamic as user types (debounced), matching the Games tracker pattern.

### 5. TV Tracker — Fix Star Rating
**Current:** Stars don't fill progressively (lines 769-777, 784-790). Each star is independent.
**Target:** Selecting star N fills stars 1 through N. Add "1" label on far left, "5" on far right.

### 6. TV Tracker — Recommendations Detail Dialog
**Current:** Recommendations only have an "Add to Library" button (line 587).
**Target:** Tapping a recommended item opens a detail dialog showing poster, overview, rating, genres, year — with an "Add" button inside.

### 7. TV Tracker — Pull-to-refresh for Series Sync
Add a scroll-based refresh trigger (or visible refresh button) that syncs series episodes from TMDb.

### 8. Floating Action Buttons
- **Gym:** Move the "Track Exercise" button from header (line 89-97) to a FAB. Same red/gym gradient.
- **TV:** Move the + button from header to a FAB. Cyan gradient.
- **Wallet:** Add a FAB for "Add Transaction" (currently accessed via the Transactions tab). Green/wallet gradient.
- All FABs use the same `FloatingActionButton` component, positioned at `bottom-24 right-6`.

### 9. Welcome/Intro Screen for All Modules
**Current state:**
- Games: Has `ModuleIntroScreen` + `useModuleIntro` — working.
- Gym: Has loading state but uses old Skeleton pattern, not `ModuleIntroScreen`.
- Wallet: Same — old Skeleton pattern.
- Supplements: Same — old Skeleton pattern.
- Dreams: No intro/loading screen at all (just skeleton grid).
- Islamic: No intro screen.
- WeightStats: No intro screen.
- TV Tracker: No intro screen.

**Target:** Every module uses `ModuleIntroScreen` on open for ~900ms minimum, ensuring the branded animation always shows.

**Implementation per page:**
- `Islamic.tsx`: Add `useModuleIntro(900)` + `ModuleIntroScreen` with Moon icon, amber theme.
- `Dreams.tsx`: Add `useModuleIntro(900)` + `ModuleIntroScreen` with Target icon, dreams theme.
- `WeightStats.tsx`: Add `useModuleIntro(900)` + `ModuleIntroScreen` with PersonStanding icon, weight theme.
- `TVTracker.tsx`: Add `useModuleIntro(900)` + `ModuleIntroScreen` with Tv icon, tv theme.
- `Gym.tsx`: Replace old Skeleton loading with `ModuleIntroScreen` using Dumbbell icon, gym theme.
- `Supplements.tsx`: Replace old Skeleton loading with `ModuleIntroScreen` using Pill icon, supplements theme.
- `Financial.tsx`: Replace old Skeleton loading with `ModuleIntroScreen` using Wallet icon, wallet theme.

### 10. Games Tracker Fixes
- **Edit game:** Tapping a game card opens an edit dialog (reuse the add-game form layout) pre-filled with current values. Allow updating platform, project link, price.
- **Open Project button:** Only show when `game.project_link` is truthy.
- **Remove Recommended Games section** entirely.
- **Add local search bar** for filtering games by name (above the library grid).

### 11. Dreams Fixes
- **Edit button:** The `DreamCard` already accepts `onEdit` prop but `Dreams.tsx` doesn't pass it. Need to add edit functionality — open the `AddDreamDialog` in edit mode or create an `EditDreamDialog`.
- **Progress calculation:** The `useDreamProgress.ts` logic looks correct (clamps 0-100, handles gain/loss). The user says "66.3 from 70 is not 48%". This suggests the starting weight is wrong — it uses the FIRST ever body stat as starting weight, but the dream's starting point should be the weight at dream creation time. Fix: store starting weight in dream metadata at creation, or use a heuristic (weight at dream's `created_at` date).
- **Remove "why important" field** from `add-dream-dialog.tsx`.
- **Remove AI genre/type exposure** from creation — keep auto-detection but don't show it as a field. The type should be auto-detected silently.
- **Type cards/chips:** Replace the type dropdown filter in `Dreams.tsx` with horizontal scrollable type chips/cards. Allow adding custom types.

### 12. Color/Theme Consistency Audit
All pages already use their module colors for headers, icons, and glows. The key gaps:
- TV bottom nav needs redesign (covered in #2).
- Islamic bottom nav needs redesign (covered in #1).
- Everything else looks consistent based on code review.

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Islamic.tsx` | Bottom nav redesign + welcome screen |
| `src/pages/TVTracker.tsx` | Toggle to header, status filters, FAB, dynamic search, fix ratings, bottom nav, rec detail, pull-refresh, welcome screen |
| `src/pages/Gym.tsx` | FAB for workout, replace skeleton with ModuleIntroScreen |
| `src/pages/Financial.tsx` | FAB for add transaction, replace skeleton with ModuleIntroScreen |
| `src/pages/Dreams.tsx` | Welcome screen, type chips, pass edit handler |
| `src/pages/Supplements.tsx` | Replace skeleton with ModuleIntroScreen |
| `src/pages/WeightStats.tsx` | Welcome screen |
| `src/pages/GamesTracker.tsx` | Edit dialog, hide Open Project when no link, remove recommendations, add local search |
| `src/components/dreams/dream-card.tsx` | Ensure edit button wired |
| `src/components/dreams/add-dream-dialog.tsx` | Remove why_important field, support edit mode |
| `src/hooks/useDreamProgress.ts` | Fix starting weight to use weight at dream creation date |

## Implementation Order
1. Bottom nav redesign (Islamic + TV) — quick pattern copy from Wallet
2. Welcome screens for all modules
3. FABs for Gym, TV, Wallet
4. TV Tracker: toggle to header, status filters, dynamic search, fix ratings, rec detail, pull-refresh
5. Games Tracker: edit dialog, hide Open Project, remove recs, local search
6. Dreams: edit support, remove why_important, type chips, progress fix

