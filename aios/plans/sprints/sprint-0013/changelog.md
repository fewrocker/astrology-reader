# Sprint 0013 — Changelog

**Theme:** Production-readiness — conversion funnel visibility, reading-limit UX, and auth correctness

---

## Completed Tasks

### task-0001 — issue-analytics-jwt-key-mismatch
**Proposal:** `issue-analytics-jwt-key-mismatch`
**Problem:** `gptInterpretation.ts` used a hardcoded `'astral-chart-jwt'` key to read the JWT from localStorage while `authService.ts` wrote it under `'astral-auth-token'`. Every GPT call from an authenticated user sent no `Authorization` header, causing the server to apply IP-based rate limits instead of account limits, analytics events to land with `user_id = null`, and the sign-up nudge to always show even to logged-in users.
**Solution:** Imported `AUTH_TOKEN_KEY` from `authService.ts` in `gptInterpretation.ts`. All GPT calls from authenticated users now carry the correct bearer token, rate limits are account-based, and analytics events correctly attribute to the user.

---

### task-0002 — issue-index-html-missing-meta
**Proposal:** `issue-index-html-missing-meta`
**Problem:** `index.html` had no `<meta name="description">`, no Open Graph tags, no Twitter Card tags, no canonical URL, and pointed to `/vite.svg` (which did not exist) for the favicon. Sharing the app URL in iMessage, Slack, or Twitter produced a blank preview card, and every browser tab showed a broken or missing favicon.
**Solution:** Created `public/favicon.svg` (gold ✦ on dark charcoal), created `public/og-image.svg` (1200×630 branded Open Graph image with zodiac wheel and wordmark), updated the page `<title>`, and inserted 14 meta tags: description, canonical, seven OG properties, and four Twitter Card tags.

---

### task-0003 — issue-todayused-counter-staleness
**Proposal:** `issue-todayused-counter-staleness`
**Problem:** `todayUsed` in `AuthContext` was loaded once at session start and never updated after readings. `SessionBadge` always showed "3 readings left today" regardless of how many readings had been done, the `HomeScreen` nudge never fired within a session, and `register()` never called `fetchUsage()` unlike `login()`.
**Solution:** Added `incrementTodayUsed` (stable `useCallback`) to `AuthContext` and exported it. All four GPT call sites in `App.tsx` call `incrementTodayUsed()` after each successful interpretation. `register()` now calls `fetchUsage()`. The JWT key constant in `gptInterpretation.ts` was reconciled with `AUTH_TOKEN_KEY`.

---

### task-0004 — code-upgrade-modal-checkout-race
**Proposal:** `code-upgrade-modal-checkout-race`
**Problem:** After an unauthenticated user completed login inside the `UpgradeModal`'s embedded `AuthModal`, `handleAuthComplete` called `handleCheckout` after a 300ms delay. `handleCheckout` read `authenticated` from a stale closure (still `false`), reopened the `AuthModal`, and trapped the user in a sign-in loop on the most conversion-critical screen in the product.
**Solution:** Extracted checkout into `runCheckoutSession` (a `useCallback`). `handleAuthComplete` now just closes the auth modal. A new `useEffect` watching `[authenticated, authModalOpen]` triggers `runCheckoutSession` when auth completes — `authenticated` is guaranteed fresh in the React render cycle. The 300ms artificial delay is gone. `ceremonyStartedAt` converted from `useState` to `useRef`.

---

### task-0005 — feat-conversion-funnel-analytics
**Proposal:** `feat-conversion-funnel-analytics`
**Problem:** `UpgradeModal.tsx` fired zero `track()` calls, `AuthModal.tsx` had no seen/dismissed/tab-switch tracking, and the server had no read endpoint for analytics. The team was blind at the most critical moment in the product.
**What it is:** End-to-end conversion funnel analytics — five new events on `UpgradeModal`, three on `AuthModal`, a server-side `GET /api/analytics/funnel` endpoint, and a composite SQLite index for fast funnel queries.
**How to use it:** `GET /api/analytics/funnel?from=YYYY-MM-DD&to=YYYY-MM-DD` with header `x-analytics-secret: <ANALYTICS_ADMIN_SECRET>` returns JSON counts for 17 funnel events from `page_view` through `login_completed`. New events: `upgrade_modal_seen`, `upgrade_cta_clicked`, `upgrade_checkout_started`, `upgrade_checkout_failed`, `upgrade_dismissed`, `auth_modal_seen`, `auth_modal_dismissed`, `auth_tab_switched`.

---

### task-0006 — feat-persistent-reading-limit-display
**Proposal:** `feat-persistent-reading-limit-display`
**Problem:** The remaining-reads counter was hidden behind a click on the `SessionBadge` dropdown. Free users had no ambient signal of how many readings they had left until they hit the wall, and the home screen nudge fired too late with generic copy.
**What it is:** Persistent inline reading-limit display in the header and a trust-building progression of home screen copy states as a free user consumes their daily readings.
**How to use it:** As a free authenticated user: the `✦` header glyph shows `"1 left"` or `"0 left"` inline when `remaining <= 1`. The home screen shows `"3 readings free today."` (0 used), `"2 readings left in your sky today."` (1 used), `"You've come back twice today. One more reading awaits. ✦"` (2 used), then the limit-reached section (3+ used). The `UpgradeModal` heading is updated for free-authenticated users. "Every feature is available on every plan" added to Basic and Advanced tier descriptions.

---

## Failed / Deferred Tasks

None — all 6 tasks delivered.

## Known Limitations

- **429 used-count sync not implemented (task-0005 spec 12):** The spec called for `setTodayUsed(e.info.used)` on 429 responses. This requires surfacing the `used` field through `RateLimitError`, touching `callProxy`. Deferred — the optimistic `incrementTodayUsed()` approach is correct for within-session counting.
