---
**Type:** Issue Fix
**Originated by:** Carmack, Taleb
**Sprint:** 0013
**Status:** done — 2026-05-14

## Outcome

Fixed in branch `sprint-0013-task-0001-issue-analytics-jwt-key-mismatch`.

- `src/services/gptInterpretation.ts`: removed `JWT_STORAGE_KEY = 'astral-chart-jwt'`, imported and used `AUTH_TOKEN_KEY` from `./authService`. Fixes `callProxy()` auth header, `isAuthenticated()` return value, and `authenticated` property in `gpt_limit_hit` events.
- `src/services/analytics.ts`: replaced local `JWT_KEY` literal with imported `AUTH_TOKEN_KEY` — no longer hardcodes the key outside `authService.ts`.
- `npx tsc --noEmit` passes cleanly. Code review verdict: PASS.

## Problem

`src/services/analytics.ts` and `src/services/gptInterpretation.ts` each hardcode a different `localStorage` key for the JWT, and only one matches the key that `AuthContext.tsx` actually writes.

- `src/services/authService.ts` line 3 exports `AUTH_TOKEN_KEY = 'astral-auth-token'`.
- `src/context/AuthContext.tsx` line 2 imports `AUTH_TOKEN_KEY` from `authService` and uses it throughout: `localStorage.setItem(AUTH_TOKEN_KEY, jwt)` at lines 134, 186, and 220. The key written to storage is always `'astral-auth-token'`.
- `src/services/analytics.ts` line 2 declares `JWT_KEY = 'astral-auth-token'` — matching the authoritative key. `track()` reads `localStorage.getItem(JWT_KEY)` at line 8 and attaches a `Bearer` token when found.
- `src/services/gptInterpretation.ts` line 29 declares `JWT_STORAGE_KEY = 'astral-chart-jwt'` — a different string. `callProxy()` reads `localStorage.getItem(JWT_STORAGE_KEY)` at line 53; `isAuthenticated()` reads the same key at line 36.

`'astral-chart-jwt'` is never written by any code in the codebase. For any logged-in user, `localStorage.getItem('astral-chart-jwt')` returns `null`.

The consequences are two-fold:

**Analytics:** `track()` in `analytics.ts` uses the correct key and does attach the JWT to `POST /event` requests. The server's `server/routes/analytics.ts` lines 31–39 verify the `Authorization: Bearer` header and resolve `user_id` from the token. This path is working correctly.

**GPT service auth header:** `callProxy()` in `gptInterpretation.ts` reads the wrong key, so `localStorage.getItem('astral-chart-jwt')` always returns `null` for authenticated users. The `hasToken` flag stays `false` (line 51). The `Authorization` header is never set on GPT requests. The GPT proxy on the server therefore sees every request as unauthenticated, regardless of whether the user is logged in.

**Analytics silent corruption:** `gpt_limit_hit` and `gpt_request_made` events are fired from within `gptInterpretation.ts` (lines 83 and 93) via `track()`. Both calls use the `track()` function from `analytics.ts`, which reads the correct key — so these events do carry the JWT and land with a non-null `user_id` in the `events` table. However, the `authenticated` property passed to `gpt_limit_hit` at line 83 is derived from `hasToken` (line 74), which is always `false` due to the wrong key. Every `gpt_limit_hit` event records `authenticated: false` even when the user is logged in.

**Rate limit tier:** The server's GPT rate limit middleware determines the user's tier from the `Authorization` header. Because the header is never sent by authenticated users, the middleware treats them as unauthenticated and applies the anonymous IP-based limit rather than their subscription tier. A paying `basic` or `advanced` user hitting the GPT proxy appears to the server as a free unauthenticated user.

**`isAuthenticated()` in gptInterpretation.ts:** This function (line 34) checks for the token under the wrong key and returns `false` for all logged-in users. The `getGptNudge()` function (line 43) therefore presents the unauthenticated sign-up nudge to users who are already authenticated.

To reproduce: log in, note that `localStorage.getItem('astral-auth-token')` returns a JWT string and `localStorage.getItem('astral-chart-jwt')` returns `null`. Make any GPT call. Inspect the outgoing `POST /api/gpt/interpret` request — no `Authorization` header is present despite the user being authenticated.

## Expected Behavior

`src/services/gptInterpretation.ts` should import and use `AUTH_TOKEN_KEY` from `src/services/authService.ts` (the value `'astral-auth-token'`), the same constant used by `AuthContext.tsx` and `analytics.ts`. No string literal for the JWT storage key should be hardcoded outside of `authService.ts`.

With the correct key in place:

- `callProxy()` attaches the `Authorization: Bearer <jwt>` header on every request for authenticated users.
- The server's rate limit middleware recognises the user's subscription tier and enforces the correct limit.
- `isAuthenticated()` returns `true` for logged-in users, suppressing the unauthenticated sign-up nudge.
- `gpt_limit_hit` events record `authenticated: true` when the user is logged in, making the analytics property accurate.
- The `events` table `user_id` column for `gpt_limit_hit` and `gpt_request_made` events remains correctly populated (this already works via `analytics.ts`); no change to the analytics write path is required.
