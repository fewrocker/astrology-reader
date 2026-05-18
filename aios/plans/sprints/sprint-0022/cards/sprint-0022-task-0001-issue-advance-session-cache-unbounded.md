# issue-advance-session-cache-unbounded

**Type:** Issue Fix
**Originated by:** Carmack, Taleb

## Problem

The module-level singleton `advanceSnapshotSessionCache` in `src/components/reading/AdvanceTab.tsx` at line 128 is declared as a plain `Map`:

```typescript
export const advanceSnapshotSessionCache = new Map<string, AdvanceSnapshot[]>()
```

Sprint-0021 converted the four per-component `useRef<Map>` caches to bounded `LruMap` instances to prevent unbounded memory accumulation. This module-level singleton — exported and shared across `AdvanceTab`, `TransitReadingPage`, and `TodayPage` — was not included in that fix. It has no size cap and no eviction policy. Every unique combination of chart key, period, and base date writes a new entry that persists for the lifetime of the browser tab.

Each `AdvanceSnapshot` entry in the stored arrays carries full `transitPlanets`, `housedTransitPlanets`, and `transitAspects` arrays. A session where the user visits Advance tabs across multiple chart identities and periods accumulates these arrays without bound. Three periods × two base dates × two people equals nine combinations producing up to ~300 snapshot objects in the cache — and this count grows with each navigation into a new period or chart view.

The secondary impact is a linear scan on every `TodayPage` mount. `TodayPage.tsx` at lines 70–78 reads the cache by iterating all entries and testing each key against a prefix pattern:

```typescript
for (const [key, snapshots] of advanceSnapshotSessionCache.entries()) {
  if (!key.startsWith(`${chartKey}:${period}:`)) continue
  // ...
}
```

This O(n) scan over the entire cache runs synchronously on every `TodayPage` mount. At a small session the cost is invisible. As the cache accumulates entries across multiple charts and periods in a longer session, this scan touches every stored snapshot array on every daily open of the Today view.

This is the same failure mode identified and fixed for the four `useRef<Map>` caches in sprint-0021. The singleton was excluded from that scope because the sprint-0021 task specification listed only the per-component `useRef` sites. The `LruMap` class is already imported in `AdvanceTab.tsx` — the fix is a one-character substitution at the declaration site.

## Expected Behavior

`advanceSnapshotSessionCache` should be an `LruMap` with a bounded capacity. A cap of 6 matches the established pattern from the sprint-0021 per-component fixes and accommodates the practical session space: three transit periods × two representative base dates. When the cap is reached, the least-recently-used entry is evicted automatically, keeping the cache footprint constant regardless of session length.

The declaration at `AdvanceTab.tsx` line 128 should read:

```typescript
export const advanceSnapshotSessionCache = new LruMap<string, AdvanceSnapshot[]>(6)
```

The exported type is unchanged — `LruMap` extends `Map` — so all import sites in `TodayPage.tsx` and `TransitReadingPage` require no modification. The O(n) prefix-scan in `TodayPage` remains but is bounded to at most 6 entries regardless of session length.

## Outcome
Status: completed
Fix: Changed advanceSnapshotSessionCache from new Map to new LruMap(6) at AdvanceTab.tsx.
Build: passed
