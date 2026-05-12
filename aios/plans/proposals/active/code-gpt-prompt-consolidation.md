# Proposal: Consolidate GPT Prompt Builders

**Type:** Code Enhancement
**Originated by:** Carmack + Taleb
**Impact:** Medium
**Effort:** Low

## Problem

GPT prompt-building functions are scattered across at least 4 files:
- `src/components/dream/DreamModal.tsx` — `buildDreamSnapshotPrompt`, `buildNatalContext`
- `src/components/reading/DailySnapshotCard.tsx` — `buildSnapshotPrompt`
- `src/engine/transits.ts` — `buildTransitPrompt`
- `src/engine/synastry.ts` — `buildSynastryPrompt`, `buildCoupleTransitPrompt`

These functions are the interface between the app's data and OpenAI. They define what information the AI receives, how it's formatted, and what tone is requested. This is high-value logic that:
- Should be testable in isolation
- Should be easy to audit when changing prompt strategy
- Should be easy to update when adding context (e.g., numerology data, solar return context)

Currently, adding new cross-system context (like numerology) to prompts means finding and editing multiple scattered files. The system prompt for the transit interpreter lives in `gptInterpretation.ts` while the user prompt is built in `transits.ts`. They're conceptually one unit but physically separated.

## Proposed Solution

Create `src/services/prompts/` (or `src/services/gptPrompts.ts`) as a single module that owns all prompt-building functions:

```typescript
// src/services/gptPrompts.ts
export function buildTransitPrompt(data: TransitPromptInput): string
export function buildSynastryPrompt(data: SynastryPromptInput): string
export function buildCoupleTransitPrompt(data: CoupleTransitPromptInput): string
export function buildDreamPrompt(data: DreamPromptInput): string
export function buildDailySnapshotPrompt(data: DailySnapshotPromptInput): string
export function buildNatalContext(chart: ChartData, birthDate: string): string
// future: export function buildSolarReturnPrompt(data: SolarReturnPromptInput): string
```

Each function takes a typed input object and returns a string. The system prompts (the "you are an expert astrologer" instructions) move into this module or into a constants file alongside it.

**Migration approach:** Extract prompt builders one at a time. Update imports. Zero behavioral change — this is pure refactoring.

## Why Code Enhancement, Not Feature or Issue Fix

This is architectural cleanup. No user-visible behavior changes. Improves maintainability and testability. Does not fix a user-facing bug (functionality works today, just poorly organized).

## Impact Assessment
- **Impact:** Medium — high maintainability value; directly unblocks clean numerology/solar-return prompt integration in future features
- **Effort:** Low — pure extraction and reorganization; no logic changes

## Dependencies
- `src/engine/transits.ts`
- `src/engine/synastry.ts`
- `src/components/dream/DreamModal.tsx`
- `src/components/reading/DailySnapshotCard.tsx`
- `src/services/gptInterpretation.ts`

## Implementation Summary

**New files:**
- `src/services/gptPrompts.ts` — all prompt builder functions, typed input interfaces, system prompt constants

**Modified files:**
- `src/engine/transits.ts` — remove `buildTransitPrompt`, import from `gptPrompts`
- `src/engine/synastry.ts` — remove `buildSynastryPrompt`, `buildCoupleTransitPrompt`, import from `gptPrompts`
- `src/components/dream/DreamModal.tsx` — remove inline prompt builders, import from `gptPrompts`
- `src/components/reading/DailySnapshotCard.tsx` — remove inline prompt builder, import from `gptPrompts`
- `src/services/gptInterpretation.ts` — move system prompts to `gptPrompts` or reference them from there
