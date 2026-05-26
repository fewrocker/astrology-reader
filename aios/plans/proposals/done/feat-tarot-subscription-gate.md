# Proposal: Subscription Gating for Tarot

- **Slug:** `tarot-subscription-gate`
- **Type:** Feature
- **Filename:** `feat-tarot-subscription-gate.md`
- **Originated by:** Jobs, Miyazaki, Taleb
- **Sprint:** 0023
- **Priority:** High — without this, all Tarot reading types ship as fully unrestricted features and the subscription model has no Tarot-specific enforcement layer.

---

## User Guidance

From `aios/guidelines.md`, Subscription Layer section:

> **Subscription Layer**
>
> Suggested structure:
>
> Free
> Limited daily card draws
> Limited three-card readings
> Limited AI synthesis
>
> Advanced
> Unlimited readings
> Full Celtic Cross
> Saved readings
> Tarot journal integration
> Deep AI synthesis
> Full Discuss ✦ chat
> Advanced spread types

This proposal operationalizes that structure with precise database columns, middleware behavior, client-side UX rules, and copy variants. Where the product spec names the limits loosely ("limited"), this proposal makes them exact.

---

## Problem / Opportunity

No Tarot-specific subscription gates or usage tracking exist anywhere in the codebase. The existing rate-limiting infrastructure — `server/middleware/gptRateLimit.ts` with its `gpt_usage(user_id, date, count)` table — is a single daily counter that treats a Tarot card draw identically to a transit reading synthesis call. This creates two failures:

1. **Semantic confusion.** A free user who exhausts their transit readings is also blocked from their single daily Tarot card, with no explanation that connects to the Tarot experience. The user sees the same `UpgradeModal` they see for transits, which says nothing about Tarot. The user does not understand what she hit or what unlocking would give her.

2. **Missing Tarot-specific limits.** The product spec defines Tarot gate semantics that have no equivalent in the daily GPT counter: a *weekly* three-card reading limit and an Advanced-only gate on Celtic Cross draws. The daily `gpt_usage` counter has no mechanism for weekly aggregation, and no mechanism for feature-type gates (as opposed to per-call volume gates).

The opportunity: implement a self-contained Tarot usage tracking layer that enforces the right limits at the right moments without touching the existing `gpt_usage` machinery, and deliver upgrade prompts that are contextually aware of the exact Tarot moment the user hit.

---

## Vision

> The gate appears after the experience, not before — you draw the card, then the wall appears (if at all).

This is the governing design principle of the entire proposal, stated by Jobs and reinforced by Miyazaki. The Tarot ritual is not an e-commerce transaction flow. A person who has drawn a card and is sitting with it is in an emotional state where an interruption — a pricing screen appearing mid-reveal — is experienced as a betrayal of trust.

The gate must be positioned so it is never mid-ritual. There is one exception: Celtic Cross. Because the Celtic Cross is defined as Advanced-only (the free tier has no Celtic Cross entitlement at all), showing a lock before the draw begins is the only correct behavior. Showing it after card 7 of 10 have been revealed is not acceptable. The Celtic Cross gate is the one case where gating before is required.

For all other gate moments — daily card limit hit, weekly three-card limit hit, save reading attempt, Discuss ✦ on a Tarot reading — the reading completes first. The gate appears only when the user tries to go further.

The reading should always be a gift. The upgrade should be a choice.

---

## Specifications

### 1. New Database Table: `tarot_usage`

Create the following table in `server/db.ts` alongside the existing `gpt_usage` table initialization:

```sql
CREATE TABLE IF NOT EXISTS tarot_usage (
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date         TEXT NOT NULL,          -- YYYY-MM-DD (UTC), the day this row covers
  week_start   TEXT NOT NULL,          -- YYYY-MM-DD (UTC), Monday of the ISO week
  daily_cards  INTEGER NOT NULL DEFAULT 0,
  weekly_three_card INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_tarot_usage_week
  ON tarot_usage (user_id, week_start);
```

The primary key is `(user_id, date)`. The `week_start` column enables a single WHERE clause to sum `weekly_three_card` across the current week without a date-range scan. The index on `(user_id, week_start)` makes the weekly aggregation an indexed lookup, not a full table scan.

### 2. Why a Separate Table — Not `gpt_usage`

The existing `gpt_usage` table tracks GPT API calls at a uniform daily granularity: one row per `(user_id, date)`, one `count` integer. This is appropriate for transit readings, synastry, solar returns, and today-page syntheses, which are all symmetric in kind (one API call = one unit of usage).

Tarot usage has structurally different semantics that cannot be expressed in a single counter:

- **Daily card draws** are a distinct gate from GPT synthesis calls. A free user drawing their one daily card should not consume their GPT call budget. The draw itself (AI-free instant interpretation) is free; the GPT synthesis is gated separately by `gpt_usage`. A user who hits the daily card draw limit may still have GPT budget left — and vice versa.
- **Weekly three-card readings** require weekly aggregation. The `gpt_usage` table has no week-level counter and adding one would require a structural change that breaks the existing prepared-statement cache that gives `gptRateLimit` its O(1) performance.
- **Celtic Cross access** is a boolean tier gate, not a counter at all. It is enforced at the route level by checking subscription tier, not by incrementing a counter.
- **Shared counter confusion.** If a Tarot draw consumed `gpt_usage` count alongside a transit reading, the free user would see: "You have used 4 of 3 GPT readings today." The math would be confusing, and the messaging would need to distinguish between Tarot and non-Tarot call types — adding complexity that a separate table avoids entirely.

`tarot_usage` keeps the Tarot gate atomic, isolated, and independently queryable.

### 3. Free Tier Limits

| Feature | Free Limit |
|---|---|
| Single card draw per day | 1 |
| Three-card readings per week | 1 |
| Celtic Cross draws | None (Advanced-only gate, not a counter) |
| Saved readings | None (Advanced-only gate, not a counter) |
| AI synthesis (GPT) on Tarot readings | Shared with existing `gpt_usage` daily limit; no separate counter |
| Discuss ✦ on Tarot | Shared with existing `gpt_usage` daily limit |

The daily card draw limit of 1 is intentionally low. The single daily card is the habit-forming surface. The limit enforces the upgrade case while still allowing the free user to experience the ritual once per day — enough to understand the product's value before paying.

The weekly three-card limit of 1 allows free users to experience the full three-card spread once per week. This is sufficient to understand the product's depth; the upgrade pitch writes itself after the user has experienced one good three-card reading and wants another.

### 4. Advanced Tier Entitlements

| Feature | Advanced |
|---|---|
| Single card draws per day | Unlimited |
| Three-card readings per week | Unlimited |
| Celtic Cross | Unlocked |
| Saved readings | Unlocked |
| AI synthesis on all Tarot reading types | Full depth, gated only by the shared `gpt_usage` advanced tier limit |
| Discuss ✦ on all Tarot reading types | Full access |
| Journal integration for saved readings | Unlocked |

There is no Basic tier distinction for Tarot. The product spec defines Free and Advanced; the Basic tier receives Advanced Tarot entitlements (unlimited draws, Celtic Cross, saved readings) as it currently receives the higher GPT call limit. This keeps the Tarot gate binary: free vs. not-free.

### 5. Server-Side Gate Enforcement

All gates are enforced server-side. Client-side checks (specification 6 below) are soft UX hints only — they do not replace server enforcement. A user who bypasses the client check by calling the API directly receives the same 429 response.

**5a. New middleware: `server/middleware/tarotRateLimit.ts`**

Create `server/middleware/tarotRateLimit.ts` following the pattern of `gptRateLimit.ts`:

```typescript
// Prepared statements (cached at module level, lazy-initialized)
// _getTarotDailyStmt: SELECT daily_cards, weekly_three_card FROM tarot_usage WHERE user_id = ? AND date = ?
// _getTarotWeeklyStmt: SELECT SUM(weekly_three_card) as total FROM tarot_usage WHERE user_id = ? AND week_start = ?
// _upsertDailyCardStmt: INSERT ... ON CONFLICT DO UPDATE SET daily_cards = daily_cards + 1 WHERE daily_cards < ?
// _upsertWeeklyThreeCardStmt: INSERT ... ON CONFLICT DO UPDATE SET weekly_three_card = weekly_three_card + 1 WHERE weekly_three_card < ?
```

The middleware is not a one-size-fits-all function. Instead, export three specific enforcement functions:

```typescript
export function tarotDailyCardGate(req, res, next): void
  // Checks daily_cards < TAROT_FREE_DAILY_CARD_LIMIT for free tier users.
  // Advanced users: next() immediately.
  // On limit reached: 429 with { error: 'tarot_daily_card_limit', resetAt, gate: 'daily_card' }

export function tarotWeeklyThreeCardGate(req, res, next): void
  // Checks weekly_three_card < TAROT_FREE_WEEKLY_THREE_CARD_LIMIT for free tier users.
  // Advanced users: next() immediately.
  // On limit reached: 429 with { error: 'tarot_weekly_three_card_limit', resetAt: weekResetAt, gate: 'weekly_three_card' }

export function tarotCelticCrossGate(req, res, next): void
  // Checks subscription_tier === 'advanced'. No counter involved.
  // On free tier: 403 with { error: 'tarot_celtic_cross_gate', gate: 'celtic_cross' }
```

These three functions are applied as route-level middleware on the Tarot draw endpoints in `server/routes/gpt.ts` (or the dedicated `server/routes/readings.ts` if Tarot draws are routed there).

**5b. Limits as environment variables**

Drawing the lesson from proposal #12 (rate limiter configuration fix), Tarot limits are not hardcoded constants with `// TEST MODE` comments. They are read from environment variables with explicit `NODE_ENV` guards:

```typescript
const TAROT_FREE_DAILY_CARD_LIMIT =
  process.env.NODE_ENV === 'production'
    ? parseInt(process.env.TAROT_FREE_DAILY_CARD_LIMIT ?? '1', 10)
    : parseInt(process.env.TAROT_FREE_DAILY_CARD_LIMIT ?? '10000', 10)

const TAROT_FREE_WEEKLY_THREE_CARD_LIMIT =
  process.env.NODE_ENV === 'production'
    ? parseInt(process.env.TAROT_FREE_WEEKLY_THREE_CARD_LIMIT ?? '1', 10)
    : parseInt(process.env.TAROT_FREE_WEEKLY_THREE_CARD_LIMIT ?? '10000', 10)
```

In `.env.test`, both variables are unset (defaulting to 10000 — effectively disabled). In production environment configuration, `TAROT_FREE_DAILY_CARD_LIMIT=1` and `TAROT_FREE_WEEKLY_THREE_CARD_LIMIT=1`. This makes the gate testable in development and correctly enforced in production without `// TEST MODE` comments that can slip through to production.

**5c. Route attachment**

```typescript
// server/routes/gpt.ts (or tarot-specific route file)
router.post('/tarot/draw/single', tarotDailyCardGate, requireAuth, handleSingleCardDraw)
router.post('/tarot/draw/three-card', tarotWeeklyThreeCardGate, requireAuth, handleThreeCardDraw)
router.post('/tarot/draw/celtic-cross', tarotCelticCrossGate, requireAuth, handleCelticCrossDraw)
router.post('/tarot/save', tarotSavedReadingsGate, requireAuth, handleSaveReading)
```

`tarotSavedReadingsGate` is a simple tier check (Advanced-only), no counter.

**5d. Counter increment timing**

The daily card counter is incremented at draw time, not at synthesis time. The draw is the unit of consumption — the user has drawn a card regardless of whether GPT synthesis completes. This mirrors how `gpt_usage` increments at request entry and releases the slot only on 5xx server failure, not on successful response.

The three-card weekly counter is incremented when the three-card draw request is accepted, not when the synthesis completes.

**5e. Week boundaries**

The `week_start` column stores the ISO Monday of the current week in YYYY-MM-DD format (UTC). This is computed as:

```typescript
function currentWeekStartUTC(): string {
  const d = new Date()
  const day = d.getUTCDay() // 0=Sunday, 1=Monday, ..., 6=Saturday
  const daysToMonday = day === 0 ? 6 : day - 1
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - daysToMonday))
  return monday.toISOString().slice(0, 10)
}
```

The weekly three-card gate sums `weekly_three_card` across all rows where `week_start = currentWeekStartUTC() AND user_id = ?`. This means a user who draws on Monday, Wednesday, and Friday of the same week accumulates across three rows, all sharing the same `week_start`. The index on `(user_id, week_start)` keeps this fast.

### 6. Client-Side Soft Check

The client holds a local snapshot of the user's Tarot usage state in `TarotContext`. This snapshot is fetched from a new endpoint `GET /api/tarot/usage` on Tarot module mount:

```typescript
// Response shape
interface TarotUsageStatus {
  dailyCardDrawsUsed: number
  dailyCardDrawsLimit: number | null     // null = unlimited (Advanced)
  weeklyThreeCardUsed: number
  weeklyThreeCardLimit: number | null    // null = unlimited (Advanced)
  celticCrossEnabled: boolean
  savedReadingsEnabled: boolean
  tier: 'free' | 'advanced'
  dailyResetAt: string                   // ISO string, next midnight UTC
  weeklyResetAt: string                  // ISO string, next Monday UTC midnight
}
```

The client uses this snapshot to:

- Show a lock icon on the mode selector when Celtic Cross is not available (Advanced-only gate shown before draw).
- Show a lock icon on the single-card draw button when `dailyCardDrawsUsed >= dailyCardDrawsLimit`.
- Show a lock icon on the three-card option when `weeklyThreeCardUsed >= weeklyThreeCardLimit`.
- Pre-empt a wasted ritual: if the user taps Celtic Cross and is on free tier, the `UpgradeModal` opens immediately — before any shuffle animation begins.

The client-side check is a best-effort UX optimization, not a security gate. The snapshot is fetched once at mount and is stale once an hour or after a reading completes. The server always enforces authoritatively.

**The lock icon:** a subtle padlock glyph (not a banner, not a disabled button with grayed text) rendered in `rgba(201,168,76,0.40)` on the mode card. Tapping the locked option opens the `UpgradeModal` immediately. This respects the user's intelligence — the lock communicates the gate without belaboring it.

### 7. Gate UX Rule: Never Interrupt Mid-Ritual

This is non-negotiable. The ritual is inviolable once it begins.

**Allowed gate positions:**

| Gate Moment | Position |
|---|---|
| Celtic Cross on free tier | Before draw — lock shown on mode selector |
| Daily card limit reached | Before draw — lock shown on draw button; if user somehow reaches server gate anyway, 429 triggers UpgradeModal post-submit |
| Weekly three-card limit reached | Before draw — lock shown on three-card option |
| Saved readings gate (on save attempt) | After reading completes, when user taps "Save" |
| Discuss ✦ gate (on Tarot reading surface) | After reading completes, when user taps "Discuss ✦" |

**Explicitly disallowed:**

- Showing the UpgradeModal while a card is face-down and waiting for user tap to reveal.
- Showing the UpgradeModal while the GPT synthesis skeleton is loading.
- Showing the UpgradeModal between card positions in a Celtic Cross reveal sequence (this cannot happen because Celtic Cross is blocked at the entry point for free users).
- Blocking the AI-free instant interpretation — the free reading always delivers its full AI-free layer. The synthesis is what may be gated.

The one exceptional case: if the server returns a 429 `tarot_daily_card_limit` response after the client's stale cache failed to catch the limit (e.g., the user drew on another device), the `DeckShuffleAnimation.tsx` receives an error response during the draw phase (before any card is revealed) and opens the UpgradeModal there. The card was never revealed, so the ritual was never started. This is acceptable.

### 8. Celtic Cross: Advanced-Only Gate, Shown Before Draw

Celtic Cross is not a counter-gated feature. It is an entitlement gate. The free user simply does not have access.

The gate is surfaced at the mode selector level in `TarotPage.tsx`. The Celtic Cross option in the mode selector renders with a lock icon when `!tarotUsageStatus.celticCrossEnabled`. Tapping it opens `UpgradeModal` with `intendedTier="advanced"` and the Celtic Cross–specific heading variant (specification 9d below).

The shuffle animation and draw sequence never begin for a free-tier user attempting Celtic Cross. The server enforces this via `tarotCelticCrossGate` middleware on the draw endpoint as a backstop.

The framing of the gate copy matters here. Celtic Cross is not withheld as punishment. The framing is: "Celtic Cross is a full sky reading. It lives on the Advanced tier." This positions the gate as a natural feature partition, not a paywall.

### 9. UpgradeModal Copy Variants for Tarot Gate Moments

The existing `UpgradeModal` serves transit readings with general copy: "You've read your sky for today." Tarot gates require distinct copy that is contextually aware of the specific ritual moment the user has reached. The `UpgradeModal` receives a `context` prop (or the `heading` is computed by the caller and passed via the existing `getHeading` extension point).

The cleanest implementation: extend `UpgradeModal`'s props to accept an optional `tarotGate` prop of a discriminated union type:

```typescript
type TarotGateContext =
  | { gate: 'daily_card' }
  | { gate: 'weekly_three_card' }
  | { gate: 'celtic_cross' }
  | { gate: 'saved_readings' }
```

When `tarotGate` is provided, `getHeading` returns gate-specific copy instead of the default transit-reading headings.

**9a. Daily card limit (`gate: 'daily_card'`)**

> "You've drawn today's card."

Sub-line (shown where reset time normally shows):
> "Your next card draws at midnight UTC. Advanced opens every card, every day."

This copy acknowledges the completion of the ritual ("you've drawn today's card" — not "you've hit your limit"), then frames the upgrade in terms of what it opens rather than what it removes.

**9b. Weekly three-card limit (`gate: 'weekly_three_card'`)**

> "You've drawn this week's three-card reading."

Sub-line:
> "Your next three-card spread opens [Monday date, e.g. 'Monday, June 2']. Advanced gives you unlimited spreads."

The Monday date is computed from `weeklyResetAt` and formatted as a friendly string, not an ISO timestamp. The user should feel oriented in time, not confronted with a countdown.

**9c. Celtic Cross lock (`gate: 'celtic_cross'`)**

> "Celtic Cross is a full sky reading."

Sub-line:
> "Ten cards read as a constellation. This reading lives on the Advanced tier."

This copy does not say "you can't access this." It says what Celtic Cross is and where it lives. The distinction is not semantic hair-splitting — it is the difference between a door labeled "Staff Only" (exclusion) and a door labeled "The Archive" (identity). The product earns the upgrade by making the gated feature sound worth having.

**9d. Saved readings lock (`gate: 'saved_readings')**

> "To keep this reading in your library, you'll need the full sky."

Sub-line:
> "Advanced saves every reading — with the moon phase on the day you drew, and access forever."

This copy speaks to what was just experienced (the reading they want to save) and frames Advanced in terms of the continuity it provides, not in terms of price or features.

The `UpgradeModal` body (TierSection descriptions) does not need to change for Tarot gates — the tier descriptions already describe what Advanced provides. Only the heading and sub-line are gate-specific.

### 10. Daily Counter Reset Logic

Daily card draw counters reset at **midnight UTC**, consistent with the existing `gpt_usage` reset behavior (`nextMidnightUTC()` in `gptRateLimit.ts`). This is a deliberate choice: UTC midnight means a user in UTC-5 experiences the reset at 7pm local time, which is earlier than a natural day boundary. The tradeoff is that the existing infrastructure, token format, and reset communication all use UTC midnight, and introducing local-time resets would require timezone-aware server logic that does not currently exist anywhere in the codebase. UTC midnight consistency is preferable to a per-user timezone complexity that would be invisible to most users anyway.

The `dailyResetAt` value returned by `GET /api/tarot/usage` is computed the same way `nextMidnightUTC()` is computed in `gptRateLimit.ts`:

```typescript
function nextMidnightUTC(): number {
  const d = new Date()
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1)
}
```

The UpgradeModal copy for daily limits displays this as a formatted time: "Your sky resets at [12:00 AM UTC]" — using `formatResetAt` from the existing `UpgradeModal`.

### 11. Weekly Counter Reset Logic

The weekly three-card limit resets at the start of each ISO week — **Monday, 00:00:00 UTC**.

The `weeklyResetAt` value is computed as:

```typescript
function nextMondayMidnightUTC(): string {
  const weekStart = currentWeekStartUTC() // Monday of current week
  const [y, m, d] = weekStart.split('-').map(Number)
  const nextMonday = new Date(Date.UTC(y, m - 1, d + 7))
  return nextMonday.toISOString()
}
```

The `tarot_usage` schema tracks `week_start` per row. A user who has drawn their one three-card reading this week has `weekly_three_card = 1` on the row for today with `week_start = 'current Monday'`. Next Monday, a new draw creates a new row with a new `week_start`, and the weekly count starts fresh. No explicit reset query is needed — the week boundary is self-encoded in the data.

The UpgradeModal sub-line for the weekly gate formats the reset date in human terms: "Monday, June 2" — not an ISO string, not a countdown timer.

### 12. Error Handling: What Shows When a Limit Is Hit

**Scenario A: Client-side cache is current (common case)**

The lock icon is visible before the user attempts the draw. Tapping opens the UpgradeModal. No API call is made. No error state is shown. The ritual never begins.

**Scenario B: Client-side cache is stale (draw on another device, or cache expired)**

The user initiates the draw. The shuffle animation begins. The server responds 429. The `DeckShuffleAnimation.tsx` state machine, upon receiving a 429 from the draw endpoint, transitions to an error state *before* the card is shown as selected. The animation stops. A brief transition (the same fade-through-black used between draw states, per Miyazaki's specification in the visual proposals) leads to the UpgradeModal opening.

Because the card was never revealed (the 429 fires during the draw API call, before the reveal sequence begins), the user has not experienced the ritual. The UpgradeModal is not interrupting a reading. It is interrupting a shuffle — which is an acceptable point of interruption.

The `DeckShuffleAnimation.tsx` error state must not show a broken spinner or a generic "Something went wrong" message. If the 429 response body contains `{ gate: 'daily_card' }`, the component maps this to the appropriate UpgradeModal variant. If the `gate` field is absent or unrecognized, it falls back to the daily_card variant copy.

**Scenario C: Server error (non-429, non-2xx)**

The draw endpoint returns a 500 or network failure. The `DeckShuffleAnimation.tsx` error state shows:

> "The draw could not complete. Please try again."

With a retry button. No UpgradeModal is shown. This is not a gate event — it is a transient failure and must be treated as such.

**Scenario D: GPT synthesis fails after a free-tier reading completes**

The free-tier user draws their one daily card. The instant interpretation renders. The GPT synthesis panel (`TarotSynthesisPanel.tsx`) enters the loading state. GPT fails (5xx or network error).

Per Taleb's proposal #3 (implemented in the `TarotSynthesisPanel` proposal): the panel transitions to the `unavailable` state with copy:

> "The synthesis is resting. The instant interpretation above is complete."

With a retry button. No UpgradeModal is shown. The free-tier reading was completed; the GPT layer is unavailable. These are different events. The `RateLimitError` thrown by `gptInterpretation.ts` when the `gpt_usage` limit is hit is the only error that opens the UpgradeModal from the synthesis panel. All other errors show the degraded-but-graceful state described above.

### 13. Testing the Gate in Development

In the development environment (`NODE_ENV !== 'production'`), the Tarot gate limits default to 10000 (effectively disabled). To test the gate behavior locally:

**Method 1: Environment variable override**

Set in the development `.env`:
```
TAROT_FREE_DAILY_CARD_LIMIT=1
TAROT_FREE_WEEKLY_THREE_CARD_LIMIT=1
```

Restart the server. The first draw will succeed; the second will hit the gate.

**Method 2: Direct database manipulation**

```sql
-- Simulate a free user who has already drawn today
INSERT INTO tarot_usage (user_id, date, week_start, daily_cards, weekly_three_card)
VALUES (1, date('now'), date('now', 'weekday 1', '-7 days'), 1, 0)
ON CONFLICT (user_id, date) DO UPDATE SET daily_cards = 1;
```

The next draw attempt by user 1 will return 429.

**Method 3: Tier override**

Set the test user's `subscription_tier` to `'free'` in SQLite and draw. Then set to `'advanced'` and confirm the lock disappears.

**Verifying the correct UpgradeModal variant appears:**

The `gate` field in the 429 response body must be logged to the browser console (development only) so the developer can confirm the correct variant key is being passed. Add a `console.debug('[TarotGate]', response.gate)` in the client-side error handler, gated behind `import.meta.env.DEV`.

**Verifying the weekly counter:**

The weekly counter is most easily tested by inserting `tarot_usage` rows with varying `week_start` values and confirming the weekly aggregation query returns the correct total. A unit test in `server/__tests__/tarotRateLimit.test.ts` should assert:

- Two rows with the same `week_start` and `weekly_three_card = 1` each produce a weekly total of 2.
- A row with last week's `week_start` does not count toward this week's total.
- The gate allows the first draw of a new week regardless of last week's count.

---

## Technical Dependency

This proposal depends on the rate limiter configuration fix (proposal #12, `issue-fix-rate-limiter-test-mode.md`). The `TIER_LIMITS` constants in `gptRateLimit.ts` and `auth.ts` are currently set to 10000 for all tiers with `// TEST MODE` comments but no `NODE_ENV` guard on the constants themselves. Before Tarot-specific limits are enforced in production, the existing GPT gate must also be enforced — otherwise the product ships with a subscription model that has no effective enforcement on either the existing or new features.

Sequence: proposal #12 lands first (or in the same PR as this proposal, with the `NODE_ENV` guard applied to both `TIER_LIMITS` and the new `TAROT_FREE_*` constants). This proposal's middleware is written with the same `NODE_ENV`-gated pattern from the start.

---

## Out of Scope

- **Payment processing changes.** `UpgradeModal.tsx`, `server/services/stripe.ts`, and the Stripe webhook handler are not modified by this proposal beyond the `tarotGate` prop addition to `UpgradeModal`. No new Stripe products, no new price IDs.
- **General subscription page changes.** The account/subscription management page is not touched. The subscription tier display (`safeUser` in `auth.ts`) is not changed.
- **GPT synthesis rate limiting for Tarot.** Tarot GPT synthesis calls (single-synthesis, three-synthesis, celtic-synthesis, discuss) consume from the existing `gpt_usage` counter via `gptRateLimit.ts`. This proposal does not introduce a separate GPT counter for Tarot — the existing mechanism handles it correctly at the HTTP middleware level, and the existing 429 response from `gptRateLimit.ts` already opens the UpgradeModal via the `RateLimitError` path in `gptInterpretation.ts`.
- **Trial periods or promotional access.** No free-trial-to-Advanced upgrade paths are specified here.

---

## Open Questions

**Whether free users can VIEW saved readings they previously created after downgrading.**

If a user was on Advanced, saved 20 Celtic Cross readings over a month, then downgraded to free, what happens when they open `SavedReadingsPage.tsx`?

Option A: Read-only access is preserved. The list view renders all saved readings; the full reading detail view is accessible. The "Save new reading" and "Discuss ✦" actions are locked. The framing: "These readings were saved on your Advanced sky. You can still read them here."

Option B: The list renders but reading detail is gated. Tapping a saved reading opens the UpgradeModal.

Option C: The list is hidden entirely on free tier.

Option A is strongly preferred on product grounds. Saved readings are data the user created; hiding them after a downgrade is the kind of action that triggers churned user complaints and negative reviews. The saved readings are sunk value — they already cost API calls and storage. Hiding them after the fact doesn't recover those costs; it just creates resentment.

Option A is also the easiest to implement correctly: the `SavedReadingsPage.tsx` endpoint returns all readings regardless of tier; the `requireAuth` middleware already gates unauthenticated access; the "Save new reading" button is the only element that needs a tier check.

**This open question should be resolved before the `SavedReadingsPage.tsx` (proposal #10) implementation begins.** The recommendation is Option A.

---

## Implementation Checklist

- [ ] `server/db.ts` — add `tarot_usage` table creation with `week_start` index
- [ ] `server/middleware/tarotRateLimit.ts` — three gate functions: `tarotDailyCardGate`, `tarotWeeklyThreeCardGate`, `tarotCelticCrossGate`; `NODE_ENV`-gated limit constants; `currentWeekStartUTC()` and `nextMondayMidnightUTC()` helpers
- [ ] `server/routes/gpt.ts` (or tarot route file) — apply gate middleware to Tarot draw endpoints
- [ ] `GET /api/tarot/usage` endpoint — returns `TarotUsageStatus` object for client-side soft check
- [ ] `src/context/TarotContext.tsx` — add `tarotUsageStatus: TarotUsageStatus | null` to context state; fetch on mount
- [ ] `src/components/tarot/TarotPage.tsx` — lock icon on Celtic Cross mode card when `!celticCrossEnabled`; lock icon on single-card draw when daily limit reached; lock icon on three-card option when weekly limit reached
- [ ] `src/components/tarot/DeckShuffleAnimation.tsx` — handle 429 responses during the draw phase; map `gate` field to correct UpgradeModal variant; never show UpgradeModal after card is revealed
- [ ] `src/components/subscription/UpgradeModal.tsx` — add `tarotGate?: TarotGateContext` prop; extend `getHeading` to return gate-specific headings; add gate-specific sub-line copy
- [ ] `server/__tests__/tarotRateLimit.test.ts` — unit tests: daily counter, weekly aggregation cross-row, week boundary reset, Celtic Cross tier check
- [ ] `.env.example` — document `TAROT_FREE_DAILY_CARD_LIMIT` and `TAROT_FREE_WEEKLY_THREE_CARD_LIMIT`
