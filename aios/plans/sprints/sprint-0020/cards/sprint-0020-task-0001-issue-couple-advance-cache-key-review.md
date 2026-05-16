# Review: sprint-0020-task-0001-issue-couple-advance-cache-key

## What Was Changed

**File:** `src/components/reading/CoupleAdvanceTab.tsx`  
**Line:** 420

**Before:**
```ts
const cacheKey = `${period}:${baseDate.toISOString()}:${chart1.angles.ascendant.longitude.toFixed(2)}:${chart2.angles.ascendant.longitude.toFixed(2)}`
```

**After:**
```ts
const cacheKey = [
  period,
  baseDate.toISOString(),
  chart1.angles.ascendant.longitude.toFixed(4),
  chart1.angles.midheaven.longitude.toFixed(4),
  String(chart1.unknownTime),
  chart2.angles.ascendant.longitude.toFixed(4),
  chart2.angles.midheaven.longitude.toFixed(4),
  String(chart2.unknownTime),
].join(':')
```

The three deficiencies fixed:
1. **Precision** — `.toFixed(2)` → `.toFixed(4)` for both charts' ascendant longitudes, reducing false-collision window from 0.01° to 0.0001°.
2. **Midheaven** — `chart1.angles.midheaven.longitude` and `chart2.angles.midheaven.longitude` added to the key; midheaven-dependent power-day markers now correctly distinguish couples with equal ascendants but different midheavens.
3. **`unknownTime` flag** — `chart1.unknownTime` and `chart2.unknownTime` added; charts with unknown-time suppression no longer collide with their counterparts.

## Build Result

**Pass.** `tsc -b && vite build` completed successfully in 10.05s with no type errors or new warnings.

## Issues Encountered

None. The change is a single-site string replacement confined to the cache key construction; no downstream logic was touched.
