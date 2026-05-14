---
**Type:** Code Enhancement
**Originated by:** Taleb (primary), Carmack (supporting)
---

## Problem / Opportunity

Two engine-level interfaces discard natal house data that is already in scope at the moment each object is constructed. Every sprint-0010 feature that needs house-aware briefs must compensate by prop-drilling `chartData` through component trees or repeating the same cross-reference lookup independently — with no guarantee that each site handles the `unknownTime` edge case correctly.

**`TransitAspect` in `src/engine/transits.ts` (line 16–25):**

```typescript
export interface TransitAspect {
  transitPlanet: PlanetName | 'NorthNode'
  natalPlanet: PlanetName | 'NorthNode'   // name string only — no house, no sign
  type: AspectType
  orb: number
  exactAngle: number
  applying: boolean
  nature: 'harmonious' | 'challenging' | 'neutral'
  symbol: string
}
```

`natalPlanet` is a bare name string. `calculateTransitAspects` (line 120) receives `natalPlanets: PlanetPosition[]` and iterates `np` over them (line 131). At the point where each `TransitAspect` is pushed (line 145), `np.house` and `np.sign` are directly in scope and are silently dropped. Every downstream consumer — `TransitAspectsSection` in `TransitReadingPage.tsx`, the inline aspect table in `AdvanceTab.tsx`, and any future surface — must re-derive the natal house by searching `chartData.planets` for a matching name. `TransitAspectsSection` currently receives no `chartData` prop, so the lookup is not even possible without a prop-interface change in that component. The house data has to travel separately from the aspect object that needs it.

**`TimelineEvent` in `src/engine/transitTimeline.ts` (line 18–35):**

```typescript
export interface TimelineEvent {
  ...
  secondPlanet?: PlanetName | 'NorthNode'   // natal planet name — no house
  aspectType?: AspectType
  ...
}
```

`findAspectPerfections` (line 167) receives `natalPlanets: PlanetPosition[]` and iterates `np` over them (line 182). At line 192, when the event is constructed, `np.house` is in scope but not included in the pushed object. The call site in `TransitTimeline.tsx` (line 34) passes only the name to `getAspectPerfectionBrief`:

```typescript
detailText = getAspectPerfectionBrief(event.aspectType, event.secondPlanet)
```

`getAspectPerfectionBrief` in `src/data/interpretations/transitEvents.ts` (line 92) accepts `(aspectType, natalPlanet)` — no house parameter exists in its signature. Because the house is absent from `TimelineEvent`, the function cannot be made house-aware without either adding `chartData` as a prop to `TransitTimeline` (which currently receives only `{ days: TimelineDay[] }`) or embedding the house in the event at build time. Adding `chartData` as a prop pushes the lookup into render time and requires `unknownTime` handling in the component; embedding it at build time keeps the engine responsible for data completeness.

The `unknownTime` boundary is the silent correctness risk across both gaps. `PlanetPosition.house` is `0` (or meaningless) when the user has no recorded birth time, because the astronomy engine does not compute houses without a birth time. Any consumer that reads `.house` without checking `chartData.unknownTime` first will either look up `PLANET_IN_HOUSE['Moon_H0']` (returns `undefined`) or produce `"House 0 Moon"` in rendered text. The current codebase handles this inconsistently — `IndividualChartSection` in `SynastryPage.tsx` gates the house column on `!chartData.unknownTime`, but no central utility enforces this contract. Each new consumer writes its own guard.

## Desired State

Both interfaces carry natal house and sign embedded at construction time, with explicit null typing for the `unknownTime` case.

**`TransitAspect` after the change:**

```typescript
export interface TransitAspect {
  transitPlanet: PlanetName | 'NorthNode'
  natalPlanet: PlanetName | 'NorthNode'
  natalHouse: number | null   // null when chartData.unknownTime is true
  natalSign: string
  type: AspectType
  orb: number
  exactAngle: number
  applying: boolean
  nature: 'harmonious' | 'challenging' | 'neutral'
  symbol: string
}
```

`calculateTransitAspects` receives `unknownTime: boolean` (already available on `ChartData` at every call site) and assigns `natalHouse: unknownTime ? null : np.house` and `natalSign: np.sign` when constructing each aspect. Consumers receive the context they need without performing any additional lookup. `TransitAspectsSection` does not need a new `chartData` prop; the `AdvanceTab` inline aspect table does not need a separate lookup path. `natalHouse: number | null` is the contract that enforces the `unknownTime` guard at the type level — a consumer that tries to use `natalHouse` without null-checking will fail TypeScript, not silently produce wrong text.

**`TimelineEvent` after the change:**

```typescript
export interface TimelineEvent {
  ...
  secondPlanet?: PlanetName | 'NorthNode'
  natalHouse?: number | null   // null when unknownTime; absent for non-aspect events
  natalSign?: string
  ...
}
```

`findAspectPerfections` populates `natalHouse: unknownTime ? null : np.house` and `natalSign: np.sign` in the event constructor. `getAspectPerfectionBrief` (or a successor `getPersonalizedEventBrief`) accepts `natalHouse: number | null` and branches into house-specific language when non-null, falling back to the current generic text when null. `TransitTimeline.tsx` passes `event.natalHouse` to the lookup call without receiving `chartData` as a new prop — the house data is already in the event.

With both changes in place, `TransitAspectsSection`, `TransitTimeline`, and `AdvanceTab` all have correct natal house data in the objects they already receive. The prop-drilling chain from `TransitReadingPage` down to each rendering leaf for the sole purpose of resolving a natal planet's house is eliminated. The `unknownTime` guard is expressed once, at the engine level where the data originates, rather than duplicated in each new consumer surface.
