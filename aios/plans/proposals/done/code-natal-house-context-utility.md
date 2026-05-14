---
**Type:** Code Enhancement
**Originated by:** Taleb (primary), Carmack (supporting)
---

## Problem / Opportunity

Every sprint-0010 feature that surfaces natal house context — transit aspect inline briefs, timeline event briefs, advance tab power-day banners, journal sky strips — must independently resolve a natal planet name to its house number by searching `chartData.planets`. No shared utility exists for this. The lookup appears four different ways across the current codebase, and the critical correctness guard — that `planet.house` is only meaningful when `chartData.unknownTime` is `false` — is applied inconsistently.

**The inconsistency is documented in existing code:**

- `src/data/interpretations/index.ts` line 132 — `assembleReading` correctly gates the house lookup: `chart.unknownTime ? null : getPlanetInHouseInterpretation(p.name, p.house)`.
- `src/components/chart/ChartWheel.tsx` line 70 — `PlanetTooltip` correctly guards: `!chartData.unknownTime ? getPlanetInHouseInterpretation(planet.name, planet.house) : null`.
- `src/components/chart/ChartWheel.tsx` line 742 — the transit aspect line renderer looks up `chartData.planets.find(p => p.name === ta.natalPlanet)` and uses `np.longitude` for drawing, but **does not check `unknownTime`** before accessing `np.house` implicitly downstream.
- `src/engine/transits.ts` lines 145–154 — `calculateTransitAspects` constructs `TransitAspect` objects at lines 145–154 with `natalPlanet: np.name` only — no `natalHouse`, no `natalSign`. The natal planet's house is available at this call site (`np.house` is on the `PlanetPosition` type, `src/engine/types.ts` line 42) but is discarded. Every consumer that subsequently wants the natal house must perform a secondary `chartData.planets.find` — re-resolving information the engine already had.
- `src/engine/synastry.ts` lines 457, 468 — the synastry prompt builder guards house inclusion inline with `!chart1.unknownTime ? \` (House ${p.house})\` : ''`, duplicating the pattern locally rather than calling a shared function.
- `src/components/discuss/DiscussModal.tsx` lines 179, 184 — same inline guard pattern, again duplicated.

**The `TransitAspect` type (`src/engine/transits.ts` lines 16–25) carries no natal house or natal sign:**

```typescript
export interface TransitAspect {
  transitPlanet: PlanetName | 'NorthNode'
  natalPlanet: PlanetName | 'NorthNode'   // name string only
  type: AspectType
  orb: number
  exactAngle: number
  applying: boolean
  nature: 'harmonious' | 'challenging' | 'neutral'
  symbol: string
  // no natalHouse, no natalSign
}
```

The natal house must be cross-referenced at every render site by finding the matching entry in `chartData.planets`. Sprint-0010 targets six new surfaces that all need this lookup. None of them currently receive `chartData` as a prop — `TransitAspectsSection` receives `transitData` only; `TransitTimeline` receives `{ days: TimelineDay[] }` only.

**The silent failure mode when the guard is missing:** `chartData.planets[i].house` is initialized to `0` in the astronomy engine for charts with `unknownTime: true` (houses are not computed without a birth time — `src/engine/astronomy.ts` line 327). A lookup of `PLANET_IN_HOUSE['Moon_H0']` returns `undefined`; `getPlanetInHouseInterpretation('Moon', 0)` returns `null`. Implementers who forget the guard either crash on null dereference or silently produce empty briefs. Those who skip the null check and pass `house: 0` directly to a string template produce visible nonsense ("House 0 Moon"). Neither failure is loud enough to be caught in code review.

**The root cause is structural:** there is no function that encapsulates the complete, correct operation — "given a planet name and a ChartData, return the natal house (null if time unknown) and the natal sign." Today this logic is written inline, differently, every time it is needed.

## Desired State

A single exported helper, `getNatalPlanetContext(planet: PlanetName | 'NorthNode', chartData: ChartData): { house: number | null; sign: string }`, lives in `src/data/interpretations/` alongside the lookup functions it gates. It encodes exactly one decision: return `house: null` when `chartData.unknownTime` is true, and the planet's actual house number otherwise. The `sign` field is always available regardless of birth time, so it is never null.

Every location in the codebase that needs natal house context — existing and new — calls this function instead of inlining the lookup. The `unknownTime` guard is tested once, in one place. Sprint-0010 implementers do not need to know the guard exists; the return type enforces it. A caller receiving `house: null` cannot pass it to `getPlanetInHouseInterpretation` without an explicit null check, which is the correct behavior: fall back to sign-only language rather than render a house-0 brief or crash.

This makes the correctness contract legible at the call site. "House 0 Moon" becomes structurally impossible when the return type is `number | null` and every downstream consumer handles the null case as a sign-only fallback. The sprint's six new surfaces are correct by default rather than correct only when each implementer independently remembers a guard that existing code already applies inconsistently.
