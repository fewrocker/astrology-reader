# Sprint 0009 Vision — Production Preparation

## Sprint Focus

This sprint converts a working single-user prototype into a multi-tier SaaS ready for real customers. That means three interlocking systems that must arrive together: a subscription model with server-enforced tier limits (free / basic / advanced), a Stripe checkout flow that grants and revokes those tiers, and a funnel-analytics layer that tracks every visitor from first page load to paid conversion. OAuth sign-up via Google and Facebook completes the onboarding surface so first-time users face zero friction barriers.

## Why Now

The backend scaffolding that was the hard prerequisite is done. Sprint-0007 delivered Express + SQLite + JWT auth and moved all GPT calls to the server behind per-IP and per-user rate limits. Sprint-0008 delivered the home screen dashboard and the quota nudge hooks (the "Save your readings ✦" auth prompt is already live on the home screen). The rate limiter already keys on `user_id` for authenticated users — the tier column in the users table and the Stripe webhook are the only additions needed to make the existing middleware enforce paid limits rather than a hardcoded 20. The UI scaffolding for subscription messaging exists through `GptSkeleton.tsx` (sprint-0008) and `gptErrors.ts`: the "rate limit exceeded" response is already propagated to every screen. Everything is staged for this sprint. Waiting further risks building more features on top of a tier-less, payment-less, analytics-blind foundation, which will require a messier retrofit later.

## Where to Look

**Subscription tier model — server**
- `server/db.ts` — add `subscription_tier TEXT DEFAULT 'free'` and `stripe_customer_id TEXT` columns to `users` table via additive migration
- `server/middleware/gptRateLimit.ts` — replace hardcoded `GPT_AUTH_DAILY_LIMIT=20` with tier-aware lookup: free→3, basic→20, advanced→100; also gate the advanced-only "journal patterns" feature (`type === 'cosmic-pattern-reading'`) behind the advanced tier check
- `server/routes/auth.ts` — expose `/api/auth/me` tier field so the client can render plan state

**Stripe integration — server**
- `server/routes/stripe.ts` (new) — `POST /api/stripe/create-checkout-session`, `POST /api/stripe/webhook` (webhook verifies `stripe-signature`, handles `checkout.session.completed`, `customer.subscription.deleted`, `customer.subscription.updated` to write `subscription_tier` to users table)
- `server/services/stripe.ts` (new) — thin wrapper around `stripe` SDK, product/price ID constants from env

**Subscription UX — client**
- `src/components/subscription/UpgradeModal.tsx` (new) — shown when the server returns 429; presents the three tiers with GPT call counts per day and the advanced-tier journal patterns benefit; primary CTA calls `POST /api/stripe/create-checkout-session` and redirects to Stripe Checkout
- `src/services/gptErrors.ts` — currently only defines error string constants; extend to carry `tier` and `resetAt` from the 429 payload so the UpgradeModal knows which plan the user is on and which plan to offer
- `src/components/home/HomeScreen.tsx` — replace the generic "Save your readings ✦" auth nudge with a tier-aware state: unauthenticated → sign up, free → upgrade nudge after 2/3 daily reads consumed, basic/advanced → account badge
- `src/context/AuthContext.tsx` — add `tier: 'free' | 'basic' | 'advanced'` to `AuthUser`, populate from `/api/auth/me` response, expose through context so any component can gate UI

**OAuth sign-up — server and client**
- `server/routes/oauth.ts` (new) — `/api/auth/google/callback` and `/api/auth/facebook/callback`; use `passport` (passport-google-oauth20, passport-facebook) or direct OAuth2 code exchange; on first-time sign-in, create user row with `subscription_tier = 'free'`; return same JWT structure as email/password auth
- `src/components/auth/AuthModal.tsx` — add "Continue with Google" and "Continue with Facebook" buttons below the email/password form; these initiate the OAuth redirect; on callback return, AuthContext picks up the JWT from URL param and stores it identically to email login

**Funnel analytics — client and server**
- `src/services/analytics.ts` (new) — thin event emitter that POSTs `{ event, properties, sessionId }` to `/api/analytics`; `sessionId` is a UUID stored in a first-party cookie (set via server on first visit, not localStorage, so it survives cache clears); events to track: `page_view`, `form_started`, `form_completed`, `reading_viewed`, `gpt_request_made`, `gpt_limit_hit`, `upgrade_modal_shown`, `checkout_started`, `signup_completed`, `login_completed`
- `server/routes/analytics.ts` (new) — `POST /api/analytics/event`; writes to an `events` table in SQLite; no external service for v1 — the owner reads raw SQLite to understand the funnel
- `server/db.ts` — add `events` table: `id, session_id, user_id (nullable), event, properties (JSON), created_at`

**Production hardening**
- `server/index.ts` — add `helmet` (security headers), `compression` (gzip), and a `morgan` or structured request logger; add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to env guard block alongside `JWT_SECRET`
- `.env.example` — document all required env vars: `JWT_SECRET`, `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_BASIC_PRICE_ID`, `STRIPE_ADVANCED_PRICE_ID`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`

## Quality Bar

"Deep" for this sprint means: a user can arrive unauthenticated, consume their 3 free GPT reads, see a conversion-optimized UpgradeModal that shows real plan benefits (not a generic paywall), click through to Stripe Checkout, pay, and immediately get their extended limit — without any manual intervention. The subscription tier must be enforced server-side (a client-side tier check alone is not acceptable). Funnel events must fire at every conversion touchpoint, not just on sign-up. The analytics table must record session continuity across page reloads so the owner can see drop-off rates at each funnel step.

"Shallow" would be: a Stripe link that goes to a static pricing page without creating a Checkout Session, or a tier column in the DB that is never read by the rate limiter, or analytics that only track sign-ups and not the pre-conversion interactions. Any proposal that does not close the full loop from limit-hit → upgrade modal → payment → tier elevation is shallow for this sprint.

For OAuth: "deep" means the user sees "Continue with Google" and one click later is authenticated and back in the app with their tier set. "Shallow" is a placeholder button that links to a signup form.

## What This Sprint Is NOT

- **Not new astrological features** — no new readings, no new chart types, no new GPT prompts. The feature set is frozen for this sprint.
- **Not a full analytics dashboard** — no Mixpanel, Amplitude, or custom admin UI. SQLite + raw queries is the v1 analytics backend. A proper dashboard is a future sprint.
- **Not a billing portal** — no subscription management UI (plan downgrade, invoice history, payment method update) inside the app. Stripe's hosted billing portal can be linked later; for now, a user who wants to cancel emails the owner.
- **Not a password reset flow** — the AuthModal already acknowledges this is unimplemented. Password reset requires email delivery infrastructure (SendGrid or similar) which is a separate sprint concern.
- **Not mobile app / PWA hardening** — the responsive design is already done; this sprint does not add service workers, push notifications, or app store packaging.
- **Not A/B testing infrastructure** — upgrade modal copy and pricing presentation are shipped as a single variant; experimentation comes after the first real conversion data exists.
- **Not multi-currency / localization** — Stripe Checkout handles currency display; the app's own UI stays English-only.
