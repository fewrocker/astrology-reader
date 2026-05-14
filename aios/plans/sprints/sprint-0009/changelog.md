# Sprint 0009 Changelog

**Status:** complete
**Branch merged:** sprint-0009 → master
**Tasks completed:** 5 / 5

---

## Completed Tasks

### code-server-production-hardening
**Proposal:** code-server-production-hardening
**Problem:** The Express server had no security headers, no body size limit, no global error handler, and the production env guard covered only `JWT_SECRET` — meaning a misconfigured deploy would silently accept unauthenticated Stripe webhook POSTs, enabling tier self-elevation.
**Solution:** Added `helmet()` (security headers: X-Frame-Options, HSTS, X-Content-Type-Options), `compression()` (gzip), `morgan` request logging, `express.json({ limit: '50kb' })`, a global async error handler that logs without leaking stack traces, and production env guards for `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` (fatal exit if missing). Ephemeral JWT_SECRET now emits an explicit warning explaining session invalidation on restart.

---

### feat-funnel-analytics
**Proposal:** feat-funnel-analytics
**What it is:** A server-side session tracking system that follows each visitor from first page load through to paid conversion, using a first-party cookie for continuity.
**Problem:** The app was completely analytics-blind — no way to know how many users arrived, which reading types drive engagement, where drop-off occurs, or what percentage of users who hit their limit convert to paid.
**Solution:** Server now sets a `session_id` UUID cookie (`SameSite=Lax; HttpOnly; 1-year`) on every first request. A SQLite `events` table (with 3 indexes defined at creation and a 90-day purge cron) receives events via `POST /api/analytics/event`. The client `src/services/analytics.ts` exposes a fire-and-forget `track()` function. 10+ events are now wired: `page_view`, `form_started`, `form_completed`, `reading_viewed` (8 reading types), `gpt_request_made`, `gpt_limit_hit`, `auth_nudge_seen`, `auth_nudge_clicked`, `login_completed`, `signup_completed`.
**How to use it:** The owner can query the SQLite database directly to answer: how many unique sessions hit the GPT limit, what percentage opened auth, how many completed a purchase. Events accumulate automatically — no configuration required.

---

### feat-oauth-signup
**Proposal:** feat-oauth-signup
**What it is:** One-click sign-in with Google or Facebook — no password required.
**Problem:** The only way to create an account was email + password, which is the maximum friction path at the highest-motivation moment (when a user hits their reading limit and wants to continue). The `password_hash NOT NULL` constraint also made adding OAuth impossible without a schema migration.
**Solution:** Direct OAuth2 code exchange (no Passport.js) in `server/routes/oauth.ts` — Google and Facebook flows with CSRF state cookie (`HttpOnly; SameSite=Lax; Max-Age=600`). Users are created with `subscription_tier='free'` and no password; the schema was migrated to make `password_hash` nullable with a CHECK constraint ensuring every user has at least one identity. JWT handoff happens via `?token=` redirect and is cleaned from the URL by `history.replaceState`. `AuthModal` now shows "Continue with Google" and "Continue with Facebook" at the top, above a ✦ divider reading "or arrive another way", with the email form below.
**How to use it:** Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` in `.env`. On the app, users see Google/Facebook as the first options in the sign-in modal.

---

### feat-stripe-checkout
**Proposal:** feat-stripe-checkout
**What it is:** The full payment loop — from hitting the reading limit to a paid subscription — with a product-voice upgrade experience that feels like the app, not a SaaS pricing page.
**Problem:** There was no way to pay. The 429 rate limit response was an inline error string inside the reading slot. No Stripe integration, no subscription tiers, no UpgradeModal.
**Solution:** `server/services/stripe.ts` wraps the Stripe SDK. `server/routes/stripe.ts` handles `POST /create-checkout-session` (auth-required, returns Stripe Checkout URL) and `POST /webhook` (mounted BEFORE `express.json()` with `express.raw()` for raw body preservation, verifies signature, handles `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` with idempotent DB writes and `invalidateUserRateLimit` calls). `src/components/subscription/UpgradeModal.tsx` is the conversion surface: dark-mystic palette, three tier descriptions in prose (not a pricing table), two-second ceremony animation before redirect ("Opening your account with the sky."), auth-first path for unauthenticated users. After payment, `?payment=success` triggers a forced `/api/auth/me` re-fetch and "The sky is wider now. ✦" appears once on the home screen. Stripe reconciliation at `/api/auth/me` catches webhook delivery failures — if a user has a `stripe_customer_id` but shows `free`, the server cross-checks Stripe's subscriptions API non-blockingly.
**How to use it:** Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_BASIC_PRICE_ID`, `STRIPE_ADVANCED_PRICE_ID` in `.env`. When any GPT limit is hit, the UpgradeModal appears automatically. Users click a tier, complete Stripe Checkout, and return to an elevated limit instantly.

---

### feat-subscription-tiers
**Proposal:** feat-subscription-tiers
**What it is:** The foundational backend layer: server-enforced subscription tiers with durable rate limit counters, tier-aware UI, and production safeguards.
**Problem:** The rate limiter used an in-memory `Map` with hardcoded limits — it reset on every server restart (every deploy gave free users a fresh quota), had no concept of tiers, didn't reflect tier changes mid-day after payment, and decremented the counter even when OpenAI was down.
**Solution:** `server/db.ts` gains `subscription_tier TEXT DEFAULT 'free'` and `stripe_customer_id TEXT` columns (additive `ALTER TABLE` migrations) plus a new `gpt_usage(user_id, date, count)` table. `gptRateLimit.ts` was fully rewritten: `RateLimitEntry` carries `tier`, limits are tier-aware (`free=3, basic=20, advanced=100`), counters are persisted to `gpt_usage` via atomic `INSERT OR IGNORE + UPDATE WHERE count < limit` (eliminates the race condition), tier is cached in-memory and re-fetched from DB only on entry creation or reset (one DB read per day per user), `invalidateUserRateLimit(userId)` export allows the Stripe webhook to flush the in-memory cache on tier elevation, `releaseSlot` via `res.locals` prevents quota consumption during OpenAI 5xx errors, and the localhost bypass is now gated to `NODE_ENV !== 'production'`. `server/routes/auth.ts` exposes `subscriptionTier` from `/api/auth/me` and a new `/api/auth/usage` endpoint. `AuthContext` gains `tier` and `todayUsed`. The `SessionBadge` dropdown shows "N readings left today" for free users and "Basic ✦" / "Advanced ✦" for paid. `HomeScreen` has a 6-state usage-aware nudge and a first-visit welcome sentence: "Your chart is ready. Everything you explore from here is yours."
**How to use it:** Everything is automatic. Free users see their reading count in the account menu. Paying users see their tier. The home screen nudge adjusts copy based on how many readings have been used today.

---

## Conflict Resolutions Summary
9 files required manual conflict resolution. All sprint work was preserved — no changes were discarded. Key resolutions:
- `server/index.ts`: Stripe webhook router mounted before `express.json()` (hard technical requirement)
- `server/db.ts`: All four migrations co-exist (events, gpt_usage, OAuth rebuild, additive tier columns)
- `gptRateLimit.ts`: task-0005's complete rewrite taken as authoritative; task-0004's webhook integration compatible
- `server/routes/auth.ts`: OAuth fields, Stripe reconciliation, and tier/usage endpoint all merged
- `src/context/AuthContext.tsx`: OAuth handoff, payment detection, tier, todayUsed — all unified in one mount useEffect
- `src/components/home/HomeScreen.tsx`: Analytics events, post-payment message, usage-aware nudge, first-visit welcome — all preserved
