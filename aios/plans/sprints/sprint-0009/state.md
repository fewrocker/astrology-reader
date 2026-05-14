# Sprint 0009 State

**Branch:** sprint-0009
**Status:** complete
**Started:** 2026-05-14
**Completed:** 2026-05-14

## Tasks

| Task | Name | Status |
|------|------|--------|
| 0001 | code-server-production-hardening | done |
| 0002 | feat-funnel-analytics | done |
| 0003 | feat-oauth-signup | done |
| 0004 | feat-stripe-checkout | done |
| 0005 | feat-subscription-tiers | done |

## Conflict Resolutions

### server/index.ts (tasks 0001–0005)
All five task branches touched this file. Resolution: combined all features in middleware order:
1. Stripe webhook router mounted **before** `express.json()` — critical for Stripe signature verification
2. `helmet()`, `compression()`, `morgan()` from task-0001
3. `express.json({ limit: '50kb' })` from task-0001
4. `cookieParser()` from task-0002/0003 (deduplicated)
5. Session cookie middleware from task-0002
6. All routers: auth, oauth (task-0003), profile, entries, gpt, analytics (task-0002), stripe (task-0004)
7. Global error handler from task-0001
Also deduplicated the double STRIPE_WEBHOOK_SECRET env guard that appeared after merging task-0001 and task-0004.

### server/db.ts (tasks 0002–0005)
Final result includes ALL tables and migrations:
- `events` table from task-0002 (with 4 indexes)
- `gpt_usage` table from task-0005
- OAuth migration (table rebuild) from task-0003
- `subscription_tier` + `stripe_customer_id` columns from task-0004/0005
Used task-0004's `addColumnIfMissing` approach (catches "duplicate column name") rather than task-0005's `IF NOT EXISTS` approach, as the OAuth rebuild creates users_new and the "duplicate column" approach is more compatible.

### server/middleware/gptRateLimit.ts (tasks 0004, 0005)
Took task-0005's version as authoritative (more complete: durable SQLite persistence, `releaseSlot`, `res.locals` augmentation, localhost bypass gated to non-production). task-0004's use of `invalidateUserRateLimit` in the Stripe webhook is fully compatible since task-0005 exports the same function.

### server/routes/auth.ts (tasks 0003, 0004, 0005)
Merged all three sets of changes:
- OAuth fields (`oauth_provider`, `oauth_subject`) in `UserRow` from task-0003
- `password_hash` nullable from task-0003
- `signToken` exported from task-0003
- Stripe reconciliation in `/me` from task-0004
- `subscriptionTier` in `safeUser` from task-0004/0005
- `/usage` endpoint from task-0005
- `SELECT_USER_COLS` includes all OAuth + stripe columns
- Fixed duplicate `subscriptionTier` in `safeUser` that appeared from auto-merge

### src/context/AuthContext.tsx (tasks 0003, 0004, 0005)
Merged all three feature sets in a single unified file:
- OAuth JWT handoff (`?token=`) and `?oauth_error=` handling from task-0003
- `oauthError`, `dismissOauthError` from task-0003
- `tier` state and `applySessionResult` from task-0004
- `refreshSession` from task-0004
- `paymentWelcomePending`, `dismissPaymentWelcome` from task-0004
- `payment=success` detection from task-0004/0005
- `todayUsed`, `fetchUsage`, `getUsage` from task-0005
- `sessionStorage.setItem('just-registered')` from task-0005
- `track('login_completed')` and `track('signup_completed')` from task-0002/0003
The mount `useEffect` handles: `?oauth_error` → early return; `?token=` JWT handoff; `?payment=success` detection; normal session check; usage fetch.

### src/components/home/HomeScreen.tsx (tasks 0002, 0004, 0005)
Merged all three feature sets:
- IntersectionObserver for `auth_nudge_seen` from task-0002
- `track('auth_nudge_clicked')` on nudge buttons from task-0002
- Post-payment "The sky is wider now. ✦" message from task-0004
- `PAYMENT_WELCOMED_KEY` localStorage guard from task-0004
- First-visit welcome sentence from task-0005
- Usage-aware 6-state `renderAuthNudge()` from task-0005
- `todayUsed` and `paymentWelcomePending`/`dismissPaymentWelcome` both destructured

### package.json (tasks 0001, 0002, 0004)
Final result includes ALL dependencies: `helmet`, `compression`, `morgan`, `@types/compression`, `@types/morgan` (task-0001); `cookie-parser`, `@types/cookie-parser` (task-0002); `stripe` (task-0004).

### src/services/authService.ts
Added `subscriptionTier?: 'free' | 'basic' | 'advanced'` to `AuthResponse.user` to resolve TS error after task-0004 merge (the server returns this field after sprint-0009 migrations).
