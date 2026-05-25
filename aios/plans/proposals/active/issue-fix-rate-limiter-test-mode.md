# Issue Fix: Rate Limiter Test Mode Values in Production

- **Slug:** `fix-rate-limiter-test-mode`
- **Type:** Issue Fix
- **Originated by:** Taleb
- **User guidance:** N/A

---

## Problem

Two files in the server layer carry `TIER_LIMITS` constants explicitly labeled "TEST MODE" that are committed to `master` with no `NODE_ENV` guard on the constant values themselves.

**`server/middleware/gptRateLimit.ts`, lines 30–35:**
```typescript
// TEST MODE: limits raised to 10000 for all tiers — effectively disabled
const TIER_LIMITS: Record<Tier, number> = {
  free: 10000,
  basic: 10000,
  advanced: 10000,
}
```
This constant controls both the DB-level atomic enforcement (`WHERE count < limit` at line 161) and the in-memory rate limit check. Setting it to `10000` across all tiers makes the entire GPT rate limiting layer inoperative. The only production-gated bypass in this file is the localhost IP bypass at line 110, which is correctly guarded behind `NODE_ENV !== 'production'`. The `TIER_LIMITS` constant itself carries no such guard — it evaluates unconditionally at module load time and will be `10000` in production.

**`server/routes/auth.ts`, line 26:**
```typescript
// TEST MODE: limits raised to 200 for all tiers
const TIER_LIMITS: Record<string, number> = { free: 200, basic: 200, advanced: 200 };
```
This constant is used by the `GET /api/auth/usage` endpoint (line 168) to report the user's tier limit back to the client. `AuthContext` consumes this response to drive tier-aware UI nudges and upgrade prompts. Returning `200` for all tiers regardless of subscription means the client-side subscription enforcement UI is reporting fabricated limits.

These are not guarded test overrides. They are production configuration values set to testing values. The comment label "TEST MODE" has no runtime effect.

---

## Expected Behavior

Rate limits should enforce actual subscription tiers. The enforcement chain is:

1. `gptRateLimit.ts` — controls whether a GPT request is allowed at all (DB-atomic enforcement via `WHERE count < limit`)
2. `auth.ts /usage` endpoint — reports current usage and the limit to the client so the UI can show accurate tier status and trigger `UpgradeModal`

Both must reflect real limits. The elevated values used during development must be isolated to the development environment and must not reach production.

**Option A — Environment variables (recommended):**
Move production limits to environment variables with documented defaults:
```
TIER_LIMIT_FREE=3
TIER_LIMIT_ADVANCED=20
```
Both files read from `process.env` with a fallback for local development. The `.env.test` file (or local `.env`) carries the elevated values. Production deploy does not set these variables to `10000`.

**Option B — Explicit `NODE_ENV` guard on the constants:**
```typescript
const TIER_LIMITS: Record<Tier, number> =
  process.env.NODE_ENV !== 'production'
    ? { free: 10000, basic: 10000, advanced: 10000 }
    : { free: 3, basic: 10, advanced: 20 }
```
This is a single-file change per file and requires no environment variable management, but it buries production values in source code without a clear override path.

Either option must be resolved in both files before any Tarot-specific rate limits are added. Adding new Tarot limits to the current configuration means the Tarot subscription gate will also be inoperative on day one in production.

---

## Scope

- `server/middleware/gptRateLimit.ts` — fix `TIER_LIMITS` at lines 31–35
- `server/routes/auth.ts` — fix `TIER_LIMITS` at line 26
- `server/middleware/rateLimiter.ts` — `authRateLimiter` has `max: 10000` (line 5), which is the `express-rate-limit` brute-force guard on login/register, not the subscription tier enforcement. Evaluate whether this also needs a real limit before the fix ships; it is a separate concern but the same pattern.
- No schema changes, no client changes, no new files required
