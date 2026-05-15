# Proposal: code-asteroid-interpretation-wire-up

**Type:** Code Enhancement
**Originated by:** Carmack, Taleb (critical), Jobs, Miyazaki (enabler)
**Status:** Active

---

## Problem / Opportunity

Sprint-0014 added a complete set of asteroid interpretation data — 60 sign entries (5 asteroids × 12 signs) in `PLANET_IN_SIGN`, 60 house entries (5 asteroids × 12 houses) in `PLANET_IN_HOUSE`, and 5 natal retrograde entries (Chiron, Ceres, Pallas, Juno, Vesta) in `NATAL_RETROGRADE`. All of this data is keyed using the same `"{Body}_{Sign}"` / `"{Body}_H{N}"` convention used for classical planets. None of it is currently reachable at runtime because two independent layers of guards block it.

### Layer 1 — Narrow type signatures on the lookup helpers

**File:** `src/data/interpretations/index.ts`, lines 19–25

```ts
export function getPlanetInSignInterpretation(planet: PlanetName | 'NorthNode', sign: ZodiacSign): InterpretationEntry | null {
  return PLANET_IN_SIGN[`${planet}_${sign}`] ?? null
}

export function getPlanetInHouseInterpretation(planet: PlanetName | 'NorthNode', house: number): InterpretationEntry | null {
  return PLANET_IN_HOUSE[`${planet}_H${house}`] ?? null
}
```

Both functions accept `PlanetName | 'NorthNode'`, which excludes `AsteroidName`. The union `BodyName` (defined in `src/engine/types.ts`, line 42 as `PlanetName | 'NorthNode' | AsteroidName`) already covers all bodies in the chart. Because the parameter type is narrower than `BodyName`, any call site that passes an asteroid name requires a type cast that TypeScript cannot verify — or, as is the case in `assembleReading()` and `PlanetTooltip`, the caller simply bypasses the call entirely with a `!isAsteroid()` guard.

### Layer 2 — Explicit `isAsteroid()` guards in `assembleReading()`

**File:** `src/data/interpretations/index.ts`, lines 136–142

```ts
export function assembleReading(chart: ChartData, aspects: Aspect[], focusArea?: FocusArea): FullReading {
  const planetReadings: PlanetReading[] = chart.planets.map((p) => ({
    planet: p,
    signInterpretation: !isAsteroid(p.name as BodyName) ? getPlanetInSignInterpretation(p.name as PlanetName | 'NorthNode', p.sign) : null,
    houseInterpretation: (chart.unknownTime || isAsteroid(p.name as BodyName)) ? null : getPlanetInHouseInterpretation(p.name as PlanetName | 'NorthNode', p.house),
    dignity: (!isAsteroid(p.name as BodyName) && p.name !== 'NorthNode') ? getDignity(p.name as PlanetName, p.sign) : null,
    retrogradeInterpretation: (p.retrograde && !isAsteroid(p.name as BodyName) && p.name !== 'NorthNode') ? (NATAL_RETROGRADE[p.name] ?? null) : null,
  }))
```

Three of the four `PlanetReading` fields are unconditionally `null` for any asteroid:

- **`signInterpretation`** — the `!isAsteroid()` guard short-circuits to `null` before calling `getPlanetInSignInterpretation`, so the 60 asteroid sign entries in `PLANET_IN_SIGN` are never fetched.
- **`houseInterpretation`** — the `isAsteroid()` condition is OR'd with `chart.unknownTime`, so house data is suppressed for asteroids even when birth time is known. The 60 asteroid house entries in `PLANET_IN_HOUSE` are never fetched.
- **`retrogradeInterpretation`** — the `!isAsteroid()` condition forces `null`, so the 5 asteroid retrograde entries added to `NATAL_RETROGRADE` (Chiron, Ceres, Pallas, Juno, Vesta) are never returned, even though the data structure already supports them.

The `dignity` field is correctly excluded for asteroids — `getDignity()` is a classical-planet concept and has no asteroid data; this guard is intentional and must be preserved.

### Layer 3 — Duplicate guards in `PlanetTooltip`

**File:** `src/components/chart/ChartWheel.tsx`, lines 70–74

```ts
const isAsteroidBody = isAsteroid(planet.name as BodyName)
const signInterp = !isAsteroidBody ? getPlanetInSignInterpretation(planet.name as PlanetName | 'NorthNode', planet.sign) : null
const houseInterp = !chartData.unknownTime && !isAsteroidBody ? getPlanetInHouseInterpretation(planet.name as PlanetName | 'NorthNode', planet.house) : null
const dignity = !isAsteroidBody && planet.name !== 'NorthNode' ? getDignity(planet.name as PlanetName, planet.sign) : null
const retroInterp = planet.retrograde && !isAsteroidBody && planet.name !== 'NorthNode' ? (NATAL_RETROGRADE[planet.name] ?? null) : null
```

The chart tooltip replicates the exact same three suppression guards independently of `assembleReading()`. The tooltip does not consume the `FullReading` pipeline — it calls the lookup helpers directly. This means fixing `assembleReading()` alone would not fix the tooltip; the tooltip's own `!isAsteroidBody` short-circuits must be removed separately.

Additionally, line 91 suppresses the retrograde badge rendering for asteroids:

```ts
{planet.retrograde && !isAsteroidBody && planet.name !== 'NorthNode' && (
  <span className="text-mystic-muted text-xs border border-mystic-muted/30 rounded px-1">Rx</span>
)}
```

With retrograde interpretation data now present for all five asteroids in `NATAL_RETROGRADE`, this conditional suppresses the Rx badge even when a retrograde interpretation would render below it.

---

## Desired State

After this change, asteroid interpretations flow through the same pipeline as classical planets, with no special-case asteroid guards at the data-fetching boundary. The code reflects one simple truth: the lookup tables are keyed by body name, and any body whose key exists in the table gets its interpretation.

### Lookup helpers accept `BodyName`

`getPlanetInSignInterpretation` and `getPlanetInHouseInterpretation` in `src/data/interpretations/index.ts` should accept `BodyName` as their first parameter instead of `PlanetName | 'NorthNode'`. Because `BodyName = PlanetName | 'NorthNode' | AsteroidName`, this is a pure widening — no call sites break. Both functions already work by string key lookup (`PLANET_IN_SIGN["{body}_{sign}"]`), so they naturally return `null` for any body that has no entry, making no runtime behavior change for bodies without data.

### `assembleReading()` removes three asteroid guards

In `src/data/interpretations/index.ts`, lines 138–141 should become:

```ts
signInterpretation: getPlanetInSignInterpretation(p.name as BodyName, p.sign),
houseInterpretation: chart.unknownTime ? null : getPlanetInHouseInterpretation(p.name as BodyName, p.house),
// dignity guard stays: getDignity() is classical-planets only
dignity: (!isAsteroid(p.name as BodyName) && p.name !== 'NorthNode') ? getDignity(p.name as PlanetName, p.sign) : null,
retrogradeInterpretation: (p.retrograde && p.name !== 'NorthNode') ? (NATAL_RETROGRADE[p.name] ?? null) : null,
```

The `isAsteroid()` import in `index.ts` remains in use for `analyzeElements()`, `analyzeModalities()`, pattern filtering, and the `dignity` guard — it is not removed.

### `PlanetTooltip` removes three duplicate asteroid guards

In `src/components/chart/ChartWheel.tsx`, lines 71–74 should become:

```ts
const signInterp = getPlanetInSignInterpretation(planet.name as BodyName, planet.sign)
const houseInterp = !chartData.unknownTime ? getPlanetInHouseInterpretation(planet.name as BodyName, planet.house) : null
const dignity = !isAsteroidBody && planet.name !== 'NorthNode' ? getDignity(planet.name as PlanetName, planet.sign) : null
const retroInterp = planet.retrograde && planet.name !== 'NorthNode' ? (NATAL_RETROGRADE[planet.name] ?? null) : null
```

The Rx badge condition on line 91 simplifies correspondingly:

```ts
{planet.retrograde && planet.name !== 'NorthNode' && (
  <span className="text-mystic-muted text-xs border border-mystic-muted/30 rounded px-1">Rx</span>
)}
```

The `isAsteroidBody` variable itself is kept — it continues to drive the header color (`text-amber-500` vs `text-mystic-gold`), the archetype badge, and the archetype prose paragraph, all of which are intentional asteroid-specific UI elements that should remain.

### Net result

The reading pipeline and the chart tooltip both become simpler: no body-class branching at the interpretation-fetch boundary, one fewer guard per field, and all 125 asteroid interpretation entries (60 sign + 60 house + 5 retrograde) become live. Classical-planet-only features (dignity, element/modality balance, pattern detection) retain their existing guards, which are semantically correct and are not touched by this change.

---

## Scope

| File | Change |
|---|---|
| `src/data/interpretations/index.ts` | Widen two function signatures; remove `isAsteroid()` guards on `signInterpretation`, `houseInterpretation`, and `retrogradeInterpretation` in `assembleReading()` |
| `src/components/chart/ChartWheel.tsx` | Remove `!isAsteroidBody` guards on `signInterp`, `houseInterp`, `retroInterp`; simplify Rx badge condition |

No data files, no new types, no new tests beyond verifying that asteroid bodies now receive non-null interpretation fields in the assembled reading.
