# Proposal: issue-couple-advance-cache-key

**Type:** Issue Fix
**Originated by:** Carmack, Taleb

---

## Problem

The couple advance snapshot cache in `CoupleAdvanceTab.tsx` constructs its cache key using `.toFixed(2)` for both partners' ascendant longitudes (line 420):

```ts
const cacheKey = `${period}:${baseDate.toISOString()}:${chart1.angles.ascendant.longitude.toFixed(2)}:${chart2.angles.ascendant.longitude.toFixed(2)}`
```

The individual advance cache key, fixed in sprint-0019 (`issue-advance-snapshot-cache-key`), uses `.toFixed(4)` and includes both ascendant and midheaven longitudes, plus `unknownTime`, for each chart (`AdvanceTab.tsx` line 1247–1248):

```ts
const chartKey = `${chartData.angles.ascendant.longitude.toFixed(4)}:${chartData.angles.midheaven.longitude.toFixed(4)}:${chartData.unknownTime}`
const cacheKey = `${chartKey}:${period}:${baseDate.toISOString()}`
```

The couple key has two distinct deficiencies relative to the individual key:

**1. Reduced precision (`.toFixed(2)` vs `.toFixed(4)`).**
At two decimal places, two ascendant longitudes that differ by less than 0.005° produce identical fingerprints. For example, `43.178°` and `43.183°` both round to `43.18`, mapping two distinct charts to the same cache slot. In a session where a user has saved multiple couples — a normal usage pattern for a compatibility product — two couples whose first (or second) partner has an ascendant within 0.01° of another couple's partner share a cache entry. One couple's pre-computed snapshots are silently served to the other.

**2. Midheaven longitude is absent from the couple key.**
The couple key fingerprints only ascendant longitude, not midheaven longitude, for either chart. `scoreCoupleSnapshot` gates Priority 1 (power day) on transiting slow planets within `angleContact` orb of both composite ASC and composite MC (lines 124–125 of `CoupleAdvanceTab.tsx`). Two couples with identical ascendants (rounded to 2 decimal places) but different midheavens share a cache slot. The cached results — including whether a power-day marker fires — reflect the midheaven of the first couple to populate the slot, not the second. The second couple receives silently incorrect snapshots.

**3. `unknownTime` is absent from the couple key.**
The individual key includes `chartData.unknownTime`. A `true`-value `unknownTime` flag suppresses house-dependent scoring paths for the individual advance. If the same person's chart is used in a couple context with `unknownTime: true` and the key does not reflect this flag, a chart computed without unknown-time suppression can collide with one that requires it.

**Reproduction path:**
1. Create two saved couples where Partner A of couple 1 has an ascendant at, e.g., `15.128°` (fingerprint: `15.13`) and Partner A of couple 2 has an ascendant at `15.132°` (fingerprint: `15.13`). All other chart data differs (different birth dates, different midheavens).
2. Load couple 1's advance tab. Snapshots are computed and stored under key `${period}:${baseDate.toISOString()}:15.13:...`.
3. Navigate to couple 2's advance tab in the same session. The same cache key is produced. The cached snapshots from couple 1 are served immediately. Couple 2's advance strip shows couple 1's computed markers with no error or warning.

The corruption is invisible at the UI level: the correct loading flow executes (the cache hit path short-circuits computation), the correct component renders, and the displayed markers are plausible but wrong.

**Files and lines:**
- `/projects/astrology-reader/src/components/reading/CoupleAdvanceTab.tsx`, line 420 — the defective cache key construction
- `/projects/astrology-reader/src/components/reading/AdvanceTab.tsx`, lines 1247–1248 — the reference implementation that was correctly fixed in sprint-0019

---

## Expected Behavior

The couple advance cache key must fingerprint both charts with the same precision and fields used by the individual advance cache key. The corrected construction:

```ts
const cacheKey = [
  period,
  baseDate.toISOString(),
  chart1.angles.ascendant.longitude.toFixed(4),
  chart1.angles.midheaven.longitude.toFixed(4),
  chart1.unknownTime,
  chart2.angles.ascendant.longitude.toFixed(4),
  chart2.angles.midheaven.longitude.toFixed(4),
  chart2.unknownTime,
].join(':')
```

With this key:
- Two charts whose ascendants differ by as little as 0.0001° produce distinct fingerprints.
- Charts with identical ascendants but different midheavens are correctly distinguished, ensuring midheaven-dependent power-day markers are not shared between couples.
- Charts with `unknownTime: true` are not confused with their `unknownTime: false` counterparts.
- No change to any snapshot computation logic, scoring logic, or rendering path is required. The fix is confined to the cache key string at `CoupleAdvanceTab.tsx` line 420.
