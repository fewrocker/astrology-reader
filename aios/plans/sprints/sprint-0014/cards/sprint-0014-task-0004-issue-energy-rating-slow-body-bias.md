**Type:** Issue Fix
**Originated by:** Jobs, Taleb

## Problem

`computeEnergyRating()` in `src/engine/transits.ts` (lines 454–466) computes a daily energy score by taking the top 8 transit aspects — sorted by orb ascending — and applying a simple vote: harmonious aspects add +1, challenging aspects subtract 1, neutral aspects contribute 0.

```ts
export function computeEnergyRating(aspects: TransitAspect[]): EnergyRating {
  const top = aspects.slice(0, 8)
  const score = top.reduce((acc, a) => {
    if (a.nature === 'harmonious') return acc + 1
    if (a.nature === 'challenging') return acc - 1
    return acc
  }, 0)

  if (score >= 3) return { label: 'Highly Favorable', score: 5, dotColor: 'bg-emerald-400', textColor: 'text-emerald-400' }
  if (score >= 1) return { label: 'Favorable', score: 4, dotColor: 'bg-green-400', textColor: 'text-green-400' }
  if (score === 0) return { label: 'Mixed', score: 3, dotColor: 'bg-yellow-400', textColor: 'text-yellow-400' }
  if (score >= -2) return { label: 'Tense', score: 2, dotColor: 'bg-orange-400', textColor: 'text-orange-400' }
  return { label: 'Demanding', score: 1, dotColor: 'bg-red-400', textColor: 'text-red-400' }
}
```

The `aspects` array passed in is produced by `calculateTransitAspects()` (lines 124–171), which loops all transit planets against all natal planets and sorts by `orb` ascending. The function currently iterates only `PLANET_NAMES` (the ten classical planets plus NorthNode) via `calculateCurrentPositions()` (lines 86–117), so the top-8 slice reflects only fast-moving bodies.

The sprint-0014 asteroid work will extend `calculateCurrentPositions()` to emit positions for Chiron, Ceres, Pallas, Juno, and Vesta, and will extend `calculateTransitAspects()` to form aspects between those bodies and the natal planets. These aspects will enter the same sorted pool that feeds `computeEnergyRating()`.

The bias mechanism is straightforward and structural:

**Daily motion disparity.** Classical planet daily motions range from ~0.99°/day (Sun) to ~0.12°/day (Saturn during retrogrades). Chiron moves approximately 0.014°/day. Ceres averages ~0.21°/day, Pallas ~0.17°/day, Juno ~0.22°/day, Vesta ~0.27°/day. At the daily orb scale (`orbScale = 0.3` in `calculateTransitAspects()`), a conjunction or opposition has a maximum allowed orb of 2.4° (8° × 0.3). Chiron traverses that 4.8° window (entry to exit) in approximately 343 days — nearly a full year. Even Ceres takes roughly 23 days to traverse it.

**Ranking by orb, not by speed.** The sort is `orb` ascending only — there is no secondary key for body type or daily motion. When Chiron is, say, 0.8° from exact opposition to natal Mars, that 0.8° orb beats a Sun-square-natal-Moon at 1.2° orb in the ranking. Chiron's opposition claims one of the top-8 slots. Because challenging aspects score −1 regardless of origin, Chiron's opposition deflects the daily score downward for the entire duration of the transit — months, not days.

**The callers.** Three places call `computeEnergyRating()` today:

1. `DailySnapshotCard.tsx` (line 115): passes `aspects` from `calculateTransitAspects(transitPlanets, chart.planets, 'daily')`.
2. `TodayPage.tsx` (line 61): passes `all` from the same call pattern.
3. `JournalEntryCard` (referenced in the function's JSDoc comment at line 452).

All three are daily-use surfaces where the energy label is presented as today's felt quality. A Chiron opposition that lasts 300 days will hold the "Tense" or "Demanding" label in place every single day — superseding Moon trines, Sun sextiles, and Venus conjunctions that are the actual daily weather — for the entire duration.

The energy rating is designed to reflect the day's shifting planetary quality, not a background life chapter. Slow asteroid aspects represent extended biographical context — in Jobs's framing, they are "a season of life," not "daily weather." In Taleb's framing, the ranking mechanism has no weight parameter for body speed, so it treats astrologically slow bodies identically to fast ones, producing a systematic and invisible bias in the output.

## Expected behavior

`computeEnergyRating()` should reflect only classical planet transit aspects when computing the daily energy score. Asteroid transit aspects — those where `transitPlanet` is an asteroid name — must be excluded from the top-8 selection that drives the score.

The fix is a one-line filter before the `slice`:

```ts
export function computeEnergyRating(aspects: TransitAspect[]): EnergyRating {
  const ASTEROID_NAMES = new Set(['Chiron', 'Ceres', 'Pallas', 'Juno', 'Vesta'])
  const classical = aspects.filter(a => !ASTEROID_NAMES.has(a.transitPlanet as string))
  const top = classical.slice(0, 8)
  // ... rest unchanged
}
```

Once `code-asteroid-type-system` is in place and `AsteroidName` is defined, the filter can use the canonical `isAsteroid()` helper instead of an inline set:

```ts
const classical = aspects.filter(a => !isAsteroid(a.transitPlanet))
```

The excluded asteroid aspects are not discarded entirely. Callers that need to surface prominent slow-body transits — such as a banner warning when Chiron is within 1° of natal Chiron (the Chiron Return), or a contextual note in the transit reading — should draw from the full unsorted `aspects` array directly, not from the top-8 slice used for the score. This preserves the energy rating's daily-weather semantics while allowing asteroid transits to be presented as what they are: extended background themes surfaced through dedicated UI treatment, not as daily vote contributions.

No changes are needed to `calculateTransitAspects()`, `getTopActiveTransits()`, or the callers. The filter belongs inside `computeEnergyRating()` so the fix is in one place regardless of how many surfaces display the rating.

## Outcome

**Status: Complete** (2026-05-15)

Added an inline `ASTEROID_NAMES_SET` filter before `slice(0, 8)` in `computeEnergyRating()` (`src/engine/transits.ts:454`). Asteroid transit aspects (Chiron, Ceres, Pallas, Juno, Vesta) are now excluded from the top-8 classical planet pool that drives the daily energy score. TypeScript check passed with no errors; build succeeded. Committed as `f2ee0ea`.
