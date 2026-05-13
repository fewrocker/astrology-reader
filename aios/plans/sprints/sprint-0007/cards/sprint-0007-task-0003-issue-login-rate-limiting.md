# Issue Fix: Login Rate Limiting

**Type:** Issue Fix
**Originated by:** Taleb

---

## Problem

`POST /api/auth/login` and `POST /api/auth/register` accept unlimited requests per IP. There is no mention of rate limiting anywhere in the sprint-0007 vision.

The Cosmic Journal stores deeply personal life entries — grief, turning points, relationships, inner states accumulated over months. These are exactly the kind of records an abusive ex-partner or stalker would want to access. A brute-force attack on a user's account requires no sophistication: pick a target email, loop over a password list, POST repeatedly.

bcrypt with cost factor 12 slows each individual verification to roughly 100ms on a modest server. This is not a defense against parallelism — 10 concurrent requests from a single IP still test 600 passwords per minute. At 100k common passwords, a targeted account is cracked in under three hours of uninterrupted parallel requests. No unusual infrastructure is required; a single laptop can sustain this load.

The `express-rate-limit` package is the standard mitigation: 8 lines of middleware, no external service required, no database writes needed for the basic implementation. The omission is a hostile surface area that is trivially exploitable from the first day the login route is live.

## Expected Behavior

`express-rate-limit` middleware is applied to both `/api/auth/login` and `/api/auth/register` — **independently** — with the following configuration:

- **Window:** 15 minutes
- **Maximum requests:** 10 per IP per window
- **Response on limit exceeded:** HTTP `429` with body `{ "error": "Too many attempts — please wait a few minutes before trying again." }`
- The rate limiter is registered **before** the route handler in the middleware chain — no request reaches the bcrypt comparison or the database query after the limit is reached.
- `/api/auth/me` (session restoration) is **not** rate-limited. This endpoint is called on every app mount to restore an existing session and must always be reachable, including for users on shared IPs (corporate networks, universities).
- `/api/auth/logout` is not rate-limited.

The rate limiter uses the default in-memory store, which is appropriate for a single-process monolith. If the app later scales to multiple processes, the store can be replaced with a Redis adapter without changing the route configuration.

## Impact

**High (security)** — prevents brute-force access to private journal data.
**Effort** — Very low (~8 lines of middleware configuration).

## Dependencies

`express-rate-limit` npm package. No other dependencies.

## Acceptance Criteria

- [ ] `express-rate-limit` is installed and listed in `package.json` dependencies
- [ ] Rate limiter is applied to `POST /api/auth/login` — 10 requests per IP per 15 minutes
- [ ] Rate limiter is applied to `POST /api/auth/register` — 10 requests per IP per 15 minutes
- [ ] The limiter middleware is registered before the route handler (no bcrypt or DB call on a blocked request)
- [ ] HTTP 429 is returned with body `{ "error": "Too many attempts — please wait a few minutes before trying again." }` when the limit is exceeded
- [ ] `GET /api/auth/me` has no rate limiting applied
- [ ] `POST /api/auth/logout` has no rate limiting applied
