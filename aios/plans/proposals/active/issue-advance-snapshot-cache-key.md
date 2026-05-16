# issue-advance-snapshot-cache-key

**Type:** Issue Fix
**Originated by:** Taleb

## Problem

The snapshot cache in `AdvanceTab` (`src/components/reading/AdvanceTab.tsx`, lines 779–797) is a `useRef<Map<string, AdvanceSnapshot[]>>` keyed by the string `${period}:${baseDate.toISOString()}` (line 786):

```typescript
const snapshotCache = useRef<Map<string, AdvanceSnapshot[]>>(new Map())

useEffect(() => {
  const cacheKey = `${period}:${baseDate.toISOString()}`
  const cached = snapshotCache.current.get(cacheKey)
  if (cached) {
    setSnapshots(cached)
    return
  }
  // ...
}, [chartData, period, baseDate])
```

The cache key encodes only the transit period (`daily` / `weekly` / `monthly`) and the base date. It encodes nothing about the chart being evaluated — not the birth date, not the birth time, not any identity of the person whose natal planets drive the entire snapshot computation.

`preCalculateSnapshots` (lines 411–511) uses `chartData` to score every snapshot: angle-contact power markers depend on `chartData.angles.ascendant.longitude` and `chartData.angles.midheaven.longitude` (lines 233–258); favorable and challenging markers rank aspects against `chartData.planets`; the house-to-natal-planet lookup at line 1094 reads from `chartData.planets`. The results are person-specific at every level.

The defect becomes observable when `AdvanceTab` is reused across different chart identities within the same React session — the scenario Taleb identifies as the couple advance surface. The vision (`aios/plans/sprints/sprint-0019/vision.md`) calls for extending `AdvanceTab` to the synastry context, either by reusing the existing component with new props or by composing from it. In either case, if the component instance persists across partner switches (which is the normal React lifecycle when a tab stays mounted), the `useRef` cache survives unmount-free re-renders. A user on chart A generates snapshots scored against chart A's natal planets and angles. The cache stores them under `monthly:2026-05-01T12:00:00.000Z`. The user switches to chart B — same period, same base date, different person. The cache key is identical. The cached value is returned immediately at line 788 without recomputation. The `setSnapshots` call on line 789 loads chart A's markers, scored against chart A's chart, into a view that is now displaying chart B. Power markers fire on angles that belong to chart A. The user sees stale, wrong data with no error, no warning, and no visible symptom beyond the results being subtly off.

The `useEffect` dependency array on line 797 includes `chartData`, which would normally force recomputation when the chart object changes. But the cache check on line 787 short-circuits before any recomputation is attempted: if `period` and `baseDate` match, the old value is returned regardless of what `chartData` now contains. The `chartData` dependency in the effect does not protect against this because the cache lookup happens inside the effect before `chartData` is used.

Taleb's analysis (sprint-0019 voice, section 2.3) flags this directly: "The partner chart identity is not part of the current cache key pattern."

**Reproduction:**
1. Open a transit reading for person A (e.g., natal Sun at 15° Aries, Saturn near the Ascendant at monthly view, base date May 2026). The Advance tab computes and caches snapshots under `monthly:2026-05-01T12:00:00.000Z`. Power markers appear at positions reflecting Saturn's proximity to person A's Ascendant.
2. Without refreshing the page or changing the period or base date, switch to person B's transit reading (e.g., a partner chart with no slow planets near the angles). The `AdvanceTab` instance either remounts or re-renders with the new `chartData`. The cache key is `monthly:2026-05-01T12:00:00.000Z` — a hit. Person A's pre-scored snapshots are served. Person B sees power markers that are incorrect for their chart.

## Expected Behavior

The snapshot cache key must include a stable, unique identifier for the chart being evaluated. When `chartData` changes — whether because the user switched charts, switched partners, or any other identity change — the cache must produce a miss and trigger a fresh call to `preCalculateSnapshots` with the new chart data.

The cache key should incorporate a fingerprint derived from `chartData` that uniquely identifies the natal chart: at minimum the birth date, birth time (or the `unknownTime` flag), and chart owner identity if available. A reasonable implementation is to derive a compact string from `chartData` properties that are stable per-person and change between persons — for example `${chartData.birthDate}:${chartData.birthTime ?? 'unknown'}` prepended to the existing `${period}:${baseDate.toISOString()}` pattern, yielding a key of the form `${chartIdentity}:${period}:${baseDate.toISOString()}`.

After this fix, switching from person A's chart to person B's chart with the same period and base date must always compute fresh snapshots for person B. Returning to person A in the same session may legitimately hit the cache because person A's key still maps to the correctly-scored snapshots. The cache should remain a performance aid for repeated visits to the same chart, not a source of cross-chart contamination.
