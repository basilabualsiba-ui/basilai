

# Plan: Fix Build Error + Goal Linking + Offline Support

## 1. Fix Build Error (PushService.ts)

**Problem:** TypeScript error on line 33 — `Uint8Array<ArrayBufferLike>` not assignable to `BufferSource`.

**Fix:** Cast the return value in `urlB64ToUint8Array` to `Uint8Array<ArrayBuffer>` using `.buffer` slice, or simply cast with `as any` on the `applicationServerKey` parameter.

**File:** `src/services/PushService.ts` line 33 — add `as BufferSource` cast.

---

## 2. Goal Linking Across Modules

The existing `useDreamProgress.ts` already links Dreams to live data (weight from `user_body_stats`, net worth from `accounts`, savings from `transactions`). This will be enhanced to:

### a. Gym → Dreams linking
- Track workout-count dreams (e.g., "Complete 100 workouts") by counting `workout_sessions`.
- Show linked module badge on dream cards (e.g., a dumbbell icon for weight dreams, wallet icon for financial dreams).

### b. Dashboard cross-module summary
- Add a new `LinkedGoalsCard` on the dashboard that shows active dreams with their live-linked data source and progress.
- Each card row: dream title, source module icon, progress bar, current/target values.

### c. Dream card metadata display
- On `DreamCard`, show the linked data source (Weight Stats, Wallet, Gym) as a small chip.
- Display live current vs target values pulled from `localStorage` metadata.

### Files to modify:
| File | Change |
|------|--------|
| `src/services/PushService.ts` | Fix TS error with type cast |
| `src/hooks/useDreamProgress.ts` | Add workout-count dream detection |
| `src/components/dreams/dream-card.tsx` | Show linked module chip + live values |
| `src/components/dashboard/dreams-card-new.tsx` | Show linked progress on dashboard |

---

## 3. Offline Support

The service worker currently only handles push notifications. Enhance it with a cache-first strategy for app shell and API response caching.

### a. Service Worker caching strategy (`public/sw.js`)
- **App shell (cache-first):** Pre-cache index.html, JS/CSS bundles, icons, manifest on install.
- **API responses (stale-while-revalidate):** Cache Supabase REST responses so the app loads with stale data when offline, then refreshes when back online.
- **Image caching:** Cache poster images, muscle group photos from storage buckets.
- Bump `CACHE_NAME` to `basilix-v4`.

### b. Offline indicator component
- Create `src/components/ui/offline-indicator.tsx` — a small banner that appears when `navigator.onLine` is false, showing "You're offline — showing cached data".
- Add to `App.tsx` layout.

### c. Supabase client wrapper for offline queuing
- Create `src/services/OfflineQueue.ts` — when offline, queue write operations (add transaction, log supplement, etc.) in `localStorage`.
- On reconnect (`window.addEventListener('online')`), flush the queue by replaying mutations.
- Wrap key context actions (FinancialContext, SupplementContext, GymContext) to use the queue when offline.

### Files to create/modify:
| File | Change |
|------|--------|
| `public/sw.js` | Add fetch caching strategies |
| `src/components/ui/offline-indicator.tsx` | New — offline banner |
| `src/services/OfflineQueue.ts` | New — mutation queue |
| `src/App.tsx` | Add OfflineIndicator |
| `src/contexts/FinancialContext.tsx` | Wrap writes with offline queue |
| `src/contexts/SupplementContext.tsx` | Wrap writes with offline queue |
| `src/contexts/GymContext.tsx` | Wrap writes with offline queue |

---

## Implementation Order
1. Fix PushService.ts build error (type cast)
2. Enhance service worker with caching strategies
3. Create offline indicator + queue service
4. Integrate offline queue into contexts
5. Enhance dream progress with workout linking + module badges

