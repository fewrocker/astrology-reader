---
**Type:** Self-Review
**Task:** sprint-0013-task-0003-issue-todayused-counter-staleness
**Reviewer:** Claude (self-review)
**Date:** 2026-05-14
---

## Summary of Changes

Three files changed, three distinct defects resolved.

### 1. `src/services/gptInterpretation.ts` — JWT key reconciliation

**Before:** `const JWT_STORAGE_KEY = 'astral-chart-jwt'` hardcoded, diverging from `AUTH_TOKEN_KEY = 'astral-auth-token'` in `authService.ts`.

**After:** Import `AUTH_TOKEN_KEY` from `./authService` and remove the local constant. All reads of the token now use the same key the auth service writes.

**Correctness:** Every `callProxy()` invocation that previously sent requests without an `Authorization` header (because the token was stored under `'astral-auth-token'` but read from `'astral-chart-jwt'`) will now correctly attach the bearer token. Server-side account-based rate limiting becomes operative; unauthenticated IP-based limits no longer apply to logged-in users.

**Risk:** None. This is a pure key-name fix — no logic change, no new dependency surface.

### 2. `src/context/AuthContext.tsx` — expose `incrementTodayUsed`, fix `register()`

**Before:** `todayUsed` was read-only from consumers. `register()` never called `fetchUsage()` after account creation, leaving the count structurally inconsistent with `login()`.

**After:**
- Added `incrementTodayUsed = useCallback(() => { setTodayUsed(prev => prev + 1) }, [])` — stable identity via empty dependency array.
- Added `incrementTodayUsed: () => void` to `AuthContextType` interface and to the context value object.
- `register()` now `await fetchUsage()` before returning `{ ok: true }` and its `useCallback` dependency array includes `fetchUsage` to match the pattern established in `login()`.

**Correctness:** The `prev => prev + 1` functional form is safe for concurrent state batches. `fetchUsage` is `useCallback` with an empty dep array, so its identity is stable and adding it to `register()`'s dep array is correct.

**Risk:** `register()` now does one extra network round-trip (the usage fetch) on account creation. For a new account the server will return `todayUsed: 0`, matching the initial `useState(0)`, so the result is a no-op on the happy path. The risk is only that this fetch adds ~50–200ms latency to registration before the modal closes — acceptable given the structural correctness benefit.

### 3. `src/App.tsx` — call `incrementTodayUsed()` at all 4 GPT sites

**Before:** `todayUsed` never updated within a session after readings.

**After:** `incrementTodayUsed()` is called immediately after each of the four GPT awaits resolves successfully, before dispatching results:

| Site | Function awaited | Line (approx) |
|------|-----------------|---------------|
| Transit | `getGptInterpretation()` | ~319 |
| Synastry | `getSynastryInterpretation()` | ~378 |
| Couple Transit | `getCoupleTransitInterpretation()` | ~425 |
| Solar Return | `getSolarReturnInterpretation()` | ~482 |

**Placement rationale:** Called after the await (server confirmed success, usage incremented server-side) but before the `if (!cancelled)` guard and dispatch (reading may still be displayed to user). This is the correct ordering — the increment should happen even if the component that triggered the effect was cleaned up, because the server already counted the request.

**429 sync:** `RateLimitInfo` does not carry a `used` field, so there is no authoritative count to sync from on rate-limit errors. The local optimistic increment is the only counter update; the server remains authoritative and will deny the next request if limits are exceeded.

**`incrementTodayUsed` not in `useEffect` dependency arrays:** The `useCallback` wrapping `setTodayUsed(prev => prev + 1)` with `[]` deps gives it a stable identity, so omitting it from the dependency arrays (which all have `// eslint-disable-line react-hooks/exhaustive-deps` already) is safe.

## What Was Not Changed

- No changes to `HomeScreen.tsx` — the `renderAuthNudge()` logic already evaluates `todayUsed` correctly against `2` and `>= 3`; it just needed the counter to be live.
- No changes to `SessionBadge` — the `remaining = tierLimits[tier] - todayUsed` computation is already correct.
- No server-side changes — the fix is purely local/optimistic. The server remains the enforcement point.

## Verification

- `npx tsc --noEmit` passes with zero errors in the worktree.
- No ESLint suppression comments were added or modified.
- All four GPT await sites confirmed by direct code inspection.
