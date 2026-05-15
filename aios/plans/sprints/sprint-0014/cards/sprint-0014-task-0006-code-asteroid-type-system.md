**Type:** Code Enhancement
**Originated by:** Jobs, Carmack, Taleb, Miyazaki

## Problem / Opportunity

The current type system in `src/engine/types.ts` was designed for ten classical planets and the North Node. Every interface that carries a celestial body name is typed `PlanetName | 'NorthNode'`, where `PlanetName` is a closed union of ten strings (lines 15–17). This design worked because the body list was fixed. Asteroid integration breaks it in two distinct ways.

**The semantic breakage.** `PlanetName` drives `BODY_MAP` in four separate files — `src/engine/astronomy.ts` (line 13), `src/engine/transits.ts` (line 47), `src/engine/transitTimeline.ts` (line 48), and `server/engine/astroCore.ts` (line 25). Each `BODY_MAP` is typed `Record<PlanetName, Astronomy.Body>`, mapping planet names to `astronomy-engine` body enums. The `astronomy-engine` library has no enum values for Chiron, Ceres, Pallas, Juno, or Vesta — those bodies use a completely different calculation path through `astronomia`'s `elliptic.Elements`. If asteroid names were added directly to `PlanetName`, TypeScript would require `BODY_MAP` to have entries for them, which cannot be satisfied. The planets and asteroids are not the same kind of thing computationally. The type system must reflect that.

**The propagation problem.** The literal string `'NorthNode'` was added as a one-off exception alongside `PlanetName` when the North Node was introduced. The same exception is now scattered across the entire engine and component layer:

- `src/engine/types.ts` line 24: `PLANET_GLYPHS: Record<PlanetName | 'NorthNode', string>` — the glyph registry
- `src/engine/types.ts` line 39: `PlanetPosition.name: PlanetName | 'NorthNode'` — the core position interface
- `src/engine/aspects.ts` lines 32–33: `Aspect.planet1` and `Aspect.planet2`
- `src/engine/aspects.ts` line 47: `AspectPattern.planets`
- `src/engine/aspects.ts` lines 189, 195, 199: three internal function signatures — `findSharedPlanet`, `getOtherPlanet`, `hasPair`
- `src/engine/transits.ts` lines 18–19: `TransitAspect.transitPlanet` and `TransitAspect.natalPlanet`
- `src/engine/transitTimeline.ts` lines 23–24: `TimelineEvent.planet` and `TimelineEvent.secondPlanet`
- `src/engine/transitTimeline.ts` line 74: `getLongitudeForName` signature
- `src/engine/transitTimeline.ts` line 102: `computeTransitAspects` inner function signature
- `src/engine/transitTimeline.ts` line 182: `const transitNames: (PlanetName | 'NorthNode')[]`
- `src/engine/synastry.ts` lines 11–12: `SynastryAspect.person1Planet` and `SynastryAspect.person2Planet`
- `src/engine/synastry.ts` line 22: `HouseOverlayEntry.planet`
- `src/components/reading/AspectRow.tsx` lines 9–10: the component's prop types

Adding a third exception — `AsteroidName` — to every one of these sites individually would expand the union to `PlanetName | 'NorthNode' | AsteroidName`, which is unwieldy and means any future body addition requires another search-and-replace across the entire codebase. More critically, components throughout the chart layer already paper over this weakness with unsafe casts: `PLANET_GLYPHS[planet.name as PlanetName] ?? '☊'` appears at `ChartWheel.tsx` lines 141, 202, 236, 254, and in `SolarReturnBiWheel.tsx` lines 196, 225, 277, `AspectRow.tsx` lines 65–66, `ReadingDisplay.tsx` lines 155–156, 286, 338, 417, and several `SynastryPage.tsx` and result page locations. The `as PlanetName` casts suppress type errors at each site — they do not provide type safety. When an asteroid name flows into any of these expressions before `PLANET_GLYPHS` is extended, the fallback `'☊'` (the North Node glyph) renders silently, misidentifying the body astrologically.

A parallel problem: `ChartWheel.tsx` line 71 guards dignity lookup with `planet.name !== 'NorthNode' ? getDignity(planet.name as PlanetName, planet.sign) : null`. This guard will not exclude asteroid names from the cast to `PlanetName`. It needs to be `isAsteroid(planet.name)` instead, using a helper that can be updated in one place as the type system evolves.

This type system work must be completed before any asteroid calculation or rendering code is written. The TypeScript compiler is the best tool for finding all missed update sites — but only if the types are changed first, causing errors at every unguarded cast or incomplete record. If runtime code lands before types are tightened, the compiler silently accepts wrong casts and the missed sites only surface as rendering bugs or wrong positions in production.

## Desired State

`src/engine/types.ts` defines two new exported types:

```typescript
export type AsteroidName = 'Chiron' | 'Ceres' | 'Pallas' | 'Juno' | 'Vesta'
export type BodyName = PlanetName | 'NorthNode' | AsteroidName
```

`AsteroidName` is a closed union of exactly the five sprint targets. `BodyName` is the single type that any code path handling an arbitrary celestial body should use — it replaces every occurrence of `PlanetName | 'NorthNode'` in interface declarations and function signatures. The existing `PlanetName` type is unchanged and remains the correct type for any code that specifically handles the ten bodies supported by `astronomy-engine`.

`src/engine/types.ts` defines a new exported constant:

```typescript
export const ASTEROID_NAMES: AsteroidName[] = ['Chiron', 'Ceres', 'Pallas', 'Juno', 'Vesta']
```

`PLANET_NAMES` remains as-is — the ten classical planets only — because it drives `BODY_MAP` loops in the `astronomy-engine` calculation path. The asteroid calculation path will iterate `ASTEROID_NAMES` separately. These two arrays must never be merged.

`src/engine/types.ts` defines a new exported constant:

```typescript
export const ASTEROID_GLYPHS: Record<AsteroidName, string> = {
  Chiron: '⚷',
  Ceres: '⚳',
  Pallas: '⚴',
  Juno: '⚵',
  Vesta: '⚶',
}
```

`PLANET_GLYPHS` retains its current signature `Record<PlanetName | 'NorthNode', string>` — or is re-typed to `Record<BodyName, string>` if the asteroid glyphs are merged into it, but the cleaner design keeps them in a separate record so that glyph lookups for planets and asteroids can be resolved through the same interface without requiring `PLANET_GLYPHS` to know about a calculation path it does not drive. Any glyph-lookup call site should resolve via `ASTEROID_GLYPHS[name] ?? PLANET_GLYPHS[name]` or a utility function that handles both maps, eliminating the `as PlanetName` casts and the misleading `?? '☊'` fallback.

`src/engine/types.ts` defines a new exported helper:

```typescript
export function isAsteroid(name: BodyName): name is AsteroidName {
  return (ASTEROID_NAMES as readonly string[]).includes(name)
}
```

This function replaces all ad-hoc `planet.name !== 'NorthNode'` guards that were written to mean "this is a planet, not a special body." After type system completion, code that needs to branch between classical planets and asteroids — the dignity lookup in `ChartWheel.tsx`, the element analysis filter in `assembleReading()`, the `BODY_MAP` iteration guards — uses `isAsteroid()` rather than string comparisons against a hardcoded list of exceptions.

The following interfaces are updated from `PlanetName | 'NorthNode'` to `BodyName`:

- `PlanetPosition.name` in `src/engine/types.ts`
- `Aspect.planet1` and `Aspect.planet2` in `src/engine/aspects.ts`
- `AspectPattern.planets` in `src/engine/aspects.ts`
- The signatures of `findSharedPlanet`, `getOtherPlanet`, and `hasPair` in `src/engine/aspects.ts`
- `TransitAspect.transitPlanet` and `TransitAspect.natalPlanet` in `src/engine/transits.ts`
- `TimelineEvent.planet` and `TimelineEvent.secondPlanet` in `src/engine/transitTimeline.ts`
- The `getLongitudeForName` function signature and the `transitNames` array in `src/engine/transitTimeline.ts`
- `SynastryAspect.person1Planet` and `SynastryAspect.person2Planet` in `src/engine/synastry.ts`
- `HouseOverlayEntry.planet` in `src/engine/synastry.ts`
- `transitPlanet` and `natalPlanet` props in `src/components/reading/AspectRow.tsx`

The intended outcome of completing these changes before any asteroid runtime code is written: the TypeScript compiler surfaces every `as PlanetName` cast that now requires re-examination, every `Record<PlanetName, ...>` that cannot accept an asteroid key, and every component that performs a glyph lookup without a fallback. The compiler is the exhaustive finder of missed sites. Running it against a codebase where `BodyName` replaces `PlanetName | 'NorthNode'` everywhere it should, with asteroid names now valid members of `BodyName`, reveals the complete list of sites that need updating before a single asteroid position can be rendered.

`PLANET_GLYPHS` should additionally include an `ASTEROID_ARCHETYPES` companion map (one archetype label per asteroid) noted in the Miyazaki voice as appropriate for tooltip rendering — `{ Chiron: 'Wounded Healer', Ceres: 'Nourisher', Pallas: 'Strategist', Juno: 'Devoted Partner', Vesta: 'Sacred Flame' }`. This belongs in `src/engine/types.ts` alongside the other body constants, not in a component file, so it can be imported wherever the archetype label is needed without creating coupling between `ChartWheel` and tooltip rendering.
