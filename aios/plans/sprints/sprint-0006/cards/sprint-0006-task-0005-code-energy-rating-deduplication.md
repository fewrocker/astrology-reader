# code-energy-rating-deduplication

**Type:** Code Enhancement  
**Originated by:** Carmack  
**User guidance:** Not directly applicable — this is a code-quality change with no user-facing behavior change.

## Problem / Opportunity

`computeEnergyRating()` is defined verbatim in two components:

- `src/components/reading/DailySnapshotCard.tsx`, lines 22–42 (interface `EnergyRating` at line 22, function body lines 29–42)
- `src/components/reading/TodayPage.tsx`, lines 42–62 (interface `EnergyRating` at line 42, function body lines 49–62)

The function signature and body are identical in both files:

```ts
function computeEnergyRating(aspects: TransitAspect[]): EnergyRating {
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

The `EnergyRating` interface is also duplicated — declared locally in each file rather than shared.

This duplication was missed during the sprint-0005 deduplication pass that unified `calculatePersonalDay` (which followed the same pattern). A third call site is imminent: the Cosmic Journal entry card will need to display a transit energy rating for each historical entry, making the situation worse. Any future change to the scoring thresholds or label strings (e.g. renaming "Demanding" to "Challenging", adjusting the `score >= 3` threshold) must be applied in multiple files, with no compile-time guarantee they remain in sync.

The natural home for this function already exists: `src/engine/transits.ts` exports `TransitAspect` (the function's only dependency) and contains all transit-related computation. Adding `computeEnergyRating` there follows the same boundary that the engine already enforces — transit logic lives in the engine, not in component files.

## Desired State

A single exported `computeEnergyRating` function and `EnergyRating` interface live in `src/engine/transits.ts`, alongside the `TransitAspect` type they depend on. Both `DailySnapshotCard.tsx` and `TodayPage.tsx` import from the engine rather than defining their own copies. The upcoming Cosmic Journal entry card imports from the same source with no duplication. If a future developer changes the scoring logic or label text, they change it in one place and every consumer reflects it immediately. The engine module remains the authoritative home for all transit-related computation, consistent with how `calculateTransitAspects`, `getTopActiveTransits`, and `calculateCurrentPositions` are already organized.

## Implementation Plan

**Step 1 — Add to engine (`src/engine/transits.ts`)**

Export `EnergyRating` interface and `computeEnergyRating` function from `src/engine/transits.ts`. The best insertion point is immediately after the `TransitAspect` interface (around line 25), before the internal `SignIngress` type — keeping the exported surface types grouped together. The function itself can be placed near `getTopActiveTransits` (line 392) since both are high-level helpers that operate on `TransitAspect[]` arrays.

**Step 2 — Update `DailySnapshotCard.tsx`**

- Remove local `EnergyRating` interface (lines 22–27)
- Remove local `computeEnergyRating` function (lines 29–42)
- Add `EnergyRating` and `computeEnergyRating` to the existing import from `../../engine/transits` (line 4 currently imports `calculateCurrentPositions`, `calculateTransitAspects`; line 5 imports `type TransitAspect`)

**Step 3 — Update `TodayPage.tsx`**

- Remove local `EnergyRating` interface (lines 42–47)
- Remove local `computeEnergyRating` function (lines 49–62)
- Add `EnergyRating` and `computeEnergyRating` to the existing import from `../../engine/transits` (line 5 currently imports `calculateCurrentPositions`, `calculateTransitAspects`, `getTopActiveTransits`; line 6 imports `type TransitAspect`)

## Dependencies

None. `TransitAspect` is already defined and exported from `src/engine/transits.ts`. No new dependencies are introduced. Existing callers are unaffected by call signature — the function signature `(aspects: TransitAspect[]): EnergyRating` is unchanged.

## Acceptance Criteria

- [ ] `src/engine/transits.ts` exports `EnergyRating` interface and `computeEnergyRating` function
- [ ] `DailySnapshotCard.tsx` has no local `EnergyRating` interface or `computeEnergyRating` function
- [ ] `TodayPage.tsx` has no local `EnergyRating` interface or `computeEnergyRating` function
- [ ] Both components import `computeEnergyRating` and `EnergyRating` from `../../engine/transits`
- [ ] TypeScript compiles with zero errors after the change
- [ ] No user-facing behavior changes — the energy rating displayed in DailySnapshotCard and TodayPage is identical before and after
- [ ] No other files modified beyond the three listed above
