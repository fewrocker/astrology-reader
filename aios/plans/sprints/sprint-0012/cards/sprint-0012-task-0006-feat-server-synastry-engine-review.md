# Code Review: sprint-0012-task-0006-feat-server-synastry-engine

**Reviewer:** Subagent (Claude Sonnet 4.6)
**Date:** 2026-05-14
**Branch:** `sprint-0012-task-0006-feat-server-synastry-engine`

---

## Files Reviewed

- `server/engine/synastryEngine.ts` (648 lines, newly created)
- `server/services/gpt.ts` (additions)
- `src/services/gptInterpretation.ts` (additions)
- `src/App.tsx` (call site updates)
- `src/components/results/SynastryPage.tsx` (retry handler update)

---

## Findings

### server/engine/synastryEngine.ts

**Imports** — Correct. Imports `normalizeAngle`, `longitudeToZodiac`, `getHouseForLongitude`, `ASPECT_DEFINITIONS`, `analyzeElements`, `PLANET_NAMES`, `ZodiacSign`, `ZodiacPosition` from `./astroCore.js`. Imports `ServerChartData` from `./chartEngine.js`. Imports `TransitData`, `TransitPeriod` from `./transitEngine.js`.

**Orb usage** — Correct. `calculateSynastryAspects` uses `orbScale = 0.75` applied to `ASPECT_DEFINITIONS` (the natal orb table from astroCore, NOT the tight transit-orb `ASPECT_DEFS` from chartEngine). Effective orbs: conjunction/square/trine/opposition 6°, sextile 4.5°, semi-sextile 1.5°, quincunx 2.25°.

**House overlay guard** — Ported exactly from `src/engine/synastry.ts` lines 141–165. Conditions `!chart1.unknownTime && chart2.houses.length > 0` and `!chart2.unknownTime && chart1.houses.length > 0` are preserved verbatim. Adaptation: `HouseCusp[]` → `map(h => h.longitude)` to produce the `number[]` expected by astroCore's `getHouseForLongitude`. Correct.

**Composite chart** — Ported verbatim. `house: 0` placeholder preserved with original comment. Iterates `[...PLANET_NAMES, 'NorthNode' as const]`. Correct.

**`calculateCompatibility`** — Ported verbatim including `identifyKeyThemes` private helper, `elementCompat`, `modalityCompat`, and all pair lists. `SIGN_ELEMENTS` and `SIGN_MODALITIES` are locally re-declared (the `analyzeElements` import from astroCore already has `SIGN_ELEMENTS`, but the local declarations are not in conflict and `modalityCompat` requires `SIGN_MODALITIES` which is not in astroCore). Correct.

**`buildSynastryPrompt`** — Ported verbatim. Uses `analyzeElements` from astroCore. Output is identical to the frontend version.

**`buildCoupleTransitPrompt`** — Ported verbatim. Uses `TransitData` and `TransitPeriod` from transitEngine. Correct.

**`computeEnergyRating` not ported** — Correct; it returns Tailwind CSS class strings, irrelevant on server.

### server/services/gpt.ts

**`handleSynastryInterpretation`** — Correct. Uses raw birth fields, calls `calculateChart`, `calculateSynastry`, `buildSynastryPrompt`, then `retryWithBackoff → callOpenAI`. Unknown-time guard handled by `!person1.time` / `!person2.time`.

**`handleCoupleTransitInterpretation`** — Correct. Computes charts, synastry data, then `calculateCurrentPositions(new Date())`, `calculateTransitAspects(..., unknownTime=true)`, builds a `TransitData` object with empty `ingresses` and `retrogrades` (appropriate for composite), then calls `buildCoupleTransitPrompt`.

**Route dispatch** — `case 'synastry-interpretation'` and `case 'couple-transit-interpretation'` present in the dispatcher switch. Correct.

**Imports** — `calculateCurrentPositions` and `calculateTransitAspects` correctly pulled from transitEngine alongside existing imports. `calculateSynastry`, `buildSynastryPrompt`, `buildCoupleTransitPrompt`, `SynastryData` correctly imported from synastryEngine. No duplicate imports.

### src/services/gptInterpretation.ts

**`getSynastryInterpretation`** and **`getCoupleTransitInterpretation`** — Exported correctly, use `callProxy` with the correct route strings. Return type cast `as Promise<string>` is sound given `callProxy` returns `Promise<unknown>`.

### src/App.tsx

**Synastry call** — `getSynastryInterpretation` called with raw birth fields extracted from `birthData.city` and `partnerBirthData.city`. `unknownTime ? null : (time || null)` correctly maps to nullable time. City null-guard at `if (!birthData.city || !partnerBirthData.city) return` already present. Correct.

**Couple transit call** — `getCoupleTransitInterpretation` called with raw birth fields. `calculateTransits` still runs locally to produce `transitData` for the UI (the `SET_SYNASTRY_TRANSIT_RESULTS` dispatch), which is correct per spec: "client-side buildSynastryPrompt calls for instant UI display stay — only the GPT call changes."

**Unused imports cleaned** — `buildSynastryPrompt` and `buildCoupleTransitPrompt` removed from App.tsx import.

### src/components/results/SynastryPage.tsx

**`handleRetryGpt`** — Updated to use `getSynastryInterpretation` with raw birth fields. Added `!birthData.city || !partnerBirthData.city` guard. Unused `buildSynastryPrompt` import removed. Correct.

---

## TypeScript

`npx tsc --noEmit` → zero errors. Verified.

---

## Verdict

**No blocking issues.** All spec requirements satisfied. Implementation is ready to commit.
