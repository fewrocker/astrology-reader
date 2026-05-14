# Code Enhancement: Server Production Hardening

**Type:** Code Enhancement
**Originated by:** Carmack, Taleb
**User guidance:** "Also, we gotta do anything else that we need in order to make this app production ready"

---

## Problem / Opportunity

`server/index.ts` is a minimal Express bootstrap that was assembled for a working demo, not a deployed product. As the app moves to real users and real payments, several gaps in the current server become liabilities. The problems are structural — they are not bugs in specific routes, but missing layers that every production Express app requires.

### 1. No security headers (`server/index.ts`, line 35–44)

The middleware chain is: `trust proxy`, `express.json()`, routes, static files. Nothing sets HTTP security headers. Without `helmet`, browsers receive responses with no `Content-Security-Policy`, no `X-Frame-Options`, no `X-Content-Type-Options`, no `Strict-Transport-Security`, and no `Referrer-Policy`. This is the default Express behavior: all headers absent. An attacker can iframe the app, exploit MIME-type sniffing, or conduct clickjacking against users who are mid-payment. None of this requires a vulnerability in the application code — it is the absence of standard defense headers.

### 2. No response compression (`server/index.ts`, line 35–44)

The GPT interpretation responses, which are the app's primary dynamic content, are returned as plain uncompressed JSON. Interpretations range from 300 to 2,000 tokens and are served on the same origin as the React app's JSON API. Without `compression` middleware, every interpretation response transfers at full byte count. On a mobile connection, this adds perceptible latency to what is already a slow GPT call. The static files are served by `express.static` (line 48), which applies its own compression — but API routes get none.

### 3. Unbounded request body size (`server/index.ts`, line 38)

```ts
app.use(express.json())
```

The bare `express.json()` call uses Express's 100kb default body size limit. The GPT route receives journal entry bodies, full dream descriptions, and numerology payloads — any of these could be constructed to approach or exceed 100kb if a client submits adversarial or malformed input. The limit should be set explicitly at 50kb, which is well above any legitimate payload this app handles and well below what a denial-of-service body bomb would use. An explicit limit also documents intent; the 100kb default is invisible.

The Stripe webhook route (planned in `feat-stripe-checkout`) must use `express.raw({ type: 'application/json' })` before the global `express.json()` — that ordering constraint is handled by `feat-stripe-checkout`, not here. The body size limit here applies to all routes that go through `express.json()`.

### 4. No global async error handler (`server/index.ts`, line 40–53)

Express 4 catches synchronous exceptions thrown in route handlers and sends a 500 HTML response that includes the stack trace. That stack trace is served to the client — it leaks file paths, library versions, and application structure. There is currently no global error handler registered anywhere in `server/index.ts`.

Async route handlers present a second problem: an unhandled promise rejection in an async Express route does not get caught by Express's built-in error handling in Node 15+. It propagates to the process-level `unhandledRejection` event. In Node 15 and later, that crashes the process. The GPT route wraps everything in `try/catch`; the auth routes do the same. But as Stripe and OAuth routes are added in this sprint, any missed `await` in an `async` handler becomes a process crash waiting to happen. A registered global error handler (`(err, req, res, next)`) is the correct backstop.

### 5. Env var guard is incomplete (`server/index.ts`, lines 16–30)

The current guard checks `JWT_SECRET` at startup:

```ts
if (!isDev && JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET must be at least 32 characters in production');
  process.exit(1);
}
```

Two gaps:

**`STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are not guarded.** These will be added by `feat-stripe-checkout`. A server that starts in production without `STRIPE_WEBHOOK_SECRET` will either skip signature verification entirely or throw a runtime error on the first webhook delivery — silently, with no startup warning. An unguarded `STRIPE_WEBHOOK_SECRET` means any party can POST arbitrary JSON to `/api/stripe/webhook` and trigger a tier elevation. This is a critical security hole, not a missing-feature gap. The guard must be added before the Stripe routes are wired in.

**The ephemeral `JWT_SECRET` warning fires in dev too late and too quietly.** Lines 23–30 generate a random ephemeral secret and log a `console.warn` if `JWT_SECRET` is not set. This is correct behavior in a zero-config local environment. But once the app has paying users, an empty `JWT_SECRET` in a staging environment means every server restart logs everyone out — including users who have just upgraded to a paid tier and are mid-session. The current warning says "Tokens will be invalidated on restart." That is accurate but does not convey that it also breaks the paid subscription UX. The warning should be surfaced at a higher severity and be explicit about the subscription implication.

### 6. No request logging (`server/index.ts`, lines 35–58)

There is no middleware logging incoming requests. In production, this means there is no record of which routes are being called, at what frequency, with what response codes, or how long they take. A 500 error on `/api/gpt/interpret` produces a `console.error` inside the route handler — but without a request log, there is no way to correlate that error with the specific request that caused it (method, path, response time, IP). `morgan` or a structured equivalent logs every request with method, path, status, and duration in a single line per request. This is the minimum observability baseline for a production server.

---

## Desired State

After this enhancement, `server/index.ts` has five additional layers in the middleware chain, each closing a distinct attack surface or operational blind spot.

**Security headers are present on every response.** `helmet()` runs before any route. Browsers that receive responses from this server get `X-Frame-Options: SAMEORIGIN` (clickjacking protection), `X-Content-Type-Options: nosniff` (MIME sniffing protection), `Strict-Transport-Security` (HTTPS enforcement on repeat visits), and a restrictive `Referrer-Policy`. Content-Security-Policy configuration is left to the default `helmet` settings for v1 — a custom CSP policy is a separate concern. The iframe attack surface is closed. The MIME sniffing surface is closed.

**API responses are gzip-compressed.** `compression()` runs before routes. GPT interpretation responses, which are the largest dynamic payloads, shrink by 60–80% over the wire. The static file serving via `express.static` continues to handle its own compression independently; `compression()` covers the API layer that `express.static` does not reach.

**The request body has an explicit 50kb ceiling.** `express.json({ limit: '50kb' })` replaces the bare call. Any request body over 50kb is rejected by Express before it reaches a route handler, with a 413 response. No legitimate use case in this app requires a body over 50kb. A journal entry of 5,000 words with a full prompt payload is well under 20kb. The explicit limit documents intent and forecloses body-bomb denial-of-service attempts.

**Stack traces no longer leak to clients.** The global error handler — registered after all routes — intercepts any `Error` that reaches Express, logs it server-side with `console.error('[unhandled]', err)`, and returns `{ "error": "internal_error" }` with HTTP 500. No stack trace, no file path, no library version reaches the client. Async route errors that are not caught locally are handled by the same handler when routes use `next(err)` correctly. The operational log gains a `[unhandled]` prefix that makes production error triage searchable.

**The server refuses to start in production without its required secrets.** The env var guard is extended to check `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in production, with `process.exit(1)` and a clear `FATAL:` message for each. A misconfigured production deploy fails loudly at startup rather than silently at the first webhook delivery or Stripe API call. The `JWT_SECRET` ephemeral warning in dev is reworded to mention the subscription impact, making it harder to overlook in staging environments.

**Every request is logged.** `morgan` (or equivalent structured logging) runs before routes. Each inbound request produces a log line with method, path, HTTP status, and response time. A 429 from the rate limiter, a 500 from an unhandled error, and a successful 200 are all visible in the server log with enough context to diagnose without adding debug instrumentation. Production incidents have a request log to work from.

**Overlap note — the localhost bypass gate.** `gptRateLimit.ts` lines 53–59 contain a localhost bypass (`LOCALHOST.has(req.ip)`) that is active in all environments. Taleb identified this as an attack surface in misconfigured deployments where `X-Forwarded-For` spoofing can pass a loopback IP and skip rate limiting entirely. Gating this bypass behind `process.env.NODE_ENV !== 'production'` is a one-line fix that belongs to `feat-subscription-tiers` (which owns the rate limiter), not here. It is noted because it compounds the `trust proxy` concerns that the env guard work in this proposal is adjacent to — both are about the server's trust boundary in a proxied deployment.
