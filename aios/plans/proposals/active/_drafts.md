# Sprint 0014 — Proposal Drafts

## Issue Proposals

### issue-applying-separating-heuristic
**Type:** Issue Fix
**Originated by:** Carmack, Jobs
**What it is:** `calculateAspects()` in `src/engine/aspects.ts` (line 76) uses `orb < def.orb * 0.5` to determine whether an aspect is applying or separating. This is semantically wrong — it labels tight aspects as "applying" regardless of whether the planets are moving toward or away from exactness. The correct determination requires comparing orbital positions 24h apart. This bug already affects all planets; fixing it while touching `aspects.ts` for the asteroid sprint is the right time.

---

### issue-astronomia-dev-dependency
**Type:** Issue Fix
**Originated by:** Carmack, Taleb
**What it is:** `astronomia` is listed in `devDependencies` in `package.json` but is required at runtime by `server/engine/astroCore.ts` for asteroid calculations. A production deployment that strips devDependencies (standard `npm install --production`) will cause the server to fail silently when calculating asteroid positions. Moving `astronomia` to `dependencies` is a one-line fix that prevents a silent production failure.

---

### issue-element-analysis-asteroid-skew
**Type:** Issue Fix
**Originated by:** Taleb
**What it is:** `analyzeElements()` and `analyzeModalities()` in `src/data/interpretations/index.ts` iterate all bodies in `chart.planets` without filtering. When 5 asteroids join the planets array, they contribute sign counts to the element and modality analysis. If four asteroids cluster in one sign (common since they share similar orbital periods), the element balance is dramatically skewed — a classically Earth-heavy chart appears Fire-dominant. This GPT context data is used in transit prompt assembly, causing misaligned readings. The fix: filter to `PLANET_NAMES` only before element/modality counting.

---

### issue-energy-rating-slow-body-bias
**Type:** Issue Fix
**Originated by:** Jobs, Taleb
**What it is:** `computeEnergyRating()` in `src/engine/transits.ts` (lines 454–466) scores daily energy from the top 8 transit aspects — challenging aspects score −1, harmonious +1. Asteroid transits to natal bodies last weeks to months (Chiron moves ~2°/year). When a Chiron opposition enters the orb, it will remain in the top-8 list for months, permanently deflecting the daily energy score toward "Tense" regardless of the actual day's planetary weather. The fix: exclude asteroid transit aspects from the energy rating calculation, or apply a fractional weight.

---

### issue-glyph-fallback-north-node
**Type:** Issue Fix
**Originated by:** Jobs, Miyazaki, Carmack, Taleb
**What it is:** Throughout `ChartWheel.tsx` (lines 141, 202, 236, 254) and other components, unknown planet names fall back to `?? '☊'` — the North Node glyph. When asteroid names flow through chart rendering before `PLANET_GLYPHS` is extended, or in any code path where the cast fails, planets silently render the North Node symbol. This misidentifies the body astrologically (the North Node has a specific meaning) and confuses users. The fix requires auditing all `PLANET_GLYPHS` lookups and replacing the North Node fallback with `ASTEROID_GLYPHS[name]` or a neutral `?` placeholder.

---

## Code Enhancement Proposals

### code-asteroid-type-system
**Type:** Code Enhancement
**Originated by:** Jobs, Carmack, Taleb, Miyazaki
**What it is:** The current type system uses `PlanetName | 'NorthNode'` throughout all interfaces. Adding asteroid names to this union would make `BODY_MAP` (which maps to `astronomy-engine` Body enums) non-exhaustive for bodies that use a different calculation path. The correct architecture: define `AsteroidName = 'Chiron' | 'Ceres' | 'Pallas' | 'Juno' | 'Vesta'` and `BodyName = PlanetName | 'NorthNode' | AsteroidName` in `src/engine/types.ts`. Keep `PLANET_NAMES` planet-only; add `ASTEROID_NAMES: AsteroidName[]`. Update `PlanetPosition.name`, `Aspect.planet1/planet2`, `TransitAspect.transitPlanet/natalPlanet`, `SynastryAspect.person1Planet/person2Planet` to use `BodyName`. Add `ASTEROID_GLYPHS` constant with Unicode glyphs ⚷⚳⚴⚵⚶. Add `isAsteroid(name: BodyName): boolean` helper. This must be done before any asteroid runtime code is added so the compiler catches all missed sites.

---

### code-chiron-synastry-themes
**Type:** Code Enhancement
**Originated by:** Carmack, Jobs, Miyazaki
**What it is:** `identifyKeyThemes()` in `src/engine/synastry.ts` (lines 308–353) checks for specific named planet pairs — Venus/Mars, Moon/Moon, Sun/Moon — but has no detection logic for Chiron contacts. Chiron conjunct or opposite personal planets (Sun, Moon, Venus, Mars) is one of the most significant synastry configurations in depth psychology. This is a ~15-line addition that checks for Chiron aspects to personal planets and adds a theme narrative: "Chiron contacts personal planets — this relationship carries a wound-and-healing dynamic that runs through its core." Also: add a `Chiron_Conjunction_Chiron` entry to `transitAspectBriefs.ts` for the Chiron Return (Chiron transiting natal Chiron) — the most significant transit of a person's midlife.

---

### code-ephemeris-utilities-consolidation
**Type:** Code Enhancement
**Originated by:** Carmack, Taleb
**What it is:** Four utility functions are duplicated verbatim (or near-verbatim) across the codebase: `getMeanNodeLongitude` (in `astronomy.ts`, `transits.ts`, `transitTimeline.ts`, `astroCore.ts`), `getPlanetLongitude` (same four files), `getHouseForLongitude` (`astronomy.ts`, `synastry.ts`, `astroCore.ts`), `getDailyMotion` (`transits.ts`, `transitTimeline.ts`, `astroCore.ts`). Each duplication is a separate bug surface. The asteroid calculation will be a fifth consumer. Consolidate into `src/engine/ephemeris.ts`, import from there in all four current files and in the new asteroid module. The server's `astroCore.ts` can import from the same module since it is pure TypeScript math with no browser-specific dependencies.

---

## Feature Proposals

### feat-asteroid-chart-visualization
**Type:** Feature
**Originated by:** Jobs, Miyazaki, Carmack
**What it is:** Visual rendering of the five asteroids across all three chart surfaces — natal `ChartWheel.tsx`, transit bi-wheel, and `SolarReturnBiWheel.tsx`. Asteroids must render as a visually distinct layer: inner ring at radius ~240 (between `INNER_R=228` and `PLANET_R=263`), amber color (#c4a472), smaller glyph circle (10px vs 13px for planets), with "A" superscript badge. Chiron gets special treatment: 12px glyph circle and a warmer glow, entering the chart animation sequence last. Retrograde markers for asteroids use muted amber `℞` positioned below the glyph (not red above-right). A collision detection loop must resolve angular overlaps when two bodies (asteroid-to-asteroid or asteroid-to-planet) fall within 5°. The planet positions table in `ResultsPage.tsx` and planet list in `ReadingDisplay.tsx` need visual section breaks between classical planets and asteroids. All `?? '☊'` fallbacks must be replaced before any asteroid renders.

---

### feat-asteroid-core-engine
**Type:** Feature
**Originated by:** Jobs, Carmack, Taleb, Miyazaki
**What it is:** The calculation backbone for asteroid positions across all chart contexts. Includes: a `calculateAsteroidPosition(name: AsteroidName, time: Date): ZodiacPosition` function in `src/engine/astronomy.ts` using `astronomia`'s `elliptic.Elements.position()` with JPL Horizons orbital elements (recent-epoch elements for Chiron, J2000 acceptable for main-belt). Critical: implement `raDecToEclipticLon(ra, dec, obliquityRad)` conversion utility — the API returns equatorial coordinates, not ecliptic longitude, and failing to convert places every asteroid ~23° wrong. Validate computed positions against a published ephemeris for at least 5 test dates spanning 1960–2040 before integration. Integrate asteroid positions into `calculateChart()` (appended to `planets` array after the classical planets), `calculateCurrentPositions()` in `transits.ts`, and mirror both in `server/engine/astroCore.ts` and `server/engine/transitEngine.ts`. Move `astronomia` from devDependencies to dependencies. Apply tighter orbs for asteroid-to-asteroid aspects (filter at display layer). Exclude asteroids from `detectPatterns()`, `analyzeElements()`, `analyzeModalities()`, and `computeEnergyRating()` calls (keep classical analysis clean). Fix `buildTransitPrompt()` to instruct GPT that asteroid transits are slow-moving background context.

---

### feat-asteroid-interpretations
**Type:** Feature
**Originated by:** Jobs, Miyazaki
**What it is:** A complete interpretation database for the five asteroids — 60 planet-in-sign entries (5 × 12), 60 planet-in-house entries (5 × 12), and 5 natal retrograde entries — written at the quality standard of the existing synastry briefs, not the reference-book style of planet-in-sign. Each asteroid has a distinct archetypal core question: Chiron (where is the wound that becomes the healer's knowledge?), Ceres (what is your relationship to nourishment, loss, and cyclical return?), Pallas (what patterns do you perceive that others miss?), Juno (what is your experience of commitment and relational justice?), Vesta (what do you devote yourself to, and what does that cost?). Interpretation text must be specific to each archetype — not generic astro-formula. Also includes: archetype framing sentences for each asteroid in the GPT context assembly (`gptInterpretation.ts` and `server/services/gpt.ts`), transit prompt instruction that asteroid transits are slow-moving background context (not daily weather), and a note for Chiron transits specifically in the transit reading when within 3° of natal Chiron (Chiron Return language).
