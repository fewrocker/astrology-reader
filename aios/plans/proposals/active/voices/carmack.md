# John Carmack — Sprint 0014 Voice

Files read: `src/engine/astronomy.ts`, `src/engine/types.ts`, `src/engine/aspects.ts`, `src/engine/transits.ts`, `src/engine/transitTimeline.ts`, `src/engine/synastry.ts`, `server/engine/astroCore.ts`, `src/components/chart/ChartWheel.tsx`, `src/data/interpretations/planetInSign.ts`, `src/data/interpretations/retrogrades.ts`, `src/data/interpretations/dignities.ts`, `src/data/interpretations/index.ts`, `src/data/interpretations/transitAspectBriefs.ts`, `src/data/interpretations/natalPlanetContext.ts`, `node_modules/astronomia/lib/elliptic.cjs`, `package.json`.

---

## Executive Summary

The asteroid integration task is well-scoped and technically feasible. The vision document is unusually precise — it identifies the right library (`astronomia`), the right class (`elliptic.Elements`), and the right data source (JPL Horizons). That's the good news. The bad news is that the current codebase has a structural flaw that will make this sprint messier than it needs to be: the type system and engine are tightly coupled through hardcoded `BODY_MAP` records that appear in four separate files, none of which are aware of each other. Adding asteroids means touching all four, and there's no central registry to update. You'll also discover that `astronomia` is a devDependency, which means it won't be available in the server build without correction — a silent runtime failure waiting to happen.

---

## Technical Approach Assessment: Asteroid Calculation

### The `elliptic.Elements` API and what it actually does

The vision correctly identifies `astronomia`'s `elliptic.Elements.position(jde, earth)` as the calculation path. I've read the source at `node_modules/astronomia/lib/elliptic.cjs`. Here's what happens at runtime:

1. It solves Kepler's equation iteratively (up to 15 iterations via `kepler2b`) to get eccentric anomaly E from mean anomaly M.
2. It computes the true anomaly ν from E, then the heliocentric distance r.
3. It projects into 3D heliocentric equatorial J2000 coordinates using the orbital elements (inclination, node, argument of perihelion).
4. It calls `astrometricJ2000`, which fetches Earth's heliocentric position from `solarxyz.positionJ2000(earth, jde)`, applies light-travel-time correction (one extra solve), and returns geocentric equatorial coordinates.

**Critical issue the vision glosses over:** the return type is a `base.Coord` object with `.ra` and `.dec` in radians — not ecliptic longitude. The existing `getPlanetLongitude` functions throughout the codebase all return ecliptic degrees (0–360). You need to convert RA/Dec → ecliptic longitude using the obliquity of the ecliptic. The formula is:

```
λ = atan2(sin(α)·cos(ε) + tan(δ)·sin(ε), cos(α))
```

where ε is the mean obliquity at the observation date (available from `Astronomy.e_tilt(time).mobl` in astronomy-engine, already used for house calculation). Failing to do this will place every asteroid at the wrong longitude by an amount that varies from 0° to ~23° depending on position. This is not a rounding error — it's a completely wrong answer. Add a `raDecToEclipticLon(ra: number, dec: number, obliquityRad: number): number` utility to `src/engine/astronomy.ts` and verify it against a known asteroid position before writing any interpretation text.

### The `earth` argument problem

`elliptic.Elements.position(jde, earth)` requires a VSOP87 `V87Planet` object for Earth — it needs the VSOP87 series data loaded. Looking at `node_modules/astronomia/data/`, we have `vsop87Bearth.js`. The import looks like:

```typescript
import { data, planetposition } from 'astronomia'
const earth = new planetposition.Planet(data.vsop87Bearth)
```

This import from a CJS package in an ES module project (`"type": "module"` in `package.json`) requires Vite to handle CJS interop. Vite handles this for client-side bundles, but the server is compiled separately with `tsx`/`tsconfig.server.json`. Verify the import path works in both build contexts before committing to this API. If the server import fails at runtime you'll get a silent `undefined` for `earth` and incorrect positions with no error message.

### Accuracy assessment

For Ceres, Pallas, Juno, and Vesta (main-belt asteroids, semi-major axes 2.1–3.4 AU, eccentricities 0.07–0.23), fixed-epoch Keplerian elements from JPL with no perturbation corrections give roughly 0.1–0.5° accuracy over a decade, degrading to ~1–2° over a century. The vision's claim of "~1 arcminute accuracy" is optimistic for hardcoded elements — that precision requires full numerical integration. However, 0.1–0.5° is **astrologically sufficient**: a 1° error doesn't change the sign or house in most cases, and aspect orb calculations stay valid.

**Chiron is the exception.** Chiron (2060) is a centaur object with a highly eccentric orbit (e=0.379) in a chaotic dynamical environment — it has multiple close encounters with Saturn over its ~50-year orbital period. Pure Keplerian propagation from fixed J2000 elements degrades faster for Chiron than for main-belt asteroids. Expect 0.5–3° errors depending on date. The vision acknowledges "periodic perturbation corrections for Chiron" but doesn't specify what those corrections are. The practical solution: use JPL Horizons' current best-fit elements from an epoch as close to the present date as possible (not J2000), which automatically incorporates integrated perturbations up to that epoch. This reduces Chiron error from ~3° to ~0.5° for dates within ±20 years of the element epoch. Document the epoch date as a comment in the code and plan to update it every 10 years.

### Retrograde detection for asteroids

The current retrograde check in `astronomy.ts` (lines 47–61) compares geocentric longitudes 1 day apart and handles 360° wraparound. This algorithm works correctly for asteroid retrograde detection without modification. Chiron's retrograde period is ~5 months per year; main-belt asteroids retrograde for ~2–4 months. The 1-day delta catches all of them cleanly.

---

## Architecture Concerns

### BODY_MAP duplication — four files, zero coordination

There are **four** separate `BODY_MAP` declarations in the codebase:

- `src/engine/astronomy.ts` (line 13)
- `src/engine/transits.ts` (line 47)
- `src/engine/transitTimeline.ts` (line 48)
- `server/engine/astroCore.ts` (line 25)

All four are `Record<PlanetName, Astronomy.Body>` and are manually kept in sync. When you add asteroids, you need a parallel `ASTEROID_ORBITAL_ELEMENTS` map in each location — or you can fix the architecture first. The better design: create `src/engine/bodies.ts` that exports:

```typescript
export const PLANET_BODY_MAP: Record<PlanetName, Astronomy.Body> = { ... }
export const ASTEROID_ORBITAL_ELEMENTS: Record<AsteroidName, KeplerianElements> = { ... }
export function getAsteroidGeocentricLongitude(name: AsteroidName, time: AstroTime): number
```

All four current `BODY_MAP` declarations get replaced with a single import. This is the right time to do this consolidation because you're adding a second map type regardless.

### The `astronomia` devDependency problem

`astronomia` is listed as a `devDependency` in `package.json` (line 42). The client-side Vite build bundles devDependencies correctly. But `server/engine/astroCore.ts` is compiled separately and runs in Node.js where it resolves `require('astronomia')` from `node_modules` at runtime. If `astronomia` is in `devDependencies` and the production deployment strips devDependencies (standard `npm install --production`), the server silently fails to calculate asteroids. Move `astronomia` to `dependencies`.

### Type union inflation — fix it before writing code

Every interface that references a body uses `PlanetName | 'NorthNode'`. For 16 bodies this becomes `PlanetName | 'NorthNode' | AsteroidName` — unwieldy and prone to missed update sites. Define a single `BodyName` type:

```typescript
export type AsteroidName = 'Chiron' | 'Ceres' | 'Pallas' | 'Juno' | 'Vesta'
export type BodyName = PlanetName | 'NorthNode' | AsteroidName
```

Then update: `PlanetPosition.name`, `Aspect.planet1`, `Aspect.planet2`, `TransitAspect.transitPlanet`, `TransitAspect.natalPlanet`, `SynastryAspect.person1Planet`, `SynastryAspect.person2Planet`, `HouseOverlayEntry.planet`, `TimelineEvent.planet`, `TimelineEvent.secondPlanet` — all of these currently typed `PlanetName | 'NorthNode'` — become `BodyName`. This is a find-replace, not a re-architecture. Do it first so the compiler catches any missed call sites when you add the asteroid names.

Critically: do **not** add asteroids to `PLANET_NAMES`. That constant drives the `BODY_MAP` lookup loops in `calculateCurrentPositions`, `detectIngresses`, `getRetrogradeStatus`, `findStations`, and `calculateCompositeChart`. Asteroids use a different calculation path. Keep `PLANET_NAMES` as the astronomy-engine bodies; add a separate `ASTEROID_NAMES: AsteroidName[]` constant for the Keplerian bodies.

### Duplicated utility functions — four copies each

These functions are copied verbatim (or near-verbatim) across the codebase:

- `getMeanNodeLongitude`: `astronomy.ts:66`, `transits.ts:67`, `transitTimeline.ts:68`, `astroCore.ts:140`
- `getPlanetLongitude`: `astronomy.ts:31`, `transits.ts:60`, `transitTimeline.ts:61`, `astroCore.ts:134`
- `getHouseForLongitude`: `astronomy.ts:230` (exported), `synastry.ts:113` (private), `astroCore.ts:161`
- `getDailyMotion`: `transits.ts:73`, `transitTimeline.ts:79`, `astroCore.ts:151`

This is four separate bug surfaces for the same four algorithms. The asteroid calculation will be a fifth consumer of some of these. Consolidate into a shared utility module before the asteroid code is written. `src/engine/ephemeris.ts` is a reasonable name — not `utils.ts` (too vague). The server version in `astroCore.ts` can import from the same place if it's pure TypeScript math with no browser-specific deps.

---

## Aspects Engine: What Breaks and What Doesn't

### `calculateAspects` in `aspects.ts` — no structural changes needed, but orbs need a config layer

The function at line 62 iterates all planets and cross-joins them. When asteroids are in `chartData.planets`, they participate automatically. The vision is correct that no structural change is needed. However, `ASPECT_DEFINITIONS` has global orb values applied to all pairs. The vision calls for tighter orbs for asteroid-to-asteroid aspects (≤3° major). The cleanest implementation: calculate everything with existing orbs, then post-filter asteroid-to-asteroid aspects with a tighter threshold:

```typescript
export function filterAsteroidAspects(aspects: Aspect[], maxAsteroidOrb = 3): Aspect[] {
  return aspects.filter(a => {
    const bothAsteroids = ASTEROID_NAMES.includes(a.planet1 as AsteroidName) &&
                          ASTEROID_NAMES.includes(a.planet2 as AsteroidName)
    return !bothAsteroids || a.orb <= maxAsteroidOrb
  })
}
```

Call this at the display/GPT assembly layer, not inside `calculateAspects` itself — keep the engine function pure.

### The applying/separating heuristic in `calculateAspects` is wrong

Line 76 in `aspects.ts`:
```typescript
const applying = orb < def.orb * 0.5
```

This says "tight aspects are applying." That's not how applying/separating works. A planet is applying when it is moving toward exact aspect, regardless of current orb. The correct test requires a future-moment comparison — the same logic used correctly in `isRetrograde()`. For natal charts the field is displayed in the tooltip but carries no physical meaning when computed this way. Either implement it properly (delta longitude comparison, similar to `isRetrograde`) or stop emitting it in the natal aspect objects. The transit code in `transits.ts` lines 145–149 does it correctly using `dailyMotion` and direction. The natal code should be consistent.

### `detectPatterns` — asteroid contamination and an existing bug

**Asteroid contamination:** filter asteroid aspects before calling `detectPatterns`. One line at the call site — no changes to the function itself. This is the sprint-scope decision.

**Existing Grand Cross bug (line 155 in `aspects.ts`):**
```typescript
const hasAllSquares = hasPair(squares[0]!, opp1.planet1, opp2.planet1) || (
  squares.filter(s => ...).length >= 4
)
```

`squares[0]!` with the `!` non-null assertion will be `undefined` if `squares.length === 0`, and the `||` short-circuit means the second condition is evaluated only sometimes. The second condition itself is wrong: it counts any square involving any of the 4 planets but doesn't verify the specific cross topology (that all 4 adjacent pairs are squared). This can produce false positive Grand Cross detections. Not a sprint-0014 blocker, but worth fixing since you'll be touching this file.

---

## Rendering Concerns

### ChartWheel planet collision — existing problem made much worse

`ChartWheel.tsx` places all natal planets at `PLANET_R = INNER_R + 35 = 263` (line 24). Planet glyph circles have radius 13px (line 693). At 700px SVG size, the PLANET_R circumference is ~1650px. 16 bodies at the same radius averages ~103px spacing — fine in aggregate, but stelliums (multiple planets within 15°) will stack glyphs completely at ~38px total spacing for 3 conjunct bodies.

The vision's approach (second ring for asteroids) is correct. Put asteroids at an inner ring: `ASTEROID_R = PLANET_R - 22 = 241`. This creates a clear visual hierarchy without conflicting with the transit ring at 288. The transit overlap nudge at lines 783–789 offsets by +12px when within 8° of a natal planet; a symmetric asteroid collision nudge at ±8px will handle crowded natal-asteroid conjunctions.

The existing transit planet rendering (lines 780–860) is a template for asteroid rendering. Copy the pattern with: smaller glyph circle (10px vs 11px for transit vs 13px for natal), amber color (`#c4a472`, distinct from natal gold `#c9a84c` and transit teal `#5ec4c4`), no "T" superscript, an "A" superscript instead to mark as asteroid.

### The `?? '☊'` fallback is silent corruption

In `ChartWheel.tsx` at lines 141, 202, 236, 254:
```typescript
PLANET_GLYPHS[name as PlanetName] ?? '☊'
```

When `name` is an asteroid not yet in `PLANET_GLYPHS`, this silently renders the North Node glyph. Add asteroid entries to `PLANET_GLYPHS` (or replace the record with a `BodyName`-keyed version), and replace this pattern with a function that throws in development mode when a glyph is missing.

### `PlanetTooltip` will render "House 0" for planets with house assignment deferred

In `PlanetTooltip` at line 93:
```typescript
{planet.degree}°{planet.minute}' {ZODIAC_GLYPHS[planet.sign]} {planet.sign} — House {planet.house}
```

There's no guard on `planet.house > 0`. Asteroids computed before house assignment (house initialized to 0 in `calculateChart`) will show "House 0" in the tooltip. This same bug exists for planets during the brief window before `getHouseForLongitude` runs — it's not new, but the asteroid addition makes it more likely to be seen. Guard: `{planet.house > 0 ? ` — House ${planet.house}` : ''}`.

---

## Performance Considerations

Aspect calculation is O(n²): 11 bodies → 55 pairs; 16 bodies → 120 pairs. Each pair checks 7 aspect definitions. 840 comparisons vs 385. This runs in microseconds. Not a concern.

Orbital element calculation: `elliptic.Elements.position()` calls `kepler2b` (up to 15 iterations) plus one light-travel-time correction. For 5 asteroids: 10 kepler solves. Each solve is ~15 iterations of simple arithmetic. Total additional cost per chart: negligible.

Bundle size is the actual concern. The VSOP87 Earth data file (`data/vsop87Bearth.js`) is a large polynomial series. If Vite includes it in the client bundle, measure the size impact. If it's above ~100KB gzipped, consider dynamic import for the asteroid calculation module so it's lazy-loaded when a chart is first requested, not on initial page load.

---

## Code Quality Issues Spotted While Exploring

### `analyzeElements` is duplicated between client and server

`src/data/interpretations/index.ts` (line 52) and `server/engine/astroCore.ts` (line 100) both implement `analyzeElements` identically. The comment in `astroCore.ts` says "ported from src/data/interpretations/index.ts — keep in sync with frontend." This is the kind of comment you write when you know you have a problem but haven't fixed it. Any math shared between client and server belongs in a `shared/` directory. The asteroid orbital element calculator belongs there too.

### `calculateCompositeChart` in `synastry.ts` silently drops non-iterated bodies

Lines 195–208:
```typescript
for (const name of [...PLANET_NAMES, 'NorthNode' as const]) {
  const p1 = chart1.planets.find(p => p.name === name)
  const p2 = chart2.planets.find(p => p.name === name)
  if (!p1 || !p2) continue
```

When asteroids are in both charts' `planets` arrays, the composite chart silently omits them because the iteration only covers `PLANET_NAMES + NorthNode`. Add asteroid names to this iteration, or use a data-driven approach: iterate over names that appear in both charts rather than a hardcoded list.

### `identifyKeyThemes` in `synastry.ts` — missing Chiron detection

Lines 308–353 check for named planet pairs in synastry using string comparisons. There's no Chiron contact detection. The vision explicitly calls out "Person 1's Chiron conjuncts Person 2's Sun — that is one of the most significant synastry contacts in depth psychology." Add Chiron to this function. The check is one block:

```typescript
const chironAspects = aspects.filter(a => a.person1Planet === 'Chiron' || a.person2Planet === 'Chiron')
if (chironAspects.length > 0) {
  const sunMoon = chironAspects.find(a =>
    (a.person1Planet === 'Chiron' || a.person2Planet === 'Chiron') &&
    ['Sun', 'Moon', 'Venus', 'Mars'].includes(a.person1Planet) ||
    ['Sun', 'Moon', 'Venus', 'Mars'].includes(a.person2Planet)
  )
  if (sunMoon) {
    themes.push("Chiron contacts personal planets — this relationship carries a wound-and-healing dynamic that runs through its core")
  }
}
```

### `retrogradeSummary` will include asteroid names in narrative text correctly

`index.ts` line 190 filters out `NorthNode` from retrograde planets. When asteroids are retrograde and added to `chartData.planets`, they'll appear in `retrogradePlanets`. The `getRetrogradeSummary` function in `retrogrades.ts` just inserts names as strings — it'll work without changes. But `NATAL_RETROGRADE[p.name] ?? null` at line 136 will return `null` for asteroids until you add their entries. That's the correct fallback behavior — no retrograde block shown, no crash.

### `resolveToUTC` has a DST edge case

`astronomy.ts` line 435: the function uses `Intl.DateTimeFormat` to resolve local time to UTC. It fails silently for birth times in the "spring forward" gap (e.g., 2:30 AM during DST transition — a time that doesn't exist). The function returns an incorrect UTC time without any error. This is an existing bug, not a sprint-0014 concern, but it affects birth chart accuracy for people born during DST transitions.

### `buildTransitPrompt` skips NorthNode but will include asteroids

`transits.ts` line 329: `if (p.name === 'NorthNode') continue` intentionally excludes the Node from the GPT transit position list. When asteroids are added to `currentPlanets`, they'll flow through this loop into the GPT prompt automatically. That's the desired behavior. Asteroid daily motions are slow (Chiron ~0.005°/day, main-belt ~0.01–0.02°/day vs Moon ~13°/day) — include a note in the prompt that these bodies move slowly so GPT doesn't hallucinate dramatic transit effects.

---

## Specific Proposals

**P1 — Critical, blocks calculation:** Add `raDecToEclipticLon(ra: number, dec: number, oblRad: number): number` to `src/engine/astronomy.ts`. Test against at least three known asteroid positions from a published ephemeris before writing any interpretation entries. This is the most likely implementation error.

**P2 — Critical, blocks server:** Move `astronomia` from `devDependencies` to `dependencies` in `package.json`. Verify server build can import and use `elliptic.Elements`.

**P3 — Architecture, do during sprint:** Consolidate the 4x-duplicated utility functions (`getMeanNodeLongitude`, `getHouseForLongitude`, `getPlanetLongitude`, `getDailyMotion`) into `src/engine/ephemeris.ts`. The asteroid calculation module will be a fifth consumer — fix the duplication before adding a sixth copy.

**P4 — Type system, do before writing asteroid code:** Define `AsteroidName` and `BodyName` in `src/engine/types.ts`. Update all interfaces. Verify the TypeScript compiler catches all missed sites before adding any runtime code.

**P5 — Rendering, required for legibility:** Implement `isAsteroid(name: BodyName): boolean` in `ChartWheel.tsx`. Render asteroids at `ASTEROID_R = 241` (inner ring), glyph circle radius 10px, amber color `#c4a472`, with "A" superscript. Fix the `?? '☊'` fallback to a proper lookup that fails loudly in development mode.

**P6 — Data quality:** Use recent JPL Horizons elements for Chiron (epoch within the past year, not J2000). Document the retrieval date as a comment in the code. For main-belt asteroids, J2000 elements are acceptable for 10-year accuracy.

**P7 — Scope guard:** Add `isAsteroid` filter before `detectPatterns` call site. One line, prevents asteroid contamination of pattern detection this sprint without touching `detectPatterns` itself.

**P8 — Bug fix (cheap):** Fix the `applying` field in `calculateAspects` in `aspects.ts`. Either implement it correctly (delta longitude comparison 24h forward) or drop the field. Emitting meaningless data is worse than emitting no data.

**P9 — Bug fix (while touching synastry.ts):** Add Chiron contact detection to `identifyKeyThemes`. Chiron-personal-planet aspects are among the most clinically significant synastry contacts. The code is already structured for this — it's a 10-line addition.

**P10 — Rendering correctness:** Add `planet.house > 0` guard to `PlanetTooltip` at line 93 of `ChartWheel.tsx` before displaying house number. Prevents "House 0" display for any planet computed before house assignment completes.

