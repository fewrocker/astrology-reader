---
**Type:** Feature
**Originated by:** All four voices
**Sprint:** 0013

## Problem / Opportunity

The product's most consequential screen — `UpgradeModal.tsx` (445 lines) — fires zero `track()` calls. The team has no instrumentation on the modal-seen, CTA-clicked, or dismissed moments that determine whether the conversion funnel is working. `AuthModal.tsx` tracks `login_completed` and `signup_completed` (via `AuthContext.tsx`) but does not track modal-seen, modal-dismissed, or the tab switch between login and register. The `gptInterpretation.ts` service fires `gpt_limit_hit` before the modal opens, but that event is orphaned — there is no `upgrade_modal_seen` to correlate it against, so there is no way to measure how many users who hit a limit actually saw the modal versus bailed out of the tab.

On the server, `server/routes/analytics.ts` is 55 lines with a single `POST /event` writer. There is no read path. The `events` table accumulates data in `server/db.ts` with three existing indices (`idx_events_session_event`, `idx_events_user_event`, `idx_events_created_at`), but none of them are optimally structured for the funnel query pattern `WHERE event = ? AND created_at BETWEEN ? AND ?`. The team cannot currently inspect conversion data without raw database access or a manual SQLite query.

Additionally, the `todayUsed` counter in `AuthContext.tsx` is loaded once at login (`fetchUsage()` at line 96–101) and never incremented client-side after a reading completes. `App.tsx`'s `SessionBadge` component computes `remaining = tierLimits[tier] - todayUsed` and renders it inside a closed dropdown — the user must click the star glyph to see it. With `todayUsed` frozen at 0 for the duration of the session, the counter is always wrong by the number of readings completed, and the `HomeScreen.tsx` nudge (which gates on `todayUsed >= 2`) never fires during a session. The result: a free user has zero visual warning before hitting the wall.

The combination of these gaps means the team is blind at the most critical moment in the product: between the user hitting a limit and the user either upgrading or leaving.

## Vision

When this feature is complete, the team can open the funnel endpoint — `GET /api/analytics/funnel?from=2026-05-01&to=2026-05-14` — and see, for any date range, how many users saw the upgrade modal, how many clicked a CTA, how many dismissed, and how that compares to the raw volume of limit-hit events. If the `upgrade_dismissed` count is ten times `upgrade_cta_clicked`, the team knows the modal's copy or tier presentation is failing and can act. If `upgrade_modal_seen` is far lower than `gpt_limit_hit`, there is a rendering or routing bug swallowing the modal. The data makes invisible problems visible.

In the client, every event the user can take in the conversion path is instrumented: arriving at the upgrade modal, clicking a CTA, switching tiers, dismissing, encountering a checkout error. Each `auth_modal_seen` event carries which tab opened first, so the team can see whether users approaching auth during an upgrade flow are arriving on the register or login tab. The `upgrade_cta_clicked` event carries the tier selected, the current tier, and the heading variant shown, so future A/B tests on `getHeading()` copy are possible without a new deploy.

The `todayUsed` counter in the header tells the truth after every reading. A user who does two transit readings in one session sees the count change from 3 to 2 to 1 after each one, because `incrementTodayUsed()` fires on every successful GPT response in `App.tsx`. The `SessionBadge` shows the remaining count inline in the header bar — no click required — when `remaining <= 2`. The `HomeScreen` auth nudge fires as soon as `todayUsed >= 1`, not at `>= 2`, so the signal appears after the first reading rather than the second-to-last.

The product can now be handed to real paying users with confidence that the team will know, within hours of any change, whether conversion improved or degraded.

## Specifications

### 1. `UpgradeModal.tsx` — `upgrade_modal_seen` event

Add a `useEffect` with dependency `[isOpen]` that fires when `isOpen` becomes `true`. This must be a separate effect from the existing `useEffect` at line 69 (which resets `checkoutState` and focuses the first button). The new effect must guard on `if (!isOpen) return` to prevent firing on close.

```ts
track('upgrade_modal_seen', {
  currentTier: currentTier,          // 'free' | 'basic' | 'advanced'
  authenticated: authenticated,      // boolean
  intendedTier: intendedTier ?? null, // 'basic' | 'advanced' | null
  heading: getHeading(currentTier, authenticated, intendedTier), // the exact heading string shown
})
```

The `heading` property is required. It is the key discriminator for future copy experiments: without it, a change to `getHeading()` cannot be attributed to a change in conversion. The `intendedTier` property distinguishes feature-gate modal appearances (when a user hit a feature wall, e.g., `intendedTier === 'advanced'`) from daily-limit appearances (`intendedTier === null` or `undefined`).

### 2. `UpgradeModal.tsx` — `upgrade_cta_clicked` event

Add `track(...)` as the first statement inside `handleCheckout` at line 112, before the `if (!authenticated)` guard. This ensures the event fires even for unauthenticated users who are redirected to the auth flow, not just for users who proceed directly to Stripe.

```ts
track('upgrade_cta_clicked', {
  tier: tier,                        // 'basic' | 'advanced' — the tier CTA the user clicked
  currentTier: currentTier,          // prop value at click time
  authenticated: authenticated,      // prop value at click time
  intendedTier: intendedTier ?? null,
})
```

### 3. `UpgradeModal.tsx` — `upgrade_checkout_started` event

Add `track(...)` immediately after the `res.ok` check passes and `data.url` is confirmed present, before the ceremony wait. This event represents a Stripe session successfully created and the user about to redirect.

```ts
track('upgrade_checkout_started', {
  tier: tier,                        // 'basic' | 'advanced'
  currentTier: currentTier,
  authenticated: authenticated,
})
```

### 4. `UpgradeModal.tsx` — `upgrade_checkout_failed` event

Add `track(...)` in both error branches inside `handleCheckout`: when `!res.ok` and when `!data.url`, and in the `catch` block. The event must fire before the `await new Promise(r => setTimeout(r, remaining))` ceremony wait so it is not suppressed by the timer.

```ts
track('upgrade_checkout_failed', {
  tier: tier,
  currentTier: currentTier,
  authenticated: authenticated,
  reason: 'server_error' | 'no_url' | 'network_error', // string literal per branch
})
```

The `reason` property must use the string literals `'server_error'` (non-2xx response), `'no_url'` (2xx but no `url` in body), and `'network_error'` (catch block / fetch threw).

### 5. `UpgradeModal.tsx` — `upgrade_dismissed` event and `handleClose` wrapper

The close button at line 200 (`onClick={onClose}`) and the dismiss button at line 392 (`onClick={onClose}`) both call `onClose` directly. Neither fires analytics. Introduce a `handleDismiss` wrapper function in the `UpgradeModal` component body:

```ts
const handleDismiss = () => {
  track('upgrade_dismissed', {
    currentTier: currentTier,
    authenticated: authenticated,
    intendedTier: intendedTier ?? null,
    checkoutState: checkoutState, // 'idle' | 'ceremony' | 'error' — captures dismissals during error state
  })
  onClose()
}
```

Replace both `onClick={onClose}` calls (the × close button and the "Continue with free" dismiss button) with `onClick={handleDismiss}`. The backdrop click handler at line 183 (`onClick={e => { if (e.target === e.currentTarget) onClose() }}`) must also be updated to call `handleDismiss()` so backdrop-click dismissals are captured.

The Escape key handler at line 79 (`if (e.key === 'Escape') onClose()`) must also call `handleDismiss()`.

The `checkoutState` property is important: a user who dismisses during the `'error'` state is a qualitatively different signal (they tried and failed) from one who dismisses at `'idle'` (they decided not to upgrade).

### 6. `AuthModal.tsx` — `auth_modal_seen` event

In the `useEffect` at line 47 (which runs when `isOpen` or `initialTab` changes), add the tracking call inside the `if (isOpen)` guard:

```ts
track('auth_modal_seen', {
  initialTab: initialTab, // 'login' | 'register'
})
```

This fires once per modal open. The `initialTab` value distinguishes the upgrade flow (which opens at `'register'`) from a direct sign-in flow (which opens at `'login'`).

### 7. `AuthModal.tsx` — `auth_modal_dismissed` event

The `handleClose` function at line 97 fires when the user closes the modal without completing auth. Add:

```ts
track('auth_modal_dismissed', {
  tab: tab, // 'login' | 'register' — the tab they were on when they dismissed
})
```

This must fire only when the modal closes without a successful auth result. The `handleClose` function is already called only in that case (successful auth calls `onClose()` directly from `handleSubmit`, not via `handleClose`). No guard is needed beyond placing the call inside `handleClose`.

### 8. `AuthModal.tsx` — `auth_tab_switched` event

The tab-switch buttons at line 134 and line 349 both call `setTab(t)` and `setTab('register')` / `setTab('login')`. Inline a `track()` call on each:

```ts
track('auth_tab_switched', {
  from: tab,  // current value of tab state before the switch
  to: t,      // the new tab
})
```

For the inline tab buttons in the switch-hint area at lines 349 and 364, the `from` value is the current `tab` state and the `to` value is the hardcoded target. This event lets the team see whether users arriving at the login tab switch to register (or vice versa) and at what rate.

### 9. `server/routes/analytics.ts` — `GET /api/analytics/funnel` endpoint

Add a `GET /funnel` route to the analytics router. The route must:

**Auth:** Require an `x-analytics-secret` request header matching `process.env.ANALYTICS_ADMIN_SECRET`. The guard must check for a missing or empty secret first and return `503` with `{ error: 'endpoint_not_configured' }` before proceeding. This prevents fail-open behavior when the env var is absent from a deployment. A missing or incorrect header value returns `403` with `{ error: 'forbidden' }`.

**Query params:** `from` and `to`, both optional ISO-8601 date strings (`YYYY-MM-DD`). If absent, default to: `from` = 7 days ago (UTC), `to` = today (UTC). The `to` bound is inclusive: the query range is `created_at >= fromDate + 'T00:00:00'` AND `created_at <= toDate + 'T23:59:59'`.

**Implementation:** Use synchronous `better-sqlite3` queries. For each event name in the canonical funnel list, execute a single `SELECT COUNT(*) as n FROM events WHERE event = ? AND created_at >= ? AND created_at <= ?` query. Do not attempt a single `GROUP BY` query — the per-event loop is clearer and extensible.

**Canonical funnel event list** (the `FUNNEL_EVENTS` array must contain exactly these names in this order):

```
page_view
form_started
form_completed
gpt_request_made
gpt_limit_hit
upgrade_modal_seen
upgrade_cta_clicked
upgrade_checkout_started
upgrade_checkout_failed
upgrade_dismissed
auth_modal_seen
auth_nudge_seen
auth_nudge_clicked
auth_modal_dismissed
auth_tab_switched
signup_completed
login_completed
```

**Response schema:**

```json
{
  "from": "2026-05-01",
  "to": "2026-05-14",
  "counts": {
    "page_view": 1420,
    "form_started": 834,
    "form_completed": 612,
    "gpt_request_made": 1874,
    "gpt_limit_hit": 241,
    "upgrade_modal_seen": 210,
    "upgrade_cta_clicked": 47,
    "upgrade_checkout_started": 31,
    "upgrade_checkout_failed": 4,
    "upgrade_dismissed": 158,
    "auth_modal_seen": 189,
    "auth_nudge_seen": 305,
    "auth_nudge_clicked": 88,
    "auth_modal_dismissed": 71,
    "auth_tab_switched": 43,
    "signup_completed": 94,
    "login_completed": 221
  }
}
```

Every event name in `FUNNEL_EVENTS` must appear as a key in `counts`, even if the count is zero. The response must always be valid JSON with `Content-Type: application/json`.

**Rate limiting:** The `GET /funnel` endpoint must not be registered under the existing write-rate-limiter middleware. It is an admin read endpoint. If the analytics router is globally wrapped in a rate limiter, explicitly exclude `/funnel` from that limiter at registration time, or register `/funnel` before the limiter middleware is applied to the router.

### 10. `server/db.ts` — add `idx_events_event_created` index

Add the following index to the `CREATE INDEX IF NOT EXISTS` block in `db.ts`:

```sql
CREATE INDEX IF NOT EXISTS idx_events_event_created
  ON events(event, created_at);
```

The existing indices `idx_events_user_event` (starts with `user_id`) and `idx_events_created_at` (single-column on `created_at`) cannot efficiently satisfy `WHERE event = ? AND created_at BETWEEN ? AND ?` for the funnel query. The composite `(event, created_at)` index covers the predicate exactly and allows SQLite to use an index range scan on `created_at` within each event bucket. This index is additive and safe to add alongside the existing indices.

### 11. `AuthContext.tsx` — `incrementTodayUsed` function and export

Add an `incrementTodayUsed` callback to the `AuthContext` value:

```ts
const incrementTodayUsed = useCallback(() => {
  setTodayUsed(prev => prev + 1)
}, [])
```

Export it from the context value object. The function must be a stable reference (via `useCallback` with empty deps) so it can be called from `App.tsx` without causing unnecessary re-renders.

Additionally, `register()` must call `await fetchUsage()` after the profile fetch, matching the pattern already present in `login()`. Currently `register()` never calls `fetchUsage()`, leaving `todayUsed` at the initial `useState(0)` value after registration.

### 12. `App.tsx` — call `incrementTodayUsed` after each successful GPT response

Destructure `incrementTodayUsed` from `useAuth()` in `App.tsx`. In each of the five GPT call sites, call `incrementTodayUsed()` immediately after the `await` resolves successfully and before dispatching results to state. The five call sites are:

- `runTransit` (the async block calling `getGptInterpretation` for transit readings)
- `runSynastry`
- `runSynastryTransit`
- `runSolarReturn`
- The natal chart GPT call (if one exists — verify; the natal calculation may be pure local arithmetic with no GPT call and thus no quota consumed)

The increment must only fire on a successful 200 response. It must not fire on 429 (rate limit), 5xx, or network error. On a 429 response, the call site must additionally read `response.used` from the 429 response body (the `gptRateLimit` middleware returns `{ used, limit, tier, authenticated }` in every 429 JSON body) and call `setTodayUsed(response.used)` to sync the client counter to the server's authoritative count. This prevents the UI from showing a higher remaining count than the server would allow.

### 13. `App.tsx` `SessionBadge` — inline remaining count when `remaining <= 2`

The `SessionBadge` component currently renders `readingsLabel` only inside the `{open && (...)}` dropdown guard. For free-tier authenticated users, when `remaining <= 2`, render the count inline in the button element itself, adjacent to the `✦` glyph, without requiring the dropdown to be open.

The inline label must use the product's vocabulary. Acceptable form: `{remaining} left` or `{remaining} sky left today`. The existing `readingsLabel` string (`"${remaining} reading${remaining !== 1 ? 's' : ''} left today"`) is acceptable for the dropdown but may be abbreviated for the inline position to avoid overflow. The threshold `remaining <= 2` (not `<= 1` as the vision describes) is specified here because showing the count from the second-to-last reading rather than the last gives the user an extra decision point before the wall. This threshold is a product decision that must be documented inline in the code as a comment.

### 14. Analytics event schema documentation in `analytics.ts`

Add a comment block in `analytics.ts` documenting the canonical event names and their required property shapes. The comment must be placed immediately before the `export function track(...)` declaration. Its purpose is to prevent property-name drift across callsites (e.g., `Tier` vs `tier`, `'Basic'` vs `'basic'`). The comment must document at minimum the following events with their exact property keys and value types:

```
upgrade_modal_seen:      { currentTier, authenticated, intendedTier, heading }
upgrade_cta_clicked:     { tier, currentTier, authenticated, intendedTier }
upgrade_checkout_started:{ tier, currentTier, authenticated }
upgrade_checkout_failed: { tier, currentTier, authenticated, reason }
upgrade_dismissed:       { currentTier, authenticated, intendedTier, checkoutState }
auth_modal_seen:         { initialTab }
auth_modal_dismissed:    { tab }
auth_tab_switched:       { from, to }
gpt_request_made:        { readingType, tier, authenticated } (existing — do not change)
gpt_limit_hit:           { tier, authenticated } (existing — do not change)
```

All tier values must be lowercase string literals: `'free'`, `'basic'`, `'advanced'`. All tab values must be `'login'` or `'register'`. Property keys must be camelCase.

### 15. `ANALYTICS_ADMIN_SECRET` environment variable documentation

The `ANALYTICS_ADMIN_SECRET` env var must be documented in whatever `.env.example` or environment setup file the project uses. If no such file exists, create a `.env.example` at the repo root with a comment explaining the variable. The funnel endpoint spec (route, header name, auth behavior) must also be mentioned in a comment inside `server/routes/analytics.ts` adjacent to the `GET /funnel` handler.

## Out of Scope

- Real-time analytics dashboard or chart visualization UI. The `/funnel` endpoint returns JSON — no admin UI, no charts, no auto-refresh.
- Per-user funnel cohort queries. The endpoint returns aggregate event counts only, not user-level funnels or session-stitched paths.
- New reading types, new GPT prompts, new chart features, or any extension to the reading engine.
- Stripe subscription management UI (cancel flow, invoice history, portal link).
- Backend infrastructure changes (deployment, SSL, environment management, monitoring alerts).
- A/B testing infrastructure or variant assignment. The `heading` property in `upgrade_modal_seen` enables future copy experiments but no test framework is built here.
- Retroactive backfill of analytics events for sessions that occurred before this sprint ships.
- `og:image` if a suitable image asset does not exist. The Open Graph meta tags are part of Sprint 0013 scope (SEO surface), but the funnel analytics proposal does not own that work.
- Server-side analytics event batching or retry logic. The fire-and-forget pattern in `analytics.ts` is preserved. Silent data loss via network failure is an accepted tradeoff for v1.

## Open Questions

1. **JWT key constant mismatch.** Carmack's analysis identifies that `analytics.ts` uses `JWT_KEY = 'astral-auth-token'` while `gptInterpretation.ts` line 29 uses `JWT_STORAGE_KEY = 'astral-chart-jwt'`. One of these is wrong, and the wrong one means analytics events from authenticated users land with `user_id = null`. Before shipping tracking, the implementation agent must check `authService.ts` (or wherever `AUTH_TOKEN_KEY` is defined as the source of truth) and confirm which key is canonical. If `gptInterpretation.ts` is the incorrect one, fix it in that file and reference the shared constant. Do not introduce new hardcoded strings.

2. **`ceremonyStartedAt` useState timing bug.** The `catch` block in `handleCheckout` reads `Date.now() - ceremonyStartedAt` where `ceremonyStartedAt` is a `useState` value. If `setCeremonyStartedAt(start)` has not triggered a re-render by the time the catch block executes (e.g., on an immediate network rejection), `ceremonyStartedAt` may still be `0`, causing the ceremony to always wait the full 2000ms on fast failures. The implementation agent should convert `ceremonyStartedAt` from `useState<number>` to `useRef<number>` so the value is read synchronously. This is a correctness fix that should be bundled with the analytics additions to `handleCheckout`.

3. **`handleAuthComplete` stale `authenticated` closure.** After a user completes auth inside the UpgradeModal's embedded AuthModal, `handleAuthComplete` calls `handleCheckout` with a 300ms delay. At that point, `handleCheckout` reads `authenticated` from the prop closure, which may still be `false` from the previous render. The implementation agent must decide: (a) convert `authenticated` to a `useRef` that is kept current in a `useEffect`, (b) remove the re-call of `handleCheckout` from `handleAuthComplete` entirely and instead close both modals and let the user re-click the CTA with fresh auth state, or (c) another approach. This must be resolved before the `upgrade_cta_clicked` event is trusted, because the stale closure could cause a double-fire (once from the original CTA click, once from `handleAuthComplete`'s re-call) for unauthenticated users who complete auth.

4. **Funnel query `session_id` vs `user_id` correlation.** Taleb's analysis notes that the payment-return `page_view` (fired when the user lands on `/?payment=success`) may arrive before `AuthContext` resolves the JWT from session storage, landing as an anonymous event (`user_id = null`). Since `session_id` persists across the Stripe redirect, the funnel query can stitch anonymous pre-auth events to post-auth events via `session_id`. The aggregate counts endpoint specified here does not expose this — it only counts events by name. If user-level conversion correlation is needed (e.g., "what fraction of users who saw `upgrade_modal_seen` also had a `signup_completed`?"), the endpoint must be extended with a `by=session` or `by=user` mode. This is deferred but the implementation agent must document the limitation as a comment in the endpoint code.

5. **`HomeScreen.tsx` nudge threshold.** The vision specifies the nudge should activate "earlier" — currently `todayUsed >= 2`. Should the nudge show at `todayUsed >= 1` (after first reading) or remain at `todayUsed >= 2`? The vision says "a first-time free user should always know how many readings they have left" which implies from the very first reading. The Carmack voice recommends showing the inline count at `remaining <= 2` (i.e., after `todayUsed >= 1` for a 3-reading free tier). The implementation agent must pick one threshold, apply it consistently across `HomeScreen.tsx` and `SessionBadge`, and document it as a comment.

6. **`register()` and pre-auth IP quota sync.** The `gptRateLimit` middleware tracks unauthenticated users by IP in an in-memory Map. When a user registers after already consuming IP-based quota, the server associates future requests to the new user account, but `todayUsed` in the client will start at whatever `fetchUsage()` returns for the new account (likely 0, since authenticated usage is tracked separately in `gpt_usage`). If the product intends for the IP-based readings to count against the new user's daily limit, the `register()` endpoint and `fetchUsage()` must be aware of the pre-auth sessions. This is likely out of scope for this sprint, but the implementation agent must confirm the current behavior and document whether it is intentional.
