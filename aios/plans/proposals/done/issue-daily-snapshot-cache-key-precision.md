# issue-daily-snapshot-cache-key-precision

**Type:** Issue Fix
**Originated by:** Taleb

## Problem

`getCacheKey` in `src/components/reading/DailySnapshotCard.tsx` (line 80–84) constructs the localStorage key for the GPT morning snapshot as:

```typescript
function getCacheKey(chart: ChartData): string {
  const sun = chart.planets.find(p => p.name === 'Sun')
  const today = new Date().toISOString().split('T')[0]
  return `${CACHE_PREFIX}${sun?.longitude?.toFixed(0)}-${today}`
}
```

`toFixed(0)` rounds the Sun's ecliptic longitude to the nearest integer degree. The Sun advances approximately 1° per day. Two people born on consecutive days — or in different years when the Sun happens to fall within rounding distance of a degree boundary on the same calendar date — produce identical cache keys and are served each other's GPT-generated morning snapshot. User A reads User B's personalized reading. Neither is aware.

The Ascendant is absent from the cache key entirely. Two people with identical natal Sun longitudes but different rising signs — a common occurrence for birth dates a year apart in the same season — receive the same cached text despite having entirely different house structures. The snapshot prompt sent to GPT includes Sun sign and degree, Moon sign and degree, and Ascendant sign (lines 42–44 of `buildSnapshotPrompt`). The cache key encodes none of the Ascendant context and only an integer approximation of the Sun. The key is structurally incapable of distinguishing charts whose personalization inputs differ.

This is the same class of precision defect corrected for the advance snapshot cache in sprints 0019 and 0020. The current advance cache key (lines 1299–1300 of `src/components/reading/AdvanceTab.tsx`) reads:

```typescript
const chartKey = `${chartData.angles.ascendant.longitude.toFixed(4)}:${chartData.angles.midheaven.longitude.toFixed(4)}:${chartData.unknownTime}`
const cacheKey = `${chartKey}:${period}:${baseDate.toISOString()}`
```

That fix established four decimal places of precision and Ascendant + Midheaven inclusion as the correct fingerprint pattern for chart-specific GPT caches in this codebase. `DailySnapshotCard` was not updated to match.

**Reproduction:**

1. Open `DailySnapshotCard` for a natal chart whose Sun is at, say, 27.6° Taurus (rounds to 28). The cache key becomes `daily-snapshot-28-2026-05-18`. GPT generates and caches a morning snapshot for this chart.
2. Open `DailySnapshotCard` for a second natal chart whose Sun is at 27.4° Taurus — born on an adjacent day or a prior year with the Sun in the same degree band. The cache key is also `daily-snapshot-28-2026-05-18` — a hit. The second chart reads the first chart's GPT snapshot verbatim, including references to the first chart's Moon sign and Ascendant context.
3. Two charts with the same integer Sun degree but different Ascendants — e.g., a Virgo rising and a Scorpio rising — produce the same key regardless of any Ascendant difference. The snapshot reflects whoever populated the cache first.

**Severity:** Silent data cross-contamination. The user has no indication that the text they are reading was generated for a different person's natal chart. The defect is invisible in single-user sessions and surfaces only under multi-chart or returning-user conditions, making it easy to overlook in development.

## Expected Behavior

The cache key must uniquely identify the natal chart to the precision of the personalization inputs used in the GPT prompt. Specifically:

- Sun longitude at four decimal places (`sun?.longitude?.toFixed(4)`) — matching the advance cache precision and eliminating rounding collisions between charts separated by fractions of a degree.
- Ascendant sign — the rising sign is included in `buildSnapshotPrompt` and must be in the key. The sign string (e.g., `"Virgo"`) is a compact, stable discriminator.
- Moon sign — natal Moon sign is included in `buildSnapshotPrompt` and participates in the GPT output. Two charts with the same Sun longitude but different natal Moon signs receive different personalization; the cache must reflect this.

A corrected key takes the form:

```typescript
function getCacheKey(chart: ChartData): string {
  const sun = chart.planets.find(p => p.name === 'Sun')
  const moon = chart.planets.find(p => p.name === 'Moon')
  const asc = chart.houses?.[0]
  const today = new Date().toISOString().split('T')[0]
  return `${CACHE_PREFIX}${sun?.longitude?.toFixed(4)}-${asc?.sign ?? 'unknown'}-${moon?.sign ?? 'unknown'}-${today}`
}
```

Existing cache entries written under the old `toFixed(0)` key will no longer be read — they will be treated as misses on the next load, triggering a fresh GPT call. This is the correct behavior: stale entries under imprecise keys should not be served. The old keys will remain in localStorage until evicted or the browser clears storage; they can optionally be cleaned up proactively using the same `CACHE_PREFIX` scan pattern already present in the codebase.
