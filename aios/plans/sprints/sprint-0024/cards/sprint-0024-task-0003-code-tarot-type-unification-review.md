# Review: sprint-0024-task-0003-code-tarot-type-unification

## Status
Completed. Build passes with zero TypeScript errors.

## What Was Done

### Canonical type definitions (src/engine/tarot.ts)
No changes needed — these were already the authoritative types.

### Removed duplicate type definitions

**src/context/TarotContext.tsx**
- Removed `DrawnCard` (4-field placeholder with id/name/suit/number)
- Removed `InstantInterpretation` (3-field placeholder with cardId/position/text)
- Removed `TarotAstroContext` (stub with `moonPhase: unknown` and `transitAspects: unknown[]`)
- Now re-exports all three from `src/engine/tarot.ts`

**src/components/tarot/types.ts**
- Removed `TarotAstroContext` (component-local variant with significantTransits, currentMoonPhase, numerologyYear)
- Removed `DrawnCard` (flat structure with astroConnection: string)
- Removed `InstantInterpretation` (with position: number, positionName, positionDescription, astroConnection: string)
- Removed `CelticSynthesisPayload` (the old intermediary shape between CelticCrossReading and gptInterpretation)
- Kept: `SynthesisChapter`, `CelticCrossPrecomputedSignals`, `SavedCelticCrossReading`, `SavedReading`

**src/types/tarot.ts**
- Removed duplicate `DrawnCard`, `InstantInterpretation`, `TarotAstroContext`, `AstroConnection`
- Now re-exports these from `src/engine/tarot.ts`
- Kept: `SpreadMode`, `ThreeCardSynthesisSkeleton`, and element/suit/arcana aliases

### Removed adapter functions (src/components/tarot/TarotPage.tsx)
All four adapter functions eliminated:
- `adaptSingleCard` — was converting engine TarotCard to panel TarotCard (now same type)
- `adaptSingleInterp` — was converting engine InstantInterpretation to panel shape (now same type)
- `adaptThreeDrawnCard` — was converting engine TarotCard → flat types/tarot.ts DrawnCard
- `adaptThreeInterp` — was converting engine InstantInterpretation → types/tarot.ts shape

Also removed:
- `buildThreeAstroCtx` — built the old TypesAstroCtx; replaced by passing engine context + separate transit summary strings
- `buildCelticAstroCtx` — built the old CelticCtx; replaced by `buildEngineCtx` (calls `buildTarotAstroContext`)
- `computeDominantElement` / `computeDominantModality` local helpers — handled by engine
- `SIGN_ELEMENTS`, `SIGN_MODALITIES` imports — no longer needed in TarotPage

### CelticCrossReading.tsx — real engine interpretation
- Removed local `computeInstantInterpretation` stub (labeled "Engine (task-0006) will provide...")
- Now calls the real `computeInstantInterpretation` from `src/engine/tarot.ts` for each Celtic Cross card
- Passes the actual `CelticCrossPosition` as the spread position, so all 10 position-specific interpretations are computed with position label, meaning, and astro signals
- Merged the separate `drawnCards: DrawnCard[]` and `interpretations: InstantInterpretation[]` state arrays into a single `drawnCards: DrawnCard[]` where each entry is `{ card: TarotCard, reversed: boolean, interpretation: InstantInterpretation }`
- `CelticSynthesisPayload` intermediary eliminated — `buildCelticSynthesisPayload` now returns `TarotCelticSynthesisPayload` directly

### TarotInterpretationPanel.tsx — engine types
- Removed local `TarotCard` and `InstantInterpretation` interface definitions
- Now imports and re-exports from `src/engine/tarot.ts`
- Updated `AstroConnection` field references: `headline` → `astroHeadline`, `resonanceNote` → `elementResonanceNote`, `lunarNote` → `lunarPhaseNote`

### ThreeCardReading.tsx — engine types
- Imports `DrawnCard` and `TarotAstroContext` from `src/engine/tarot.ts`
- Props updated: removed `instantInterpretations` (now embedded in `DrawnCard.interpretation`), added explicit transit summary and moon sign props
- All `card.id`, `card.name`, etc. → `dc.card.id`, `dc.card.name` (engine DrawnCard nests TarotCard)
- `interp.astroConnection.headline` → `interp.astroConnection.astroHeadline`
- `interp.cardNumber` (removed from engine) → `dc.card.number`
- `astroContext.sunSign` → `astroContext.natalSunSign`, etc.

### gptInterpretation.ts — adapter eliminated
- `getTarotCelticSynthesis` previously took `CelticSynthesisPayload` and adapted it to `TarotCelticSynthesisPayload` server-side. The adapter is gone — the function now takes `TarotCelticSynthesisPayload` directly.

### astroConnection upgrade
The `astroConnection` field in Celtic Cross interpretation was previously a plain string:
```
astroConnection: [card.rulingPlanet, card.rulingSign].filter(Boolean).join(' — ')
```
It is now the full `AstroConnection` object from the engine, with `cardElement`, `natalDominantElement`, `elementResonanceNote`, `transitInfluence`, `lunarPhaseNote`, `advanceCategoryNote`, and `astroHeadline`.

## Type count before → after
- `TarotAstroContext` definitions: 3 → 1
- `DrawnCard` definitions: 3 → 1 (engine.ts is canonical)
- `InstantInterpretation` definitions: 3 → 1 (engine.ts is canonical)
- Adapter functions: 4 → 0

## Behavior
No user-visible behavior changes. All reading flows (single, three-card, Celtic Cross) work as before. The Celtic Cross now uses real position-aware interpretations via the engine instead of the stub.
