---
# Snapshot Cache LRU Bound

**Type:** Code Enhancement
**Originated by:** Taleb

## Problem / Opportunity

Four components hold unbounded `useRef<Map<string, AdvanceSnapshot[]>>` caches that are never evicted:

- **`AdvanceTab.tsx` line 1284** — keyed by `chartKey:period:baseDate.toISOString()`. One entry per (chart, period, baseDate) triple. A monthly run produces 37 snapshots (offsets 0–36); each `AdvanceSnapshot` carries `transitPlanets` (10–14 planet objects), `housedTransitPlanets`, `transitAspects` (up to ~50 aspect objects), `retrogrades`, `score`, `date`, `dateStr`. Estimated per-entry heap: ~240 KB for the monthly period, ~55 KB for daily (31 entries), ~130 KB for weekly (53 entries).
- **`CoupleAdvanceTab.tsx` line 847** — keyed by `period:baseDate:asc1:mc1:unknownTime1:asc2:mc2:unknownTime2`. Larger key space than the individual cache because partner switching multiplies entries. Each entry carries the same snapshot structure as above plus synastry-augmented scoring state.
- **`SolarReturnPage.tsx` line 43** — keyed by `sr:targetYear:asc:mc`. One entry per SR year viewed; the slice is 13 entries (offsets 0–12 at monthly cadence). Added in sprint-0020.
- **`TransitReadingPage.tsx` line 243** — keyed by `transitPeriod:baseDate:asc:mc:unknownTime`. Lifted cache shared between the Advance tab and the Transit Timeline to avoid recomputation on tab switches (see comment at line 237–242).

**Growth path in a long session:** A user who browses individual advance across three periods (daily, weekly, monthly) accumulates three cache entries, one per period key. If the base date also shifts (e.g. page re-mount on a date boundary) the old key is orphaned and a new one is inserted — the map never shrinks. A user who also views the couple tab with two different partner combinations accumulates up to six couple entries. A user who looks at three SR years accumulates three SR entries. The snapshot cache in `TransitReadingPage` compounds with every transit-period switch. In an extended multi-tab session on a low-RAM device (~2 GB usable), 8–12 orphaned entries across all four caches can consume 1.5–2 MB of heap that is never reclaimed until full page reload.

There is no existing LRU or eviction utility in `src/utils/` — only `src/utils/storage.ts`, which addresses `localStorage` quota, not in-memory Map growth.

## Desired State

A minimal `useLruMap<K, V>(capacity: number)` hook (or a bare `LruMap<K, V>` class) lives in `src/utils/lruMap.ts`. It wraps a `Map` and enforces a maximum entry count by deleting the least-recently-used key on every `set` that would exceed the cap. The implementation requires no external dependency — insertion-order deletion from a plain `Map` is O(1) using `Map.prototype.keys().next()`.

Suggested shape:

```ts
// src/utils/lruMap.ts
export class LruMap<K, V> extends Map<K, V> {
  constructor(private readonly capacity: number) { super() }
  set(key: K, value: V): this {
    if (this.has(key)) this.delete(key)          // move to MRU position
    else if (this.size >= this.capacity) this.delete(this.keys().next().value as K)
    return super.set(key, value)
  }
}
```

Each of the four cache sites then changes from:

```ts
const snapshotCache = useRef<Map<string, AdvanceSnapshot[]>>(new Map())
```

to:

```ts
const snapshotCache = useRef<LruMap<string, AdvanceSnapshot[]>>(new LruMap(6))
```

A cap of **6 entries** is chosen because:
- The three transit periods (daily/weekly/monthly) × two likely base dates (before and after a midnight re-mount) = 6 for a single-chart session, so normal use never evicts.
- A couple-tab session with up to three partner combinations × two periods = 6 — again no eviction under normal browsing.
- The SR cache rarely exceeds 2–3 years per session; 6 is generous.
- 6 × 240 KB ≈ 1.4 MB worst-case per cache instance — a bounded and predictable ceiling.

The change to each of the four `useRef` call sites is a one-line substitution. The `LruMap` class fully extends `Map`, so all existing `.get`, `.has`, `.set` call sites need no further changes.

No change is required to the cache key structure, the scoring logic, or the snapshot computation path. The `TransitReadingPage` lifted cache (line 243) is included in the fix even though it was not in the original stub — it is structurally identical and subject to the same growth risk from transit-period switching.
