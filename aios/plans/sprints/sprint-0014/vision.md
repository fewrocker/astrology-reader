# Sprint 0014 — Vision

**Theme:** Asteroids

---

## Sprint Focus

Add the main asteroids — Chiron, Ceres, Pallas, Juno, and Vesta — to all three chart contexts: natal birth charts, synastry, and transits. The positions must be astronomically correct, rendered visually in the chart wheels, interpreted meaningfully in both the reading cards and GPT context, and surfaced in the transit timeline. Nothing half-hearted: if a point appears on a chart it must carry interpretation everywhere a planet does.

---

## Why Now

Sprint 0013 completed the commercial hardening layer (conversion funnel analytics, limit visibility, auth corrections). The product is now stable and ready to receive real users. Sprint 0012 built server-sovereign calculation: `server/engine/astroCore.ts` exists and mirrors the client engine. The timing is right to deepen the astrological core rather than add more product surfaces.

The current engine in `src/engine/astronomy.ts` calculates exactly eleven bodies: the ten classical planets plus Mean North Node. `src/engine/types.ts` defines `PlanetName` as a union of only those ten planets; `NorthNode` is handled as a named exception. Chiron has been explicitly documented as a desired addition since the earliest spec (`aios/planning/define-product.md`, F3: "Chiron if library supports"). The library does support it — just not directly.

`astronomy-engine` (the primary calc library) has no native asteroid support beyond the nine planets and Pluto. However, `astronomia` is already installed (`package.json`) and its `elliptic.Elements` class in `node_modules/astronomia/lib/elliptic.cjs` can compute any solar system body from standard Keplerian orbital elements — the same approach used by professional ephemeris software. JPL publishes precise current-epoch orbital elements for all five target asteroids. The calculation infrastructure for this sprint already exists in the project's dependencies.

---

## Where to Look

**Calculation layer — client:**
- `src/engine/astronomy.ts` — `calculateChart()` builds the `ChartData.planets` array; asteroids must be appended here, using `astronomia`'s `elliptic.Elements.position()` fed by hardcoded JPL orbital elements (epoch J2000) plus periodic perturbation corrections for Chiron
- `src/engine/types.ts` — `PlanetName`, `PLANET_NAMES`, and `PLANET_GLYPHS` must be extended; the type union currently lists only 10 planets; `AsteroidName` type and `ASTEROID_GLYPHS` need to be added (Chiron ⚷, Ceres ⚳, Pallas ⚴, Juno ⚵, Vesta ⚶)
- `src/engine/aspects.ts` — `calculateAspects()` iterates all planets including the new ones automatically (no change needed if types are extended), but orbs for asteroid-to-asteroid aspects should be tighter (≤3° major, ≤1° minor) to avoid clutter

**Calculation layer — server:**
- `server/engine/astroCore.ts` — must receive the same asteroid extensions as the client; this module is used for server-side GPT context assembly including dream interpretations and solar return; it mirrors `src/engine/astronomy.ts`

**Transit layer — client:**
- `src/engine/transits.ts` — `calculateCurrentPositions()` iterates `PLANET_NAMES` and calls `BODY_MAP`; asteroids must be added to both the iteration and the position function; Chiron moves ~2°/year (slower than Saturn), Ceres ~1.5°/year — they matter for monthly and longer transit windows but are essentially static in daily readings, so they can be included in all periods but noted as slow-moving in the reading UI

**Chart rendering:**
- `src/components/chart/ChartWheel.tsx` — planet glyphs are rendered at `PLANET_R` (radius ~263 in a 700×700 SVG); asteroids should render in a visually distinct ring or at a slightly different radius to avoid crowding; the current planet glyph circle is 13px radius; asteroid glyphs should be slightly smaller (10–11px) and use a distinct color (soft amber or muted teal, not gold which is for natal planets); the bi-wheel structure for transits already uses `TRANSIT_PLANET_R = 288` for a separate ring — asteroids in transit can use the same ring
- `src/components/chart/SolarReturnBiWheel.tsx` — currently renders only the bodies in `ChartData.planets`; if `calculateChart()` includes asteroids in the planets array, they appear automatically, but sizing and color differentiation will need explicit handling

**Synastry:**
- `src/engine/synastry.ts` — `calculateSynastryAspects()` cross-joins `chart1.planets` and `chart2.planets`; if asteroids are in the planets array, synastry aspects including asteroid-to-planet aspects are computed automatically; the tighter `orbScale = 0.75` already applies — this is correct behavior for synastry

**Interpretation database:**
- `src/data/interpretations/planetInSign.ts` — currently has entries keyed `${planet}_${sign}` for 10 planets; 5 asteroids × 12 signs = 60 new entries needed; each entry needs `brief` (1 sentence) and `detail` (2–4 sentences)
- `src/data/interpretations/planetInHouse.ts` — same structure; 5 × 12 = 60 new entries
- `src/data/interpretations/retrogrades.ts` — Chiron, Ceres, Pallas, Juno, Vesta all go retrograde; 5 new entries for natal retrograde interpretations (brief + detail)
- `src/data/interpretations/dignities.ts` — Ceres has proposed rulership of Virgo/Taurus (contested); this is an opportunity to add "proposed dignity" data without asserting it as canonical; conservative approach: skip dignities for asteroids in this sprint

**GPT context:**
- `src/services/gptInterpretation.ts` — assembles `natalPlanetContext` for the GPT prompt; asteroid positions and signs must be included so GPT-generated readings can reference them
- `server/services/gpt.ts` — server-side GPT prompt construction; same extension needed

---

## Quality Bar

"Deep, not shallow" for this sprint means:

1. **Five specific asteroids, not a generic "asteroids" flag.** Chiron (wounded healer), Ceres (nurturing, cycles of loss and return), Pallas (strategic intelligence, pattern recognition), Juno (committed partnership, justice), Vesta (devotion, sacred focus). Each has a distinct archetypal signature. The interpretation database must reflect these differences — not generic "asteroid in Aries" copy.

2. **Positions are astronomically correct.** Keplerian elements from JPL Horizons, validated against published ephemeris data for at least three test dates. A Chiron position that is 2° off is not acceptable. The `elliptic.Elements` approach in `astronomia` is sufficient for ~1 arcminute accuracy when current-epoch elements are used.

3. **Chart wheels remain legible.** Eleven bodies already populate the natal ring. Five more require either a second ring at a different radius (preferred) or a clear visual hierarchy (smaller glyphs, lower opacity, distinct color). Crowded glyphs that overlap defeat the feature. If two points fall within 5° of each other they must be offset angularly so their glyphs do not collide.

4. **Interpretation entries are written, not placeholder.** Every one of the 120+ new interpretation entries (asteroid in sign, asteroid in house, retrograde narratives) must be real astrological text. These entries are the product's differentiation — they are read by users directly and fed to GPT. Generic filler text ("Chiron in Aries means you are wounded in the area of self") is not acceptable.

5. **Transit integration is meaningful.** In the transit reading, Chiron transiting natal planets or being transited by Saturn or Pluto is significant and should appear in the `TransitAspect` list. Asteroid transit aspects to natal planets with orbs ≤3° should surface in the timeline. The transit timeline cards in `src/components/reading/TransitTimeline.tsx` already handle arbitrary `TransitAspect` entries — no structural change needed if the data is correct.

6. **Synastry asteroid overlays are explained.** If Person 1's Chiron conjuncts Person 2's Sun, that is one of the most significant synastry contacts in depth psychology. `src/data/interpretations/synastryAspectBriefs.ts` does not need 25 new asteroid-combination entries — a fallback to the natal aspect interpretation with synastry framing is acceptable — but the data must flow through the synastry display.

---

## What This Sprint Is NOT

- **Not all asteroids.** The main five (Chiron, Ceres, Pallas, Juno, Vesta) represent the standard set in modern Western astrology. Eris, Sedna, Lilith (Black Moon Lilith — a calculated point, not an asteroid), Hygiea, and the tens of thousands of numbered minor planets are out of scope. Adding them would require a real-time ephemeris API or bundled data files; the five main asteroids can be computed from hardcoded orbital elements.

- **Not a new chart type.** No asteroid-only chart, no standalone asteroid report. Asteroids integrate into the existing three chart surfaces (natal, synastry, transit) and appear in the same reading cards and GPT context as planets.

- **Not a redesign of the chart wheel.** The 700×700 SVG in `ChartWheel.tsx`, the ring structure, the color palette, and the tooltip system are all stable and shipped. This sprint adds data to the existing structure — it does not rebuild the rendering architecture.

- **Not aspect pattern detection for asteroids.** `detectPatterns()` in `src/engine/aspects.ts` finds Grand Trines, T-Squares, Grand Crosses, and Yods. Asteroids forming these patterns with planets is real (Chiron in a Yod is meaningful) but adding asteroid-aware pattern detection is complex and edge-case-heavy. Leave patterns planet-only for this sprint.

- **Not a Black Moon Lilith feature.** Lilith is frequently requested and astrologically significant, but it is a calculated mean apogee point (not a physical body) and its calculation differs from Keplerian orbital mechanics. If it falls out naturally from the Mean Node formula work, it can be included, but it is not a sprint target.
