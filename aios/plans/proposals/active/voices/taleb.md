# Nassim Taleb — Sprint 0014 Voice

## Sprint 0014 Focus: Asteroids

---

## Preamble

I want you to notice something about the sprint vision document. It is 84 lines of carefully considered scope. It correctly names the integration points. It explicitly prohibits a dozen things that would over-extend the sprint. It reads like a competent engineer thought it through.

And then it describes relying on hardcoded Keplerian orbital elements from JPL Horizons for all five asteroids, fed into a `timeP` (time of perihelion) parameter, without once asking: *what happens when the elements are stale, the calculation produces a NaN, or the TypeScript type system silently permits an asteroid name to flow into a function that only handles planets?*

These are not edge cases. These are the normal failure modes of integrating a physically-modeled approximation into a type-unsound codebase without defensive infrastructure. Let me go through them.

---

## 1. The Orbital Elements Are Hardcoded Against a Clock That Is Already Running

The vision document correctly notes that JPL Horizons orbital elements at epoch J2000 (January 1.5, 2000 TT) can achieve ~1 arcminute accuracy for the five target asteroids. This is true. At epoch.

The problem is that this accuracy degrades. The Keplerian two-body formulation ignores perturbations from Jupiter, Saturn, and the other major bodies — and for the asteroid belt, Jupiter's perturbations are not small. For Chiron specifically, which is a centaur object crossing the orbits of Saturn and Uranus, the perturbation accumulates significantly faster than for main-belt asteroids.

Concrete numbers: Chiron's orbital period is approximately 50.7 years. Its eccentricity is 0.38. JPL's osculating elements at J2000 accumulate errors on the order of 0.5–2° per decade from unmodeled perturbations. By the time the elements are integrated to compute a chart for a user born in 1985 (roughly -15 years from J2000) or for a transit reading in 2035 (+35 years from J2000), the Keplerian propagation may be off by 1–4° for Chiron.

The vision document says "A Chiron position that is 2° off is not acceptable." It then proposes the approach that will produce that error for a significant fraction of the user base.

**The specific fragility:** The orbital elements for `timeP` — the time of perihelion passage — are the most sensitive parameter. A small error in `timeP` propagates to large position errors for high-eccentricity orbits (Chiron: e=0.38, Ceres: e=0.08). Chiron's next perihelion is around 1996 (it just passed it). Using a J2000 `timeP` requires backward integration through the 1996 perihelion with unmodeled perturbations at every step. This is the worst case for Keplerian accuracy.

**What to do:** Use elements published at the nearest perihelion epoch for each body, not J2000. For Chiron, the 1996 perihelion elements give 15 years of forward accuracy instead of 50 years of accumulated error. Validate computed positions against at least five known ephemeris points across 1960–2040 before shipping. Not three test dates as the vision specifies — five, spanning the full range of likely birth years in the user base.

---

## 2. The `elliptic.Elements.position()` API Returns Equatorial RA/Dec, Not Ecliptic Longitude

This is the trap nobody mentions. The `astronomia` library's `Elements.position()` method — the specific function the vision document recommends — returns a `base.Coord` object with `ra` (right ascension) and `dec` (declination) in radians, in equatorial J2000 coordinates. The rest of the codebase works in ecliptic longitude (0–360°). The existing planet calculation functions in `src/engine/astronomy.ts` return ecliptic degrees via `Astronomy.Ecliptic(geo).elon`.

If the asteroid implementation calls `Elements.position()` and reads the result as ecliptic longitude without the equatorial-to-ecliptic coordinate transformation, every asteroid position will be wrong. Not slightly wrong — wrong by the obliquity of the ecliptic (~23.4°) plus a systematic error in the right ascension conversion.

This will not throw an error. It will not produce NaN. It will produce a number between 0 and 360 that passes `longitudeToZodiac()` without complaint and renders a glyph on the chart in the wrong sign. The Sun checks out. The Moon checks out. Mercury checks out. Chiron is 23° off and nobody notices until an astrologer with a reference ephemeris tests their chart.

**The coordinate chain that must be implemented:** `Elements.position(jde, earth)` → returns `{ra, dec}` in radians → convert to ecliptic using obliquity: `λ = atan2(sin(ra)*cos(ε) + tan(dec)*sin(ε), cos(ra))` where ε is the obliquity at that JDE. Then normalize to 0–360°.

The existing `Astronomy.Ecliptic(geo).elon` pattern used for planets cannot be reused here because `astronomia`'s return type is incompatible with `astronomy-engine`'s `GeoVector` type. The conversion must be written explicitly.

**Verification requirement:** Before any integration test, print the computed Chiron longitude for a known date (e.g., 2024-01-01) and compare against a published ephemeris. If the first output is wrong, the coordinate conversion is wrong. Do not proceed to UI integration until this passes.

---

## 3. TypeScript Will Not Save You: The `PlanetName` Union Expansion Is a Silent Breaking Change

The current type system in `src/engine/types.ts` defines:

```typescript
export type PlanetName =
  | 'Sun' | 'Moon' | 'Mercury' | 'Venus' | 'Mars'
  | 'Jupiter' | 'Saturn' | 'Uranus' | 'Neptune' | 'Pluto'
```

And `PlanetPosition.name` is typed as `PlanetName | 'NorthNode'`. The vision document proposes adding an `AsteroidName` type and including asteroids in `PlanetPosition.name`.

Here is what TypeScript will not catch when you do this.

**Pattern A — The `Record<PlanetName, ...>` exhaustive maps become silently incomplete:**

`BODY_MAP` in `src/engine/astronomy.ts` is `Record<PlanetName, Astronomy.Body>`. If `PlanetName` is extended to include asteroids, TypeScript will require entries for the new asteroid names — which is correct and will produce a compile error. Good. But `BODY_MAP` cannot have entries for asteroids because `astronomy-engine` has no `Body` enum value for them. The solution — creating a separate asteroid calculation path — means `BODY_MAP` must remain typed to the old `PlanetName` while asteroid positions come from a separate mechanism. If `PlanetName` is extended, the existing `BODY_MAP` will no longer compile. If `AsteroidName` is kept separate and asteroids are appended to the `planets` array as `PlanetName | 'NorthNode' | AsteroidName`, then every piece of code that iterates `chart.planets` and does `BODY_MAP[p.name]` will fail at the new planets silently at runtime (since `BODY_MAP[name]` returns `undefined` for unknown keys and TypeScript's `Record<PlanetName, ...>` index does not protect against accessing with a supertype key under `--noUncheckedIndexedAccess` which is almost certainly not enabled).

**Pattern B — `PLANET_GLYPHS` is `Record<PlanetName | 'NorthNode', string>` — a strict type:**

`ChartWheel.tsx` line 73: `const glyph = PLANET_GLYPHS[planet.name]`. If `planet.name` can be an asteroid name and `PLANET_GLYPHS` does not have that key, `glyph` is `undefined`. The text element renders nothing. The SVG circle appears with no glyph. This is a silent rendering failure that produces a blank disk on the chart.

The existing transit planet code does this correctly — it uses `PLANET_GLYPHS[tp.name as PlanetName] ?? '☊'` with a fallback. But the natal planet rendering at line 661 does not: `const glyph = PLANET_GLYPHS[planet.name]` with no fallback. If an asteroid flows through to natal rendering before `PLANET_GLYPHS` is extended, the glyph is `undefined` and a TypeScript strict build may not catch this because the cast `as PlanetName` suppresses the error.

**Pattern C — `getDignity()` in `src/data/interpretations/dignities.ts` is called with `planet.name as PlanetName`:**

`assembleReading()` in `src/data/interpretations/index.ts` line 135: `dignity: p.name !== 'NorthNode' ? getDignity(p.name as PlanetName, p.sign) : null`. If asteroids are in the planets array and `p.name` is `'Chiron'`, the `as PlanetName` cast compiles fine (TypeScript's `as` casts are not type-safe). `getDignity()` looks up `DOMICILE[planet]` where `planet` is `'Chiron'`, which is `undefined` in the Partial record. It returns null. That is the correct behavior, but it is achieved through a runtime null check on an unsafe cast, not through type safety. If `getDignity()` ever adds a code path that does not guard against unknown planets, it will throw at runtime on asteroid names.

**The structural fix:** Define a discriminated union that separates classical planets from asteroids at the type level, and add a union discriminant to `PlanetPosition`. Then every switch/lookup that is planet-specific can check `if (isClassicalPlanet(p.name))` before touching `BODY_MAP` or `PLANET_GLYPHS`. This is more surgery than the vision contemplates, but it is the only approach that makes the type system defensive rather than decorative.

---

## 4. Adding Five Bodies Means the Aspect Count Grows Quadratically, and Nobody Has Checked the UI Ceiling

Currently: 11 bodies (10 planets + NorthNode) → C(11,2) = 55 possible pairs. In practice, a natal chart with full orbs typically generates 20–35 aspects.

After asteroids: 16 bodies → C(16,2) = 120 possible pairs. With the same orb settings, expect 40–60+ aspects per chart in many configurations, especially for centuries where asteroid clusters are tightly packed in the zodiac.

**The `ReadingDisplay.tsx` consequence:** `AspectSection` at line 182–201 renders every aspect in `reading.aspects` with no limit. If there are 60 aspects, it renders 60 rows. The section title says `Aspects (60)`. The section becomes effectively unnavigable. No user reads 60 aspect interpretations. The information density is the opposite of the quality bar the sprint sets.

**The `filteredAspects` consequence in `ChartWheel.tsx`:** Line 296–299 filters to only major aspects (conjunction, sextile, square, trine, opposition). But with 16 bodies and 8° orbs, a dense chart can produce 30+ major aspects. The SVG aspect line rendering draws every one. At 30+ lines across a 700×700 SVG, the center of the chart becomes a visual disaster — a web of overlapping colored lines that communicates nothing.

**The `computeEnergyRating()` consequence:** This function at `src/engine/transits.ts:454` takes the top 8 transit aspects and scores them. With asteroids as transit planets, the top 8 may be entirely Chiron-to-natal-asteroid aspects — low-signal, slow-moving contacts that produce misleading daily energy ratings. The energy score assumes the top aspects are meaningful, but the asteroid aspects to asteroid positions are generally considered less significant than outer-planet-to-personal-planet transits. The ranking by orb alone is insufficient when the bodies involved have different astrological weights.

**The synastry consequence is the worst of all:** Two charts with 16 bodies each → C(16,2) = 120 cross-chart pairs. In `calculateSynastryAspects()` the nested loop is `for p1 of chart1.planets` × `for p2 of chart2.planets` = 16 × 16 = 256 pairs. With 75% orb scaling, synastry aspects reduce but not by enough. A typical synastry will go from ~40 aspects to 70–90 aspects. `SynastryAspectsSection` renders all of them with no cap. The `keyThemes` logic in `identifyKeyThemes()` checks hardcoded planet pairs like `['Venus', 'Mars']` and `['Moon', 'Moon']` — it will completely miss Chiron-to-Moon contacts, which are among the most significant synastry aspects in depth psychology, while generating irrelevant Saturn commentary from asteroid-Saturn aspects.

**The fix:** The aspect calculation must accept an `orbScale` parameter specifically for asteroid-to-asteroid aspects, apply tighter orbs (the vision mentions this but does not specify enforcement), and the UI must cap displayed aspects at a readable limit with a "show more" pattern.

---

## 5. The Interpretation Lookup System Has No Fallback for Missing Keys — And Nobody Wrote the Fallback Before They Wrote the Feature

In `src/data/interpretations/index.ts`:

```typescript
export function getPlanetInSignInterpretation(planet: PlanetName | 'NorthNode', sign: ZodiacSign): InterpretationEntry | null {
  return PLANET_IN_SIGN[`${planet}_${sign}`] ?? null
}
```

This returns null when the key is missing. `ChartWheel.tsx` line 69 calls this for the tooltip. If the interpretation is null, the tooltip simply omits the sign interpretation section. So far so good — silent degradation.

But `assembleReading()` in `src/data/interpretations/index.ts` line 131 passes `signInterpretation: null` into the `PlanetReading` objects for asteroid planets. `ReadingDisplay.tsx` then renders these planet readings. What happens when `signInterp` is null?

Looking at `ReadingDisplay.tsx` line 96–104: the sign interpretation section conditionally renders only when `signInterp` is truthy. So: Chiron appears in the planet list with a glyph, a sign, a house, but no interpretation text whatsoever. The planet card is present but empty. For a user who sees a card labeled "Chiron ⚷ in Taurus — House 8" with no explanatory text beneath it, the feature is not half-shipped — it is confusing, because the presentation implies there should be content.

**The second failure mode is in `transitAspectBriefs.ts`:** `computeTransitAspectBrief()` at line 107 checks `const phrases = TRANSIT_PLANET_PHRASES[transitPlanet as string]`. If `transitPlanet` is `'Chiron'` and `TRANSIT_PLANET_PHRASES` has no entry for it, `phrases` is `undefined`. The guard at line 112 catches this: `if (!natalHouse || natalHouse < 1 || natalHouse > 12 || !phrases)`. It falls back to `getAspectPerfectionBrief(aspectType, natalPlanet)`. So the transit brief displays a generic aspect text rather than a Chiron-specific phrase. This is acceptable as a fallback but the fallback is not documented as intentional — when someone sees "trine suggests harmonious energy flow" where they expected "Chiron trine your natal Moon suggests..." they will file a bug.

**The natal retrograde interpretation in `retrogrades.ts`:** `NATAL_RETROGRADE` is keyed by planet name. If Chiron is retrograde at birth and `NATAL_RETROGRADE['Chiron']` is missing, `assembleReading()` line 136 returns `null`. The retrograde section of the tooltip is omitted silently. This is the correct failure mode — but it compounds with the missing sign interpretation: a retrograde Chiron in a chart has no sign text and no retrograde text. The planet card is completely empty except for the header.

**The fix that must happen before not after:** Write the fallback rendering for asteroids with missing interpretations before building the interpretation database. The fallback must say something distinguishable from emptiness — "Interpretation for [asteroid] in [sign] will be available in a future update" or similar — so that partially-shipped data does not look like a bug. Do not ship the asteroid rendering without either the complete 60 sign + 60 house + 5 retrograde entries, or an explicit and visible fallback state.

---

## 6. The `analyzeElements()` and `analyzeModalities()` Functions Will Be Skewed by Asteroid Data

Both `analyzeElements()` and `analyzeModalities()` in `src/data/interpretations/index.ts` iterate `chart.planets` without filtering. They count every body in the planet array — including NorthNode and, after this sprint, all five asteroids.

Currently: 11 bodies contribute to element balance (10 planets + NorthNode, though NorthNode being in one sign for ~18 months means many charts have 2–3 of one sign from NorthNode alone).

After sprint: 16 bodies contribute. Five additional bodies from the asteroid belt means +5 sign contributions. If Ceres, Pallas, Juno, and Vesta are all clustered in a 30° range (not unusual — they orbit at roughly 2.5–3 AU and can be in the same sign for months), they add 4 counts to one element bucket. A chart that looks Earth-balanced by classical standards suddenly shows Fire-dominant because four asteroids happen to be in Aries during the user's birth month.

The element balance analysis is used in the GPT prompt (`buildTransitPrompt()` line 362: `const elementAnalysis = analyzeElements(natalChart.planets)`). If the element balance is skewed by asteroid clustering, the GPT is told "dominant element: Fire, you lead with passion and courage" for a chart that is classically Earth-heavy. The GPT reads this as factual context and frames the transit interpretation accordingly. The user receives a reading that contradicts their lived experience.

**The fix:** `analyzeElements()` and `analyzeModalities()` should accept a filter parameter or operate on a subset. Classical element/modality analysis uses the ten traditional planets, not asteroids. The technical implementation is trivial — filter `chart.planets` by `PLANET_NAMES` before passing to these functions. The decision about whether asteroids should influence element balance is an astrological judgment call, but the decision must be made explicitly rather than defaulted to "all bodies count equally."

---

## 7. The Server-Side Engine Is a Separate Codebase and Will Drift

`server/engine/astroCore.ts` is explicitly a mirror of `src/engine/astronomy.ts`. The vision document acknowledges this and requires the same asteroid extensions to be applied to the server engine.

But look at what has already happened: `astroCore.ts` has its own `PLANET_NAMES`, its own `BODY_MAP`, its own `getMeanNodeLongitude()`, its own `getDailyMotion()` — all duplicated from the client engine. The comment in `chartEngine.ts` says "ported from src/data/interpretations/index.ts — keep in sync with frontend." The word "keep in sync" describes a process that requires human discipline, not technical enforcement.

The drift has already begun. The `ASPECT_DEFS` in `server/engine/chartEngine.ts` uses hardcoded orbs of 2.4 for conjunction/square/trine/opposition and 1.8 for sextile (the 0.3× daily scaling of natal orbs). The client `transits.ts` applies this same scaling dynamically via `orbScale = period === 'daily' ? 0.3 : ...`. If someone changes the natal orb for, say, trine from 8 to 7 in `src/engine/aspects.ts`, the client transit calculation updates automatically (0.3 × 7 = 2.1). The server stays at 2.4 forever, because the constant is hardcoded.

When asteroid orbital elements are added, they will be added to at minimum:
- `src/engine/astronomy.ts` (client natal calculation)
- `server/engine/astroCore.ts` (server natal calculation, used in GPT context)
- `src/engine/transits.ts` (client transit current positions)
- `server/engine/transitEngine.ts` (server transit positions)

If the elements are copied-pasted across these files and one copy is later corrected (e.g., a `timeP` value is updated after validation), the others will silently remain wrong. A user whose natal chart is calculated client-side sees one Chiron position; the same chart calculated server-side for the GPT prompt sees a different Chiron position. The GPT context is inconsistent with the rendered chart. This will happen.

**The structural fix is outside the scope of this sprint but must be noted:** The orbital elements for asteroids should live in a single source file imported by all four calculation modules. Not copied. If the calculation functions differ between client and server, make the elements a shared constant and the calculation a shared library function. The alternative is four copies of the same numbers with four independent opportunities for divergence.

---

## 8. Existing Fragilities This Sprint Will Touch That Nobody Is Discussing

**A — `PLANET_GLYPHS[r.planet]` in `AdvanceTab.tsx` at line 414 has no fallback:**

`getRetrogradeStatus()` in `src/engine/transits.ts` returns `planet: PlanetName` (not `| AsteroidName`). If asteroids are added to the retrograde status output — and they should be, since Chiron retrogrades for approximately 6 months per year — this code will display the asteroid name without a glyph if `PLANET_GLYPHS` is not updated, or will display `undefined` if the key lookup fails silently.

**B — The `calculateCompositeChart()` in `src/engine/synastry.ts` iterates `[...PLANET_NAMES, 'NorthNode' as const]` explicitly:**

Line 195: `for (const name of [...PLANET_NAMES, 'NorthNode' as const])`. This will not include asteroids in the composite chart calculation unless `PLANET_NAMES` is extended — but if `PLANET_NAMES` is extended, `BODY_MAP` breaks (see fragility #3 above). The composite chart will silently omit all asteroid positions even if they are present in both natal charts. Chiron in the composite chart is considered significant in relationship astrology. Its absence from the composite will be an unexplained gap.

**C — The house overlay calculation ignores asteroids for the same reason:**

`calculateHouseOverlays()` at line 134 iterates `chart1.planets` and `chart2.planets` — so asteroids in the planets array will be included. But the output type `HouseOverlayEntry.planet` is typed `PlanetName | 'NorthNode'`. If an asteroid name flows through, TypeScript will either require a type assertion or produce an error, depending on how strictly the type is defined. The synastry page rendering at `SynastryPage.tsx` line 155 checks `INNER_PLANETS.includes(entry.planet as string)` — `INNER_PLANETS` is `['Sun', 'Moon', 'Venus', 'Mars', 'Mercury']`. Asteroid overlays will never be flagged as high-signal overlays, which is probably correct for Ceres-in-partner's-7th but wrong for Chiron-in-partner's-1st. The hardcoded `INNER_PLANETS` list is a design assumption that bakes in the current planet roster.

**D — The `identifyKeyThemes()` function is blind to asteroids:**

This function in `src/engine/synastry.ts` produces the `keyThemes` array by checking hardcoded planet pairs. Chiron-to-Sun contacts are among the most analyzed in depth psychological astrology. Ceres-to-Moon contacts speak directly to nurturing and attachment patterns. None of these will generate key themes, because the function only checks for `'Saturn'`, `'Pluto'`, and `'NorthNode'` aspects by name. The asteroid aspects will appear in the full aspect list but contribute nothing to the narrative summary. This is a design gap that will be invisible to users but means the synthesis features are not as enhanced as the raw data suggests.

---

## 9. What the Keplerian Approach Cannot Produce and Nobody Will Notice Until a Power User Complains

The `astronomia` `elliptic.Elements` class computes the geometric (astrometric) position of the body. What astrologers use, and what `astronomy-engine` produces for the classical planets, is the *apparent* geocentric ecliptic longitude — accounting for light-time correction and aberration.

The `elliptic.Elements.position()` code in `node_modules/astronomia/lib/elliptic.cjs` lines 47–55 does apply light-time correction (the `τ = base.lightTime(Δ)` + `fn(τ)` pattern). It also applies ecliptic aberration at line 55: `apparent.eclipticAberration(λ, β, jde)`. And it applies FK5 correction at line 56. So the return value is apparent coordinates in equatorial form. This is correct behavior.

But the vision document says to use `elliptic.Elements.position()` and take the ecliptic longitude directly. The return type is `base.Coord` with `ra` and `dec` (equatorial), not ecliptic. There is no `.elon` property on the return. If the implementer reads the source and discovers this, they need to perform the equatorial-to-ecliptic conversion. If they do not read the source and assume the output format matches `astronomy-engine`'s `Ecliptic(geo).elon`, they will use `result.ra` as if it were ecliptic longitude, which is wrong in units and coordinate frame simultaneously.

The library API incompatibility between `astronomia` and `astronomy-engine` is the most likely implementation trap. Document the conversion explicitly before implementation begins.

---

## Robustness Requirements

These are not optional quality improvements. They are the minimum to prevent silent failures:

1. **Validate asteroid positions against published ephemeris for at least five dates spanning 1960–2040 before any UI integration.** Not three dates as the vision specifies. Five. The failure modes differ between historical (before epoch) and future (after epoch) dates.

2. **Write explicit coordinate conversion from equatorial RA/dec to ecliptic longitude and verify it produces the expected output.** Include the obliquity calculation for the target JDE, not a hardcoded constant.

3. **Add null-fallback rendering for missing asteroid interpretations that is visually distinguishable from a bug.** An empty planet card looks broken. A card with "in-depth interpretation coming soon" looks like a work in progress.

4. **Cap aspect display in the UI at 30 major aspects.** Add a "show all" expansion. The current architecture renders unlimited aspects and will break at scale.

5. **Filter `analyzeElements()` and `analyzeModalities()` to classical planets only** (or make this an explicit configurable choice) before asteroid data flows into GPT prompts and element balance displays.

6. **Consolidate orbital elements into a single shared constant file** imported by all four calculation modules (client astronomy, server astroCore, client transits, server transitEngine). One edit propagates everywhere. Four copies diverge in silence.

7. **Extend `TRANSIT_PLANET_PHRASES` in `transitAspectBriefs.ts` for all five asteroids** before transit aspects to asteroids appear in reading cards. The fallback to generic text is functional but produces a qualitatively different experience for asteroid transits than for planet transits.

---

## Specific Proposals

**Issue: Coordinate conversion from astronomia output must be explicit and tested**
The `elliptic.Elements.position()` return is equatorial (RA/dec in radians), not ecliptic longitude. Write a dedicated function `asteroidEclipticLongitude(elements, jde, earth)` that calls `Elements.position()` and applies the equatorial-to-ecliptic transform. Unit test this function against three known ephemeris positions for Chiron before anything touches the rendering layer.

**Issue: Orbital elements must use perihelion-epoch values, not J2000**
For Chiron (high eccentricity, recent perihelion in 1996), J2000 elements accumulate larger errors than elements published at or near perihelion. Source and use the best available osculating elements at the nearest perihelion epoch for each of the five bodies.

**Issue: Aspect count must be bounded before UI integration**
Extend `calculateAspects()` to accept an `asteroidOrbScale` parameter (default 0.5 for asteroid-to-asteroid pairs, 0.75 for asteroid-to-planet pairs). Add a limit parameter to `AspectSection` rendering with a "show all" toggle. Do this before asteroids are in the planet array, not after the aspect count explosion is visible to users.

**Issue: `analyzeElements()` must not include asteroids by default**
Add a filter in `assembleReading()` and `buildTransitPrompt()` to pass only classical planets to element/modality analysis. This is a one-line fix with significant impact on GPT context quality.

**Issue: `calculateCompositeChart()` will silently omit asteroids**
Decide explicitly whether asteroids appear in the composite chart. If yes, update the iteration. If no, document the exclusion. Do not let the implicit `[...PLANET_NAMES, 'NorthNode']` enumeration silently exclude them.

**Issue: `identifyKeyThemes()` in synastry is blind to significant asteroid contacts**
At minimum, add Chiron-to-personal-planet detection (Chiron conjunct/opposite/square Sun, Moon, Venus, Mars of the partner). These contacts are among the most analyzed in depth psychological synastry and will appear in the aspect list with no narrative weight.

**Issue: Server and client orbital elements will diverge**
Create a shared constants file for asteroid orbital elements at the repo root or in a shared utility module. Both client and server import from it. A single source of truth makes correction automatic across all calculation modules.

**Issue: `PLANET_GLYPHS[planet.name]` in natal rendering has no fallback**
`ChartWheel.tsx` line 661: add `?? '●'` (or any visible placeholder) so that an asteroid with a missing glyph renders a visible placeholder rather than nothing. The existing transit planet code already does this correctly at line 792.

---

## What Will Bite, and When

In order of probability that it causes a visible, user-facing problem within 30 days of shipping:

1. **The coordinate conversion is wrong.** Every asteroid position is systematically off by ~23° because the implementer assumed `Elements.position()` returned ecliptic longitude. This will be caught quickly by anyone who checks their chart against Astro.com. But if no one checks before shipping, it will be cached in user state and corrected positions will look like regressions.

2. **An asteroid glyph is `undefined` in the natal chart SVG.** A blank disk appears in the chart for one of the five asteroids. Users report the chart looks broken. The cause is a missing key in `PLANET_GLYPHS`.

3. **The element balance analysis skews toward whichever sign cluster the asteroids happen to occupy.** Users born in months where multiple asteroids are in the same sign get radically skewed element profiles and receive GPT transit readings that frame them as dominant in an element they don't identify with. These users have no way to know the analysis is including asteroid positions.

4. **Interpretation data is partially missing.** Five asteroids × 12 signs × 2 contexts (in-sign, in-house) = 120 entries. The sprint quality bar says "real astrological text, not placeholder." Writing 120 genuinely differentiated entries is 3–5 days of focused content work. If this is underestimated, the sprint ships with empty planet cards.

5. **Server and client asteroid positions diverge.** A user's chart renders Chiron at 14° Aries. The GPT context says Chiron is at 16° Aries because a different copy of the orbital elements was used, or the server had a different `timeP` value. The GPT references a position the user cannot see on their chart. This confusion is subtle enough that it surfaces as "the AI doesn't match my chart" reports rather than as a technical bug.

The sprint is technically feasible. The orbital mechanics library is present and capable. The integration points are well-mapped. The failure modes are not in the vision or the plan — they are in the implementation assumptions that nobody will write down until someone ships the wrong coordinate system and spends a day debugging why Chiron is always in the wrong sign.

Ship the coordinate validation first. Everything else depends on it being right.
