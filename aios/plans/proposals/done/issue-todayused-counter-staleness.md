---
**Type:** Issue Fix
**Originated by:** All four voices (Carmack: "the single most important observation"; Jobs: "a stale counter in the permanent header is a broken promise"; Miyazaki: "a companion that stopped walking"; Taleb: worst-case scenario)
**Sprint:** 0013

## Problem

`AuthContext.tsx` initializes `todayUsed` at `useState(0)` (line 91) and only ever updates it through `fetchUsage()` (lines 96–102), which calls `getUsage()` and sets the state from the server response. `fetchUsage()` is called in exactly two places: after a successful session restore via `getSession()` (line 160) and after `login()` (line 208). It is never called after `register()` (lines 216–238), and — critically — it is never called again after any successful GPT reading during a session.

Every call to `getGptInterpretation()`, `getSynastryInterpretation()`, `getCoupleTransitInterpretation()`, or `getSolarReturnInterpretation()` goes through `callProxy()` in `src/services/gptInterpretation.ts`. When the server responds successfully, `callProxy()` increments the module-level `_sessionCalls` counter (line 92) and fires a `track('gpt_request_made', ...)` analytics event (line 93), but nothing touches the React `todayUsed` state in `AuthContext`. There is no `setTodayUsed` call anywhere outside `AuthContext.tsx` itself — the service layer has no access to React state.

**Reproduction path:**

1. User loads the app with a saved birth chart and an authenticated free-tier session. `fetchUsage()` runs at session restore; suppose the server returns `todayUsed: 0`. React state: `todayUsed = 0`, `remaining = 3`.
2. User runs a transit reading. `runTransit` in `App.tsx` (lines 289–334) awaits `getGptInterpretation()`. The server increments `gpt_usage` to 1. The client dispatches `SET_TRANSIT_INTERPRETATION`. `todayUsed` in React is still `0`.
3. User navigates back to the home screen (`HomeScreen.tsx`). `renderAuthNudge()` (lines 122–205) evaluates `todayUsed <= 1` — true — and renders only `<div className="mb-6" />`. No nudge is shown.
4. `SessionBadge` in `App.tsx` (lines 78–81) computes `remaining = (tierLimits[tier] ?? 3) - todayUsed = 3 - 0 = 3`. The dropdown shows "3 readings left today" — one reading behind reality.
5. User runs a second reading (synastry). Server increments `gpt_usage` to 2. `todayUsed` is still `0`. Badge still reads "3 readings left today."
6. User runs a third reading (solar return). Server increments `gpt_usage` to 3 and returns HTTP 429. `callProxy()` throws `RateLimitError`. `runSolarReturn` catches it and calls `openUpgrade(e.info)`. The `UpgradeModal` opens abruptly — the user has received zero prior warning and the badge was showing "3 readings left today" until the wall hit.

**Secondary defect — `register()` path:**

`register()` in `AuthContext.tsx` (lines 216–238) never calls `fetchUsage()`. After registration the `todayUsed` state is `0` from the initial `useState(0)`. This is accidentally correct for new accounts (server-side count is also 0), but it is structurally inconsistent with the `login()` path and would silently miscount if a registration follows IP-based usage tracking on the server side. The `HomeScreen.tsx` "first-visit welcome sentence" guard at line 66 explicitly checks `todayUsed === 0` alongside `sessionStorage.getItem('just-registered')`, making the session behavior depend on this accidental correctness.

**Secondary defect — stale JWT key in `gptInterpretation.ts`:**

`callProxy()` reads the auth token using `JWT_STORAGE_KEY = 'astral-chart-jwt'` (line 29), while `AuthContext.tsx` line 2 imports `AUTH_TOKEN_KEY` from `authService.ts` to store the token. If `AUTH_TOKEN_KEY` resolves to a different string (e.g., `'astral-auth-token'`), then `callProxy()` sends every GPT request without an `Authorization` header — the user is treated as unauthenticated by the server, IP-based limits apply instead of account-based limits, and all analytics events in `gptInterpretation.ts` land with no `user_id` attribution in the `events` table. This is a silent data-integrity failure that compounds the `todayUsed` staleness by making it impossible to correlate events to users even when logged in.

**Why this matters in production:**

Sprint 0013 is hardening the conversion funnel. The sprint vision requires the remaining-reads count to be permanently visible in the header (not behind a click). Promoting `todayUsed`-derived information to a persistent UI surface while `todayUsed` never updates makes the product actively mislead the user. A free user who has made 2 readings sees "3 readings left today" in the header — a false promise — until the server denies the third request and the UpgradeModal fires with no forewarning. Jobs' framing is exact: "A stale counter in a hidden dropdown is a minor bug. A stale counter in the permanent header is a broken promise." The staleness bug must be resolved before the counter is promoted to permanent visibility.

## Expected Behavior

After every successful GPT reading within a session, `todayUsed` in `AuthContext` increments by 1 immediately — without a server round-trip. The increment is local and optimistic; the server remains authoritative and will enforce the actual limit via 429. Within a session, the following must hold:

- `SessionBadge` shows the correct remaining count after each reading, without requiring a page reload or re-login.
- `HomeScreen.renderAuthNudge()` fires the "1 reading left today" copy at `todayUsed === 2` and the "Daily limit reached" copy at `todayUsed >= 3`, in the same session as the readings that consumed those slots.
- A free authenticated user who has made 2 readings in a single session sees the limit-warning nudge before they attempt a third reading, not after it is denied.

The fix requires `AuthContext` to expose an `incrementTodayUsed` callback (a `useCallback` wrapping `setTodayUsed(prev => prev + 1)`) via context, and for each of the four GPT async blocks in `App.tsx` — `runTransit` (line 319), `runSynastry` (line 375), `runSynastryTransit` (line 420), and `runSolarReturn` (line 482) — to call `incrementTodayUsed()` immediately after the awaited interpretation resolves successfully and before dispatching results. No re-fetch from the server is needed or appropriate; a local increment is the correct trade.

`register()` must also call `await fetchUsage()` after the profile is applied, matching the pattern established in `login()`, to eliminate the structural inconsistency even if it is currently harmless.

The `JWT_STORAGE_KEY` constant in `gptInterpretation.ts` must be reconciled with `AUTH_TOKEN_KEY` from `authService.ts` — both must reference the same localStorage key, preferably by importing the constant rather than hardcoding the string independently.
