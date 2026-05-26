# Sprint 0024 — State

## Status
completed

## Branch
sprint-0024

## Tasks

| Task | Slug | Status |
|------|------|--------|
| 0001 | sprint-0024-task-0001-issue-celtic-live-interpretation | completed |
| 0002 | sprint-0024-task-0002-issue-deck-fan-card-backs | completed |
| 0003 | sprint-0024-task-0003-code-tarot-type-unification | completed |
| 0004 | sprint-0024-task-0004-feat-gpt-synthesis-depth | completed |
| 0005 | sprint-0024-task-0005-feat-shuffle-ritual-wiring | completed |

## Conflict Resolutions

### task-0001 × task-0003 (Celtic Cross type unification + live transits)

**Files**: `src/components/tarot/types.ts`, `src/components/tarot/TarotPage.tsx`, `src/components/tarot/CelticCrossReading.tsx`, `src/services/gptInterpretation.ts`

**Resolution**: Task-0003's unified type system was kept as the canonical approach — `TarotAstroContext`/`DrawnCard`/`InstantInterpretation` from `src/engine/tarot.ts` are the single types used everywhere. Task-0001's real transit wiring was preserved by threading `dailyTransitSummary`, `weeklyTransitSummary`, and `moonSign` as explicit props into `CelticCrossReading` (alongside `tarotAstroContext`). `buildCelticSynthesisPayload` was updated to accept and forward these strings to the `TarotCelticSynthesisPayload`. The old `CelticSynthesisPayload` local type and the old `buildCelticAstroCtx`/`toDrawnCard`/`computeInstantInterpretationForCeltic` helpers were removed. `CelticReadingFlow` in TarotPage computes live transits via `calculateTransits` and passes summaries explicitly.

### task-0004 × previous state (GPT synthesis depth)

**Files**: `src/services/gptInterpretation.ts`, `src/components/tarot/ThreeCardReading.tsx`, `server/services/gptTarot.ts`

**Resolution**: Task-0004's richer `signals` computation (elemental dignities, court card dynamics, numeral progression) was fully preserved. `clientComputeCelticStructuralSignals` was updated to use `TarotCardPayload` (unified type with `.id`/`.name`) instead of the old format (`.cardId`/`.cardName`). `getTarotCelticSynthesis` keeps the direct pass-through from task-0003 but enriches the payload with computed signals before sending. The server-side prompt now includes the intention anchor and structural instructions from task-0004. `ThreeCardReading.tsx` conflict resolved by accessing card properties via `.card.element`, `.card.name`, etc. (unified `DrawnCard` type).

### task-0005 × previous state (shuffle ritual wiring)

**Files**: `src/components/tarot/TarotPage.tsx`

**Resolution**: Both `CelticReadingFlow` (HEAD) and `ShuffleRitualFlow` (task-0005) were preserved — they serve different routing cases. Task-0005's `ritualCardIndices` auto-pick `useEffect` was added to `ThreeReadingFlow` alongside HEAD's transit calculations. The `TarotPageInner` switch now handles `shuffle-ritual` case via `ShuffleRitualFlow` and passes `ritualCardIndices` to single/three reading flows.
