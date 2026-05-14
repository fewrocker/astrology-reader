# John Carmack — Voice Analysis: Sprint 0013

Sprint 0012 moved the computation to the server and established a trust boundary. Sprint 0013 is about the commercial layer: limits, tracking, and conversion. Different domain, same standard. You ship it right or you ship it lying to yourself.

I have read the key files: `src/context/AuthContext.tsx`, `src/services/gptInterpretation.ts`, `src/services/analytics.ts`, `server/routes/analytics.ts`, `server/db.ts`, `src/App.tsx` (SessionBadge), `src/components/subscription/UpgradeModal.tsx`, `src/components/auth/AuthModal.tsx`, `src/components/home/HomeScreen.tsx`, `index.html`. Here is what I actually see in the code.

---

## The `todayUsed` Staleness Problem

This is the most technically concrete bug in the sprint and also the easiest to fix. Let me describe what actually happens.

`AuthContext.tsx` line 96–101: `fetchUsage()` calls `getUsage()` and calls `setTodayUsed(result.data.todayUsed)`. This function is called in two places only: after session restore (line 160) and after `login()` (line 208). That is it. `register()` never calls `fetchUsage()`. Post-registration `todayUsed` is whatever the initial `useState(0)` gave you — it stays at zero until the user logs out and back in.

More concretely: `gptInterpretation.ts` line 93 fires `track('gpt_request_made', ...)` after every successful GPT call, and `_sessionCalls` is incremented at line 92. But there is no corresponding `setTodayUsed(prev => prev + 1)` anywhere in the client. Every successful GPT call goes to the server, the server increments `gpt_usage`, and the client's `todayUsed` is not updated.

The consequence: `SessionBadge` in `App.tsx` line 79 computes `remaining = (tierLimits[tier] ?? 3) - todayUsed`. If `todayUsed` never increments, `remaining` stays stuck at 3 (for a free user) regardless of how many readings they actually did this session. The user sees "3 readings left today" right up until the server returns 429 and `RateLimitError` fires.

The `HomeScreen.tsx` nudge logic at lines 129–155 is entirely driven by `todayUsed`. At `todayUsed <= 1`: no nudge. At `todayUsed === 2`: "1 reading left today ✦ Upgrade for more." At `todayUsed >= 3`: "Daily limit reached ✦ Upgrade to continue." With `todayUsed` frozen at 0, that nudge never fires in the same session as the readings. The user gets zero warning.

**The fix is one line.** In `gptInterpretation.ts`, after `_sessionCalls++` at line 92, the service has no access to React state — it is not inside the React tree. The cleanest fix is to expose an `onGptSuccess` callback from `AuthContext` and subscribe to it from the calling site. But that is over-engineered. The simpler path: expose an `incrementTodayUsed` function from `AuthContext` and call it at the use sites in `App.tsx` immediately after the `await getGptInterpretation(...)` calls resolve successfully.

`App.tsx` has five GPT call sites — `runTransit` (line ~319), `runSynastry` (line ~376), `runSynastryTransit` (line ~424), `runSolarReturn` (line ~482), and the `loading` view's natal chart computation (no GPT call — the natal calculation is pure local arithmetic, no quota consumed). Each async block that calls a GPT service function should call `incrementTodayUsed()` on success, before dispatching results. Five callsites, two lines each. The context function is `setTodayUsed(prev => prev + 1)` wrapped in a `useCallback`. This is a 20-minute fix.

Do not re-fetch from the server after each reading. A network round-trip to fix a UI counter is the wrong trade. The server-side count is authoritative; the client-side count only needs to be approximately right within a session. Increment locally, accept the risk of off-by-one if tabs are open in parallel. The server will still enforce the limit correctly.

---

## The UpgradeModal Analytics Gap

`UpgradeModal.tsx` is 445 lines with zero `track()` calls. This is not a judgment about code quality — it is a measurement gap. The modal has a `useEffect` at line 69 that fires when `isOpen` changes to true. That is where `track('upgrade_modal_seen', { currentTier, authenticated, intendedTier })` goes. One line.

The two CTA buttons both call `handleCheckout(priceId, tier)`. That function is at line 112. Add `track('upgrade_cta_clicked', { tier, currentTier, authenticated })` as the first line of `handleCheckout`. One line.

The close button at line 200 calls `onClose`. The dismiss button at line 393 also calls `onClose`. Neither fires analytics. You need a `handleClose` wrapper that calls `track('upgrade_dismissed', { currentTier, authenticated })` and then `onClose()`. Replace both `onClick={onClose}` calls with the wrapper.

One correctness point: the `isOpen` `useEffect` at line 69 also calls `setCheckoutState('idle')` and focuses the first button. Do not fire `upgrade_modal_seen` inside that same effect — it will re-fire on every open/close cycle as long as the component stays mounted. Fire it once in a separate `useEffect` with `[isOpen]` dependency that guards on `if (!isOpen) return`. Same hook, different responsibility.

The `AuthModal` gap is shallower. Add `track('auth_modal_seen', { initialTab })` in the `useEffect` at line 47 that already runs when `isOpen` becomes true. The `handleClose` at line 97 already exists — add `track('auth_modal_dismissed', { tab })` there, guarded by `if (!result?.ok)` so it does not fire when the user successfully completes auth (that fires `login_completed` / `signup_completed` instead). The tab-switch buttons at line 135 already call `setTab(t)` — add `track('auth_tab_switched', { to: t })` inline.

---

## The Analytics Server Endpoint Architecture

`server/routes/analytics.ts` is 55 lines — a single `POST /event` writer with best-effort user ID resolution from JWT. No read path exists.

The funnel query the vision wants (`GET /api/analytics/funnel`) is a straightforward aggregation. The `events` table has an `event` column, a `created_at` column, and the indices `idx_events_user_event` (on `user_id, event, created_at`) and `idx_events_created_at` (on `created_at`). An index on just the `event` column plus `created_at` range would be the fastest path for the funnel query, but the composite `idx_events_user_event` index will satisfy a query of the form `WHERE event = ? AND created_at >= ? AND created_at < ?` if SQLite uses the index for the `event` predicate first. Verify the query plan with `EXPLAIN QUERY PLAN` before calling it done.

The cleanest implementation:

```typescript
router.get('/funnel', (req, res) => {
  const secret = process.env.ANALYTICS_ADMIN_SECRET
  if (!secret || req.headers['x-analytics-secret'] !== secret) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }

  const { from, to } = req.query
  const fromDate = typeof from === 'string' ? from : new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
  const toDate = typeof to === 'string' ? to : new Date().toISOString().slice(0, 10)

  const FUNNEL_EVENTS = [
    'page_view',
    'form_started',
    'form_completed',
    'gpt_request_made',
    'gpt_limit_hit',
    'upgrade_modal_seen',
    'upgrade_cta_clicked',
    'upgrade_dismissed',
    'auth_modal_seen',
    'auth_nudge_seen',
    'auth_nudge_clicked',
    'signup_completed',
    'login_completed',
  ]

  const db = getDb()
  const counts: Record<string, number> = {}
  for (const event of FUNNEL_EVENTS) {
    const row = db.prepare(
      `SELECT COUNT(*) as n FROM events WHERE event = ? AND created_at >= ? AND created_at < ?`
    ).get(event, fromDate, toDate + 'T23:59:59') as { n: number }
    counts[event] = row.n
  }

  res.json({ from: fromDate, to: toDate, counts })
})
```

This is synchronous SQLite via better-sqlite3 — no async needed. The loop over 13 events runs 13 indexed queries. Each query touches at most the rows matching one event name in the date range. For a product at early scale this is instant. Do not try to do it in one SQL GROUP BY query to be clever — the loop is clearer, easier to extend with per-event properties, and SQLite's query planner handles it fine.

One missing index worth adding: `CREATE INDEX IF NOT EXISTS idx_events_event_created ON events(event, created_at)`. The existing `idx_events_user_event` starts with `user_id`, making it useless for queries that do not filter by user. The existing `idx_events_created_at` is a single-column index that cannot satisfy the `event = ?` predicate efficiently. Add the two-column index. This is a one-line change to `db.ts` in the `CREATE INDEX IF NOT EXISTS` block.

---

## SessionBadge: The Click-to-See Problem

`App.tsx` line 81: `readingsLabel` is assigned a string for free-tier users. Lines 110–119: it is rendered inside the open dropdown, behind the `{open && (...)}` guard. A free user who has used 2 of 3 readings will never see "1 reading left today" unless they click the star icon.

The fix the vision asks for is correct and technically simple: render an inline count in the button itself (lines 85–94) when `tier === 'free'` and `remaining <= 1`. The button is currently just a `✦` glyph. Add a text span adjacent to it: `{tier === 'free' && remaining <= 1 && <span style={{...}}>1 left</span>}`. This does not change the layout meaningfully — it is a small text fragment to the left of the glyph.

The threshold matters. Showing the count when `remaining <= 2` (i.e., from the start) would be fine; the vision says `≤1`. Either is defensible. The important thing is that it is visible without interaction. Pick one and be consistent with what `HomeScreen.tsx` shows.

---

## HomeScreen Nudge Threshold Inconsistency

`HomeScreen.tsx` line 129: `if (todayUsed <= 1)` — no nudge. This means a free authenticated user who has used 0 or 1 readings sees no remaining-reads signal at all. The nudge only appears at `todayUsed === 2` (one reading left). Combined with the `todayUsed` staleness bug above, this means in practice the nudge never fires in session.

Even once `todayUsed` is fixed to increment locally, a user who opens the home screen after 1 reading has no signal. The vision says "a first-time free user should always know how many readings they have left." That means the signal should be present from the start — not deferred until the last reading.

The fix is a simple copy change. For `todayUsed <= 1` when authenticated and free, instead of returning a spacer `<div className="mb-6" />`, show "3 readings free today" or "X readings left today" as static text (not a button). This is informational, not an upgrade CTA, and matches what the SessionBadge should also show.

---

## UpgradeModal: The `AuthModal` Inside a Modal Problem

`UpgradeModal.tsx` line 62: `const [authModalOpen, setAuthModalOpen] = useState(false)`. When an unauthenticated user clicks a CTA in the UpgradeModal, it opens an `AuthModal` rendered at line 232 — inside the UpgradeModal's return. The UpgradeModal's `if (!isOpen && !authModalOpen) return null` guard at line 107 is what keeps both portals from unmounting each other.

This is fragile. The auth flow is: user clicks CTA → `handleCheckout` → `setAuthModalOpen(true)` → `AuthModal` renders inside UpgradeModal → user completes auth → `handleAuthComplete` fires → waits 300ms → calls `handleCheckout` again → Stripe redirect.

The 300ms wait at line 167 (`await new Promise(r => setTimeout(r, 300))`) is a race condition disguised as a ceremony. It is waiting for the `AuthContext` state to settle after `login()` / `register()` sets the JWT. But `login()` in `AuthContext.tsx` line 182 already calls `fetchUsage()` and returns. By the time `handleAuthComplete` runs its 300ms wait, the auth state should already be settled. The 300ms is cargo-culted. It might mask a real timing issue — if `auth.token` is checked inside `handleCheckout` via `localStorage.getItem('astral-auth-token')`, the token should be set synchronously by `localStorage.setItem(AUTH_TOKEN_KEY, jwt)` at line 186. There is no async race.

Additionally: `handleCheckout` checks `if (!authenticated)` where `authenticated` comes from the `UpgradeModal` prop — which is `isAuthenticated` from `AppContent`. This prop is stale by the time `handleAuthComplete` calls `handleCheckout` because the component did not re-render with the new auth state before the 300ms timer fires. The `authenticated` closure is the value from the previous render. This is a real bug — after OAuth or email login completes inside the UpgradeModal, `handleCheckout` may still see `authenticated = false` and loop back into the auth flow.

The fix: `handleCheckout` should read auth state from a ref (`useRef`) or call a callback that reads from the current context value, not from the prop closure. Alternatively, after `handleAuthComplete` resolves, do not call `handleCheckout` at all — instead, close both modals and let the user click the CTA again with fresh state. This is slightly less smooth UX but eliminates the race entirely. Given that the existing 300ms band-aid suggests this was already noticed, the simpler path is likely correct.

---

## Analytics `track()` Function: Fire-and-Forget Is Right, But There Are Latent Issues

`analytics.ts` line 5: `track()` reads `JWT_KEY = 'astral-auth-token'` from localStorage. `gptInterpretation.ts` line 29: `JWT_STORAGE_KEY = 'astral-chart-jwt'`. These are two different strings. One of them is wrong. Either the analytics service is sending tokens that the analytics endpoint never validates (it does — analytics endpoint tries to resolve userId from the Authorization header), or the GPT service is sending tokens under a different key than analytics uses.

Check `authService.ts` for what `AUTH_TOKEN_KEY` is. If it is `'astral-auth-token'`, then analytics is right and gptInterpretation is wrong. If it is `'astral-chart-jwt'`, analytics is wrong. Either way, these two files should reference the same constant, not hardcode the string independently.

This means analytics events from authenticated users are not being correlated to `user_id` in the `events` table. The analytics endpoint does best-effort JWT verification; if the token key is wrong, the Authorization header is never sent, `userId` stays null, and all events land as anonymous. The funnel query will show correct event counts but zero user-attributed events. This silently undermines any user-level cohort analysis.

---

## SEO: The Minimum Bar Is Low, The Current State Is Below It

`index.html` has a `<title>`, a `vite.svg` favicon (the default Vite project favicon — not something you ship to real users), and no meta tags beyond charset and viewport. No description. No OG tags. No Twitter card. When a user pastes the URL into iMessage, they get a blank preview.

The fix is ten lines of HTML. There is no technical complexity here — it is just not done. The one thing worth flagging: the `og:image` tag requires an actual image file or a data URI. For a quick fix, a 1200×630 dark SVG with the Astral Chart glyph is sufficient. Do not block the other meta tags on having a perfect OG image. Ship description, og:title, og:description, og:type, og:url, twitter:card now. Add og:image when there is an asset to point at.

The favicon is more noticeable than most people realize. Replace `/vite.svg` with a simple inline SVG or a base64 data URI of a star glyph before any real traffic hits. A missing favicon is a 404 in the browser's network tab and looks unfinished.

---

## What Is Over-Engineered

**Nothing in this sprint is at risk of over-engineering.** The features are modest: add `track()` calls, add a GET endpoint, fix a counter, add meta tags. The risk is the opposite — under-engineering by tracking events that cannot be queried, or querying events that are never tracked.

The one thing to watch: the `getHeading()` function in `UpgradeModal.tsx` lines 34–52 has four cases. When analytics events are added, the `upgrade_modal_seen` property `heading` could carry the actual heading string for segmentation. This is not over-engineering — it is the minimum context needed to understand which modal variant converts better. Pass it.

---

## What Is Under-Engineered

**The analytics event schema has no type definitions.** `track()` accepts `event: string` and `properties?: Record<string, unknown>`. There is nothing stopping a developer from calling `track('upgrade_modal_seen', { Tier: 'Basic' })` in one place and `track('upgrade_modal_seen', { tier: 'basic' })` in another. The properties are different key names and different casing — they will not aggregate. For a small team, the fix is not a type system — it is a comment block in `analytics.ts` that documents the canonical event names and their expected property shapes. Five minutes of documentation prevents six months of mismatched data.

**`register()` in `AuthContext.tsx` line 216 never calls `fetchUsage()`.** `login()` calls it at line 208. After registration, `todayUsed` stays at 0. A newly registered user's `SessionBadge` will show "3 readings left today" accurately (because they have used 0), but this is by accident — it happens to be correct because new users start at 0. If a user registers after already using some IP-based quota and the server knows their pre-auth usage, `todayUsed` would be wrong. Add `await fetchUsage()` to `register()` after the profile fetch, to match the pattern in `login()`.

---

## The Single Most Important Observation

The staleness of `todayUsed` is the thread that runs through every UX failure in this sprint. The `SessionBadge` is invisible about limits because `todayUsed` never increments. The `HomeScreen` nudge never fires in session because `todayUsed` never increments. The "1 reading left" warning never appears because `todayUsed` never increments. Fix that one counter and three separate UX defects close simultaneously. It is the highest-leverage change in the sprint and it is a twenty-minute implementation.

The analytics gaps are real and the funnel endpoint is necessary, but neither of them blocks anything. The `todayUsed` bug actively undermines the user experience right now.
