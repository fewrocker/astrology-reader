# Sprint 0014 — Changelog

**Completed:** 2026-05-15

## Fixes

### Applying/Separating Aspect Heuristic (task-0001)
Corrected the logic in `calculateAspects` and `synastry` that determined whether an aspect was applying or separating. The previous heuristic produced inverted results in many cases; the fix uses proper daily motion comparison.

### Astronomia as Production Dependency (task-0002)
Moved `astronomia` from `devDependencies` to `dependencies` in `package.json`. The library is used at runtime for asteroid orbital element calculations and was previously missing from production builds.

### Asteroid Bodies Excluded from Element/Modality Analysis (task-0003)
`analyzeElements()` and `analyzeModalities()` in `src/engine/index.ts` and `transits.ts` now filter out asteroid bodies, keeping classical-planet-only tallies. Previously asteroids skewed the fire/earth/air/water and cardinal/fixed/mutable distributions.

### Asteroid Aspects Excluded from Energy Rating (task-0004)
`computeEnergyRating()` in `transits.ts` no longer counts aspects involving asteroid bodies. Slow-moving asteroids were inflating transit energy scores.

### Glyph Fallback and getBodyGlyph Helper (task-0005)
Added `ASTEROID_GLYPHS` map and `getBodyGlyph(body)` helper to `src/engine/types.ts`. Replaced 35 separate glyph-lookup sites across components with a single call. North Node ☊ and all 5 asteroids now have consistent glyphs.

## Code Improvements

### Asteroid Type System (task-0006)
Added `AsteroidName` union type, `BodyName = PlanetName | AsteroidName | 'NorthNode'`, and `isAsteroid(body)` type guard to `src/engine/types.ts`. Updated ~15 interfaces and function signatures across 6 files to use `BodyName` where applicable, enabling correct TypeScript narrowing.

### Chiron Synastry Themes (task-0007)
`identifyKeyThemes()` in the synastry engine now detects Chiron conjunctions and oppositions and generates wound-healer narrative phrases. Added `TRANSIT_PLANET_PHRASES` entries for Chiron transits. Added a Chiron Return special case (Chiron returning to natal position ~50-year cycle) to transit timeline interpretation.

### Ephemeris Utilities Consolidation (task-0008)
Created `src/engine/ephemeris.ts` consolidating `getPlanetLongitude()`, `getMeanNodeLongitude()`, and `getDailyMotion()` that were previously duplicated across `astronomy.ts`, `synastry.ts`, `transitTimeline.ts`, and `transits.ts`. All call sites updated to import from the new module.

## Features

### Asteroid Core Engine (task-0009)
Full asteroid position calculation engine using Keplerian orbital elements via the `astronomia` library:
- `calculateAsteroidPosition(asteroid, date)` using `ASTEROID_ORBITAL_ELEMENTS` (JPL mean elements for Chiron, Ceres, Pallas, Juno, Vesta)
- Asteroids integrated into birth chart, synastry, and transit calculations
- `ChartWheel.tsx` renders asteroids in a distinct outer ring with amber glyphs at smaller scale
- Aspect calculation includes asteroid positions
- Tooltip shows asteroid archetype name alongside sign/degree

### Asteroid Interpretations (task-0010)
126 interpretation entries covering all 5 asteroids:
- 60 sign placements (5 asteroids × 12 signs) at synastry-brief quality
- 60 house placements (5 asteroids × 12 houses)
- 5 retrograde interpretations (one per asteroid)
- 1 Chiron Return interpretation (special life milestone ~age 50)
