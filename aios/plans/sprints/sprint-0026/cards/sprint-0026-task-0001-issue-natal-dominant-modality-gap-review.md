# Review: sprint-0026-task-0001 — Natal Dominant Modality Gap

**Status:** Completed  
**Type:** Issue Fix

---

## What Was Done

`natalDominantModality` was computed in `buildTarotAstroContext` (src/engine/tarot.ts) and stored on `TarotAstroContext`, but never forwarded past that point. It was absent from all three synthesis payload interfaces and all three GPT prompt blocks.

### Files Changed

**`server/services/gptTarot.ts`**
- Added `natalDominantModality: string | null` field to `TarotSingleSynthesisPayload`, `TarotThreeSynthesisPayload`, and `TarotCelticSynthesisPayload`.
- Added a `computeDominantModality` helper function with an inline `SIGN_MODALITIES_SERVER` lookup table (mirrors the client-side `computeDominantModality` in `src/engine/tarot.ts`). The server has no shared module for this; the implementation is self-contained.
- In `handleTarotSingleSynthesis`: added `let natalDominantModality = payload.natalDominantModality`, re-derived it via `computeDominantModality(natalChart)` in the server-override block, and emitted `Dominant modality: ${natalDominantModality}` in the "This Person's Sky Right Now" prompt section (guarded: line is omitted when null).
- In `handleTarotThreeSynthesis`: same pattern applied to the three-card handler.
- In `handleTarotCelticSynthesis`: same pattern applied to the Celtic Cross handler's "This Person's Living Sky" prompt section.

**`src/services/gptInterpretation.ts`**
- Added `natalDominantModality: string | null` to all three client-side payload interfaces (`TarotSingleSynthesisPayload`, `TarotThreeSynthesisPayload`, `TarotCelticSynthesisPayload`). These are the types used by the client to construct and send payloads.

**`src/components/tarot/TarotPage.tsx`**
- Added `natalDominantModality: engineCtx.natalDominantModality` to the single-card synthesis payload object.

**`src/components/tarot/ThreeCardReading.tsx`**
- Added `natalDominantModality: astroContext.natalDominantModality` to the three-card synthesis payload object.

**`src/components/tarot/CelticCrossReading.tsx`**
- Added `natalDominantModality: astroContext.natalDominantModality` to the `buildCelticSynthesisPayload` return value.

---

## Verification

- `npm run build` — clean, no TypeScript errors.
- `npx tsc --project tsconfig.server.json --noEmit` — clean, no errors.
- No engine changes required. `computeDominantModality` already produced the correct value; the fix is purely in payload construction and prompt text, exactly as the sprint card specified.

---

## Null-Safety

The modality line in each prompt uses a conditional template: `${natalDominantModality ? `Dominant modality: ${natalDominantModality}` : ''}`. When no clear modal dominance exists (tied counts), `computeDominantModality` returns null and the line is simply absent from the prompt — consistent with the sprint card's requirement that "the line should be omitted rather than sent as `null`."

---

## No Scope Drift

No engine logic was changed. No new spread types, UI surfaces, or non-tarot pages were touched. The fix is the minimum required to thread an already-computed value from the engine context through the payload interfaces and into the prompt strings.
