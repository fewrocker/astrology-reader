**Task** — sprint-0024-task-0001-issue-celtic-live-interpretation
**Status** — Completed
**Reviewer** — Agent

---

## What Was Done

Three compounding defects were fixed that caused the Celtic Cross to be the least-interpreted spread despite being the most complex.

### Defect 1 — Real engine wired for Celtic Cross instant interpretations

**File:** `src/components/tarot/CelticCrossReading.tsx`

- Removed the local stub `computeInstantInterpretation` (76–92) entirely.
- Imported `computeInstantInterpretation` from `../../engine/tarot` and `TarotAstroContext as EngineCtx` for the engine type.
- Added `engineAstroContext: EngineCtx` prop to `CelticCrossReadingProps`.
- Implemented `computeInstantInterpretationForCeltic` which:
  - Converts `CelticCrossPosition` → engine `SpreadPosition` (mapping `name` → `label`, `description` → `meaning`).
  - Calls the real `engineComputeInstantInterpretation(sourceCard, reversed, enginePosition, engineCtx)`.
  - Adapts the engine's structured `AstroConnection` object to the local `astroConnection: string` by joining `astroHeadline`, `transitInfluence`, `elementResonanceNote`, and `lunarPhaseNote`.
  - Derives `reversalNote` from the engine output rather than a static template.
- Each of the ten Celtic Cross positions now produces position-aware, transit-aware, astro-grounded `InstantInterpretation`. The Tower in the Foundation position adapts its meaning through `adaptInterpretationToPosition` with the Foundation spread profile.

### Defect 2 — `buildCelticAstroCtx` now computes real transit data

**File:** `src/components/tarot/TarotPage.tsx`

- Added a new `CelticReadingFlow` component (mirroring the existing `ThreeReadingFlow` pattern) that:
  - Computes `engineCtx` via `buildEngineCtx`.
  - Calls `calculateTransits(chartData, 'daily')` and `calculateTransits(chartData, 'weekly')`.
  - Passes `formatTransitSummary` output and current moon sign into `buildCelticAstroCtx`.
  - Passes `engineCtx` as `engineAstroContext` to `CelticCrossReading`.
- Updated `buildCelticAstroCtx` to accept `dailyTransitSummary`, `weeklyTransitSummary`, and `currentMoonSign` parameters:
  - `currentMoonPhase` is now populated from the live Moon sign (via `calculateTransits`).
  - `significantTransits` now contains `[dailyTransitSummary, weeklyTransitSummary]` for threading to the server.
- The `celtic-reading` switch case now renders `CelticReadingFlow` instead of calling `CelticCrossReading` directly.

### Defect 3 — Celtic synthesis payload carries live transit summaries

**Files:** `server/services/gptTarot.ts`, `src/services/gptInterpretation.ts`

**Server (`server/services/gptTarot.ts`):**
- Added `dailyTransitSummary: string | null` and `weeklyTransitSummary: string | null` fields to `TarotCelticSynthesisPayload`.
- `handleTarotCelticSynthesis` now calls `calculateTransits(natalChart, 'daily')` and `calculateTransits(natalChart, 'weekly')` in the authenticated user block (same pattern as `handleTarotThreeSynthesis`).
- `currentMoonSign` is now extracted from live transit data rather than left as the client's `moonSign`.
- Added `## Daily Transit Context` and `## Weekly Transit Context` sections to the Celtic synthesis prompt (placed after `## This Person's Living Sky`).
- Strengthened the `**Astrology Resonance**` section instruction to require specific daily and weekly transit connections to actual cards.

**Client (`src/services/gptInterpretation.ts`):**
- Added `dailyTransitSummary: string | null` and `weeklyTransitSummary: string | null` to the client-side `TarotCelticSynthesisPayload` interface.
- `getTarotCelticSynthesis` extracts `significantTransits[0]` (daily) and `significantTransits[1]` (weekly) from the `CelticSynthesisPayload` and includes them in the server payload.
- Fixed `number: 0` constant → `number: c.number ?? 0` for accurate card number data.

**Supporting changes:**
- `src/components/tarot/types.ts`: Added `number?: number` to the card shape in `CelticSynthesisPayload`.
- `buildCelticSynthesisPayload` in `CelticCrossReading.tsx` now includes `number: card.number` in each card mapping.

---

## Build Status

- `npm run build` — clean, no errors (1921 modules transformed).
- `npx tsc --project tsconfig.server.json --noEmit` — clean, no errors.

---

## Impact

The Celtic Cross is now on parity with the three-card flow for sky data quality:
- Every card reveal panel shows position-aware meaning (a Tower in Foundation ≠ a Tower in Outcome).
- Transit influence, lunar phase note, and element resonance note appear in the interpretation panel.
- The GPT synthesis prompt receives daily and weekly transit summaries and can fulfill its own instruction to name specific transits.
- The `astroHeadline` field in the synthesis prompt is now the engine-computed headline, not a raw planet-sign concatenation.
