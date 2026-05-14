# Proposal: feat-subscription-tiers

**Type:** Feature
**Originated by:** Jobs (tier indicator in SessionBadge, usage-aware nudge on HomeScreen), Carmack (tier-aware rate limiter, RateLimitEntry shape, invalidateUserRateLimit, cosmic-pattern-reading gate placement), Taleb (SQLite persistence for counters, releaseSlot callback, localhost bypass hardening, atomicity via WHERE count < limit)

---

## User Guidance

SPRINT NAME: PRODUCTION PREPARATION — subscription tiers: free (calc-only + 3 GPT/day), basic (20 GPT/day), advanced (100 GPT/day + cross-time journal patterns)

---

## Problem / Opportunity

### The rate limiter resets on every server restart

`server/middleware/gptRateLimit.ts` holds every counter in two module-level `Map` objects (`authenticated`, `unauthenticated`). These are process-private, in-process variables. When the server restarts — via deploy, OOM kill, or provider maintenance — both maps are re-initialized to empty. A free user who consumed all 3 daily readings at 11:58pm gets 3 fresh readings after a midnight deploy. On a server that deploys twice a day, a free user in practice has 6–9 unchecked calls per day. For a paid product where daily limits are the monetization mechanism, this is a correctness defect, not an operational annoyance. The vision note in `_drafts.md` and Taleb's fragility audit identify this as the second most dangerous failure mode after webhook-delivery loss.

### The rate limiter has no concept of tier

`checkLimit(authenticated, userId, AUTH_LIMIT)` uses a single hardcoded constant (`GPT_AUTH_DAILY_LIMIT`, default 20). There is no path from a user's `subscription_tier` to the limit that is applied. The `users` table in `server/db.ts` has no `subscription_tier` column at all — the schema shows only `id, email, password_hash, full_name, birth_date, birth_time, birth_place, created_at`. Tier enforcement cannot exist until the column exists and the middleware reads it.

### The check-then-act race on the in-memory counter is not atomic

`checkLimit` reads `entry.count`, compares it to `limit`, and if below, writes `entry.count++`. Under concurrent requests (two GPT calls arriving in the same Node event loop turn, which can happen with the browser's parallel fetch), both reads observe the same count value before either write completes. Both calls pass. A free user with a 3-call limit can slip through to 4 or 5 calls if they trigger concurrent requests. The correct fix is a SQL `UPDATE ... SET count = count + 1 WHERE count < limit` statement, which the database engine executes atomically.

### The localhost bypass is unconditional and production-exploitable

Lines 53–59 of `gptRateLimit.ts` bypass all rate limiting for `req.ip` matching `127.0.0.1`, `::1`, or `::ffff:127.0.0.1`. In production, `server/index.ts` sets `app.set('trust proxy', 1)`, which causes `req.ip` to be derived from the `X-Forwarded-For` header. A client that sends `X-Forwarded-For: 127.0.0.1` will match this bypass set, completely circumventing all limits. This is the standard first attempt by any rate-limit bypass script. There is no `NODE_ENV` guard on the bypass.

### OpenAI 5xx errors consume the user's daily quota

The rate limit middleware increments `entry.count` on the inbound request, before the GPT call has been attempted. If OpenAI returns a 503 or 504 (which it does during outages, per Taleb's audit), the user's quota was consumed without delivering a reading. A paid basic-tier user who tries 3 times during a 2-hour OpenAI outage loses 3 of their 20 daily calls. The middleware has no mechanism to release a slot on downstream failure.

### The `cosmic-pattern-reading` type has no tier gate

`server/routes/gpt.ts` passes all `type` values to `handleGptRequest()` without checking whether the requesting user has permission for that type. The `cosmic-pattern-reading` type (which triggers a cross-time journal pattern analysis, the defining advanced-tier feature per the sprint vision) is available to any authenticated user regardless of tier. There is no feature gate anywhere in the current codebase.

### `/api/auth/me` does not return the user's tier

`safeUser()` in `server/routes/auth.ts` returns `id, email, fullName, birthDate, birthTime, birthPlace, createdAt`. The `subscription_tier` column (once added) is not included. `AuthContext` calls `getSession()` → `GET /api/auth/me` on mount and surfaces the result to the entire React tree. Without `subscription_tier` in this response, no client component can know the user's tier to render tier-appropriate UI.

### `AuthContext` has no `tier` field

`AuthContextType` in `src/context/AuthContext.tsx` defines `user: AuthUser | null` but `AuthUser` has no `tier` property. The `SessionBadge` in `src/App.tsx` (lines 30–113) shows the authenticated user only a display name and a Sign Out button. The auth nudge in `HomeScreen.tsx` (lines 108–118) checks only `isAuthenticated` — it has no access to daily usage state or tier. Every component that needs to branch on tier currently has no path to that information.

### The `SessionBadge` dropdown is tier-blind

The dropdown panel (lines 85–110 of `src/App.tsx`) shows only `displayName` and "Sign Out." A free-tier user who has used 2 of their 3 daily readings sees nothing about their usage. A paid user who just upgraded sees nothing that acknowledges the upgrade. The surface exists and is rendered on every screen; it is the natural home for quiet, persistent tier awareness.

### The HomeScreen auth nudge is context-free

The nudge (lines 108–117 of `HomeScreen.tsx`) is a single static string: `"Save your readings ✦"`. It fires for any unauthenticated user regardless of how many readings they have used that day. A user who has consumed 2 of 3 free readings and is one call away from hitting their limit sees exactly the same nudge as a user who just arrived and has used zero. The nudge is not doing its job: it neither conveys urgency proportional to the user's state nor explains what is at stake.

---

## Vision

The subscription tier system should feel like the product knows you. Not a paywall that appears from nowhere — a gradual clarification of the relationship between what you are exploring and what it takes to explore more.

**For the free user who is unaware of limits:** The first visit to the home screen shows the chart dashboard exactly as today. Nothing about limits is visible until it becomes relevant. The experience is identical to the pre-monetization product.

**For the free user approaching their limit:** When a free user has consumed 2 of their 3 daily readings, the home screen nudge changes — quietly, in the same visual register as today's text — to something like "1 reading left today ✦ Upgrade for more." Not a warning box. Not a banner. A single line in the same position as the current "Save your readings ✦" link, now carrying specific information. The user who notices it understands exactly where they are.

**For the free user who hits their limit:** The 429 response triggers the UpgradeModal (a future proposal, `feat-stripe-checkout`). The tier data — which the server now includes in the 429 response body and which `gptErrors.ts` will carry through — tells the modal which state to render. The rate limit data lands correctly because the server is persisting counts to SQLite, so the counter reflects reality across deploys.

**For the paid user opening the header:** The `SessionBadge` dropdown opens and shows "Basic ✦" or "Advanced ✦" as a small badge next to the display name. No quota counter for paid users — they are not running out. The badge is the acknowledgment that the system knows they upgraded.

**For the developer on localhost:** The localhost bypass works as before. Nothing changes for local development. The bypass is now explicitly conditional on `NODE_ENV !== 'production'`, so staging and production behave identically to real users.

**For the product when OpenAI is unavailable:** A paid user's call fails cleanly. The error surface (GptSkeleton error state) explains the outage. Crucially, the daily quota counter in SQLite is not incremented for that call — the `releaseSlot` callback fires, the count is decremented, and the user's remaining calls are unaffected. The system treats infrastructure outages as invisible to quota accounting.

The signature moment of this feature is not the upgrade flow (that belongs to `feat-stripe-checkout`). It is the absence of surprise. A user who watches their session context shift from "3 readings left" to "1 reading left" in the header dropdown and home screen nudge, and then sees the UpgradeModal, should feel that the product was tracking their journey honestly the whole time — not that a wall suddenly appeared.

---

## Specifications

### Database

1. The `users` table must gain two new columns via additive `ALTER TABLE` migrations executed in `server/db.ts` at startup, after the existing `CREATE TABLE IF NOT EXISTS users` block:
   ```sql
   ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
   ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
   ```
   These migrations must use `ADD COLUMN IF NOT EXISTS` (available in SQLite 3.35+; `better-sqlite3` ships 3.44+). They must run at every startup and be idempotent — if the columns already exist, the statement is a no-op.

2. A new `gpt_usage` table must be created to persist daily GPT call counts across server restarts:
   ```sql
   CREATE TABLE IF NOT EXISTS gpt_usage (
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     date    TEXT NOT NULL,
     count   INTEGER NOT NULL DEFAULT 0,
     PRIMARY KEY (user_id, date)
   );
   ```
   The `PRIMARY KEY (user_id, date)` constraint enforces one row per user per calendar day and enables the `INSERT OR IGNORE` upsert pattern. The `ON DELETE CASCADE` ensures cleanup if a user account is deleted.

3. `subscription_tier` must be constrained at the application layer to one of `'free'`, `'basic'`, or `'advanced'`. SQLite does not enforce text enum constraints natively; the application must validate before writing. The column default is `'free'` so all existing users are implicitly free.

4. `stripe_customer_id` is nullable. It is null for all existing users and for all users who have never initiated a Stripe checkout. It is populated when the Stripe webhook handler processes a successful `checkout.session.completed` event (handled in the separate `feat-stripe-checkout` proposal). This table column is defined here because the schema change belongs with the tier infrastructure.

### Rate Limiter Refactor (`server/middleware/gptRateLimit.ts`)

5. The `RateLimitEntry` type must be extended to include tier:
   ```ts
   type RateLimitEntry = {
     count: number
     resetAt: number
     tier: 'free' | 'basic' | 'advanced'
   }
   ```

6. Tier limits must be defined as named constants:
   ```ts
   const TIER_LIMITS: Record<'free' | 'basic' | 'advanced', number> = {
     free: 3,
     basic: 20,
     advanced: 100,
   }
   ```
   The existing `AUTH_LIMIT` and `UNAUTH_LIMIT` env-var-driven constants are removed. Unauthenticated users always receive the `free` limit (3 calls per day).

7. On entry creation (the map has no entry for this user, or the existing entry has passed its `resetAt`), the middleware must perform a single synchronous DB read to fetch the user's `subscription_tier`:
   ```ts
   const row = getDb()
     .prepare('SELECT subscription_tier FROM users WHERE id = ?')
     .get(userId) as { subscription_tier: string } | undefined
   const tier = (row?.subscription_tier ?? 'free') as 'free' | 'basic' | 'advanced'
   ```
   This DB read happens only once per user per day — on the first post-midnight GPT call. Subsequent calls within the same day use the cached `tier` from the in-memory map entry. This is the correct tradeoff: one DB read per day per user, zero reads on the hot path.

8. The in-memory `authenticated` map is an L1 cache over the `gpt_usage` SQLite table. The canonical source of truth for counts is SQLite. On entry creation (new day or new user), the middleware must also read the current count from `gpt_usage` for the current UTC date:
   ```ts
   const usageRow = getDb()
     .prepare('SELECT count FROM gpt_usage WHERE user_id = ? AND date = ?')
     .get(userId, todayUTC()) as { count: number } | undefined
   const currentCount = usageRow?.count ?? 0
   ```
   The in-memory entry is initialized with `count = currentCount`. This means a restart mid-day restores the user's actual usage from SQLite — not from zero.

9. Each allowed GPT request must be persisted to `gpt_usage` atomically. The increment must use a single SQL statement that enforces the limit at the database level:
   ```sql
   INSERT INTO gpt_usage (user_id, date, count)
     VALUES (?, ?, 1)
     ON CONFLICT (user_id, date)
     DO UPDATE SET count = count + 1
     WHERE count < ?
   ```
   The `WHERE count < ?` clause makes the update a no-op when the limit is already reached. The `changes` property of the statement result (`.run(...).changes`) must be checked: if `changes === 0`, the DB-level limit was reached and the request must be rejected with 429. If `changes === 1`, the increment succeeded and the in-memory map is updated to match.

10. The `releaseSlot` callback must be defined and attached to `res.locals` before calling `next()`:
    ```ts
    res.locals.releaseSlot = () => {
      // Decrement in-memory entry
      const entry = authenticated.get(userId)
      if (entry && entry.count > 0) entry.count--
      // Decrement DB row
      getDb()
        .prepare('UPDATE gpt_usage SET count = MAX(0, count - 1) WHERE user_id = ? AND date = ?')
        .run(userId, todayUTC())
    }
    ```
    The `MAX(0, count - 1)` guard prevents the count from going negative in the DB.

11. The `releaseSlot` callback must be typed. `res.locals` must include the type so `server/routes/gpt.ts` can call it without a TypeScript error:
    ```ts
    // In a shared types file or at the top of gptRateLimit.ts:
    declare module 'express-serve-static-core' {
      interface Locals {
        releaseSlot?: () => void
      }
    }
    ```

12. The localhost bypass must be gated behind `NODE_ENV !== 'production'`:
    ```ts
    if (process.env.NODE_ENV !== 'production' && LOCALHOST.has(req.ip ?? '')) {
      next()
      return
    }
    ```
    In production this block is never reached. The bypass is entirely invisible to deployed instances.

13. The unauthenticated path (no valid JWT) continues to use IP-based keying. Unauthenticated users always receive the `free` limit (3 calls per day). IP-based counts are not persisted to SQLite in this sprint — persistence for authenticated users is the priority, and unauthenticated IP limits losing state on restart is a known and acceptable tradeoff for v1. A comment must document this explicitly in the code.

14. The `invalidateUserRateLimit(userId: number): void` function must be exported from `gptRateLimit.ts`:
    ```ts
    export function invalidateUserRateLimit(userId: number): void {
      authenticated.delete(userId)
    }
    ```
    This is called by the Stripe webhook handler (defined in `feat-stripe-checkout`) after a tier elevation is written to the DB. The next GPT call from this user will hit the DB to fetch the new tier and start a fresh in-memory entry at the new limit.

15. The 429 response body must be extended to include the user's current tier and the number of calls consumed today:
    ```ts
    res.status(429).json({
      error: 'rate_limit_exceeded',
      resetAt: new Date(entry.resetAt).toISOString(),
      limit: TIER_LIMITS[tier],
      used: entry.count,
      tier,
      authenticated: userId !== null,
    })
    ```
    The `tier`, `limit`, and `used` fields allow the client UpgradeModal to display accurate context without a separate API call.

### Feature Gate in GPT Route (`server/routes/gpt.ts`)

16. The `cosmic-pattern-reading` gate must be added in `server/routes/gpt.ts`, after `gptRateLimit` runs and before `handleGptRequest` is called. It must not be inside the rate limit middleware — feature permission and rate limiting are independent concerns:
    ```ts
    if (type === 'cosmic-pattern-reading') {
      const userId = (res.locals as { userId?: number }).userId
      if (!userId) {
        res.status(401).json({ error: 'authentication_required' })
        return
      }
      const row = getDb()
        .prepare('SELECT subscription_tier FROM users WHERE id = ?')
        .get(userId) as { subscription_tier: string } | undefined
      if (row?.subscription_tier !== 'advanced') {
        res.status(403).json({ error: 'advanced_tier_required', feature: 'cosmic-pattern-reading' })
        return
      }
    }
    ```

17. The GPT route handler must call `res.locals.releaseSlot?.()` when the error from `handleGptRequest` is an OpenAI 5xx error (503, 504). It must NOT call `releaseSlot` for 4xx errors (malformed request, unknown type) — those consumed a legitimate call attempt:
    ```ts
    } catch (err) {
      const message = err instanceof Error ? err.message : 'internal_error'
      if (message === 'gpt_unavailable') {
        res.locals.releaseSlot?.()
        res.status(503).json({ error: 'gpt_unavailable' })
        return
      }
      // 4xx errors: do NOT release slot
      if (message.startsWith('Unknown GPT type:')) {
        res.status(400).json({ error: message })
        return
      }
      res.locals.releaseSlot?.()  // unexpected 5xx — release slot
      res.status(500).json({ error: 'internal_error' })
    }
    ```

18. The `userId` must be made available to `server/routes/gpt.ts` from the rate limit middleware via `res.locals`. The current middleware extracts `userId` internally; it must also write it to `res.locals.userId` so the feature gate in the route can read it without re-parsing the JWT.

### Auth Route (`server/routes/auth.ts`)

19. `UserRow` interface must include the new columns:
    ```ts
    interface UserRow {
      // ... existing fields ...
      subscription_tier: string
      stripe_customer_id: string | null
    }
    ```

20. All `SELECT` statements in `server/routes/auth.ts` that fetch a `UserRow` must include `subscription_tier` in the column list. The current hardcoded column lists (`SELECT id, email, password_hash, full_name, birth_date, birth_time, birth_place, created_at FROM users WHERE ...`) must be updated to also select `subscription_tier`.

21. `safeUser()` must return `subscriptionTier`:
    ```ts
    function safeUser(user: UserRow) {
      return {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        birthDate: user.birth_date,
        birthTime: user.birth_time,
        birthPlace: user.birth_place ? JSON.parse(user.birth_place) : null,
        createdAt: user.created_at,
        subscriptionTier: (user.subscription_tier ?? 'free') as 'free' | 'basic' | 'advanced',
      }
    }
    ```
    The nullish coalesce handles any existing rows that pre-date the migration and whose `subscription_tier` column reads null (SQLite does not backfill existing rows when adding a column with a DEFAULT — it applies the default only for INSERT statements, not for rows that existed before the ALTER TABLE. Existing rows will have null. The `?? 'free'` guard makes this safe.)

22. The `GET /api/auth/me` response must include `subscriptionTier` in the `user` object. Since `safeUser()` now includes it, this follows automatically. No additional handler changes are needed beyond updating `safeUser()` and the SELECT statements.

23. The `POST /api/auth/register` response must also include `subscriptionTier` via the same `safeUser()` path. New users register with `subscription_tier DEFAULT 'free'`, so their initial `safeUser()` output will always be `subscriptionTier: 'free'`.

24. The `POST /api/auth/login` response must include `subscriptionTier` via `safeUser()` (already the case once `safeUser()` is updated).

### AuthContext (`src/context/AuthContext.tsx`)

25. `AuthUser` type must gain a `tier` field. The `AuthUser` type is currently defined in `src/services/authService.ts` (imported at line 2 of `AuthContext.tsx`). The type must become:
    ```ts
    interface AuthUser {
      id: number
      email: string
      displayName: string
      tier: 'free' | 'basic' | 'advanced'
    }
    ```

26. `ServerUserProfile` type (returned by `getSession()` and `getProfile()` in `authService.ts`) must include `subscriptionTier: 'free' | 'basic' | 'advanced'`.

27. `AuthContextType` must expose `tier: 'free' | 'basic' | 'advanced'`:
    ```ts
    interface AuthContextType {
      // ... existing fields ...
      tier: 'free' | 'basic' | 'advanced'
    }
    ```

28. The `tier` value in context must be derived from the authenticated user's `tier` field. When no user is authenticated, `tier` defaults to `'free'`:
    ```ts
    const tier = user?.tier ?? 'free'
    ```

29. Where `setUser` is called with a newly created `AuthUser` object — in the `login`, `register`, `notifyLoggedIn`, and session-restore code paths — the `tier` field must be populated from the server response. The pattern in `login()` (lines 108–111) constructs a `loggedInUser` manually; it must now include `tier: userData.subscriptionTier ?? 'free'`.

30. `AuthContext.Provider` value must include `tier`. The context value object (lines 167–182) must add `tier`.

31. After a Stripe Checkout redirect returns with `?payment=success` in the query string, `AuthContext` must trigger a forced session re-fetch to update the tier without requiring the user to log out and back in. On mount, check `window.location.search` for the `payment=success` parameter. If present, call `getSession()` regardless of whether a token was already loaded, update the user state with the fresh tier, and call `window.history.replaceState({}, '', window.location.pathname)` to clean the parameter from the URL. This behavior belongs in `AuthContext` because `AuthContext` owns the session state.

### `gptErrors.ts` (`src/services/gptErrors.ts`)

32. The `GPT_RATE_LIMIT_UNAUTH` and `GPT_RATE_LIMIT` string constants must be supplemented with a structured error type that carries the 429 payload:
    ```ts
    export interface GptRateLimitError {
      type: 'rate_limit_exceeded'
      tier: 'free' | 'basic' | 'advanced'
      limit: number
      used: number
      resetAt: string  // ISO 8601
      authenticated: boolean
    }
    ```

33. The existing string constants (`GPT_RATE_LIMIT`, `GPT_RATE_LIMIT_UNAUTH`, `GPT_NUDGE`) must be preserved for backward compatibility with components that currently render them. They may be deprecated in a future sprint but must not be removed in this one — other components depend on `isGptError()` checking against these strings.

34. A new parsing function must be exported:
    ```ts
    export function parseRateLimitError(json: unknown): GptRateLimitError | null
    ```
    This function validates that `json` conforms to `GptRateLimitError` shape (checking `error === 'rate_limit_exceeded'`, presence of `tier`, `limit`, `resetAt`) and returns the typed object or `null` if validation fails.

### `SessionBadge` (`src/App.tsx`)

35. `SessionBadge` must accept and use `tier` from `useAuth()`. The component destructures `{ isAuthenticated, displayName, logout }` — it must also destructure `tier`.

36. For authenticated free-tier users, the dropdown panel must display remaining daily reads. Since `AuthContext` knows `tier` but not today's `used` count, the remaining-reads display requires a separate mechanism. Two options: (a) the server includes `todayUsed` in `/api/auth/me` response and `AuthContext` stores it, or (b) `SessionBadge` fetches usage count separately. Option (a) is preferred. `AuthContext` gains a `todayUsed: number` field, populated from `GET /api/auth/me`. The `gpt_usage` table is already queried during the rate limit check — a separate endpoint `GET /api/user/usage` should return `{ todayUsed: number, limit: number, resetAt: string }` so the client can display accurate remaining reads without adding complexity to the auth response.

37. For free-tier users, the dropdown panel body (below the display name) shows:
    ```
    [displayName]
    3 readings left today
    ──────────────────
    Sign Out
    ```
    The "3 readings left today" line uses `rgba(201,168,76,0.45)` color and `text-xs font-heading`. The count reflects `limit - todayUsed`. When at 0 remaining: "0 readings left today" — same styling, no red or warning color. The information is factual, not alarming.

38. For basic-tier users, the dropdown shows:
    ```
    [displayName]
    Basic ✦
    ──────────────────
    Sign Out
    ```
    "Basic ✦" is rendered in `text-xs font-heading` at `rgba(201,168,76,0.75)` — a step up from muted but not the full gold of the display name.

39. For advanced-tier users, the dropdown shows:
    ```
    [displayName]
    Advanced ✦
    ──────────────────
    Sign Out
    ```
    Same styling as basic.

40. The unauthenticated state of `SessionBadge` (the "Sign in" button) is unchanged.

41. The dropdown close-on-outside-click behavior (the `mousedown` handler, lines 36–42 of `App.tsx`) is unchanged.

42. The tier label and remaining-reads line must have `role="status"` and `aria-live="polite"` so screen readers announce tier changes when the dropdown opens.

### `HomeScreen` Auth Nudge (`src/components/home/HomeScreen.tsx`)

43. `HomeScreen` must destructure `tier` and a new `todayUsed` value from `useAuth()`:
    ```ts
    const { isAuthenticated, tier, todayUsed } = useAuth()
    ```

44. The auth nudge section (currently lines 108–118) must branch on authentication state, tier, and daily usage:

    - **Unauthenticated, `todayUsed === 0` or `todayUsed === 1`** (first visit or early session):
      ```
      Save your readings ✦
      ```
      Same copy and styling as today. The user has plenty of free reads left; this nudge is about account persistence, not urgency.

    - **Unauthenticated, `todayUsed === 2`** (one read remaining):
      ```
      1 reading left today ✦ Sign in to save more
      ```
      Same visual register (small, gold/60, left-aligned text link) but now carries specific usage context. No visual emphasis change — just different copy.

    - **Unauthenticated, `todayUsed >= 3`** (limit reached):
      The UpgradeModal should already be appearing at this point (triggered by the 429 response). If the modal is dismissed, the nudge should read:
      ```
      Daily limit reached ✦ Sign in for more readings
      ```

    - **Authenticated, free tier, `todayUsed === 0` or `todayUsed === 1`**:
      No nudge is rendered. The `<div className="mb-6" />` spacer (current line 118) is preserved for layout.

    - **Authenticated, free tier, `todayUsed === 2`** (one read remaining):
      ```
      1 reading left today ✦ Upgrade for more
      ```
      Same small-text link style, clicking opens UpgradeModal (passed as a prop from `App.tsx` or via a context callback).

    - **Authenticated, free tier, `todayUsed >= 3`** (limit reached):
      ```
      Daily limit reached ✦ Upgrade to continue
      ```
      Same styling.

    - **Authenticated, basic or advanced tier**:
      No nudge. The spacer is preserved.

45. On the first authenticated session immediately after registration (when the user has no prior visit data and `todayUsed === 0`), the welcome sentence must appear once below the identity line, in place of the secondary reference line:
    ```
    Your chart is ready. Everything you explore from here is yours.
    ```
    This sentence appears only when: the user is authenticated, the session is the first after registration (detected via a sessionStorage flag set during `register()` and cleared after display), and `todayUsed === 0`. After displaying once, the sessionStorage flag is cleared and the sentence never reappears in subsequent page loads or sessions.

46. The welcome sentence uses `text-xs text-mystic-muted/70 italic mb-4` styling. It is not bold, not golden, not animated. It is a quiet acknowledgment that appears once and then disappears into the ordinary session flow.

47. All nudge buttons must have descriptive `aria-label` attributes:
    - `aria-label="Sign in to save your readings"`
    - `aria-label="1 reading remaining today — sign in for more"`
    - `aria-label="Daily limit reached — sign in for more readings"`
    - `aria-label="Upgrade your plan for more readings"`

### Usage Data in AuthContext

48. `AuthContextType` must expose `todayUsed: number`. Default value is `0` when unauthenticated.

49. `todayUsed` must be populated by calling `GET /api/user/usage` after the session is restored. This endpoint returns `{ todayUsed: number, limit: number, resetAt: string }` and reads from the `gpt_usage` table for today's UTC date.

50. `GET /api/user/usage` must be added to `server/routes/auth.ts` (or a new `server/routes/user.ts`), behind `requireAuth`. It executes:
    ```sql
    SELECT count FROM gpt_usage WHERE user_id = ? AND date = ?
    ```
    If no row exists, `todayUsed` is 0. The `limit` field is derived from the user's `subscription_tier`.

51. The `todayUsed` value in `AuthContext` is not real-time — it reflects the state at session load. It does not decrement as calls are made within the same session. This is intentional for v1: the purpose is to drive the home screen nudge, not to show a live counter. The SessionBadge "remaining reads" display similarly reflects the session-load state. If accurate real-time count is needed in a future sprint, the GPT interpretation service can emit an event that `AuthContext` listens to.

### Edge Cases and Error States

52. If `GET /api/user/usage` fails (network error or server error), `todayUsed` in `AuthContext` falls back to `0` and `tier` falls back to the value from the most recent `/api/auth/me` response. The nudge and SessionBadge render based on cached state. No error is shown to the user for this secondary fetch failure.

53. If the `gpt_usage` DB query fails during a GPT request (e.g., the SQLite file is locked), the rate limit middleware must fail open (allow the call through) rather than returning a 500. A comment must explain this choice: a failed quota check that blocks a paying user is worse than a failed quota check that allows an extra call. Log the failure at `console.error` level.

54. If `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` throws because the SQLite version is older than 3.35, the server startup must catch the error and throw a clear message: `"SQLite version too old to run migrations. Requires 3.35+."` This is better than a silent failure mid-request.

55. A user whose `subscription_tier` value in the DB is an unrecognized string (e.g., from a future migration or data corruption) must be treated as `'free'` at the rate limit and feature gate layers. The fallback must be documented with a comment.

56. The `invalidateUserRateLimit(userId)` export is safe to call multiple times — `authenticated.delete(userId)` is idempotent.

57. On the very first GPT call after a server restart (when the `gpt_usage` row does not yet exist for today), the `INSERT OR IGNORE ... UPDATE WHERE count < limit` pattern handles the insert atomically. No special startup initialization is needed.

58. Unauthenticated requests that hit the limit return `authenticated: false` in the 429 body, as today. This field is used by `UpgradeModal` to know whether to prompt sign-in before checkout.

59. When a user's `subscription_tier` is `'advanced'`, `TIER_LIMITS.advanced` is 100. A user who has consumed 100 calls in a day receives a 429 with `tier: 'advanced'`. The UpgradeModal (in `feat-stripe-checkout`) handles this edge case with copy like "Daily limit reached — your reads reset at midnight." There is no higher tier to offer.

### TypeScript and Build Correctness

60. All changes to `AuthContextType` must be reflected in all call sites of `useAuth()`. The TypeScript compiler must not emit errors for any module that destructures from `useAuth()`. Running `npm run build` (or `tsc --noEmit`) must complete without new errors introduced by this feature.

61. The `declare module 'express-serve-static-core'` augmentation for `res.locals.releaseSlot` must be placed in a `.d.ts` file or in a file that is included by the TypeScript project. It must not be in a file that is excluded from compilation.

62. `todayUTC()` is a utility function that returns the current date in `'YYYY-MM-DD'` format using `Date.prototype.toISOString().slice(0, 10)`. It must be defined once (in `gptRateLimit.ts` or a shared `server/utils/date.ts` module) and imported where needed in the server codebase.

### Performance

63. The synchronous DB reads for tier lookup (`SELECT subscription_tier FROM users WHERE id = ?`) must use `better-sqlite3`'s `prepare().get()` pattern with a prepared statement. The statement must be prepared once and cached as a module-level constant, not re-prepared on every call:
    ```ts
    const getTierStmt = getDb().prepare('SELECT subscription_tier FROM users WHERE id = ?')
    ```
    The same applies to the `gpt_usage` upsert and decrement statements.

64. The net overhead added to each GPT request in the steady state (entry exists in memory, today's date matches, tier is cached) must be: one in-memory map lookup, one synchronous SQLite write (the upsert). The SQLite write for `gpt_usage` with WAL mode enabled is expected to complete in under 1ms. No additional DB reads occur in the hot path.

### Acceptance Checks

65. A free user who makes 3 GPT calls, observes the 429, and then makes a 4th call after a server restart, must receive a 429 on the 4th call. The SQLite `gpt_usage` row must contain `count = 3` for that user's UTC date.

66. A user who upgrades to basic tier via the Stripe webhook (simulated by a direct `UPDATE users SET subscription_tier = 'basic' WHERE id = ?` in test) and then calls `invalidateUserRateLimit(userId)` must be able to make up to 20 GPT calls total (resetting from the 3 consumed before upgrade — the in-memory entry is deleted and rebuilt fresh from the DB, but the `gpt_usage` row already has `count = 3`. The new limit is 20, so they have 17 remaining). Calling `invalidateUserRateLimit` does not reset the `gpt_usage` count in the DB — it only deletes the in-memory cache entry so the new tier is picked up.

67. Sending `X-Forwarded-For: 127.0.0.1` in a request to the production server must not bypass the rate limiter.

68. Making two concurrent GPT requests (Promise.all([fetch('/api/gpt/interpret'), fetch('/api/gpt/interpret')])) for a free user at count=2 must result in exactly one succeeding and one receiving 429. The `WHERE count < limit` SQL constraint enforces this atomically.

69. A call that fails with OpenAI 503 must not decrement the user's remaining calls. After the failed call, `SELECT count FROM gpt_usage WHERE user_id = ? AND date = ?` must return the same value as before the call.

70. `GET /api/auth/me` for an authenticated user must return a `user` object with `subscriptionTier: 'free'` for all existing users (those who existed before the migration). No existing user must receive `subscriptionTier: null` or `subscriptionTier: undefined`.

71. The `SessionBadge` dropdown for a free user with `todayUsed = 1` must display "2 readings left today".

72. The `HomeScreen` nudge for an unauthenticated user with `todayUsed = 2` must display "1 reading left today ✦ Sign in to save more" and must not display "Save your readings ✦".

73. The `HomeScreen` nudge for an authenticated basic-tier user must display no nudge text (only the spacer `<div className="mb-6" />`).

74. The first-visit welcome sentence must appear exactly once after registration and must not appear on subsequent page loads or after the user logs out and logs back in.

75. The `cosmic-pattern-reading` type request from a free or basic user must return `403` with `{ error: 'advanced_tier_required', feature: 'cosmic-pattern-reading' }` and must not consume a daily call slot (the `releaseSlot` must be called if the slot was reserved, or the gate must be checked before the rate limit increments — gate placement after `gptRateLimit` but before `handleGptRequest` means the slot was already consumed; the gate must call `res.locals.releaseSlot?.()` before returning 403).

---

## Out of Scope

- **Stripe Checkout, webhook handler, and `UpgradeModal`** — defined in `feat-stripe-checkout`. This proposal covers only the tier model, rate limiter, and UI surfaces that consume tier data. The payment loop that writes `subscription_tier` to the DB is a separate concern.
- **OAuth sign-up** — defined in `feat-oauth-signup`. The `subscription_tier` column added in this proposal will be used by the OAuth user creation path, but the OAuth flow itself is not specified here.
- **Funnel analytics events** — defined in `feat-funnel-analytics`. The usage-aware nudge on `HomeScreen` surfaces tier information; it does not emit analytics events. Analytics wiring is a separate pass.
- **Billing portal, plan downgrade, invoice history** — not in this sprint. A user who wants to cancel contacts the owner.
- **Password reset, email verification** — not in this sprint.
- **Admin panel for manual tier overrides** — identified by Taleb as important operational tooling. Out of scope for this proposal but flagged as a high-priority follow-up.
- **Stripe reconciliation at `/api/auth/me`** — Taleb proposes cross-checking Stripe's subscriptions API at login for users with `stripe_customer_id` and `free` tier. This is a recovery mechanism for webhook delivery failures. It is logically part of `feat-stripe-checkout` (it requires `stripe_customer_id` to be populated and the Stripe SDK to be initialized) and is specified there.
- **`todayUsed` as a real-time counter** — `AuthContext` reflects usage at session load only. Live decrement as calls are made within a session is deferred.
- **Unauthenticated IP-based counter persistence** — IP counters remain in-memory only for v1. Only authenticated user counts are persisted to SQLite.
- **Multi-process rate limiter coordination** — the current design assumes a single Node process. If the deployment moves to multiple processes or containers, the in-memory map is no longer shared. This is deferred; SQLite with WAL mode handles concurrent reads but a single writer per process. Multi-process deployments would require Redis or a different coordination mechanism.

---

## Open Questions

1. **Where does `todayUsed` live in the auth response?** The current proposal adds `GET /api/user/usage` as a separate endpoint called after session restore. An alternative is to include `todayUsed` directly in the `/api/auth/me` response by joining `gpt_usage` in the same query. The join is slightly simpler for the client (one fewer request) but adds complexity to the auth query. The separate endpoint keeps concerns cleaner but adds a round trip. Decision needed before implementation.

2. **Does `invalidateUserRateLimit` also reset the `gpt_usage` DB count, or only the in-memory entry?** The current spec says it only deletes the in-memory cache entry — the `gpt_usage` DB count is preserved across upgrades (a user who used 3 free calls before upgrading now has 17 basic calls remaining, not 20). Is this the right user experience? An alternative: on tier elevation, reset the `gpt_usage` count for today by deleting the row (`DELETE FROM gpt_usage WHERE user_id = ? AND date = ?`). This gives the upgrading user a full 20 calls immediately upon payment. The downside is that it makes the count discontinuous in the events log. Taleb's proposal does not specify; Jobs's would prefer the full-20 experience.

3. **What happens to the `gpt_usage` row when a user's tier is elevated by Stripe?** Related to question 2. If the count is not reset, a user who hit their 3-call limit and then upgraded gets 17 calls for the rest of the day, not 20. This is technically correct (they consumed 3 calls, they have 17 remaining of their new 20 limit) but may feel punitive. The welcome experience after payment ("the sky is wider now") is diminished if the user discovers they only have 17 readings left.

4. **Should the `TIER_LIMITS` constants be configurable via environment variables?** The current spec hardcodes them. Carmack's analysis hardcodes them too (the env-var-driven `GPT_AUTH_DAILY_LIMIT` is removed). The benefit of env-var configuration is A/B testing different limits without a deploy. The cost is more moving parts. For v1, hardcoded limits are simpler and correct.

5. **`GET /api/user/usage` authentication**: the endpoint must be behind `requireAuth`. But the `HomeScreen` needs `todayUsed` for unauthenticated users too (to show the IP-based usage count in the nudge). For unauthenticated users, the server cannot return per-user usage (IP-based counts are in-memory only). The options are: (a) always show the nudge as "Save your readings ✦" for unauthenticated users regardless of usage, (b) expose an unauthenticated `GET /api/user/usage` that reads the IP-based in-memory counter. Option (a) is simpler. The current spec in the Specifications section already branches unauthenticated nudge copy on `todayUsed` — this question resolves whether that branch is actually implementable or should be simplified to auth-state-only.

6. **First-visit welcome sentence trigger mechanism**: using `sessionStorage` means the sentence disappears if the user opens a new tab after registering. Using a `users` table `first_session_shown_at TEXT` column (written on first `GET /api/auth/me` after registration) is more reliable but adds a DB write. The `sessionStorage` approach is simpler for v1 but may miss some users who open multiple tabs. Does this matter enough to add a DB column?
