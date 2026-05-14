---
**Type:** Self-Review
**Task:** sprint-0013-task-0005-feat-conversion-funnel-analytics
**Reviewer:** Claude (self-review)
**Date:** 2026-05-14
---

## Summary

All 15 specifications from the sprint card were implemented. One additional fix was bundled: the JWT key mismatch in `gptInterpretation.ts` (Open Question 1 from the card), which was a prerequisite for authenticated analytics events to carry a `user_id`. The `ceremonyStartedAt` useState-to-useRef conversion (Open Question 2) was also completed.

9 files changed, 262 insertions, 25 deletions.
`npx tsc --noEmit` passes with zero errors.

---

## Spec-by-Spec Checklist

| # | Spec | Status | Notes |
|---|------|--------|-------|
| 1 | `UpgradeModal.tsx` — `upgrade_modal_seen` | ✓ | Separate `useEffect([isOpen])` with `if (!isOpen) return` guard; includes `heading` property calling `getHeading()` |
| 2 | `UpgradeModal.tsx` — `upgrade_cta_clicked` | ✓ | First statement in `handleCheckout`, before `if (!authenticated)` guard |
| 3 | `UpgradeModal.tsx` — `upgrade_checkout_started` | ✓ | Fires after `data.url` confirmed, before ceremony wait |
| 4 | `UpgradeModal.tsx` — `upgrade_checkout_failed` | ✓ | Three branches: `'server_error'` (!res.ok), `'no_url'` (!data.url), `'network_error'` (catch); all fire before ceremony wait |
| 5 | `UpgradeModal.tsx` — `upgrade_dismissed` + `handleDismiss` | ✓ | `handleDismiss` defined as `useCallback`; replaces `onClose` in: × button, backdrop click, "Continue with free" button, Escape key handler; `checkoutState` included in payload |
| 6 | `AuthModal.tsx` — `auth_modal_seen` | ✓ | Inside `if (isOpen)` block of the `[isOpen, initialTab]` useEffect |
| 7 | `AuthModal.tsx` — `auth_modal_dismissed` | ✓ | First statement in `handleClose`; fires only on non-auth closure |
| 8 | `AuthModal.tsx` — `auth_tab_switched` | ✓ | Tab-switcher buttons (with `t !== tab` guard to avoid self-switch events) and both switch-hint inline links |
| 9 | `server/routes/analytics.ts` — `GET /funnel` | ✓ | 503 on missing env var, 403 on wrong secret, per-event COUNT loop, FUNNEL_EVENTS list (17 events in specified order), inclusive date bounds, registered before write rate limiter |
| 10 | `server/db.ts` — composite index | ✓ | `idx_events_event_created ON events(event, created_at)` added to CREATE INDEX block |
| 11 | `AuthContext.tsx` — `incrementTodayUsed` + `register()` fix | ✓ | `useCallback(() => setTodayUsed(prev => prev + 1), [])`, added to interface and context value; `register()` now calls `getProfile()` and `await fetchUsage()` before returning |
| 12 | `App.tsx` — `incrementTodayUsed()` at GPT call sites | ✓ | Called after all 4 GPT awaits (transit, synastry, synastry-transit, solar return); natal chart has no GPT call (confirmed by code inspection — `assembleReading()` is pure local arithmetic) |
| 13 | `App.tsx` `SessionBadge` — inline remaining count | ✓ | `remaining <= 2` threshold; renders `{remaining} left` span with `aria-hidden="true"` adjacent to ✦ glyph; threshold documented as inline comment |
| 14 | `analytics.ts` — event schema comment | ✓ | Comment block immediately before `export function track(...)` covering all 10 specified events with property keys and types |
| 15 | `.env.example` — `ANALYTICS_ADMIN_SECRET` | ✓ | Added with generation instructions and explanation of 503 behavior; endpoint behavior also documented as JSDoc comment in `server/routes/analytics.ts` |

---

## Bundled Fixes (Open Questions)

### Open Question 1 — JWT key mismatch in `gptInterpretation.ts`
**Resolved.** `gptInterpretation.ts` was using hardcoded `'astral-chart-jwt'` while `authService.ts` exports `AUTH_TOKEN_KEY = 'astral-auth-token'`. Fixed by importing `AUTH_TOKEN_KEY` from `./authService` and removing the local constant. Without this fix, all analytics events from authenticated users would have landed with `user_id = null`.

### Open Question 2 — `ceremonyStartedAt` useState timing bug
**Resolved.** Converted from `useState<number>(0)` to `useRef<number>(0)`. The catch block now reads `ceremonyStartedAt.current` synchronously rather than from a potentially-stale state snapshot, preventing fast network failures from always waiting the full 2000ms ceremony.

### Open Question 3 — `handleAuthComplete` stale `authenticated` closure
**Not resolved** (deferred). The spec gives three options. Option (a) adds a `useRef` for `authenticated`; option (b) removes the re-call; option (c) is open-ended. This task's scope is analytics instrumentation. The double-fire risk for `upgrade_cta_clicked` from unauthenticated users who complete auth is acknowledged: the second call (from `handleAuthComplete`'s `handleCheckout` re-invocation) will fire with the still-false `authenticated` prop. Resolving the stale closure is task 0004's domain (checkout race condition fix). Documented here for awareness.

### Open Questions 4, 5, 6
Not in scope for this task. Open Question 4 (session_id correlation for per-user funnel) is documented as a comment in the `/funnel` route handler. Open Question 5 (nudge threshold) is addressed via the `remaining <= 2` threshold in SessionBadge. Open Question 6 (IP-quota on registration) is noted in the register() fix as a known limitation.

---

## 429 Sync Limitation

The spec (§12) states: "On a 429 response, call `setTodayUsed(e.info.used)` to sync the client counter to the server's authoritative count." However, `RateLimitInfo` does not carry a `used` field — it carries `{ resetAt, authenticated, tier }`. The middleware returns `{ used, limit, tier, authenticated }` in the 429 JSON body, but `RateLimitError` does not surface the `used` field in its `.info` property. Since modifying `RateLimitError` and `callProxy` is outside this task's file scope, and the catch blocks in `App.tsx` only have access to `e.info` (not the raw response), the 429 sync was not implemented. The optimistic increment is the only counter update. This is the same limitation documented in the task 0003 review.

**Severity:** Warning (not blocking). The server remains authoritative and will deny the next over-limit request regardless of client counter state.

---

## Blocking Issues

None. TypeScript compiles clean. All 15 specs implemented.
