**Type:** Issue Fix
**Originated by:** Taleb

## Problem

`analyzeElements()` and `analyzeModalities()` in `src/data/interpretations/index.ts` (lines 52–88) iterate every entry in the `planets: PlanetPosition[]` array without filtering. Each function tallies sign contributions to produce an element or modality balance, then picks a dominant and optionally a lacking bucket.

```ts
// analyzeElements — line 54
for (const p of planets) {
  counts[SIGN_ELEMENTS[p.sign]] += 1
}

// analyzeModalities — line 73
for (const p of planets) {
  counts[SIGN_MODALITIES[p.sign]] += 1
}
```

Both functions are called with the full `chart.planets` array in two places:

1. `assembleReading()` at lines 144–145 of the same file:
   ```ts
   const elements = analyzeElements(chart.planets)
   const modalities = analyzeModalities(chart.planets)
   ```

2. `buildTransitPrompt()` in `src/engine/transits.ts` at line 361, which feeds the result directly into the GPT system prompt:
   ```ts
   const elementAnalysis = analyzeElements(natalChart.planets)
   prompt += `Dominant element: ${elementAnalysis.dominant} — ${elementAnalysis.interpretation.dominant}\n`
   ```

`PLANET_NAMES` is defined in `src/engine/types.ts` (lines 19–22) as a ten-entry constant array of the classical planets:

```ts
export const PLANET_NAMES: PlanetName[] = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
]
```

`PlanetPosition.name` is typed as `PlanetName | 'NorthNode'` (types.ts line 39). The sprint-0014 asteroid work will append five additional `PlanetPosition` entries — Chiron, Ceres, Pallas, Juno, Vesta — to `chart.planets` with names outside this union.

Once those bodies are in the array, every call to `analyzeElements` or `analyzeModalities` will count all 16 bodies equally. Asteroids in the main belt cluster for months at a time — Ceres, Pallas, Juno, and Vesta can all share the same sign simultaneously. That clustering adds 4 identical element/modality ticks to one bucket. A chart that is classically Earth-dominant can be reported as Fire-dominant because four asteroids happen to transit Aries during the birth month. The GPT prompt receives this skewed balance as factual context (`Dominant element: Fire — you lead with passion and courage`) and frames the entire transit reading around it. The user receives a reading that contradicts their lived experience, with no indication that asteroid clustering is the cause.

## Expected behavior

`analyzeElements()` and `analyzeModalities()` should only count the ten classical planets when producing the balance used for astrological interpretation and GPT context. Asteroids must not contribute to element or modality tallies by default.

The fix is a one-line filter at the two call sites using the existing `PLANET_NAMES` constant:

```ts
// assembleReading() — src/data/interpretations/index.ts lines 144–145
const classicalPlanets = chart.planets.filter(p => (PLANET_NAMES as readonly string[]).includes(p.name))
const elements = analyzeElements(classicalPlanets)
const modalities = analyzeModalities(classicalPlanets)

// buildTransitPrompt() — src/engine/transits.ts line 361
const classicalPlanets = natalChart.planets.filter(p => (PLANET_NAMES as readonly string[]).includes(p.name))
const elementAnalysis = analyzeElements(classicalPlanets)
```

Alternatively, `analyzeElements` and `analyzeModalities` can accept an optional filter parameter so the filtering is explicit at the function signature level rather than at every call site. Either approach makes the astrological judgment explicit: asteroids are excluded from element/modality balance by design, not by accident.

NorthNode is already present in `chart.planets` (as `PlanetName | 'NorthNode'`) and contributes one sign count today. Whether NorthNode should be included is a separate astrological judgment; the immediate fix addresses the five-body asteroid skew introduced by the sprint.
