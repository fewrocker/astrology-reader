# feat-stripe-checkout

**Type:** Feature
**Originated by:** Jobs, Miyazaki, Carmack, Taleb

---

## User Guidance

> "Theres a basic tier that allows 20 readings/requests per day, and a more advanced tier that allows 100 readings a day and also access to across time patterns of Journal Entries and Dreams. implement a easy payment solution like Stripe for that. Ai calls should show when the quota is met and invite for the next plans explaining subtly the benefits."

---

## Problem / Opportunity

The product has seven sprints of genuine depth behind it: real astronomical computation, real GPT interpretations, a journal that accumulates personal history, a home screen that knows who you are. It earns engagement. Users come back.

And then the sky says: *"Daily reading limit reached — try again tomorrow."*

That sentence — currently in `src/services/gptErrors.ts` as `GPT_RATE_LIMIT` — is where the product's relationship with its most engaged users ends. No modal. No acknowledgment of what the user was reaching for. No path forward that respects the moment. A sentence of text, rendered inline inside the reading result, where the interpretation would have been.

The user who hit the limit just proved the product has value. They used it until it stopped them. That is the highest-signal moment in the entire funnel, and the current system treats it as a technical constraint rather than a conversation.

The opportunity is not merely to collect payment. It is to make the limit-hit moment feel like an invitation — and to build the infrastructure that delivers what was promised the instant payment completes.

**What is missing today:**

- No Stripe integration exists anywhere in the codebase (`server/index.ts`, `server/routes/`, `server/services/` — none of these contain any payment handling)
- `server/routes/auth.ts` → `safeUser()` returns no `subscription_tier` field; the client has no knowledge of what tier the user is on
- `server/middleware/gptRateLimit.ts` uses a single hardcoded `AUTH_LIMIT = 20` regardless of tier; the `RateLimitEntry` type is `{ count: number; resetAt: number }` with no tier field; there is no `invalidateUserRateLimit` export
- No `UpgradeModal` component exists in the client; the 429 response surfaces as a string constant, not a modal
- No post-payment tier refresh exists; `AuthContext` populates once at mount and never re-fetches unless the user logs in again
- No webhook handler exists; there is no recovery path if Stripe webhook delivery fails

---

## Vision

### The Arc: From Limit to Sky

**The limit hits.** The user just asked for a reading. The split-render pattern means the page is already present — the chart data, the structure, everything except the interpretation. Where the GptSkeleton shimmer normally resolves into prose, it resolves instead into something different. Not an error. A pause.

The UpgradeModal appears. It is not a pricing page. It does not say "You've hit your limit." It says something that acknowledges the user was in the middle of something that mattered. The design is the same dark-mystic material as everything else in this product — `linear-gradient(160deg, rgba(22,16,8,0.98) 0%, rgba(15,11,5,0.99) 100%)`, gold accents, serif font for the tier names — because this modal lives inside the product's world, not outside it.

**The modal holds.** Three tiers described in prose, not in a table. Not checkmarks in columns. The current tier is acknowledged without judgment. The path forward is a single gold button. No confirmation dialog. No "are you sure?" The user just decided.

**The ceremony.** When the user clicks that button, there is a held breath. Not a loading spinner. A single sentence, centered: *"Opening your account with the sky."* The ✦ glyph, slow pulse. Two seconds, then the redirect to Stripe Checkout.

**Payment completes.** The user lands back in the app at `/?payment=success`. `AuthContext` detects the query parameter on mount, triggers a forced re-fetch of `/api/auth/me`, and updates the tier in context. The GPT call they were trying to make now succeeds — the server has already received the webhook and elevated the tier in the database.

**The sky is wider.** The home screen — `src/components/home/HomeScreen.tsx` — shows one addition: a soft ambient line, below the identity block, visible only once: *"The sky is wider now. ✦"* Not a modal. Not a banner. A sentence in the space where they stand. It appears on the first render post-payment and is marked seen in localStorage so it never repeats.

The conversation continues from exactly where it paused.

---

## Specifications

### 1. Server service: `server/services/stripe.ts`

Create a thin SDK wrapper. Initialize the Stripe client with `STRIPE_SECRET_KEY` from env. Export typed constants for price IDs, sourced from env variables so they can differ between test and production:

```
STRIPE_BASIC_PRICE_ID
STRIPE_ADVANCED_PRICE_ID
```

Export a function `createCheckoutSession({ userId, priceId, customerEmail, stripeCustomerId? })` that creates a Stripe Checkout Session with:
- `mode: 'subscription'`
- `success_url: '<BASE_URL>/?payment=success'`
- `cancel_url: '<BASE_URL>/'`
- `customer_email` for new customers, or `customer` for returning customers with an existing `stripe_customer_id`
- `metadata: { userId: String(userId) }` on the session — required for the webhook handler to correlate the session back to a database user
- `subscription_data.metadata: { userId: String(userId) }` — also set on the subscription object, since `customer.subscription.updated` events do not carry session metadata

Export a helper `getTierFromPriceId(priceId: string): 'basic' | 'advanced' | null` that maps known price IDs to tier names and returns null for unknown price IDs. This function is used by the webhook handler and must not hard-code prices — it must read from the same env constants.

### 2. DB migration

In `server/db.ts`, after the existing `CREATE TABLE IF NOT EXISTS users` block, add an additive migration using SQLite 3.35+ syntax:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
```

These columns are safe to add to existing databases without affecting existing rows. `subscription_tier` defaults to `'free'` for all existing users. `stripe_customer_id` is nullable and null for all existing users.

### 3. Webhook route mounting order — hard technical requirement

In `server/index.ts`, the Stripe webhook route **must** be registered **before** the `app.use(express.json())` global middleware. The current file has `app.use(express.json())` at line 38, with all route registrations below it. The webhook handler requires the raw request body bytes for Stripe signature verification via `stripe.webhooks.constructEvent()`. Once `express.json()` has consumed and re-serialized the body, signature verification will fail silently in production — Stripe will retry the event 72 hours, every event will be rejected, and no tiers will ever be elevated from webhooks.

The correct ordering in `server/index.ts`:

```
// 1. Raw body route — before express.json()
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhookHandler)

// 2. Global JSON parser — all other routes
app.use(express.json({ limit: '50kb' }))

// 3. All other routes
app.use('/api/auth', authRouter)
// ...
```

The `express.raw({ type: 'application/json' })` middleware must be scoped to the webhook route only. Do not replace the global `express.json()` with `express.raw()`.

### 4. Webhook handler: `server/routes/stripe.ts`

**Event hierarchy (in order of precedence):**

1. `customer.subscription.deleted` → set `subscription_tier = 'free'` for the user associated with `stripe_customer_id`. This handles cancellation and payment failure (Stripe moves the subscription to deleted after grace period exhaustion).

2. `customer.subscription.updated` with `event.data.object.status === 'active'` → set `subscription_tier` based on `getTierFromPriceId()` applied to the subscription's current price ID. This handles plan changes and reactivations.

3. `checkout.session.completed` → initial tier grant. Read `session.metadata.userId` to find the user. Write `stripe_customer_id` from `session.customer` to the users table (this links the user to future subscription events). Write `subscription_tier` from `getTierFromPriceId(session.subscription_price_id)`. The subscription events will also fire for the same payment — treat those as the authoritative ongoing signal, and `checkout.session.completed` as the initial bootstrap.

**Idempotency:** Every tier write must use the UPDATE idempotency pattern:

```sql
UPDATE users SET subscription_tier = ? WHERE id = ? AND subscription_tier != ?
```

This ensures that a re-delivered event for a tier the user is already on is a no-op. For `stripe_customer_id` writes, use a similar conditional: only write if the current value is NULL or differs.

**After every successful tier write**, call `invalidateUserRateLimit(userId)` (exported from `server/middleware/gptRateLimit.ts`). This deletes the user's in-memory rate limit entry so their next GPT call does a fresh DB lookup at the new tier limit rather than being blocked by a stale free-tier counter from before payment.

**Signature verification** must be the first step in the handler, before any DB operations:

```ts
const sig = req.headers['stripe-signature']
let event: Stripe.Event
try {
  event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
} catch (err) {
  res.status(400).send(`Webhook signature failed: ${err}`)
  return
}
```

**Error handling:** If a DB write fails inside the webhook handler, return HTTP 500. Stripe will retry the event. Never return 200 for an event that was not successfully processed — Stripe uses 2xx to mark events as delivered.

**`STRIPE_WEBHOOK_SECRET` env guard:** The production env guard in `server/index.ts` must include `STRIPE_WEBHOOK_SECRET`. An unset `STRIPE_WEBHOOK_SECRET` means anyone can POST arbitrary events to the webhook endpoint and elevate tiers for any user. This is a critical security requirement, not a nice-to-have.

### 5. Checkout session endpoint: `POST /api/stripe/create-checkout-session`

Mounted in `server/routes/stripe.ts`. Requires `requireAuth` middleware — unauthenticated users cannot create a checkout session directly (the UpgradeModal handles the auth-first flow separately on the client).

Request body: `{ priceId: string }`. Validate that `priceId` is one of the known valid price IDs (basic or advanced). Reject unknown price IDs with 400.

Fetch the user record from the DB to get their `email` and existing `stripe_customer_id`. If `stripe_customer_id` is non-null, pass it as `customer` to the Checkout Session so Stripe recognizes the returning customer. If null, pass `customer_email` so Stripe creates a new customer and the resulting `customer.id` can be captured from the webhook.

Respond with `{ url: session.url }`. The client redirects to this URL directly — no intermediate confirmation page.

### 6. `invalidateUserRateLimit` export

Add to `server/middleware/gptRateLimit.ts`:

```ts
export function invalidateUserRateLimit(userId: number): void {
  authenticated.delete(userId)
}
```

This is the bridge between the webhook handler and the in-memory rate limiter. When a user upgrades mid-day, their in-memory entry still carries the old tier and the old count. Deleting the entry forces the next GPT call to start a fresh entry with the new tier's limit. Without this, a user who upgrades from free (3 calls) to basic (20 calls) at 2pm after exhausting their 3 free calls will still be blocked until midnight UTC.

### 7. Tier-aware `RateLimitEntry`

Update the `RateLimitEntry` type in `server/middleware/gptRateLimit.ts`:

```ts
type RateLimitEntry = { count: number; resetAt: number; tier: 'free' | 'basic' | 'advanced' }
```

On entry creation (new user or post-midnight reset), do a single synchronous DB read via `getDb()` to fetch `subscription_tier` for the user. The tier is cached in the entry for the day — do not re-fetch on every call. When the entry is invalidated by `invalidateUserRateLimit`, the next call creates a fresh entry with a fresh DB read at the current tier.

The tier-to-limit mapping:
- `'free'` → 3 calls/day
- `'basic'` → 20 calls/day
- `'advanced'` → 100 calls/day

### 8. `/api/auth/me` returns `subscription_tier`

In `server/routes/auth.ts`, the `UserRow` interface and `safeUser()` function currently do not include `subscription_tier` or `stripe_customer_id`. Update `UserRow` to include these fields. Update the SELECT query in both the `/me` GET handler and the `login` POST handler to include `subscription_tier`. Update `safeUser()` to expose `subscriptionTier` in the returned object.

The `stripe_customer_id` field should **not** be returned to the client — it is an internal server implementation detail.

### 9. Stripe reconciliation at `/api/auth/me`

At the `/me` endpoint, after fetching the user from DB, add a non-blocking Stripe reconciliation check:

```
if (user.stripe_customer_id && user.subscription_tier === 'free') {
  // Check Stripe subscriptions API for active subscription
  // If found: update DB tier, call invalidateUserRateLimit
  // If Stripe call fails: proceed with DB value — never block auth on Stripe API error
}
```

This is Taleb's safety net: Stripe is the source of truth for payment, not the SQLite database. A webhook failure leaves the user with a payment receipt from Stripe and a `free` tier in the DB. On next login or `/me` call, the reconciliation check catches this mismatch and corrects it without manual intervention.

The reconciliation check must be:
- **Non-blocking:** if the Stripe API call throws (network error, timeout, Stripe outage), catch the error, log it, and proceed with the DB value. Never fail authentication because Stripe is unavailable.
- **Idempotent:** use the same `UPDATE ... WHERE subscription_tier != ?` pattern as the webhook handler.
- **Lightweight:** only fires when `stripe_customer_id` is set AND tier is `'free'` — i.e., only for users who have ever started a Stripe relationship but appear to be on free. Not for users who have never touched Stripe.

### 10. `AuthContext` gains `tier` field

In `src/context/AuthContext.tsx`, the `AuthUser` type must include:

```ts
tier: 'free' | 'basic' | 'advanced'
```

Populated from the `subscriptionTier` field of the `/api/auth/me` response. The context should expose `tier` directly so any component can gate UI without importing auth internals.

### 11. Client tier refresh after payment return

In `AuthContext`, on mount, check `window.location.search` for `?payment=success`. If present:
1. Trigger a forced re-fetch of `/api/auth/me` (bypassing any cached session state)
2. Update the `tier` field in context from the response
3. Call `window.history.replaceState(null, '', window.location.pathname)` to remove the `?payment=success` parameter from the URL

This must happen before rendering the home screen, so the UI never briefly shows the free-tier state to a user who just paid.

The `?payment=success` detection also triggers the "The sky is wider now. ✦" post-payment message display (see Specification 15).

### 12. `gptErrors.ts` extension

The 429 response from the server currently contains `{ error, resetAt, limit, authenticated }`. The client's `gptInterpretation.ts` service currently converts 429 responses into the `GPT_RATE_LIMIT` or `GPT_RATE_LIMIT_UNAUTH` string constants.

This behavior must change: a 429 response should not produce an inline string in the reading result. It should signal the calling component to open the UpgradeModal. The exact mechanism (a thrown typed error, a returned sentinel object, a callback prop) is a developer decision, but the behavioral contract is:

- 429 received → UpgradeModal opens, reading slot stays in its pre-interpretation state (not populated with an error string)
- The modal receives `{ resetAt: string, currentTier: 'free' | 'basic' | 'advanced', authenticated: boolean }` as props so it can display contextually correct copy

The `GPT_RATE_LIMIT` and `GPT_RATE_LIMIT_UNAUTH` string constants may remain in `gptErrors.ts` as fallback values for scenarios where no modal surface is available (server error, offline state), but they must not be the primary rate-limit response.

### 13. `UpgradeModal.tsx`: component design

**File:** `src/components/subscription/UpgradeModal.tsx`

**Trigger conditions:**
- 429 response from any GPT endpoint, for any user (authenticated or not)
- Attempt to access `type === 'cosmic-pattern-reading'` on a free or basic tier (the server returns 403 for this; the client interprets it as an UpgradeModal trigger pointing to the Advanced tier)

**Visual language:** identical palette to `AuthModal` and `ReadingsModal`. Background: `linear-gradient(160deg, rgba(22,16,8,0.98) 0%, rgba(15,11,5,0.99) 100%)`. Border: `rgba(201,168,76,0.28)`. Box shadow: `0 8px 32px rgba(0,0,0,0.6)`. Gold accents for tier names and CTAs. Muted text for descriptive body copy. `font-heading` (serif) for tier names. No table. No feature columns. No checkmarks.

**Heading copy — context-aware:**
- Unauthenticated user hitting IP limit: `"Three free readings per day. You've used yours."`
- Authenticated free user hitting 3-call limit: `"Your readings for today have ended."` with `resetAt` time displayed below as `"Your sky resets at midnight UTC."` — turns the wall into a schedule
- Authenticated basic user hitting 20-call limit: `"You've explored the full sky today."` with reset time
- Authenticated free or basic user attempting cosmic-pattern-reading: `"This reading requires the Advanced sky."`

**Tier descriptions — prose, not table:**

Free (current state indicator if applicable):
> "Three readings a day — a morning consultation with the sky. No cost, no card."

Basic:
> "Twenty readings a day. Enough to explore every corner of your chart across a full day's reflection. [price]/month"

Advanced:
> "One hundred readings a day, and a new power that only time can reveal: patterns across your journal and your dreams — what the sky has been building while you were keeping it." [price]/month"

The advanced description does extra work for users who have journal history: it names the feature in terms of what the person actually has. If the user has journal entries, the copy should acknowledge this — not with a counter, but with the phrase "while you were keeping it" which implies earned history.

**"You are here" marker:** The current tier receives a subtle visual indicator — a small muted line `"you are reading on free"` or `"you are reading on basic"` — in the product's language. Not the word "current" in a badge. A sentence.

**CTA structure:**
- Primary button (gold, full-width): `"Open Basic — $[price]/month"` or `"Open Advanced — $[price]/month"` pointing to the next tier up
- Secondary link (muted, smaller): `"Or open Advanced — $[price]/month"` if there is a tier above the primary
- Tertiary quiet dismiss: `"Continue with free — your sky resets at midnight"` (closes modal, does not navigate)

**For unauthenticated users:** the primary CTA does not go to Stripe. It opens `AuthModal` in register mode, remembering the intended tier via component state or a lightweight ref. After authentication completes, the UpgradeModal re-opens (or proceeds directly to checkout) for the tier that was selected. The user who signs up must land at the checkout for the tier they intended, not back at a blank upgrade modal.

**Accessibility:** the modal must be keyboard-navigable, with focus trapped inside while open, `role="dialog"`, `aria-modal="true"`, and a visible close control.

### 14. Payment ceremony: two-second held state

When the user clicks the primary CTA (and is authenticated), the component POSTs to `/api/stripe/create-checkout-session`. While this request is in flight, do not show a generic loading spinner. Show:

```
[slow pulsing ✦]
"Opening your account with the sky."
```

Full-bleed within the modal content area. The ✦ uses the same `animate-spin` at 3s duration already used in the app's loading states. The sentence is centered, `font-heading`, `text-mystic-gold/80`.

Hold this state for a minimum of 2 seconds even if the server responds faster — the ceremony is intentional, not a loading artifact. After 2 seconds and after the server response is ready, `window.location.href = session.url`.

If the server responds with an error during this window, transition out of the ceremony state back to the tier presentation, with a quiet error note: `"Something went wrong — please try again."` No stack traces. No technical detail.

### 15. Post-payment home screen message

In `src/components/home/HomeScreen.tsx`, add logic to display a one-time ambient message after payment return.

Condition: `AuthContext` `tier` has been elevated (not `'free'`) AND a localStorage key `payment_welcomed` is not set. Set the key immediately on first render of this condition to prevent the message from ever repeating.

The message appears in the left panel of the home screen, below the identity block and above the "Get Your Readings ✦" CTA, in the empty space that exists between them. It is not a banner. Not a modal. One line of text:

```
"The sky is wider now. ✦"
```

Styled as `text-mystic-gold/70 text-sm font-heading text-center`, with a gentle fade-in animation (`animate-fade-in` or equivalent). No dismiss control needed — it is only rendered once, and after the next page interaction it is naturally replaced.

### 16. UpgradeModal trigger wiring

The UpgradeModal must be elevated to the `AppContent` level in `src/App.tsx` — not rendered inside individual reading screens — so it can be triggered from any GPT call regardless of which screen the user is on (results, transit, synastry, solar return, today). A shared `upgradeModalOpen` state and `onUpgrade` callback pattern, similar to how `authModalOpen` and `openAuth()` work currently (see `App.tsx` lines 183-187), should gate it.

The `UpgradeModal` receives:
- `isOpen: boolean`
- `onClose: () => void`
- `currentTier: 'free' | 'basic' | 'advanced'`
- `resetAt: string | null` — from the 429 response payload
- `authenticated: boolean`
- `intendedTier?: 'basic' | 'advanced'` — for cosmic-pattern-reading triggers that know which tier is needed

### 17. UI states inventory

Every moment in the payment flow must have a defined state:

| Moment | UI State |
|---|---|
| Reading limit hit (any screen) | UpgradeModal opens; reading slot stays in skeleton/partial state |
| Unauthenticated limit hit | UpgradeModal shows with "sign up first" CTA path |
| User clicks tier CTA (unauthenticated) | AuthModal opens; UpgradeModal stays in memory |
| Auth completes (from upgrade path) | AuthModal closes; checkout begins for intended tier |
| User clicks tier CTA (authenticated) | Payment ceremony (2s hold) |
| Ceremony complete, server responds | Redirect to Stripe Checkout |
| Stripe Checkout cancelled | User returns to `/?` (cancel_url); no state change; UpgradeModal may be re-triggered on next limit hit |
| Stripe Checkout completed | User lands at `/?payment=success`; AuthContext re-fetches; tier elevated in context |
| Post-payment first render | "The sky is wider now. ✦" visible on HomeScreen |
| Post-payment subsequent renders | No special message; normal home screen |
| Webhook fails, user returns | Reconciliation at `/api/auth/me` catches mismatch; tier elevated; same post-payment UX |
| Subscription cancelled (server-side) | Next `/api/auth/me` call returns `free`; AuthContext updates; UI shows free state |
| Mid-session tier downgrade | Client tier is stale until next `/api/auth/me` call; GPT calls may fail at new limits; server is authoritative |

---

## Out of Scope

- **Billing portal UI** — no subscription management inside the app (plan downgrade, invoice history, payment method update). Users who want to cancel contact the owner directly; Stripe's hosted billing portal is a future sprint addition.
- **Trial periods** — no Stripe trial configuration in v1. The free tier is the trial.
- **Multi-currency / localization** — Stripe Checkout handles currency display; the app's UI stays English-only.
- **Proration and plan switching** — a user upgrading from basic to advanced mid-cycle via the app is out of scope. Stripe handles proration server-side; the app does not need to surface it.
- **Admin panel for manual tier override** — the Taleb voice correctly identifies this as valuable; it is not in scope for this feature but should be tracked as a follow-on operational need.
- **A/B testing on upgrade modal copy** — ship one variant; experiment after first conversion data exists.
- **Refunding quota for OpenAI failures** — the `releaseSlot` mechanism (Taleb Proposal 5) is correctly scoped to `feat-subscription-tiers`, not this feature.
- **Durable rate limit persistence** — the SQLite-backed `gpt_usage` table (Taleb Proposal 2) is correctly scoped to `feat-subscription-tiers`. This feature assumes `invalidateUserRateLimit` is sufficient for the webhook-to-ratelimiter bridge.
- **OAuth sign-up flow** — scoped to `feat-oauth-signup`. The UpgradeModal's unauthenticated CTA path opens `AuthModal` in email/password mode for this feature; OAuth buttons are wired by that separate feature.
- **Facebook OAuth** — scoped to `feat-oauth-signup`.
- **Password reset** — out of scope for the sprint entirely.

---

## Open Questions

1. **Price points.** The spec does not define dollar amounts for Basic and Advanced tiers. The `UpgradeModal` copy includes `[price]/month` placeholders that must be filled before ship. These are a product decision, not an engineering decision, but they block the modal copy being finalized.

2. **Base URL for Stripe success/cancel redirect.** The `createCheckoutSession` service needs a `BASE_URL` env variable for constructing the `success_url` and `cancel_url`. This must be in `.env.example` and the production env guard. Should it be `VITE_BASE_URL` (from the build) or `SERVER_BASE_URL` (a server-side env var)? For a server-side Stripe call, `SERVER_BASE_URL` is cleaner — it does not expose the URL construction to the client bundle.

3. **Stripe test vs. live mode toggle.** The `STRIPE_SECRET_KEY` and price IDs differ between test and live. The `.env.example` should document the convention (e.g., `sk_test_...` vs. `sk_live_...`). Should the webhook handler log a warning if it detects a live-mode key in a non-production `NODE_ENV`?

4. **The `checkout.session.completed` → price ID mapping.** A `checkout.session.completed` event's session object does not directly contain the price ID — it contains a `subscription` ID. To get the price ID from `checkout.session.completed`, you must either retrieve the subscription from Stripe in the webhook handler, or rely on `customer.subscription.created` (which fires with full price data). The recommended approach: do not tier-write from `checkout.session.completed` at all; use `customer.subscription.created` (status `active`) for the initial grant. This simplifies the event hierarchy to: `created`/`updated` with `active` → elevate; `deleted` → free. Confirm this event ordering matches the product's intended behavior.

5. **The cosmic-pattern-reading 403 vs. 429.** When a free or basic user attempts a `cosmic-pattern-reading`, the server should return a distinct status to indicate "feature not available at this tier" rather than "rate limit exceeded." A 403 with `{ error: 'tier_required', requiredTier: 'advanced' }` is more semantically correct than a 429. The client must distinguish these two triggers to display the correct heading copy in the UpgradeModal. Confirm the error shape and status code for this gate.

6. **`payment_welcomed` localStorage key and tier downgrade.** If a user pays, sees "The sky is wider now. ✦", then cancels, then pays again — should the welcome message re-appear? The current spec sets `payment_welcomed` once and never clears it, so the message never re-appears. This seems correct but should be confirmed.

7. **Ceremony duration and perceived performance.** The 2-second held state is intentional, but if the `/api/stripe/create-checkout-session` call takes longer than 2 seconds (slow network, Stripe API latency), the user will wait 2+ seconds. Cap total wait at 4 seconds before surfacing an error state. Confirm the acceptable ceiling.

---

## Outcome

**Completed:** 2026-05-14
**Branch:** sprint-0009-task-0004-feat-stripe-checkout
**Commit:** 480da21

### Files Created
- `server/services/stripe.ts` — Stripe SDK wrapper with `createCheckoutSession`, `getTierFromPriceId`, `PRICE_IDS`
- `server/routes/stripe.ts` — `/webhook` (raw body, signature verification, subscription event handlers) + `/create-checkout-session` (requireAuth)
- `src/components/subscription/UpgradeModal.tsx` — dark-mystic modal with tier prose descriptions, ceremony state, auth-first path for unauthenticated users

### Files Modified
- `server/index.ts` — stripe router registered BEFORE express.json() (critical ordering); production guard for STRIPE_WEBHOOK_SECRET
- `server/db.ts` — additive migration adds `subscription_tier TEXT DEFAULT 'free'` and `stripe_customer_id TEXT`
- `server/middleware/gptRateLimit.ts` — tier-aware limits (free=3, basic=20, advanced=100); `invalidateUserRateLimit` export; tier cached in RateLimitEntry
- `server/routes/auth.ts` — `UserRow` + `safeUser` extended with `subscriptionTier`; Stripe reconciliation at `/me` catches webhook delivery failures
- `src/services/gptInterpretation.ts` — `RateLimitError` class (replaces inline string); 429 responses now throw typed error
- `src/context/AuthContext.tsx` — `tier` field, `refreshSession`, `paymentWelcomePending`/`dismissPaymentWelcome`, `?payment=success` detection
- `src/services/authService.ts` — `ServerUserProfile` extended with `subscriptionTier`
- `src/App.tsx` — `upgradeModalOpen` state + `openUpgrade` callback; `RateLimitError` caught in all four GPT async effects; `UpgradeModal` mounted at AppContent level
- `src/components/home/HomeScreen.tsx` — one-time "The sky is wider now. ✦" message on post-payment first render

### Key Decisions
- Stripe API version updated to `2026-04-22.dahlia` (latest in installed package)
- Webhook event priority: `subscription.deleted` → free; `subscription.created/updated` (active) → tier grant; `checkout.session.completed` → bootstrap (retrieves sub to map price)
- Ceremony holds minimum 2s even if server responds faster; errors transition back to tier presentation
- `payment_welcomed` localStorage key set once, never cleared (confirmed correct per spec Q6)
