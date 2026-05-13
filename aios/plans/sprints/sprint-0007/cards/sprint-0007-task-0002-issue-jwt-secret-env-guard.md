# Issue Fix: JWT Secret Env Guard

**Type:** Issue Fix
**Originated by:** Taleb

---

## Problem

The vision states the JWT secret "must come from environment variables, never hardcoded." There is no proposed mechanism to enforce this at startup. The risk is a developer writing:

```ts
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-fallback'
```

This pattern is extremely common, appears harmless, and catastrophically undermines JWT security in any deployment where the environment variable is not set. A server running with a known or guessable default secret accepts any token signed with that string — meaning any user can forge a JWT and authenticate as any other user, gaining full access to their private Cosmic Journal, birth data, and dream sessions.

The check must be: if `JWT_SECRET` is absent OR shorter than 32 characters, AND `NODE_ENV` is not `'development'`, the process must exit immediately with a clear error message. In development, a random 32-character ephemeral secret is generated at startup with a `console.warn` so the developer is aware sessions will not persist across restarts.

The failure mode this prevents is a production deploy with an accidentally unset environment variable — the server boots, looks healthy, serves traffic, and silently accepts forged tokens. Without the startup guard, this can go undetected until a security audit or an incident.

## Expected Behavior

`server/index.ts` checks `JWT_SECRET` at startup before any route is mounted:

- **Production / staging (`NODE_ENV !== 'development'`):** If `process.env.JWT_SECRET` is absent or shorter than 32 characters, call `process.exit(1)` with the message: `"FATAL: JWT_SECRET must be set to at least 32 characters in production"`. The server must not serve any traffic.
- **Development (`NODE_ENV === 'development'`):** If `JWT_SECRET` is absent or too short, generate a random 32-character ephemeral secret using `crypto.randomBytes(32).toString('hex')` and log: `"WARNING: Using ephemeral JWT_SECRET — all sessions will be invalidated on restart"`. Allow startup to continue.
- **No hardcoded fallback** in any code path — no `|| 'fallback'`, no `?? 'secret'`, no default string anywhere in the server codebase.

The guard runs synchronously before `app.listen()`. If it passes, the resolved secret is stored in a module-scoped constant and used exclusively for all `jwt.sign()` and `jwt.verify()` calls.

## Impact

**Critical (security)** — a missing guard allows forged token authentication against private user data.
**Effort** — Very low (~10 lines, synchronous, no dependencies beyond Node's built-in `crypto` module).

## Dependencies

None. This is a pure `server/index.ts` addition that runs before any route code.

## Acceptance Criteria

- [ ] Server exits with code 1 and the specified message if `JWT_SECRET` is absent in production
- [ ] Server exits with code 1 and the specified message if `JWT_SECRET` is fewer than 32 characters in production
- [ ] Server starts in development with an auto-generated ephemeral secret and a `console.warn` if `JWT_SECRET` is not set
- [ ] No string literal, constant, or fallback value serves as a JWT secret anywhere in `server/`
- [ ] The resolved secret is used for all `jwt.sign()` and `jwt.verify()` calls
