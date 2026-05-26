# Code Review — sprint-0025-task-0006-code-tarot-shared-utilities

**Reviewer:** Code Review Agent
**Date:** 2026-05-26
**Branch:** sprint-0025-task-0006-code-tarot-shared-utilities

---

## Summary

The task extracts `shuffleTarotDeck`, `computeCardReversal`, `formatTransitSummary`, `computePersonalDay`, `computePersonalYear`, `buildEngineCtx`, and transit setup (via `useTransitData` hook) from `TarotPage.tsx` and `CelticCrossReading.tsx` into a new canonical shared module at `src/components/tarot/tarotUtils.ts`. All consuming files import from there. All three reading flows (Single, Three-card, Celtic Cross) use the same `useTransitData` hook for consistent transit data preparation. The build passes with zero TypeScript errors.

---

## Files Reviewed

| File | Change |
|---|---|
| `src/components/tarot/tarotUtils.ts` | New file — canonical implementations of all shared utilities plus `useTransitData` hook |
| `src/components/tarot/TarotPage.tsx` | Removed all local function definitions; imports all utilities and hook from tarotUtils |
| `src/components/tarot/CelticCrossReading.tsx` | Removed `shuffleTarotDeck` and `computeCardReversal` local definitions; imports from tarotUtils |
| `server/services/gptTarot.ts` | Added docblock to server-side `formatTransitSummary` noting canonical source |

---

## Findings

### Blocking

None.

---

### Warnings

**W1 — Server-side `formatTransitSummary` is still duplicated (unavoidable, documented).**
The sprint card treats the client-server duplication as a problem. Due to separate TypeScript compilation contexts (`tsconfig.app.json` covers `src/` only; `tsconfig.server.json` covers `server/` only with `rootDir: ./server`), the server cannot import from `src/`. The function is kept in `server/services/gptTarot.ts` with a docblock identifying it as a server-side mirror of the canonical client source. Any behavior change must be applied to both copies. This is the correct pragmatic resolution given the project structure. A future refactor could introduce a `shared/` directory covered by both tsconfigs if the duplication grows further.

---

### Suggestions

**S1 — `DataTarotCard` alias in `CelticCrossReading.tsx` could be simplified.**
`CelticCrossReading.tsx` still imports `type { TarotCard as DataTarotCard } from '../../data/tarot/types'`. Now that the file imports `shuffleTarotDeck` from `tarotUtils.ts` (which returns `TarotCard[]` from the same underlying `types.ts`), the alias is only needed for the `deck` state annotation. The types are structurally identical so there is no bug, but the alias could be dropped and the type imported directly from `../../engine/tarot` (which re-exports it) for consistency. Non-blocking; purely cosmetic.

**S2 — `buildEngineCtx` calls in each flow could eventually be merged into `useTransitData` or a combined hook.**
Each flow still independently calls `useMemo(() => buildEngineCtx(...))`. A `useTarotReadingContext(chartData, birthDate)` hook returning both `engineCtx` and the transit context would reduce the two-line setup to one. This is a future improvement, not a defect — the current implementation is correct and clear.

---

## Verdict

**No blocking issues.** The implementation is correct, the build is clean, and all canonical implementations live in one place. Both the function-level duplication and the transit-setup pattern are fully addressed within the client-side compilation boundary. The server-side mirror is documented.
