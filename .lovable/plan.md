
Implementation plan

1. Wallet / Prayer / TV bottom bars
- Rebuild the Prayer and TV mobile bottom bars to match the Wallet pattern exactly:
  - blurred glass container
  - top glow line in module color
  - rounded active tile with soft inner gradient
  - active icon scale + slight lift
  - small top highlight line
- Use amber theme for Prayer and cyan theme for TV.
- Keep the same spacing/height/grid behavior as Wallet so all modules feel unified.

2. Welcome-screen / open animation fixes
- Audit each module page load path and move the “welcome” animation to page-level wrappers, not only card-level loaders.
- Add a short controlled intro state when a module opens so the branded loading/welcome screen always appears before content mounts.
- Fix cases where data already exists and the page renders too fast, skipping the animation.
- Apply this consistently to Prayer, TV, Gym, Wallet, Dreams, Supplements, and Weight.

3. Floating action buttons
- Reuse the Dreams FAB size/shape/position as the shared pattern.
- Convert:
  - Gym top-right play button → floating action button
  - TV top-right add button → floating action button
  - Wallet “make log” / add action → floating action button
- Keep each FAB in its module theme color and shadow.
- Standardize z-index, bottom spacing above bottom nav, and sound trigger behavior.

4. TV Tracker redesign
- Header
  - Move the Movies/Series toggle into the top bar where the add button used to be.
  - Make it pill/circular styled in the TV theme.
- Main filtering
  - Add a second segmented filter row where the old Movies/Series toggle currently is.
  - Movies filters: Want to Watch, Watched
  - Series filters: Want to Watch, Watching, Watched
  - Preserve current bottom tab when switching Movies/Series.
- Ratings
  - Fix star selection so choosing 4 fills 1–4, choosing 2 fills 1–2.
  - Add visible 1 label on the left and 5 on the right.
- Recommendations
  - Tapping a suggested title should open a detail dialog/page instead of only offering add-to-library.
- Refresh / sync on scroll
  - Add pull/down refresh behavior or near-top refresh trigger for series syncing.
  - On refresh, fetch latest TMDb season data for series already in library and insert missing episodes/seasons.
- Upcoming episodes
  - Keep existing upcoming badge behavior and ensure refreshed episodes also get air_date.
- Bottom nav
  - Restyle TV bottom nav to match the Wallet design.

5. Dreams improvements
- Card actions
  - Add a visible edit button for each dream card.
- Progress bug
  - Fix progress math in `useDreamProgress` for weight dreams.
  - Use the correct formula based on starting value, current value, target value, and gain/loss direction.
  - Clamp 0–100 and make it work for existing and future records.
- New-dream flow
  - Remove “AI genera/type” exposure and “why important” field from the creation flow.
  - Keep background logic that detects links to gym / weight / wallet and estimated cost when relevant.
- Types UX
  - Replace the current type dropdown with type cards/chips near the top of Dreams.
  - Let users create new custom types.
  - Then show related dreams below based on selected type.
- Keep existing similar-dreams refinement (same type only, real titles shown).

6. My Games Tracker feature
- Scope
  - New dashboard card + new page + RAWG-backed add/search flow.
  - Keep same app card structure, but give games a distinct module color.
  - Per your answer, hide Game Pass for now.
- Data model / backend
  - Add a new `games` table for tracked games.
  - Recommended extra columns beyond your base spec:
    - `rawg_id`
    - `slug`
    - `platform`
    - `project_link`
    - `user_price_ils`
    - `genres` text[]
    - `image`
    - `rating`
    - `date_added`
    - cached RAWG metadata fields as needed
  - Add permissive RLS consistent with current app pattern.
- Edge function
  - Create a RAWG proxy edge function using `RAWG_API_KEY`.
  - Support:
    - search endpoint
    - game details endpoint
    - suggested/recommendations endpoint
  - Cache responses where practical.
- UI
  - New “My Games Tracker” page with:
    - top platform filter
    - library grid/list of tracked games
    - floating “+ Add Game” button
    - add-game modal with RAWG autocomplete, platform picker, project link, price field
    - recommended games section limited to 5
  - “Open Project” should open inside the app:
    - web: internal dialog/sheet with iframe/web view style container
    - mobile/capacitor: in-app browser/webview fallback path
- Routing/dashboard
  - Add dashboard card and route.
  - Use lazy image loading for game covers.

7. Sounds / theming consistency
- Audit module pages and buttons so colors, shadows, chips, active states, and glows follow each module icon/theme color.
- Review button sound coverage across the updated modules.
- If implementation stays simple, keep the current shared sound system and map module actions consistently.
- If needed, introduce a lightweight per-module config object for color tokens + preferred sound presets, without overcomplicating the codebase.

8. Required reads/changes for implementation
- Files likely to update:
  - `src/pages/TVTracker.tsx`
  - `src/pages/Financial.tsx`
  - `src/pages/Gym.tsx`
  - `src/pages/Islamic.tsx`
  - `src/pages/Dreams.tsx`
  - `src/components/dreams/dream-card.tsx`
  - `src/components/dreams/add-dream-dialog.tsx`
  - `src/hooks/useDreamProgress.ts`
  - `src/components/dashboard/*card*.tsx`
  - `src/App.tsx`
  - `src/services/SoundService.ts`
- New files likely:
  - games page/components
  - RAWG edge function
  - migration for `games` table
  - games dashboard card

9. Important dependency/setup note
- `TMDB_API_KEY` already exists.
- `RAWG_API_KEY` is not currently present in project secrets, so implementation of the Games feature should wait for that secret to be added first.

10. Recommended implementation order
- First: bottom nav redesign + floating buttons + welcome-screen reliability
- Second: TV Tracker interaction fixes and sync refresh
- Third: Dreams fixes
- Fourth: My Games Tracker schema + RAWG proxy + UI
- Fifth: end-to-end visual/audio consistency pass and testing
