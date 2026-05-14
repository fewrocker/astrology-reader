# Nassim Taleb — Voice Analysis

## Sprint 9 Focus: Production Preparation (Stripe, OAuth, Tiers, Analytics)

---

## Fragility Audit

I have read the code. Let me be direct: this system is being converted from a toy into a financial instrument without acknowledging that a financial instrument has a fundamentally different failure mode than a demo app. A demo app fails silently and the user tries again. A financial instrument fails and someone was charged money without receiving what they paid for. That asymmetry changes everything, and the sprint vision does not treat it seriously enough.

Here is the fragility report. I am presenting these in order of damage potential, not implementation order.

---

### 1. The most dangerous scenario: customer charged, tier never elevated

The sprint vision plans a Stripe webhook handler (`POST /api/stripe/webhook`) that listens for `checkout.session.completed` and writes `subscription_tier` to the users table. This is the only path by which a successful payment becomes an elevated tier. There is no fallback.

What happens when the webhook fails?

Stripe retries webhooks with exponential backoff over 72 hours. During those 72 hours, the customer has a payment receipt from Stripe and a `free` tier in your database. They attempt a GPT call, receive a 429, see the upgrade modal — and they already paid. They email you or, more likely, they initiate a chargeback. The chargeback costs you $15–25 in processing fees regardless of outcome.

The spike is narrow but the damage is real. Webhook delivery is not guaranteed. Network partitions, server restarts, and handler exceptions all cause webhook failures. The current `server/index.ts` has no crash recovery, no process manager. A single unhandled exception during the webhook handler will drop that delivery silently.

The mitigation is not to make the webhook more reliable — it is to build idempotent recovery. Every successful Stripe Checkout session creates a `checkout.session` object with a `customer` ID and a `subscription` ID. At login and at `/api/auth/me`, the server should cross-check the user's `stripe_customer_id` against Stripe's API if the tier is `free` — because Stripe is the source of truth for payment, not your SQLite database. If Stripe says the customer has an active subscription and your DB says `free`, your DB is wrong. This reconciliation call is cheap (one HTTP request at login) and eliminates the entire class of webhook-loss failures.

Nobody in the vision document mentions this reconciliation path. The vision treats the webhook as the sole source of truth. It is not.

---

### 2. The rate limiter lives in process memory. The server process restarts.

Read `server/middleware/gptRateLimit.ts` carefully. The two `Map` objects — `authenticated` and `unauthenticated` — are module-level variables. They are initialized when the process starts and reset to empty when the process restarts.

A user consumes 3 free calls. The server restarts (deploy, crash, out-of-memory kill). The in-memory counter is gone. The user now has 3 free calls again. On a server that deploys twice per day, a free user effectively has 6–9 calls per day. On a server that crashes once per hour under load, the limit is meaningless.

The sprint vision mentions adding `helmet` and `compression` to `server/index.ts` and nothing about rate limit persistence. The vision assumes the server runs continuously. Servers do not run continuously. They are killed by deployments, OOM conditions, and provider maintenance windows.

For the tier system to have any integrity, the rate limit counter must survive process restarts. The DB is already there. The `events` table that the analytics proposal adds is already going into SQLite. A `gpt_usage` table — `user_id, date, count` — with an upsert on each GPT call is the correct data model. The in-memory map becomes a write-through cache over this table. This is a 20-line change that eliminates an entire class of limit bypass.

The unauthenticated (IP-based) counter has the same problem, compounded by the fact that after the sprint, the free unauthenticated tier drops from 5 to 3 calls. Three calls that reset on every deploy is not a limit. It is theater.

---

### 3. The JWT contains no tier. The tier lives only in the DB. But the JWT is trusted for 30 days.

Look at `server/routes/auth.ts` line 22–26. `signToken` encodes only `userId` in the JWT. The tier is not in the token. This means every GPT request requires a DB read to determine the user's tier.

This is actually the correct design — the tier is not baked into a long-lived token. But the sprint vision also says to expose the tier from `/api/auth/me` so the client can render plan state. The client stores this in `AuthContext`. The `AuthContext` is populated once at mount from a `getSession()` call (see `AuthContext.tsx` line 80–98). After that, the client-side tier value is never refreshed unless the user logs out and back in.

Here is the race condition: a user pays via Stripe Checkout. The webhook fires and updates the DB to `basic`. The user is redirected back to the app. The `AuthContext` still shows `free` because it was populated at mount and never re-fetched. The client renders the free-tier upgrade nudge to a user who just paid. The GPT calls succeed (because the server reads the tier from DB per-request), but the client UI still shows "upgrade to basic." This produces a cognitively dissonant experience: GPT calls work, but the UI says you're on the free plan.

The fix is simple: after the Stripe Checkout redirect completes, the client must re-fetch `/api/auth/me` and update `AuthContext`. The Stripe Checkout success URL should include a `?payment=success` query parameter. The client should detect this and trigger a session refresh. The vision does not specify this flow.

The deeper fragility is longer-lived: if the tier changes server-side (webhook, admin action, subscription lapse) while the user has an active session, the client UI is stale until the next full page reload. For a billing-critical feature, the client tier state must be treated as a cache with an explicit invalidation trigger, not a one-time load.

---

### 4. The race condition at the payment/limit boundary

Scenario: free user hits their 3rd call. The middleware checks the in-memory counter. Count is 2, increments to 3, allows the call. The response arrives. The user clicks the upgrade button in the modal. While the Stripe Checkout tab is open, they click "new tab," open the app, and fire a 4th GPT call. The counter is now at 3. The middleware blocks this call with 429. Correct.

Now the faster version of this scenario: the user hits call 3 and the upgrade modal opens simultaneously (because the response was slow and the user double-clicked). They submit two GPT calls within the same middleware check window. The `checkLimit` function reads `entry.count` for both calls before either write completes — because Node.js is single-threaded but these are synchronous operations running in the same tick. Actually, better-sqlite3 is synchronous, so the DB read is blocking. But the in-memory counter is not DB-backed at all. Two near-simultaneous requests hitting the same in-memory map: the first reads count=2, the second reads count=2 (before the first write completes), both increment to 3, both pass. The user gets 2 calls when they should have gotten 1.

This is a classic check-then-act race on shared mutable state. The current implementation is not atomic. For the paid tier where a user has 100 calls per day, the blast radius of this race is small. For the free tier of 3, every extra call is a free API call to OpenAI that was not paid for.

The fix is a DB-backed upsert with a `WHERE count < limit` constraint, or an in-memory lock. The in-memory map with a simple increment is not safe under concurrent requests.

---

### 5. OAuth introduces a new trust surface you do not control

The vision plans Google and Facebook OAuth via Passport.js or direct OAuth2 exchange. This is the right direction for reducing sign-up friction. The fragility is in what happens when the external provider changes something.

Google has changed their OAuth token format twice in the past four years. Facebook has deprecated API versions with 3–6 months notice. Both providers have had outages that lasted hours. When Google is down, no one can log in via Google OAuth. If Google OAuth is the only sign-in path a user has (they signed up with Google, never set a password), they cannot access their account until Google recovers.

The vision does not address what happens to a user who signed up via Google OAuth when Google is down. The `passport-google-oauth20` package pins to a specific OAuth2 flow version. If Google deprecates that version, sign-in breaks silently on the next request — no error in the dashboard, just a failing OAuth redirect that users see as "can't log in."

Specific fragility in the planned implementation:

The vision says "on first-time sign-in, create user row with `subscription_tier = 'free'`." The `users` table currently has `password_hash TEXT NOT NULL`. An OAuth user has no password. The migration needs to make `password_hash` nullable. If this migration is not written correctly as an additive change (not a destructive schema change), existing email/password users lose their `password_hash` column. The vision says "additive migration" for the tier column but says nothing about the `password_hash` nullability change that OAuth requires. This is a schema change that touches every existing user row.

---

### 6. The analytics `events` table is an unbounded write target

The vision says: "write to an `events` table in SQLite; no external service for v1 — the owner reads raw SQLite to understand the funnel." This is reasonable for an early product. The fragility is that `events` is an append-only table with no archival policy.

The listed events include `page_view`, `gpt_request_made`, `reading_viewed`. On a moderately successful launch, a few hundred users each generating 10–20 events per session produces tens of thousands of rows per day. SQLite handles this fine. After six months, you have several million rows. SQLite handles this fine too — until you try to query across them without the right indexes.

The specific fragility: the session continuity requirement says `sessionId` is a UUID stored in a first-party cookie. If the cookie is set per-visit and persists across reloads, a single user with 30 days of activity will have thousands of events sharing the same `session_id`. A funnel query like "how many users who hit `gpt_limit_hit` converted within 24 hours" requires a JOIN between `events` rows with different `event` values, filtered by `session_id` and time window. Without an index on `(session_id, event, created_at)`, this query will full-scan the table. At 1M rows, that is a second or two. At 10M rows, it hangs the SQLite connection and blocks all other DB operations — because SQLite uses file-level locking for writes.

The vision says nothing about indexes on the `events` table. Adding them later requires a table rebuild in SQLite (no concurrent ALTER TABLE). This is a schema migration on a live table with potentially millions of rows.

The mitigation is not complex: define the indexes at table creation time. But you must decide on the query shapes before you create the table, or you will regret it.

There is also no TTL or purge mechanism. The `events` table will grow forever. Build in a purge job from day one — even something as simple as "delete events older than 90 days" on a daily cron. Not because 90-day-old events are worthless, but because the discipline of having a purge job prevents the accidental indefinite growth that causes production incidents.

---

### 7. The `LOCALHOST` bypass in `gptRateLimit.ts` is an attack surface in misconfigured deployments

Line 53–59 of `server/middleware/gptRateLimit.ts`:

```typescript
const LOCALHOST = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])

export function gptRateLimit(req: Request, res: Response, next: NextFunction): void {
  if (LOCALHOST.has(req.ip ?? '')) {
    next()
    return
  }
```

This bypass exists for local development. In production, `server/index.ts` sets `app.set('trust proxy', 1)`. When trust proxy is enabled, `req.ip` is taken from the `X-Forwarded-For` header. If the reverse proxy (nginx, Cloudflare, Fly.io load balancer) is misconfigured and passes client-provided `X-Forwarded-For` values without stripping them, a client can spoof `X-Forwarded-For: 127.0.0.1` and bypass the rate limiter entirely.

This is not a theoretical attack. It is the standard first thing a rate-limit bypass script tries. The `trust proxy: 1` setting tells Express to trust exactly one proxy hop. If deployed behind two proxy layers (e.g., Cloudflare in front of Fly.io), this setting is wrong — it should be `trust proxy: 2`. With the wrong trust proxy setting, `req.ip` may still resolve to a spoofed value.

The correct fix is to remove the localhost bypass entirely for production, or to gate it behind `process.env.NODE_ENV !== 'production'`. Development bypass logic has no business being active in production.

---

### 8. OpenAI downtime with paid subscribers is an SLA liability

The vision does not address what happens when OpenAI is down. It will be down. OpenAI has had multiple multi-hour outages. During an outage:

- The `callOpenAI` function throws a `GptServiceError` with status 503 or 504.
- The retry logic in `retryWithBackoff` attempts 3 calls with exponential backoff.
- After 3 failures, the error propagates to `gpt.ts` route handler, which returns 503.
- The client shows "Couldn't generate interpretation."
- The user's daily counter was incremented by the middleware *before* the GPT call was attempted.

That last point is the fragility. The rate limit is decremented regardless of whether OpenAI succeeds. A paid user on the basic tier (20 calls/day) attempts a call during an OpenAI outage, gets an error, and loses one of their 20 daily calls. They did not receive what they paid for. If the outage lasts 3 hours and they try once per hour, they lose 3 calls before giving up.

The fix is not to refund calls — that is complex. The fix is to not decrement the counter when the downstream call fails. The middleware currently decrements on the way in, before the result is known. Either move the decrement to a response hook that only fires on success, or use a two-phase approach: reserve the call slot on request, release it if OpenAI returns an error.

This is harder to implement than it sounds because the middleware runs before the async GPT call. The cleanest path is to pass a `releaseSlot` callback into `res.locals` from the middleware, and call it in the route handler on non-5xx errors only.

---

## What the Sprint Vision Is Ignoring

The vision is a flow diagram. "User pays → webhook fires → tier elevates → user has more calls." Every step in that diagram assumes a reliable world. The real system operates in an unreliable world.

The vision does not have an answer to: what does a user do when their tier does not match their payment? There is no support email listed, no admin panel, no manual override path. When the first webhook failure happens — and it will happen — there is no recovery mechanism for the customer and no operational tooling for the owner.

The vision treats the `events` analytics table as a write-only sink. It does not ask: who reads it, how, and what queries will they run? The answer determines the schema. A schema designed for writes that do not anticipate specific reads is a schema that will be rebuilt six months later under production load.

The vision adds OAuth as a sign-up option without asking what a user does when their OAuth provider is unreachable. The answer should be: they have an email/password fallback. But the schema has `password_hash TEXT NOT NULL`, which means OAuth users cannot be created without a password hash. Either the migration makes `password_hash` nullable (and existing users are unaffected) or OAuth users are created with a random unusable hash. The vision does not specify which. The developer will make a choice. It may be the wrong one.

---

## Proposals I Am Making

### Proposal 1: Stripe reconciliation at login — eliminate the webhook-is-single-truth dependency

At `/api/auth/me` and at login, if the user has a `stripe_customer_id` and their tier is `free`, check Stripe's subscriptions API for that customer. If an active subscription exists, elevate the tier in DB and return the corrected tier. This costs one Stripe API call (cacheable for the session) and eliminates the entire class of "paid but tier not elevated" failures. Mark it as non-blocking: if the Stripe check fails (network error), proceed with the DB value. Never block authentication on a Stripe call.

**Fragility addressed:** Webhook delivery failure leaves paid users on free tier. Reconciliation at login is the recovery path.

### Proposal 2: Persist the rate limit counter to SQLite — the in-memory map is not durable

Add `gpt_usage(user_id INTEGER, date TEXT, count INTEGER, PRIMARY KEY (user_id, date))`. On each GPT request: `INSERT OR IGNORE ... then UPDATE ... SET count = count + 1 WHERE count < limit`. The `WHERE count < limit` in the UPDATE is the atomicity guarantee — it is a single SQL statement, not a check-then-act. If the UPDATE affects 0 rows, the limit was exceeded. The in-memory map becomes an L1 cache over this table for hot paths.

**Fragility addressed:** Process restart resets all in-memory counters. Paid users' limits reset on every deploy. Free users get unlimited calls across deployments.

### Proposal 3: Re-fetch `/api/auth/me` after Stripe redirect returns

The Stripe Checkout success URL should be `/?payment=success`. In `AuthContext`, detect the `payment=success` query parameter on mount and trigger a forced session re-fetch. Update the `tier` field in context. This is a 10-line change that prevents the dissonant experience of a paying user seeing a free-tier UI.

**Fragility addressed:** Client-side tier state is stale after successful payment. The user paid, the GPT calls work, but the UI says they're on free.

### Proposal 4: Gate the localhost bypass behind `NODE_ENV !== 'production'`

In `gptRateLimit.ts`, wrap the localhost bypass in an environment check:

```typescript
if (process.env.NODE_ENV !== 'production' && LOCALHOST.has(req.ip ?? '')) {
```

This is a one-line change. The cost is zero. The risk of not doing it is a spoofable rate limit in any misconfigured production environment.

**Fragility addressed:** `X-Forwarded-For` spoofing bypasses the rate limiter in production.

### Proposal 5: Do not decrement the rate limit counter on OpenAI 5xx errors

Pass a `releaseSlot` function via `res.locals` from the middleware. The function sets `entry.count--` on the in-memory map (and decrements the DB row in the durable implementation). In the GPT route handler, call `res.locals.releaseSlot?.()` when the error is a 503 from OpenAI. Do not release the slot on 4xx errors (malformed requests) — those consumed a real call attempt.

**Fragility addressed:** Paid users lose daily quota during OpenAI outages. The call was not served; the limit should not be consumed.

### Proposal 6: Create the `events` table indexes at definition time, not later

When writing the `CREATE TABLE events` migration in `server/db.ts`, add these indexes in the same migration block:

```sql
CREATE INDEX IF NOT EXISTS idx_events_session_event ON events(session_id, event);
CREATE INDEX IF NOT EXISTS idx_events_user_event ON events(user_id, event, created_at);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
```

Add a purge mechanism from day one: a scheduled function (daily cron via `setInterval` on server startup, or a manual admin endpoint) that deletes events older than 90 days.

**Fragility addressed:** Unbounded table growth leads to full-scan queries that block SQLite's file lock. Indexes defined post-hoc on a multi-million-row table require a full table rebuild.

### Proposal 7: Make `password_hash` nullable in the OAuth migration — explicitly, not implicitly

The OAuth migration must include `ALTER TABLE users RENAME COLUMN password_hash TO password_hash_old` and re-add it as `TEXT` (nullable) plus a column rename back. Or, the safer path: add `oauth_provider TEXT` and `oauth_subject TEXT` columns; add a `CHECK` constraint that either `password_hash IS NOT NULL OR (oauth_provider IS NOT NULL AND oauth_subject IS NOT NULL)`. This makes the schema self-documenting and prevents the invalid state of a user with neither a password nor an OAuth identity.

**Fragility addressed:** OAuth requires `password_hash` to be nullable but the column is currently `NOT NULL`. A naive migration that adds OAuth columns without addressing `password_hash` will either fail on OAuth user creation or create users with a garbage password hash.

---

## What Everyone Is Ignoring

The team is focused on the happy path. User arrives, pays, gets more calls, is happy. That is not the path that causes production incidents. The path that causes incidents is: user arrives, pays, Stripe webhook fails, user emails in rage, there is no admin panel to manually fix the tier, the owner must SSH into the server and run a SQLite UPDATE command.

This scenario will happen. Webhooks fail. The question is whether the system was built with recovery mechanisms or whether the owner will be hand-editing a database at 11pm.

The recovery mechanisms are not complex. A one-page admin endpoint (`/admin/users?secret=...`) that shows user emails, their tier, their Stripe customer ID, and a button to manually sync tier from Stripe would cost 2 hours to build and would eliminate the entire class of manual interventions. The vision does not mention it. Nobody is thinking about what happens after the payment system breaks — only about building the payment system.

Build the system as if every external dependency will fail at the worst possible time. Because it will.
