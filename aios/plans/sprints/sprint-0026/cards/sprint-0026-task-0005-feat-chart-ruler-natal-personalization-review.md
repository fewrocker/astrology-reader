# Review: sprint-0026-task-0005-feat-chart-ruler-natal-personalization

## Status
completed

## What Was Done

### 1. Canonical rulership lookup — `src/engine/tarot.ts`
Added `SIGN_RULERSHIPS` exported constant (12 entries, modern rulerships) as the single authoritative source for client-side derivation. Documented the server-side mirror requirement in comments.

### 2. `TarotAstroContext` extended
Added `chartRulerPlanet: string | null` field to the interface, documented as "ruling planet of the Ascendant sign (modern rulerships), null when ascendant is unavailable."

### 3. `buildTarotAstroContext` populates `chartRulerPlanet`
Inside the same try/catch block that protects the other natal sign extractions, `chartRulerPlanet` is derived from `natalAscendantSign` using `SIGN_RULERSHIPS`. Null ascendant → null chart ruler. No fallback guessing.

### 4. `buildEngineCtx` — no changes required
Delegates entirely to `buildTarotAstroContext`; `chartRulerPlanet` flows through unchanged. Spec 4 satisfied.

### 5. Server-side `SIGN_RULERSHIPS_SERVER` mirror — `server/services/gptTarot.ts`
Added a `SIGN_RULERSHIPS_SERVER` constant with identical 12-entry structure and a `deriveChartRuler(ascSign)` helper. Documented lockstep maintenance requirement matching the `formatTransitSummary` pattern.

### 6. `TarotCardPayload` extended
Added `rulingPlanet: string | null` field. Required for spec 12 (same-planet conjunction signal).

### 7. All three payload types extended
`TarotSingleSynthesisPayload`, `TarotThreeSynthesisPayload`, `TarotCelticSynthesisPayload` all received `chartRulerPlanet: string | null` and `natalDominantModality: string | null` fields (spec 5, 6, 7, 14).

### 8. Server-side auth path re-derives chart ruler (spec 8)
In each of the three handlers' `if (userId)` blocks, after re-deriving `natalAscSign` from the server-computed chart, `chartRulerPlanet` is immediately re-derived using `deriveChartRuler()`. The client-supplied value is overridden.

### 9. Prompt: "This Person's Sky Right Now" / "This Person's Living Sky" blocks updated
All three handlers now render:
- `Chart ruler: {planet}` when present (null → no line, no placeholder)
- For the single-card handler: when the card's ruling planet equals the chart ruler, a `SAME AS THIS CARD'S RULING PLANET` annotation signals GPT to name this conjunction explicitly (spec 12)
- `Dominant modality: {Cardinal|Fixed|Mutable}` when present (spec 14)

### 10. Prompt instructions updated (spec 9, 10)

**Single-card handler (paragraph 2):** Replaced "Mention at least one natal placement" with an instruction requiring: (a) name the chart ruler when present, (b) describe the relationship between the card's ruling planet or element and the chart ruler, (c) prohibition on sentences equally true for a different card, (d) explicit same-planet conjunction naming, (e) graceful null fallback.

**Three-card handler (ASTROLOGY_SYNTHESIS):** Added requirement that at least one sentence draw on the chart ruler's relationship to one of the three drawn cards, naming it by planet and explaining what it means for this specific person.

**Celtic Cross handler (Astrology Resonance):** Added requirement to treat the chart ruler as the primary natal signal, named at least as prominently as Sun or Moon sign references.

### 11. Client-side payload construction updated
`TarotPage.tsx`, `ThreeCardReading.tsx`, `CelticCrossReading.tsx` all updated to:
- Pass `rulingPlanet: drawn.card.rulingPlanet ?? null` in the card payload
- Pass `chartRulerPlanet: astroContext.chartRulerPlanet` and `natalDominantModality: astroContext.natalDominantModality` in the synthesis payload

## Spec Compliance

| Spec | Status | Notes |
|------|--------|-------|
| 1. Canonical rulership lookup | done | `SIGN_RULERSHIPS` in `src/engine/tarot.ts`, 12 entries, modern rulerships |
| 2. `TarotAstroContext.chartRulerPlanet` | done | `string | null`, derived from ascendant sign |
| 3. `buildTarotAstroContext` populates it | done | inside try/catch, null on any error |
| 4. `buildEngineCtx` no changes | done | flows through unchanged |
| 5. Single payload `chartRulerPlanet` | done | plus re-derivation in auth path |
| 6. Three payload `chartRulerPlanet` | done | plus re-derivation in auth path |
| 7. Celtic payload `chartRulerPlanet` | done | plus re-derivation in auth path |
| 8. Server auth re-derives chart ruler | done | all three handlers |
| 9. Paragraph 2 instruction quality | done | card-specific, ruler-relationship required |
| 10. Same instruction in all three | done | ASTROLOGY_SYNTHESIS and Astrology Resonance updated |
| 11. Null-safety | done | null → no line in prompt, conditional instruction |
| 12. Same-planet conjunction signal | done | single-card prompt annotates match explicitly |
| 13. Instant interpretation unchanged | done | no changes to `computeInstantInterpretation` |
| 14. `natalDominantModality` threaded | done | all three payloads and prompt blocks |
| 15. Canonical lookup consistency | done | server mirror documented as requiring lockstep maintenance |

## Build Verification

- `npm run build` — passes, zero TypeScript errors
- `npx tsc --project tsconfig.server.json --noEmit` — passes, zero errors

## Decisions Made

**Spec 12 implementation:** Rather than a separate instruction block for the same-planet case, the conjunction signal is embedded as an annotation in the prompt data block itself (e.g., "Chart ruler: Pluto — SAME AS THIS CARD'S RULING PLANET (Pluto): highest personal resonance signal — name this conjunction explicitly"). This is applied only in the single-card handler where spec 12 is most clearly specified; the three-card and Celtic handlers receive the chart ruler and can derive the relationship. The alternative (separate instruction block in all three handlers) would add complexity that the model does not require — the annotation in the data block is sufficient.

**`natalDominantModality` instruction changes:** Per spec 14 out-of-scope clause, the field is threaded to the prompt block but no modality-specific synthesis instructions were written. The model receives the information; crafting modality instructions is a separate prompt authoring task.
