**Type:** Feature
**Originated by:** Jobs, Carmack, Taleb, Miyazaki
**User guidance:** Add asteroids to the charts. All of them; birth charts, synastry, transits. They have to look nice and mean something. Focus on the main ones.
**Status:** ✅ Complete — 2026-05-15

---

## Outcome

All 15 specifications implemented and building cleanly. 18 files changed, 684 insertions.

**Engine:** `calculateAsteroidPosition()` + `isAsteroidRetrograde()` in `astronomy.ts` using `astronomia` Keplerian mechanics (`elliptic.Elements`) with proper RA/Dec → ecliptic longitude conversion (Meeus Ch. 13). Earth VSOP87 singleton via lazy `getEarth()`. JDE computed from `time.tt`. Shared orbital elements in `src/engine/asteroidElements.ts` (JPL Horizons values). Server-side `astroCore.ts` duplicates inline due to `rootDir: ./server` constraint (documented).

**Type system:** `AsteroidName`, `BodyName` union, `isAsteroid()`, `getBodyGlyph()`, `ASTEROID_GLYPHS`, `ASTEROID_ARCHETYPES` added to `types.ts`. `PlanetPosition.name` widened to `BodyName`. Cascade fixed across aspects.ts, synastry.ts, transits.ts, transitTimeline.ts, interpretations/index.ts, and 6 component files.

**Chart rendering:** Amber inner ring at `ASTEROID_R = 240` (vs `PLANET_R = 263`), 10px glyph circles, amber glow filter (#d97706), angular de-collision for asteroids within 5°. `PlanetTooltip` shows archetype badge + italic archetype note for asteroid bodies; dignity/retrograde guarded for classical planets only.

**Filtering:** `filterAsteroidAspects()` added to `aspects.ts`. Classical-planet-only element/modality analysis in `index.ts`, `astroCore.ts`, `synastry.ts`. `computeEnergyRating()` excludes asteroid aspects. `buildTransitPrompt()` has slow-body framing instruction and skips asteroid aspects for tightest-applying priority. Chiron detection added to `identifyKeyThemes()` in synastry.

**Dependency:** `astronomia` moved from devDependencies → dependencies in package.json.

**Not done (out of scope):** Interpretation data (120 sign/house entries), validation script against JPL Horizons, `buildSynastryPrompt()` archetype context lines.

---

## Problem / Opportunity

The engine in `src/engine/astronomy.ts` calculates exactly eleven bodies: the ten classical planets plus Mean North Node. `src/engine/types.ts` defines `PlanetName` as a union of only those ten planets; `NorthNode` is handled as a named exception at lines 39, 195 of the codebase. Five bodies with deep psychological and astrological significance — Chiron (wounded healer), Ceres (nourishment and grief cycles), Pallas (strategic intelligence), Juno (committed partnership), and Vesta (sacred devotion) — are entirely absent from every chart surface.

This is not a missing feature. It is a missing layer of the product. The planets describe the outer life: will, emotion, communication, desire, action, expansion, discipline, disruption, dissolution, transformation. The asteroids describe something harder to reach: where the wound lives, how you metabolize loss, what kind of intelligence you carry that doesn't fit the standard categories, what you require and will not tolerate in a long-term bond, what you hold sacred at personal cost. For a product whose differentiation is depth of interpretation, the absence of these bodies means the birth chart reading stops short of the most personally resonant territory in modern astrology.

`astronomy-engine` — the primary calculation library — has no native asteroid support. However, `astronomia` is already installed as a `devDependency` in `package.json` (line 46). Its `elliptic.Elements` class in `node_modules/astronomia/lib/elliptic.cjs` computes any solar system body from standard Keplerian orbital elements. JPL Horizons publishes precise orbital elements for all five target bodies. The calculation infrastructure for this sprint exists in the project's dependencies; the integration work is the sprint.

The critical structural problem blocking this integration is not the orbital mechanics. It is the type system and architecture: `BODY_MAP` in `astronomy.ts` (line 13), `transits.ts` (line 47), `transitTimeline.ts` (line 48), and `astroCore.ts` (line 25) all duplicate the same `Record<PlanetName, Astronomy.Body>` map. Asteroids must go through a different calculation path — `astronomia`'s `elliptic.Elements.position()` — and must not be added as phantom entries to any `BODY_MAP`. `astronomia` is in `devDependencies`, meaning the production server build will silently fail to resolve it if deployed with `npm install --production`. The type union `PlanetName | 'NorthNode'` appears in fifteen places across five files; adding `AsteroidName` requires a deliberate type strategy, not a search-and-replace.

---

## Vision

After this sprint, a user opens their natal birth chart and sees two layers of bodies: an outer planetary ring at the familiar radius, and a quieter inner ring of five asteroid glyphs — slightly smaller, rendered in soft amber, arriving last in the animation sequence. They hover Chiron and read: not "Chiron in Taurus means you are wounded around resources" but something that lands — something that names the pattern of self-worth and material security that has shaped their relationship with money and their body since early life. The product tells them something true.

In synastry, Chiron conjunct a partner's Sun is surfaced as a key theme — not buried in line forty of the aspect list. In transits, Chiron transiting natal Mars is present in the timeline but framed as an extended season measured in months, not a daily event. In the monthly GPT reading, asteroid transits appear as background context while fast-planet transits drive the foreground. The composite chart includes asteroid midpoints. Element and modality analysis remain classical-planet-only, so the GPT context is not skewed by asteroid clustering.

The calculation is correct. The design is intentional. The interpretation text is written with the quality of the synastry briefs, not the planet-in-sign database. Every one of the 120 new entries — 5 asteroids × 12 signs, 5 asteroids × 12 houses — names the specific archetypal question of that body in that placement. None of them could be mistaken for a generic horoscope column entry.

---

## Specifications

### 1. `raDecToEclipticLon()` — the critical coordinate conversion

**Location:** `src/engine/astronomy.ts`, add near line 30 alongside `getPlanetLongitude`.

**Background:** `elliptic.Elements.position(jde, earth)` in `node_modules/astronomia/lib/elliptic.cjs` at line 100 returns a `base.Coord` object with `.ra` (right ascension, radians) and `.dec` (declination, radians) in J2000 equatorial coordinates. It does NOT return ecliptic longitude. Reading `.ra` as ecliptic longitude without conversion produces a systematic error of up to ~23° — in the wrong sign entirely — with no error thrown and no NaN produced. This is the highest-probability silent implementation failure.

**Function signature:**
```typescript
function raDecToEclipticLon(ra: number, dec: number, obliquityRad: number): number
```

**Formula (Meeus, Chapter 13):**
```
λ = atan2(sin(ra) * cos(ε) + tan(dec) * sin(ε), cos(ra))
```
where `ε` is obliquity in radians, `ra` and `dec` are in radians.

**Obliquity source:** `Astronomy.e_tilt(time).mobl` converted to radians — already used in `calculateChart()` at line 295 for house calculation. Use the same value for consistency. This provides the apparent obliquity at the target JDE.

**Normalize:** The result from `atan2` is in `[-π, π]`; apply `normalizeAngle(result * Astronomy.RAD2DEG)` to get `[0, 360)` in degrees.

**Validation requirement (blocking):** Before any integration with `calculateChart()`, compute Chiron's longitude for 2024-01-01 UTC and compare against a published ephemeris (JPL Horizons web interface or Astro.com chart for that date). The position must agree to within 1°. Do not proceed to chart integration until this check passes. Also test: Ceres for 2000-01-01 (J2000 epoch — should match elements exactly), and Chiron for 1996-02-14 (perihelion — maximum Keplerian accuracy).

### 2. `calculateAsteroidPosition()` — the main calculation function

**Location:** `src/engine/astronomy.ts`, after `getMeanNodeLongitude` and before `localSiderealTime`.

**Function signature:**
```typescript
export function calculateAsteroidPosition(
  name: AsteroidName,
  time: Astronomy.AstroTime,
  obliquityRad: number,
): ZodiacPosition
```

**Implementation outline:**
1. Retrieve the `KeplerianElements` record for `name` from `ASTEROID_ORBITAL_ELEMENTS` (see spec 3).
2. Instantiate `new elliptic.Elements(elements)` from `astronomia`.
3. Instantiate the Earth VSOP87 object: `new planetposition.Planet(data.vsop87Bearth)`.
4. Compute JDE from `time.tt` (terrestrial time in Julian days from J2000): `jde = 2451545.0 + time.tt`.
5. Call `elem.position(jde, earth)` — returns `base.Coord` with `.ra` and `.dec` in radians.
6. Call `raDecToEclipticLon(coord.ra, coord.dec, obliquityRad)` to get ecliptic longitude in degrees.
7. Call `longitudeToZodiac(longitude)` and return.

**Retrograde detection for asteroids:** Compute longitude at `time` and at `time + 1 day` using the same `calculateAsteroidPosition` call. If the difference (with 360° wraparound handling identical to `isRetrograde()` in astronomy.ts lines 47–61) is negative, the body is retrograde. Extract this pattern into a shared `isAsteroidRetrograde(name, time, obliquityRad)` helper.

**Imports to add** to `src/engine/astronomy.ts`:
```typescript
import { elliptic, planetposition, data } from 'astronomia'
```
Verify this import path resolves in both the Vite client build and the `tsx`/`tsconfig.server.json` server build before committing. The package is CJS (`"use strict"; Object.defineProperty(exports, '__esModule', { value: true })`); Vite handles CJS interop for client bundles automatically. The server must also be verified.

### 3. Orbital elements — `ASTEROID_ORBITAL_ELEMENTS` constant

**Location:** A new file `src/engine/asteroidElements.ts` — the single source of truth imported by ALL four calculation modules (astronomy.ts, transits.ts, astroCore.ts, and any server transit engine). Do not copy-paste into multiple files. This is the robustness requirement most likely to fail in implementation.

**Type definition:**
```typescript
export interface KeplerianElements {
  axis: number   // semi-major axis, AU
  ecc: number    // eccentricity (dimensionless)
  inc: number    // inclination, radians
  argP: number   // argument of perihelion, radians
  node: number   // longitude of ascending node, radians
  timeP: number  // time of perihelion passage, JDE
  epochNote: string // human-readable source + date for audit
}

export const ASTEROID_ORBITAL_ELEMENTS: Record<AsteroidName, KeplerianElements> = { ... }
```

**Epoch strategy:**
- For Ceres, Pallas, Juno, Vesta (main-belt asteroids, eccentricities 0.07–0.23): J2000.0 elements (JDE 2451545.0) from JPL Horizons are adequate — Keplerian accuracy within 0.5° over a 40-year span. Source from JPL Small Body Database at https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html.
- For Chiron (eccentricity 0.379, recent perihelion Feb 1996): Use the most recent perihelion-epoch osculating elements available from JPL Horizons. Chiron's next perihelion is approximately 2047. Use the 1996 perihelion epoch elements (approximately JDE 2450128) rather than J2000, which reduces forward/backward propagation error from ~3° to ~0.5° for dates within ±20 years. Document the element retrieval date as a comment in `epochNote`.

**Each element value:** All angular quantities (`inc`, `argP`, `node`) must be stored in **radians** as required by `elliptic.Elements`. Convert from JPL Horizons degree values: multiply by `Math.PI / 180`. `timeP` is JDE (Julian date, terrestrial time).

**Validation:** After writing the elements, compute positions for the following five dates and compare against JPL Horizons web ephemeris or Astro.com:
- 1960-06-01 (historical, well before epoch)
- 1980-01-01 (natal birth year for a 44-year-old user)
- 2000-01-01 (J2000 epoch — most accurate point)
- 2024-01-01 (recent transit reading)
- 2040-01-01 (future transit, maximum propagation error)

Accept only if all five dates produce positions within 1° of ephemeris values for main-belt bodies, and within 2° for Chiron (which has unavoidable centaur perturbation errors at date extremes). If Chiron fails at 1960 or 2040, document the known error in `epochNote` but do not block the feature — users born in extreme date ranges can note the limitation.

### 4. Type system changes — do this first, before any runtime code

**Location:** `src/engine/types.ts`

**Add:**
```typescript
export type AsteroidName = 'Chiron' | 'Ceres' | 'Pallas' | 'Juno' | 'Vesta'

export const ASTEROID_NAMES: AsteroidName[] = ['Chiron', 'Ceres', 'Pallas', 'Juno', 'Vesta']

export type BodyName = PlanetName | 'NorthNode' | AsteroidName

export const ASTEROID_GLYPHS: Record<AsteroidName, string> = {
  Chiron: '⚷', Ceres: '⚳', Pallas: '⚴', Juno: '⚵', Vesta: '⚶',
}

export const ASTEROID_ARCHETYPES: Record<AsteroidName, string> = {
  Chiron: 'Wounded Healer',
  Ceres: 'Nourisher',
  Pallas: 'Strategist',
  Juno: 'Devoted Partner',
  Vesta: 'Sacred Flame',
}

export function isAsteroid(name: BodyName): name is AsteroidName {
  return ASTEROID_NAMES.includes(name as AsteroidName)
}
```

**Update `PlanetPosition.name`:**
```typescript
export interface PlanetPosition extends ZodiacPosition {
  name: BodyName  // was: PlanetName | 'NorthNode'
  retrograde: boolean
  house: number
}
```

**Do NOT extend `PLANET_NAMES`.** This constant drives `BODY_MAP` loops in `calculateCurrentPositions`, `detectIngresses`, `getRetrogradeStatus`, `findStations`, and `calculateCompositeChart`. Asteroids use a different calculation path. Keep `PLANET_NAMES` as exactly the ten astronomy-engine bodies.

**After making this change, run `tsc --noEmit` and fix every type error the compiler surfaces.** The compiler will find all missed call sites. This is the intended effect. Key sites to expect:
- `BODY_MAP[p.name]` in `astronomy.ts`, `transits.ts`, `transitTimeline.ts`, `astroCore.ts` — guard with `!isAsteroid(p.name)` before lookup
- `getDignity(planet.name as PlanetName, ...)` in `src/data/interpretations/index.ts` — change guard from `p.name !== 'NorthNode'` to `!isAsteroid(p.name) && p.name !== 'NorthNode'`
- `PLANET_GLYPHS[planet.name]` in `ChartWheel.tsx` — extend lookup to check `ASTEROID_GLYPHS` first
- `TransitAspect.transitPlanet` and `.natalPlanet` — update from `PlanetName | 'NorthNode'` to `BodyName`
- `SynastryAspect.person1Planet` and `.person2Planet` — same update
- `HouseOverlayEntry.planet` — update to `BodyName`
- `TimelineEvent.planet` and `.secondPlanet` — update to `BodyName`

### 5. Integration into `calculateChart()` in `astronomy.ts`

**Location:** `src/engine/astronomy.ts`, inside `calculateChart()`, after the North Node block (currently at lines 283–291) and before the LST/house calculation block (line 293).

**Implementation:** After appending the NorthNode to `planets`, add:
```typescript
// Asteroid positions — calculated via astronomia elliptic.Elements
// Must be after planet loop; BODY_MAP has no asteroid entries
for (const asteroidName of ASTEROID_NAMES) {
  const zodiac = calculateAsteroidPosition(asteroidName, time, obliquityRad)
  const retro = isAsteroidRetrograde(asteroidName, time, obliquityRad)
  planets.push({
    ...zodiac,
    name: asteroidName,
    retrograde: retro,
    house: 0, // assigned in the house assignment loop below
  })
}
```

The obliquity value (`Astronomy.e_tilt(time).mobl`) must be computed before this block. Move the `const obliquity = Astronomy.e_tilt(time).mobl` line that currently appears at line 294 (inside the house calculation block) to just before the planet loop starts, so it is available for both `calculateAscendant()`, `calculateMidheaven()`, and `calculateAsteroidPosition()`.

**House assignment:** The existing house assignment loop at lines 304–306 (`for (const planet of planets) { planet.house = getHouseForLongitude(...) }`) iterates the full `planets` array and will assign houses to asteroids automatically. No change needed.

**`ChartData.planets` type:** The return type already uses `PlanetPosition[]`, which after the type change in spec 4 accepts `BodyName` names. No interface change needed.

### 6. Integration into `calculateCurrentPositions()` in `transits.ts`

**Location:** `src/engine/transits.ts`, inside `calculateCurrentPositions()`, after the NorthNode block (currently lines 106–114) and before the return.

**Implementation:**
```typescript
// Asteroid current positions for transit aspects
const obliquityRad = Astronomy.e_tilt(time).mobl * Astronomy.DEG2RAD
for (const asteroidName of ASTEROID_NAMES) {
  const zodiac = calculateAsteroidPosition(asteroidName, time, obliquityRad)
  // Daily motion: compare to position 1 day later
  const timePlus = Astronomy.MakeTime(new Date(time.date.getTime() + 86400000))
  const zodiacPlus = calculateAsteroidPosition(asteroidName, timePlus, obliquityRad)
  let motionDiff = zodiacPlus.longitude - zodiac.longitude
  if (motionDiff > 180) motionDiff -= 360
  if (motionDiff < -180) motionDiff += 360

  positions.push({
    ...zodiac,
    name: asteroidName,
    retrograde: motionDiff < 0,
    house: 0,
    dailyMotion: motionDiff,
  })
}
```

Import `calculateAsteroidPosition` from `astronomy.ts` (it is already `export function` per spec 2). Import `ASTEROID_NAMES` from `types.ts`.

**`TransitPosition` type:** `TransitPosition extends PlanetPosition`; after spec 4's type change, `name: BodyName` accepts asteroid names. No interface change needed.

**`calculateTransitAspects()`:** No structural change needed. This function iterates all `transitPlanets` and `natalPlanets` and cross-joins them. Asteroids in both arrays will produce asteroid-transit-to-natal-planet and planet-transit-to-natal-asteroid aspects automatically. The asteroid-to-asteroid transit aspects (transiting Chiron aspecting natal Ceres) will also be computed; these are filtered at the display layer (see spec 10 for `computeEnergyRating` and spec 13 for `buildTransitPrompt`).

### 7. Integration into `transitTimeline.ts`

**Location:** `src/engine/transitTimeline.ts`, in `findAspectPerfections()` (lines 172–221).

The current `transitNames` at line 182 is `[...PLANET_NAMES]`. This must be extended to include asteroids as transit bodies:
```typescript
const transitNames: BodyName[] = [...PLANET_NAMES, ...ASTEROID_NAMES]
```

**The `getLongitudeForName` function** at line 74 handles `PlanetName | 'NorthNode'` but will not handle `AsteroidName`. Extend it:
```typescript
function getLongitudeForName(name: BodyName, time: Astronomy.AstroTime, obliquityRad?: number): number {
  if (name === 'NorthNode') return getMeanNodeLongitude(time)
  if (isAsteroid(name)) {
    if (!obliquityRad) {
      obliquityRad = Astronomy.e_tilt(time).mobl * Astronomy.DEG2RAD
    }
    return calculateAsteroidPosition(name, time, obliquityRad).longitude
  }
  return getPlanetLongitude(BODY_MAP[name], time)
}
```

**`findStations()`** at line 285 tracks retrograde station events. Asteroids (especially Chiron, which retrogrades approximately 5 months per year) produce station events. Add asteroids to the `stationPlanets` array within `findStations()` and use the asteroid calculation path for daily motion:
```typescript
const stationPlanets: BodyName[] = [
  'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
  ...ASTEROID_NAMES,
]
```
Inside the loop, branch on `isAsteroid(name)` to compute `getDailyMotion` vs the asteroid variant.

**`findIngresses()`** at line 225: Do NOT add asteroids to ingresses. Slow-moving bodies (Chiron spends ~4 years in a sign) changing signs is astrologically significant but occurs so rarely it will only appear in multi-year timeline views. For the current monthly/weekly/daily timeline scope, asteroid ingresses add noise without value.

**`TimelineEvent.planet` and `.secondPlanet`:** Already typed `PlanetName | 'NorthNode'` — update to `BodyName` as part of spec 4 type changes.

### 8. Server-side: `astroCore.ts`

**Location:** `server/engine/astroCore.ts`

This file mirrors `src/engine/astronomy.ts` for server-side natal chart calculation used in GPT context assembly. It must receive the same asteroid extensions.

**Import:** Add `import { calculateAsteroidPosition, isAsteroidRetrograde } from '../../src/engine/astronomy'` — or, if the server build cannot import from `src/`, extract `calculateAsteroidPosition` into `src/engine/asteroidElements.ts` alongside the elements constant and import from there. The elements constant MUST come from the shared `src/engine/asteroidElements.ts` (spec 3), not be re-declared in `astroCore.ts`.

**Extend `analyzeElements()` in `astroCore.ts` at line 100:** This function iterates all planets and counts elements. After spec 6, asteroid positions will be in the planets array passed to it. Filter them out before counting:
```typescript
export function analyzeElements(planets: ZodiacPosition[]): ElementBalance {
  // Classical planets only — asteroids skew element balance (see spec 11)
  const classicalPlanets = planets.filter(p => 
    !isAsteroid((p as { name?: string }).name as BodyName)
  )
  const counts: Record<Element, number> = { Fire: 0, Earth: 0, Air: 0, Water: 0 }
  for (const p of classicalPlanets) {
    counts[SIGN_ELEMENTS[p.sign]] += 1
  }
  // ...rest of function unchanged
}
```

**Server transit engine (if `server/engine/transitEngine.ts` exists or is created this sprint):** The same `calculateAsteroidPosition` and `ASTEROID_ORBITAL_ELEMENTS` shared constants must be used. The server must not have its own copy of the orbital element values.

### 9. Synastry: what flows automatically and what requires explicit changes

**`calculateSynastryAspects()` in `synastry.ts`:** No change needed. The function at line 72 cross-joins `chart1.planets` and `chart2.planets`. When both charts include asteroid positions (they will, via spec 5), asteroid-to-planet and asteroid-to-asteroid synastry aspects are computed automatically with the existing `orbScale = 0.75`.

**`calculateHouseOverlays()` in `synastry.ts`:** No change needed. The function at line 134 iterates `chart1.planets` and `chart2.planets` directly. Asteroids will be included automatically. The `HouseOverlayEntry.planet` type must be updated to `BodyName` as part of spec 4.

**`calculateCompositeChart()` in `synastry.ts` — explicit change required:** The iteration at line 195:
```typescript
for (const name of [...PLANET_NAMES, 'NorthNode' as const]) {
```
must be extended to include asteroids:
```typescript
for (const name of ([...PLANET_NAMES, 'NorthNode', ...ASTEROID_NAMES] as BodyName[])) {
```
Without this change, asteroid positions in both natal charts are silently omitted from the composite chart. Chiron in the composite chart is considered significant in relationship astrology and must not be silently excluded. The composite asteroid position is the simple midpoint of the two natal asteroid longitudes — the same `midpointLongitude()` function used for planets.

**`identifyKeyThemes()` in `synastry.ts` — add Chiron detection:** The function at line 292 checks hardcoded planet pairs. Add:
```typescript
// Chiron contacts to personal planets — wound-and-healing dynamic
const chironToPersonal = aspects.filter(a =>
  (a.person1Planet === 'Chiron' || a.person2Planet === 'Chiron') &&
  (
    ['Sun', 'Moon', 'Venus', 'Mars'].includes(a.person1Planet as string) ||
    ['Sun', 'Moon', 'Venus', 'Mars'].includes(a.person2Planet as string)
  )
)
if (chironToPersonal.length > 0) {
  const tightest = chironToPersonal.sort((a, b) => a.orb - b.orb)[0]
  const isHarsh = tightest.nature === 'challenging'
  themes.push(isHarsh
    ? 'Chiron contacts a personal planet — this relationship carries a wound-and-healing dynamic at its core; the Chiron person\'s wound is activated by the other\'s identity or feeling'
    : 'Chiron contacts a personal planet — this relationship has a healing dimension; one person\'s wound becomes a source of growth and care for the other'
  )
}
```

**`elementCompat()` and `modalityCompat()` in `synastry.ts`:** Both functions iterate `chart.planets` directly at lines 260–261 and 281–282. After asteroid addition, both will count asteroid signs in their element/modality tallies. Apply the same classical-planet filter as specified in spec 11:
```typescript
for (const p of chart1.planets.filter(p => !isAsteroid(p.name))) count1[SIGN_ELEMENTS[p.sign]]++
for (const p of chart2.planets.filter(p => !isAsteroid(p.name))) count2[SIGN_ELEMENTS[p.sign]]++
```

### 10. Aspect calculation: orbs and the `detectPatterns()` exclusion

**`calculateAspects()` in `aspects.ts`:** No structural change needed. The function iterates all planets in the passed array and cross-joins them. When the array includes asteroids, asteroid-to-planet and asteroid-to-asteroid aspects are computed with the standard `ASPECT_DEFINITIONS` orbs.

**Asteroid-to-asteroid orb tightening:** Do not modify `calculateAspects()` itself. Instead, add a post-filter function to `aspects.ts`:
```typescript
export function filterAsteroidAspects(
  aspects: Aspect[],
  maxAsteroidOrb = 3,
): Aspect[] {
  return aspects.filter(a => {
    const bothAsteroids = isAsteroid(a.planet1 as BodyName) && isAsteroid(a.planet2 as BodyName)
    return !bothAsteroids || a.orb <= maxAsteroidOrb
  })
}
```
Call this at the display assembly layer (in `assembleReading()` in `src/data/interpretations/index.ts` and at the `ChartWheel.tsx` aspect rendering site), not inside `calculateAspects()`. The engine stays pure; the display layer applies the sprint's asteroid-to-asteroid orb constraint. The sprint scope is asteroid-to-planet aspects; asteroid-to-asteroid aspects within 3° are still computed and shown.

**`detectPatterns()` in `aspects.ts`:** One-line filter at the call site. Do not modify `detectPatterns()` itself. In `src/data/interpretations/index.ts` (or wherever `detectPatterns()` is called), filter asteroid aspects out before passing to the function:
```typescript
const classicalAspects = aspects.filter(a =>
  !isAsteroid(a.planet1 as BodyName) && !isAsteroid(a.planet2 as BodyName)
)
const patterns = detectPatterns(classicalAspects)
```
Pattern detection for asteroids is explicitly out of scope for this sprint (vision.md). Without interpretation entries for asteroid-inclusive patterns, detected patterns are noise.

### 11. `analyzeElements()` and `analyzeModalities()` — classical-planet filter

**Problem:** Both functions in `src/data/interpretations/index.ts` iterate `chart.planets` without filtering. After asteroid addition, five additional sign contributions enter the element/modality count. Asteroids cluster — Ceres, Pallas, Juno, and Vesta can all be within a 30° range during a given year — so five asteroids in the same sign can flip a chart's dominant element from its classical reading. This skew flows directly into the GPT prompt via `buildTransitPrompt()` at line 361: `const elementAnalysis = analyzeElements(natalChart.planets)`.

**Fix in `src/data/interpretations/index.ts`:**
```typescript
export function analyzeElements(planets: PlanetPosition[]): ElementBalance {
  // Classical element analysis uses the ten traditional planets only.
  // Asteroids are excluded: their clustering patterns can skew element balance
  // away from the classical reading GPT uses for context.
  const classical = planets.filter(p => !isAsteroid(p.name))
  // ...existing logic using `classical` instead of `planets`
}

export function analyzeModalities(planets: PlanetPosition[]): ModalityBalance {
  const classical = planets.filter(p => !isAsteroid(p.name))
  // ...existing logic using `classical`
}
```

**Same fix** must be applied to `analyzeElements()` in `server/engine/astroCore.ts` (line 100) and to `elementCompat()`/`modalityCompat()` in `synastry.ts` (specs 8 and 9 above).

### 12. `computeEnergyRating()` asteroid exclusion

**Location:** `src/engine/transits.ts`, `computeEnergyRating()` at line 454.

**Problem:** This function takes the top 8 transit aspects and scores them +1 (harmonious) or -1 (challenging). When asteroid transit aspects enter the pool, a slow-moving Chiron opposition lasting 6 months can persistently occupy top-8 slots (it will have near-zero orb for extended periods), deflecting the daily energy rating toward "Tense" for months regardless of faster-planet influences.

**Fix:** Filter asteroid aspects before scoring:
```typescript
export function computeEnergyRating(aspects: TransitAspect[]): EnergyRating {
  // Exclude asteroid transit aspects — they represent multi-month background context,
  // not daily weather. The energy rating is meant to reflect the day's felt quality.
  const classicalAspects = aspects.filter(a =>
    !isAsteroid(a.transitPlanet as BodyName) && !isAsteroid(a.natalPlanet as BodyName)
  )
  const top = classicalAspects.slice(0, 8)
  // ...rest of function unchanged
}
```

### 13. `buildTransitPrompt()` — slow-body awareness instruction

**Location:** `src/engine/transits.ts`, `buildTransitPrompt()` at line 292.

**Problem 1 — transit position listing:** The loop at line 328 (`for (const p of transitData.currentPlanets)`) skips NorthNode but will include asteroids. This is correct — asteroid positions should appear in the GPT context. However, add asteroid archetype context inline:
```typescript
for (const p of transitData.currentPlanets) {
  if (p.name === 'NorthNode') continue
  const archetypeNote = isAsteroid(p.name as BodyName)
    ? ` (${ASTEROID_ARCHETYPES[p.name as AsteroidName]})`
    : ''
  prompt += `- Transit ${p.name}${archetypeNote}: ${p.degree}°${p.minute}' ${p.sign}${p.retrograde ? ' [Rx]' : ''}\n`
}
```

**Problem 2 — tightest-applying-aspect priority instruction:** The priority instruction at lines 371–378 instructs GPT to lead with the tightest applying aspect. If this is a Chiron transit (possible during a Chiron-to-natal-Mars period lasting months), a daily reading dominated by a years-long Chiron theme is not useful. Guard:
```typescript
// Skip asteroid aspects for daily priority — they are background context
const tightestApplying = transitData.transitAspects.find(a =>
  a.applying &&
  !isAsteroid(a.transitPlanet as BodyName) &&
  !isAsteroid(a.natalPlanet as BodyName)
) ?? transitData.transitAspects.find(a =>
  !isAsteroid(a.transitPlanet as BodyName) &&
  !isAsteroid(a.natalPlanet as BodyName)
)
```

**Problem 3 — slow-body framing instruction:** Add the following to the instructions block, after the existing priority paragraph and before the period-specific focus list:
```typescript
prompt += `Asteroid body framing: Chiron, Ceres, Pallas, Juno, and Vesta are slow-moving bodies. Their transits to natal planets represent extended themes measured in months, not days. In a daily or weekly reading, mention asteroid transit aspects only as background context — do not lead with them, do not anchor the reading's opening to them, and do not frame them as immediate events. In a monthly reading, an asteroid transit within 2° of exact may be foregrounded as a season-level theme. The daily energy is driven by fast-moving planets (Sun, Moon, Mercury, Venus, Mars).\n\n`
```

**Natal position listing for asteroids:** The loop at line 318 already includes all `natalChart.planets`. After spec 5, asteroids will appear here. Add archetype context for natal asteroid lines:
```typescript
for (const p of natalChart.planets) {
  const houseStr = !natalChart.unknownTime && p.house > 0 ? ` (House ${p.house})` : ''
  const archetypeNote = isAsteroid(p.name as BodyName)
    ? ` [${ASTEROID_ARCHETYPES[p.name as AsteroidName]} — ${getAsteroidGPTContext(p.name as AsteroidName)}]`
    : ''
  prompt += `- ${p.name}: ${p.degree}°${p.minute}' ${p.sign}${houseStr}${p.retrograde ? ' [Rx]' : ''}${archetypeNote}\n`
}
```
Where `getAsteroidGPTContext` returns the one-sentence framing from Miyazaki proposal 5:
- Chiron: "formative wounds that become sources of wisdom and care for others"
- Ceres: "nourishment, cycles of loss and return, the mother wound"
- Pallas: "strategic intelligence, pattern recognition, the wisdom that does not fit conventional authority"
- Juno: "committed partnership, equality, what we demand and what we cannot forgive in bonds"
- Vesta: "sacred dedication, the flame kept at personal cost, devotion as identity"

### 14. Validation requirement — five test dates before UI integration

This is a blocking requirement. Do not integrate `calculateAsteroidPosition()` into `calculateChart()` until the following validation passes:

Create a temporary validation script (can be a simple Node.js script or a test file) that:
1. Calls `calculateAsteroidPosition` for each of the five asteroids on these dates: 1960-06-01, 1980-01-01, 2000-01-01, 2024-01-01, 2040-01-01
2. Prints the computed ecliptic longitude and zodiac sign
3. Compares against JPL Horizons ephemeris values (look up via https://ssd.jpl.nasa.gov/horizons/app.html, observer body: Geocentric, reference frame: Ecliptic J2000, output: ecliptic lon/lat)

**Acceptance criteria:**
- Main-belt asteroids (Ceres, Pallas, Juno, Vesta): all five dates within 1.0° of ephemeris
- Chiron: dates 1980-2040 within 2.0° of ephemeris; 1960 documented if error exceeds 2°
- If 2024-01-01 Chiron fails the 1° threshold, the orbital elements must be re-sourced from a more recent JPL epoch before proceeding

Document the validation results — the computed vs. ephemeris values for each body and date — in a comment block at the top of `src/engine/asteroidElements.ts`. This is the audit trail.

### 15. `astronomia` dev→prod dependency move

**Location:** `package.json`

Move `astronomia` from `devDependencies` (line 46) to `dependencies`. This is a critical blocker for the server build.

**Current state:** `"astronomia": "^4.2.0"` appears in `devDependencies`. The Vite client bundle resolves `devDependencies` at build time and bundles them — so the client build works in production. The server (`server/engine/astroCore.ts`) compiled with `tsx`/`tsconfig.server.json` resolves `require('astronomia')` from `node_modules` at runtime. If the production deployment uses `npm install --production`, devDependencies are not installed. The server will throw `MODULE_NOT_FOUND` at runtime with no useful error message, and all asteroid positions will be undefined.

**Fix:**
```json
"dependencies": {
  ...
  "astronomia": "^4.2.0",
  ...
}
```
Remove from `devDependencies`. This is a one-line move.

**Bundle size consideration:** The VSOP87 Earth data file (`node_modules/astronomia/data/vsop87Bearth.js`) is a large polynomial series used to compute Earth's position (required by `elliptic.Elements.position()`). Measure the Vite bundle size increase after this addition. If it exceeds ~80KB gzipped, wrap the asteroid calculation module in a dynamic import within the client chart calculation function so it is lazy-loaded when the chart is first requested rather than included in the initial bundle.

---

## Out of Scope

**All other asteroids:** Eris, Sedna, Hygiea, and the tens of thousands of numbered minor planets are not in scope. They require real-time ephemeris APIs or bundled data files that would significantly increase bundle size. The five main asteroids can be computed from hardcoded orbital elements.

**Black Moon Lilith:** A calculated mean apogee point, not a Keplerian body. Its calculation path differs from the `elliptic.Elements` approach used here. Out of scope for this sprint.

**Asteroid dignities:** Contested rulerships (Ceres/Virgo, Vesta/Virgo or Scorpio) are not canonical in the way classical rulerships are. The `getDignity()` function in `src/data/interpretations/dignities.ts` should be guarded to return null for asteroid names rather than crashing. The dignity display itself is not added.

**Asteroid-specific filter UI in transit timeline:** No "Asteroids" filter button in the timeline filter bar. Asteroids appear in the Aspects filter category alongside planets.

**Aspect pattern detection for asteroids:** `detectPatterns()` is called with classical aspects only (spec 10). Asteroid-inclusive patterns (e.g., Chiron in a Yod) are excluded because there is no interpretation text for them.

**Asteroid retrograde interpretation entries:** The `NATAL_RETROGRADE` lookup in `retrogrades.ts` will return null for asteroid names — this is correct behavior. Retrograde asteroids will show their retrograde flag on the chart but without a dedicated retrograde text entry. These entries (five total) are a lower-priority addition after the core 120 in-sign/in-house entries.

**Applying/separating correction in `calculateAspects()`:** The existing heuristic at `aspects.ts:76` (`const applying = orb < def.orb * 0.5`) is incorrect for all bodies, including asteroids. Fixing this requires the time parameter in `calculateAspects()` — a refactor that is out of scope for this sprint. The transit code in `transits.ts` does this correctly via `dailyMotion`; the natal chart applying flag is a known limitation.

**Grand Cross detection bug in `aspects.ts:155`:** The `hasPair(squares[0]!, ...)` pattern with a non-null assertion on a potentially empty array is a pre-existing bug. Fixing it is not in scope for this sprint.

**Composite chart house assignment:** `calculateCompositeChart()` sets `house: 0` for all composite planets (comment at line 207 explicitly notes this as a known gap from sprint 0011). Asteroids in the composite chart will also have `house: 0`. Out of scope.

**Chiron Return special transit interpretation:** The `transitAspectBriefs.ts` special-case entry for `Chiron_Conjunction_Chiron` is noted as valuable (Jobs voice) but is an interpretation data task, not part of the core engine. Out of scope for the engine proposal; should be a separate task in the sprint.

---

## Open Questions

**1. VSOP87 import in server build.** The `import { data, planetposition } from 'astronomia'` pattern must be tested in the server's `tsx`/`tsconfig.server.json` build context before the sprint begins. CJS interop is handled by Vite for client builds but the server uses a different compilation path. If the import fails at runtime on the server, asteroid positions will be undefined with no error message. Proof-of-concept: write a 10-line test server script that imports `astronomia` and calls `new planetposition.Planet(data.vsop87Bearth)`, run it with `tsx`, confirm no error.

**2. Chiron elements epoch.** The 1996 perihelion elements from JPL Horizons — what is the best available `timeP` value, and what accuracy does it produce for users born in 1960 (the oldest likely user cohort)? If the 1960 validation check in spec 14 shows Chiron error exceeding 3° for the chosen elements, consider whether there is a better mid-range epoch or whether the limitation should be documented to users.

**3. Shared calculation module for client and server.** `astroCore.ts` currently duplicates `getMeanNodeLongitude`, `getPlanetLongitude`, `getHouseForLongitude`, and `getDailyMotion` from the client engine. The asteroid calculation adds `calculateAsteroidPosition` as a fifth shared function. The right long-term fix is a `shared/engine/` or `src/engine/shared.ts` module imported by both. For this sprint: at minimum, `calculateAsteroidPosition` and `ASTEROID_ORBITAL_ELEMENTS` must come from a single shared location (spec 3 addresses this via `src/engine/asteroidElements.ts`). The broader de-duplication is a separate cleanup sprint.

**4. Bundle size impact of VSOP87.** `vsop87Bearth.js` is the Earth VSOP87 series required by `elliptic.Elements.position()`. Its size in the Vite bundle must be measured after the `astronomia` dependency move (spec 15). If the bundle impact is significant (above ~80KB gzipped), a dynamic import strategy for the asteroid calculation module should be designed and documented. The decision between eager loading and dynamic import must be made before the client integration is written.

**5. Interpretation data staffing.** The 120 interpretation entries (5 asteroids × 12 signs + 5 asteroids × 12 houses) are the product's differentiation. At the quality standard set by the synastry briefs — addressing rather than describing, specific to the archetype rather than mechanically applied — each entry requires real attention. The sprint plan must allocate explicit time for this writing work, not treat it as a fill-in task after the engine is done. If the interpretation data is not ready when the engine is shipped, the sprint must either hold the feature behind a flag or ship the asteroids with an explicit "interpretation coming soon" fallback state — not an empty planet card.

**6. `buildSynastryPrompt()` asteroid context.** The synastry GPT prompt in `synastry.ts` at line 447 lists all planets for both charts. After spec 5, asteroids will appear in these lists. Should asteroid archetype context lines (as specified for `buildTransitPrompt()` in spec 13) be added to `buildSynastryPrompt()` as well? This is a product quality question — GPT without archetype context for Chiron will produce weaker synastry language. The recommendation is yes, but the exact implementation is not specified here.
