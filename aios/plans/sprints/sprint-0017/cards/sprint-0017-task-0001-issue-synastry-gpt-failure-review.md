# Review: sprint-0017-task-0001-issue-synastry-gpt-failure

**Status:** completed
**Date:** 2026-05-15

## Summary

Three defects fixed in the synastry GPT pipeline.

## Changes Made

### Defect 1 — `getSynastryInterpretation` and `getCoupleTransitInterpretation` missing try/catch
**File:** `src/services/gptInterpretation.ts`

Both functions previously returned `callProxy(...)` directly with no error handling, meaning any error would propagate as an unhandled rejection rather than being caught and displayed as an inline message. Both now follow the same pattern as `getSolarReturnInterpretation`:
- Wrapped in try/catch
- RateLimitError is rethrown so the caller can open UpgradeModal
- All other errors return `err instanceof Error ? err.message : GPT_SERVER_ERROR`
- Success path returns `(result as string) || 'Unable to generate synastry interpretation.'`

### Defect 2 — Triple `incrementTodayUsed()` calls
**File:** `src/App.tsx`

Four reading paths (transit, synastry, synastry-transit, solar-return) each had three consecutive calls to `incrementTodayUsed()` — two unconditional ones after the await, and one inside the `if (!cancelled)` guard. The two unconditional duplicates were removed from every block. Each path now has exactly one call, inside the `if (!cancelled)` guard alongside the dispatch, ensuring usage is counted only on success and only when the component is still mounted.

### Defect 3 — `max_tokens` too low for synastry handlers
**File:** `server/services/gpt.ts`

- `handleSynastryInterpretation`: changed from default 2000 tokens to `{ temperature: 0.85, max_tokens: 4000 }` — synastry readings are long and were being truncated.
- `handleCoupleTransitInterpretation`: changed to `{ temperature: 0.85, max_tokens: 3000 }` — couple transit readings also benefit from more headroom.

## Checks

- TypeScript build passes cleanly on the main project (worktree errors are pre-existing missing-node_modules issues unrelated to these changes).
- All three defects are independently verifiable by reading the diff.
- No unintended side effects: other handlers (`handleSolarReturnInterpretation`, natal, transit, etc.) are untouched.
