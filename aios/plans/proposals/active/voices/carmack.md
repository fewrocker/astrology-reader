# John Carmack — Voice Analysis: Sprint 0009

The backend scaffolding that landed in 0007 was right. SQLite with WAL mode, JWT auth, the GPT proxy, per-user rate limiting in memory — solid foundation. Sprint-0008 shipped the UI that drives users toward auth. Now sprint-0009 has to close the money loop: tier enforcement, Stripe webhooks, OAuth, and funnel analytics. This is where I'm going to be blunt about what's harder than it looks and what will break you if you're not precise.

---

## Technical Diagnosis

### The Rate Limiter Is Currently a Single Point of Fragility

Look at `server/middleware/gptRateLimit.ts`. The entire enforcement mechanism is two in-process `Map` objects:

```ts
const authenticated: Map<number, RateLimitEntry> = new Map()
const unauthenticated: Map<string, RateLimitEntry> = new Map()
```

This works fine as a rate limiter for a single process. But there are three problems sprint-0009 introduces that this design does not handle:

1. **Server restart = quota reset.** A user hits their free 3-call limit at 11:58pm, you restart the server at 11:59pm, they have 3 fresh calls. For a paid product where limits are the monetization lever, this is a correctness bug, not just a cosmetic issue.

2. **Tier lookup is missing the database.** Right now `checkLimit(authenticated, userId, AUTH_LIMIT)` uses a single hardcoded `AUTH_LIMIT`. To make tiers work, this function needs to do a DB read per request to know whether the user is free/basic/advanced. That read happens on the hot path of every GPT call. `better-sqlite3` is synchronous and fast (~0.1ms per query), so this is fine — but the tier lookup must be cached in the in-memory map entry alongside the count, otherwise you're either hitting the DB on every request or you're ignoring tier upgrades until midnight reset.

   The correct data structure for `RateLimitEntry` needs to become:
   ```ts
   type RateLimitEntry = { count: number; resetAt: number; tier: 'free' | 'basic' | 'advanced' }
   ```
   And the tier should be re-fetched from DB when the entry either doesn't exist or resets at midnight — not on every single call.

3. **The `cosmic-pattern-reading` gate.** The vision correctly identifies that `cosmic-pattern-reading` is advanced-only. Right now `gptRateLimit.ts` has no concept of feature gating — it only counts calls. The feature gate (reject if `type === 'cosmic-pattern-reading'` and tier is not `advanced`) must be added in `server/routes/gpt.ts` **after** `requireAuth` and **after** the tier is looked up from the DB. A rate limit middleware is the wrong place for a feature permission check — those are two different concerns. Don't conflate them.

### The Stripe Webhook Has Three Classic Failure Modes

The vision correctly calls for `server/routes/stripe.ts` with webhook verification via `stripe-signature`. Let me be precise about what will bite you:

**1. Raw body requirement.** Stripe webhook verification requires the exact raw request body bytes — not the parsed JSON. Express's `express.json()` middleware in `server/index.ts` (line 37) will consume and parse the body before it reaches your webhook handler. The Stripe SDK's `stripe.webhooks.constructEvent()` will then fail with a signature mismatch because it's getting a re-serialized string, not the original bytes.

The fix is to mount the webhook route **before** `app.use(express.json())`, and use `express.raw({ type: 'application/json' })` as middleware on that route specifically:

```ts
// In server/index.ts — MUST come before express.json()
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhookHandler)
```

If you get the order wrong, signature verification will fail on every webhook event in production, Stripe will retry, and you'll have a pile of unprocessed subscription events with no obvious error message.

**2. Idempotency — process each event exactly once.** Stripe guarantees at-least-once delivery. The same `checkout.session.completed` event can be delivered multiple times. Your webhook handler must be idempotent: processing a `checkout.session.completed` event for a user who is already `basic` tier must be a no-op, not a double-write or log error.

The correct implementation:
```ts
// Use INSERT OR REPLACE or UPDATE with WHERE clause that checks current state
db.prepare('UPDATE users SET subscription_tier = ? WHERE id = ? AND subscription_tier != ?')
  .run('basic', userId, 'basic')
```

Or store processed Stripe event IDs in the DB and skip already-seen events. For v1, the UPDATE idempotency is sufficient, but understand that Stripe event IDs are what make this correct in the face of retries.

**3. Race condition between checkout.session.completed and customer.subscription.updated.** When a user completes Stripe Checkout, Stripe fires multiple events in quick succession: `checkout.session.completed`, then `customer.subscription.created`, then potentially `customer.subscription.updated`. If your handler for `checkout.session.completed` reads the subscription from the session and writes the tier, and then `customer.subscription.updated` arrives a second later with a different state, you can end up with the wrong tier. Define a canonical hierarchy: `customer.subscription.deleted` → free, `customer.subscription.updated` with `status === 'active'` → tier from price ID, `checkout.session.completed` → initial grant. The subscription events take precedence over session events.

### OAuth Code Exchange Must Not Be Naive

The vision mentions `passport-google-oauth20` or direct OAuth2 code exchange. Let me flag the security requirements that are non-negotiable:

**State parameter.** The OAuth2 `state` parameter is not optional — it prevents CSRF attacks on the callback. When the user clicks "Continue with Google", your server must generate a cryptographically random state value (16+ bytes from `crypto.randomBytes`), store it in a short-lived server-side session (or a signed cookie), and include it in the authorization URL. When Google redirects to `/api/auth/google/callback?code=...&state=...`, your handler must verify the state matches what was stored before exchanging the code. If you skip this, an attacker can trick a logged-in user into linking a Google account to the attacker's account.

**Where to store the pending state.** This app has no session mechanism — it's JWT-only. Options:
- A short-lived in-memory map of `{ state → timestamp }` with a 10-minute TTL. Simple, works for single-process. Loses state on restart (acceptable for OAuth flow — the user just tries again).
- A signed `HttpOnly` cookie containing the state value, set before redirect, verified on callback. This is the cleaner approach and doesn't require server memory.

The cookie approach: set `Set-Cookie: oauth_state=<value>; HttpOnly; SameSite=Lax; Secure; Max-Age=600` before redirecting to Google. Read it back on the callback, verify, then delete it.

**The token handoff after OAuth completes.** After the OAuth callback creates/finds the user and issues a JWT, how does that JWT get to the React app? The callback is a server-side redirect, not an XHR response the React client is waiting on. Options:
- Redirect to `/?token=<jwt>`. The React app reads the `token` query param on mount, stores it in localStorage, removes the param from the URL. Simple. The JWT is briefly visible in the URL and in browser history — acceptable for a v1 without sensitive context in the token.
- Redirect to a short-lived one-time-use token endpoint. The redirect goes to `/?code=<one-time-code>`, the React app exchanges the code for the JWT in a background POST. More secure, more complex.

For v1: the query param handoff is fine. The JWT contains only `userId` and expiry — nothing sensitive. But the React `AuthContext` needs to handle this: on mount, check `window.location.search` for a `token` param, and if present, store it and call `history.replaceState` to clean the URL before running the normal session check.

### Database Schema Changes Need to Be Additive and Safe

The current schema in `server/db.ts` uses `CREATE TABLE IF NOT EXISTS`. The new columns (`subscription_tier`, `stripe_customer_id`) cannot be added to the `CREATE TABLE` statement alone — that only applies when the table doesn't exist yet. For existing databases (any deployed instance or developer machine), those columns won't be created.

The correct pattern is an additive migration using `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (available in SQLite 3.35+, released March 2021 — `better-sqlite3` ships with SQLite 3.44+, so this is safe):

```ts
instance.exec(`
  ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
`)
```

This should run at startup **after** the `CREATE TABLE IF NOT EXISTS` block, not inside it. The pattern is: define the initial schema in `CREATE TABLE`, then apply migrations sequentially after. For now two migrations is fine inline. Once you hit five, you'll want a numbered migration system — but don't build that now.

The `events` table for analytics is new, so `CREATE TABLE IF NOT EXISTS` is sufficient there. Schema:
```sql
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  event TEXT NOT NULL,
  properties TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_event_created ON events(event, created_at);
```

Index on `(session_id)` for funnel queries. Index on `(event, created_at)` for "how many checkout_started events this week" queries. Don't add more indexes speculatively — SQLite writes slow down with every index on a hot insert path, and the events table is going to be the most write-heavy table in the system.

### The Funnel Analytics Session Continuity Problem Is Subtle

The vision calls for a `sessionId` UUID stored in a first-party cookie set by the server. This is the right call — localStorage doesn't survive a cache clear, and you want to track pre-auth users through to conversion. But there are specifics that matter:

**Cookie attributes that determine whether this actually works:**
- `SameSite=Lax` — required, or the cookie won't be sent on the initial navigation from Google/Facebook OAuth redirect (a top-level GET). `SameSite=Strict` would break OAuth return flows.
- `Secure` — required in production. Not in dev.
- `HttpOnly` — the session ID cookie should be HttpOnly because the client doesn't need to read it for the analytics calls (the client generates its own UUID or reads it from a separate non-HttpOnly cookie). Actually, re-think this: if the analytics POST includes the session_id in the body, the client needs to know it. Either make the session_id cookie non-HttpOnly, or have the server set a separate non-HttpOnly cookie for the client-readable session ID, or include the session_id in the `/api/auth/me` response.

The cleanest architecture: the server sets a session_id cookie on the first request to any `/api/*` endpoint (via a middleware that checks for the cookie and creates one if absent). The cookie is `SameSite=Lax; Secure; HttpOnly; Max-Age=31536000` (1 year). The client-side `analytics.ts` does NOT need to know the session_id — it just POSTs events to `/api/analytics/event`, and the server reads the session_id from the cookie. This keeps the session management entirely server-side. The client just fires events with `{ event, properties }`.

**Event ordering and deduplication.** The client will fire `page_view` on every mount. React components re-mount on hot reload in dev and on StrictMode double-invocation in dev. Implement a simple dedup on the server: if the same `(session_id, event, created_at truncated to the minute)` arrives twice within 5 seconds, drop the duplicate. Or don't — raw event tables with duplicates are queryable as long as you use `COUNT(DISTINCT ...)` patterns in your analysis queries. Don't over-engineer dedup for v1.

**Cookie SameSite and the cross-origin issue.** In dev, the client runs on port 5173 (Vite) and the server on port 3002. The cookie set by the server is on `localhost:3002`. The Vite proxy (`/api` → `http://localhost:3002`) forwards requests, so the cookie domain is correct — cookies from `localhost` are sent to `localhost` regardless of port. This is not an issue in prod where everything runs on the same origin.

### The Subscription → Tier → Rate-Limit Chain Has a Correctness Hole

Here is the specific sequence that will cause a bug if not handled:

1. User is free tier, hits 3-call limit at 11:00pm.
2. User pays, Stripe fires `checkout.session.completed` at 11:01pm.
3. Webhook handler updates `users.subscription_tier = 'basic'`.
4. User tries to make a GPT call at 11:02pm.
5. **Bug:** The in-memory `authenticated` Map still has `{ count: 3, resetAt: midnight, tier: 'free' }` for this user. The DB says `basic` but the rate limiter says `free`.

The fix: when the tier is upgraded, you must invalidate the in-memory rate limit entry for that user. The webhook handler runs in the same process as the rate limiter, so this is straightforward — export a function from `gptRateLimit.ts`:

```ts
export function invalidateUserRateLimit(userId: number): void {
  authenticated.delete(userId)
}
```

Call it from the Stripe webhook handler after updating the DB tier. The user's next call will do a fresh DB lookup and start a new entry with their new tier limit.

This is the kind of thing that passes all your manual tests (you'll always test with a fresh server or fresh user) and then silently fails in production for every user who upgrades mid-day. Write a test for it before shipping.

### Production Hardening Gaps

The vision lists `helmet` and `compression` for `server/index.ts`. These are important but not the main gaps. Here is what will actually bite:

**`trust proxy` setting.** `app.set('trust proxy', 1)` is already set (line 37 of `server/index.ts`). Good. But `gptRateLimit.ts` uses `req.ip` for the unauthenticated case. With `trust proxy: 1`, `req.ip` is taken from `X-Forwarded-For`. This is correct behavior behind a load balancer, but make sure the deployment platform sets exactly one `X-Forwarded-For` hop. If someone puts two proxies in front (CDN + load balancer), `req.ip` could be the CDN IP rather than the user IP, collapsing all CDN traffic onto a single rate limit bucket. This is a theoretical concern for v1 but know that it exists.

**`STRIPE_WEBHOOK_SECRET` must be in the env guard.** The vision mentions adding it to the env guard block. Currently `server/index.ts` only guards `JWT_SECRET`. The pattern is clear — add the guard for `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in production. An unset `STRIPE_WEBHOOK_SECRET` means webhook signature verification silently fails or is skipped, and anyone can POST to `/api/stripe/webhook` and upgrade their own tier. This is a critical security hole, not a nice-to-have hardening item.

**The JWT secret guard allows a 0-character secret in dev.** Lines 23-30 of `server/index.ts` generate an ephemeral secret if `JWT_SECRET` is empty. Ephemeral secrets mean every server restart logs everyone out. For a product with paid subscriptions, this is not acceptable even in staging. Add `JWT_SECRET` to the required-in-dev check, or at minimum log a clear startup warning that explains the implication.

**No request body size limit.** `app.use(express.json())` without a `limit` option defaults to 100kb. The GPT route accepts arbitrary payloads including full journal entry bodies and prompt strings. Set an explicit limit:
```ts
app.use(express.json({ limit: '50kb' }))
```
The Stripe webhook route must use `express.raw()` with a matching limit (Stripe payloads are typically under 4kb).

**No global error handler.** If a synchronous exception escapes an Express route handler, Express 4 will catch it and return a 500 with an HTML error page that leaks stack traces. You have async routes — an unhandled promise rejection in a route doesn't get caught by Express at all and will crash the process in Node 15+. Add a global async error handler:
```ts
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[unhandled]', err)
  res.status(500).json({ error: 'internal_error' })
})
```
And in async routes, use `try/catch` or wrap in a utility. The GPT route already does this correctly. Stripe and OAuth routes need the same treatment.

---

## What I'd Build and In What Order

The sprint has four independent workstreams that can be parallelized. Here is the dependency order within each and where they interact:

**Track A — Tier enforcement (server):**
1. DB migration: `ALTER TABLE users ADD COLUMN subscription_tier`, `ALTER TABLE users ADD COLUMN stripe_customer_id`
2. Update `gptRateLimit.ts` to do a DB lookup and use tier-appropriate limit; add `invalidateUserRateLimit` export
3. Add feature gate for `cosmic-pattern-reading` in `server/routes/gpt.ts`
4. Update `/api/auth/me` to return `subscription_tier`

This track is prerequisite for Stripe (you need the DB column before the webhook can write it) and for the client upgrade flow (you need the tier in the auth response before `AuthContext` can expose it).

**Track B — Stripe integration (server):**
Depends on Track A completing step 1.
1. `server/services/stripe.ts` — SDK init, price ID constants, checkout session creation
2. `server/routes/stripe.ts` — webhook handler with raw body parsing, idempotent tier writes, `invalidateUserRateLimit` call
3. Wire the route into `server/index.ts` **before** `app.use(express.json())`
4. `server/routes/stripe.ts` — checkout session endpoint (authenticated only)

**Track C — OAuth (server + client):**
No dependency on Tracks A/B, can run in parallel.
1. `server/routes/oauth.ts` — state generation, Google/Facebook callback handlers, JWT issuance
2. Wire into `server/index.ts`
3. Client: `AuthContext` handles `?token=` param from OAuth redirect
4. Client: `AuthModal.tsx` adds OAuth buttons

**Track D — Analytics (server + client):**
No dependency on Tracks A/B/C.
1. DB migration: `events` table
2. `server/routes/analytics.ts` — event write endpoint
3. Session cookie middleware in `server/index.ts`
4. Client: `src/services/analytics.ts` — event emitter
5. Wire events into existing client components at conversion touchpoints

**The integration point everyone forgets:** When `AuthContext` adds `tier` to the user object, every component that currently checks `isAuthenticated` to decide whether to show GPT content needs to also consider tier. The free tier has limits that matter to the UI (show quota counter when at 2/3 usage). The client-side tier display is driven by what the server returns in `/api/auth/me` — it is not authoritative (the server enforces), but it drives the UI state for the upgrade flow.

---

## Proposals I'm Making

### proposal-tier-aware-rate-limit

**What:** Refactor `server/middleware/gptRateLimit.ts` to store tier in the in-memory entry alongside count and resetAt. On entry creation (new user or post-reset), do a single synchronous DB read via `getDb()` to fetch the user's `subscription_tier`. Export `invalidateUserRateLimit(userId)` for use by the Stripe webhook handler. Add the `cosmic-pattern-reading` feature gate as a separate check in `server/routes/gpt.ts`, not inside the rate limit middleware.

**Why it's right:** The current middleware has the right structure — it just needs the tier lookup added in the right place (on entry creation, not on every call) and the invalidation hook for Stripe webhooks. The alternative of hitting the DB on every GPT call is acceptable for SQLite but sets a bad pattern. The alternative of not invalidating on tier change creates the mid-day upgrade bug described above.

**Scope:** `server/middleware/gptRateLimit.ts` (~30 line change), `server/routes/gpt.ts` (~15 line addition), `server/db.ts` (~10 lines for migration).

### proposal-stripe-webhook-raw-body-first

**What:** In `server/index.ts`, register the Stripe webhook route with `express.raw({ type: 'application/json' })` before the `app.use(express.json())` global middleware. Add `STRIPE_WEBHOOK_SECRET` to the production env guard alongside `JWT_SECRET`. Add idempotency guard in the webhook handler using UPDATE WHERE pattern.

**Why it's right:** The raw body ordering is a hard technical requirement from the Stripe SDK — not a preference. Getting this wrong produces a silent failure in production (signature always fails, webhook always rejected, no errors logged unless you add explicit logging for the verification step). I've seen teams spend days debugging this.

**Scope:** `server/index.ts` (route ordering), `server/routes/stripe.ts` (new file, ~80 lines for the webhook handler).

### proposal-oauth-state-cookie

**What:** Implement OAuth state parameter verification using a signed `HttpOnly; SameSite=Lax` cookie set before the OAuth redirect and verified on callback. Do not use an in-memory state map (loses state on restart) or skip the state parameter entirely (CSRF vulnerability). JWT handoff via `?token=` query param with `history.replaceState` cleanup in `AuthContext`.

**Why it's right:** The state parameter is a required security control. The cookie approach is the cleanest implementation for a stateless JWT server. The JWT-in-URL handoff is the minimum viable approach that actually works for an SPA without a session layer, and the URL cleanup prevents the token from appearing in analytics and referrer headers.

**Scope:** `server/routes/oauth.ts` (new file, ~100 lines), `src/context/AuthContext.tsx` (~20 line addition to handle `?token=`), `src/components/auth/AuthModal.tsx` (OAuth button additions).

### proposal-analytics-server-side-session

**What:** Add a session cookie middleware in `server/index.ts` that creates a `sessionId` UUID (stored in a `SameSite=Lax; Secure; HttpOnly` cookie) on first request. Analytics events are posted to `/api/analytics/event` without a session_id in the body — the server reads the session_id from the cookie. This keeps the session management server-side and prevents client-side session ID forgery.

**Why it's right:** The alternative (client generates a UUID and POSTs it) means clients can forge or reuse session IDs, poisoning the funnel data. The server-side cookie approach ties the session to the HTTP conversation correctly. The `SameSite=Lax` (not `Strict`) setting is required because OAuth redirects are cross-origin top-level navigations that must carry the session cookie to correctly attribute the conversion.

**Scope:** `server/index.ts` (~20 lines for session middleware), `server/routes/analytics.ts` (new file, ~40 lines), `src/services/analytics.ts` (new file, ~50 lines), `server/db.ts` (~15 lines for events table and indexes).

---

## What I'd Simplify or Warn Against

**Don't add `passport.js`.** The vision mentions it as an option. Passport is 15 years old, its middleware pattern conflicts with modern TypeScript Express patterns, and it adds complexity for two OAuth providers you can implement directly in ~100 lines using `node-fetch` or the provider's SDK. Direct OAuth2 code exchange is: redirect to authorization URL with client_id + scope + redirect_uri + state, receive code on callback, POST to token endpoint with code + client_secret, GET user profile from provider API with access token, done. No Passport.

**Don't serialize tier into the JWT.** The vision doesn't suggest this, but it's an obvious shortcut someone might take: put `tier: 'basic'` in the JWT payload so you don't need a DB read on every GPT call. Don't do this. JWT payloads can't be revoked without a blocklist. If a user downgrades or their subscription lapses, their 30-day JWT still says `basic`. The in-memory rate limit map with tier caching is the correct tradeoff: DB hit once per day per user (on first post-reset call), zero DB hits for subsequent calls within the day.

**The `/api/auth/me` response already needs `subscription_tier`.** The client `AuthContext` currently calls `getSession()` → `/api/auth/me` on mount and on login. The `safeUser()` function in `server/routes/auth.ts` strips the DB row to the safe fields. Adding `subscription_tier` to `safeUser()` is a two-line change. Do it as part of Track A, not as an afterthought — the client UpgradeModal and quota display depend on it.

**Write the unhappy paths for Stripe before the happy path.** The `customer.subscription.deleted` handler (user cancels or payment fails) needs to run `UPDATE users SET subscription_tier = 'free' WHERE stripe_customer_id = ?` and call `invalidateUserRateLimit`. Test this flow before launch. The user who sees their paid access disappear without explanation is a support ticket and a chargeback. The user who continues to have access after canceling is a revenue leak. Both failures come from the same place: incomplete webhook handling.
