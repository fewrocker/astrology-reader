# feat-funnel-analytics

**Type:** Feature
**Originated by:** Jobs, Carmack, Taleb

---

## User Guidance

> "I would also like to install on the app user tracking metrics for funnel tracking, meaning how many users get in, track them via cookies to see their interactions, how much they are using and how close they are to subscribing."

---

## Problem / Opportunity

The app today is analytics-blind. Once a user arrives, every decision they make — entering birth data, requesting a reading, hitting their GPT limit, opening or closing the auth modal, clicking upgrade — happens invisibly. There is no way to know whether the home screen nudge converts, which reading type most frequently triggers the limit, what percentage of users who see the UpgradeModal start a Stripe checkout, or what the day-7 return rate looks like.

This matters most precisely at the moment sprint-0009 ships monetization. Without funnel data, pricing is a guess, upgrade modal copy is a guess, and the placement of auth prompts is a guess. The owner cannot know whether the UpgradeModal heading is working or whether 90% of users dismiss it in under two seconds. They cannot tell whether users who hit the limit on transit readings convert at a different rate than users who hit it on synastry. They cannot measure checkout completion. They are flying without instruments.

The critical conversion path — first visit → GPT limit hit → upgrade modal → Stripe checkout → paid tier — crosses two authentication state changes (anonymous → registered, registered → paid) and requires session continuity across all of them. Without a server-side session cookie that survives the authentication boundary, a user who converts from anonymous to paid will appear in the data as two unrelated visitors. The funnel will be unreadable.

There is no current mechanism in the codebase for any of this. `src/services/` has no analytics service. `server/routes/` has no analytics endpoint. `server/db.ts` defines no `events` table. The events table, if added without indexes defined at creation time, will degrade at scale: funnel queries joining on `session_id` across millions of rows without an index on `(session_id, event)` will full-scan and block SQLite's file lock.

---

## Vision

The analytics system enables the owner to see the full funnel from first visit to payment, identify where users drop off, and understand which features drive conversion.

After this feature ships, the owner can open the SQLite database and answer questions like:

- Of all sessions that recorded a `gpt_limit_hit` event, what fraction also recorded `checkout_started` within the same session? That is the raw upgrade conversion rate.
- Which reading type appears most frequently in `gpt_limit_hit` properties? If 60% of limit hits occur during daily transit readings, the UpgradeModal copy should emphasize transit value.
- Of all sessions that recorded `auth_nudge_seen`, what fraction also recorded `auth_nudge_clicked`? That is the nudge click-through rate. If it is below 5%, the nudge copy needs work.
- What percentage of users who completed `form_completed` came back for a second session (a new `page_view` event with the same `session_id` on a different day)? That is the day-1 retention signal.
- How many sessions progressed through `form_completed` → `reading_viewed` → `gpt_request_made` → `gpt_limit_hit` → `upgrade_modal_shown` → `checkout_started` in a single session? That full-funnel count is the conversion health number.

The `session_id` cookie, set server-side before any user action and persisting for one year, is the thread that connects all of these events. A user who arrives anonymously, hits their limit, registers, and then pays — all in one browser session — has all those events linked under a single `session_id`. The conversion is attributable.

---

## Specifications

### 1. Session Cookie Middleware

**Location:** `server/index.ts`, registered as the first middleware before all route handlers.

**Behavior:**
- On every request to any `/api/*` path, inspect the incoming cookies for a cookie named `session_id`.
- If the cookie is absent or empty, generate a new UUID using `crypto.randomUUID()` (available in Node 14.17+, no import needed beyond `crypto`).
- Set the cookie on the response with the following attributes:

```
Set-Cookie: session_id=<uuid>; Max-Age=31536000; Path=/; SameSite=Lax; HttpOnly[; Secure]
```

- `Max-Age=31536000` — one year in seconds. The session persists across browser closes and cache clears.
- `SameSite=Lax` — required, not `Strict`. OAuth redirects from Google/Facebook are cross-origin top-level navigations (`GET` requests). `SameSite=Strict` would drop the cookie on those navigations, severing the session link at the most important conversion moment (OAuth sign-up after hitting the limit). `Lax` allows cookies to be sent on top-level cross-origin `GET` navigations.
- `HttpOnly` — the client does not need to read the `session_id` value. The `analytics.ts` client service does not include the session ID in the POST body; the server reads it from the cookie. HttpOnly prevents JavaScript access, eliminating XSS-based session ID theft.
- `Secure` — set only when `process.env.NODE_ENV === 'production'`. In dev, Vite proxies `/api/*` requests to the Express server on port 3002, and the cookie domain is `localhost` in both cases. The Vite proxy forwards the cookie correctly. `Secure` on `localhost` would cause the browser to reject the cookie in dev, so it must be gated.

**Cookie parsing:** the server must parse incoming cookies before this middleware runs. Use the `cookie-parser` package (`app.use(cookieParser())`), mounted before the session middleware.

**Middleware registration order in `server/index.ts`:**
```
1. app.post('/api/stripe/webhook', express.raw(...), stripeWebhookHandler)  // must be before express.json()
2. app.use(express.json({ limit: '50kb' }))
3. app.use(cookieParser())
4. app.use(sessionMiddleware)   // sets session_id cookie on all /api/* requests
5. app.use('/api/auth', authRouter)
6. app.use('/api/profile', profileRouter)
7. app.use('/api/entries', entriesRouter)
8. app.use('/api/gpt', gptRouter)
9. app.use('/api/analytics', analyticsRouter)
```

The session middleware should inspect `req.path` and only act when the path starts with `/api`. It should not set a cookie on static file requests or SPA fallback requests, both of which bypass the middleware chain already through their own handlers.

### 2. Events Table Schema

**Location:** `server/db.ts`, added to the `instance.exec()` block alongside the existing `CREATE TABLE IF NOT EXISTS` statements.

**Exact SQL:**

```sql
CREATE TABLE IF NOT EXISTS events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT    NOT NULL,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  event      TEXT    NOT NULL,
  properties TEXT,
  created_at TEXT    DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_events_session_event
  ON events(session_id, event);

CREATE INDEX IF NOT EXISTS idx_events_user_event
  ON events(user_id, event, created_at);

CREATE INDEX IF NOT EXISTS idx_events_created_at
  ON events(created_at);
```

**Column notes:**
- `session_id TEXT NOT NULL` — the UUID from the server-set cookie. Never null; every event is attributed to a session.
- `user_id INTEGER REFERENCES users(id) ON DELETE SET NULL` — nullable. Anonymous events have `NULL`. When a user registers or logs in, subsequent events carry their `user_id`. The `ON DELETE SET NULL` ensures that deleting a user (GDPR, etc.) does not delete their historical events — it anonymizes them.
- `event TEXT NOT NULL` — the event name string (see Section 5 for the full event taxonomy).
- `properties TEXT` — JSON-serialized properties object, or `NULL` for events with no properties. Stored as text because SQLite's JSON functions are available for querying when needed, and the schema stays simple.
- `created_at TEXT DEFAULT (datetime('now'))` — ISO 8601 datetime string in UTC, consistent with the existing `users` and `entries` tables.

**Index rationale (from Taleb's proposal 6, must be defined at creation time):**
- `idx_events_session_event ON events(session_id, event)` — funnel queries join events by session. "Give me all sessions that have both a `gpt_limit_hit` and a `checkout_started`" requires scanning by `session_id`. Including `event` in the index allows covering the most common query shape: `WHERE session_id = ? AND event = ?`.
- `idx_events_user_event ON events(user_id, event, created_at)` — queries scoped to a known user: "how many `reading_viewed` events has user 42 fired this week?" The composite key on `(user_id, event, created_at)` covers that query without a full-table scan.
- `idx_events_created_at ON events(created_at)` — time-range queries: "how many `checkout_started` events occurred this week?" This index enables the most common aggregate: events in a time window regardless of session or user.

Adding indexes after the table has millions of rows requires SQLite to rebuild the entire table in a new file and swap. On a live production database, this is a blocking operation. The indexes must exist from the first insert.

### 3. 90-Day Purge Mechanism

**Location:** `server/index.ts`, after `getDb()` is called at startup.

**Implementation:** a `setInterval` that fires once per day and deletes events older than 90 days.

```typescript
// Purge events older than 90 days — runs daily at server startup
setInterval(() => {
  try {
    const db = getDb()
    const result = db
      .prepare("DELETE FROM events WHERE created_at < datetime('now', '-90 days')")
      .run()
    if (result.changes > 0) {
      console.log(`[analytics] purged ${result.changes} events older than 90 days`)
    }
  } catch (err) {
    console.error('[analytics] purge failed:', err)
  }
}, 24 * 60 * 60 * 1000) // 24 hours
```

The purge runs once on the 24-hour mark after server start, not at a fixed wall-clock time. This is intentional: a fixed wall-clock purge (e.g., midnight UTC) would require a scheduler that is more complex to implement and test. The drift is acceptable for a data retention policy.

The purge catches its own errors and logs them without crashing the server. SQLite DELETE on an indexed `created_at` column runs in O(matching rows) not O(total rows).

### 4. Analytics Endpoint

**Location:** `server/routes/analytics.ts` (new file).

**Route:** `POST /api/analytics/event`

**Request body:** `{ event: string; properties?: Record<string, unknown> }`

**Authentication:** not required. This endpoint accepts events from both anonymous and authenticated sessions. If a valid JWT is present in the `Authorization` header, the endpoint resolves the `user_id` and includes it. Otherwise `user_id` is `NULL`.

**Session ID source:** read exclusively from `req.cookies.session_id`. The session middleware (Section 1) guarantees this cookie exists before the request reaches the analytics handler, because the session middleware runs first and sets the cookie if absent. The session ID is never read from the request body — the server controls session attribution.

**Input validation:**
- `event` must be a non-empty string, maximum 64 characters.
- `properties`, if present, must be a plain object. Serialize it to JSON before storing.
- If validation fails, return `400 { error: 'invalid_event' }`.
- Unknown event names are accepted. The server does not maintain a whitelist; client code is the source of truth for event names.

**Write behavior:** synchronous `better-sqlite3` insert (already the pattern throughout the codebase).

**Response:** `200 { ok: true }`. Analytics writes must never block the client. If the insert fails (disk full, DB locked), log the error and return `200` anyway. Losing analytics events is acceptable; breaking the client experience over an analytics failure is not.

**User ID resolution:** the endpoint optionally reads the JWT from the `Authorization: Bearer <token>` header, verifies it with the same `requireAuth` logic used in other routes, and extracts `userId`. This does not throw a 401 — it is best-effort. If the token is absent or invalid, `user_id` remains `NULL`.

**Full handler sketch:**

```typescript
router.post('/event', (req: Request, res: Response): void => {
  const sessionId = req.cookies?.session_id as string | undefined
  if (!sessionId) {
    // Should not happen if session middleware is correctly ordered, but guard anyway
    res.status(200).json({ ok: true })
    return
  }

  const { event, properties } = req.body as { event?: unknown; properties?: unknown }

  if (typeof event !== 'string' || !event || event.length > 64) {
    res.status(400).json({ error: 'invalid_event' })
    return
  }

  const propsJson = (properties && typeof properties === 'object' && !Array.isArray(properties))
    ? JSON.stringify(properties)
    : null

  // Best-effort user ID resolution
  let userId: number | null = null
  try {
    const authHeader = req.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number }
      userId = payload.userId
    }
  } catch { /* not authenticated — userId stays null */ }

  try {
    const db = getDb()
    db.prepare(
      'INSERT INTO events (session_id, user_id, event, properties) VALUES (?, ?, ?, ?)'
    ).run(sessionId, userId, event, propsJson)
  } catch (err) {
    console.error('[analytics] insert failed:', err)
    // Do not propagate to client
  }

  res.json({ ok: true })
})
```

### 5. Client Analytics Service

**Location:** `src/services/analytics.ts` (new file).

**Design:** a thin fire-and-forget wrapper over `fetch('/api/analytics/event')`. The client never handles or observes analytics errors. The service does not manage or transmit the `session_id` — that is the server's responsibility.

**Interface:**

```typescript
export function track(event: string, properties?: Record<string, unknown>): void
```

`track` returns `void`, not a Promise. Callers do not await it. Internally it calls `fetch` and swallows any network errors.

**JWT forwarding:** the service reads the JWT from `localStorage` (same key used by `authService.ts`: `'astral-chart-jwt'`) and includes it in the `Authorization` header if present. This is what allows the server to resolve `user_id` for authenticated events.

**Implementation:**

```typescript
const JWT_KEY = 'astral-chart-jwt'
const ENDPOINT = '/api/analytics/event'

export function track(event: string, properties?: Record<string, unknown>): void {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  try {
    const token = localStorage.getItem(JWT_KEY)
    if (token) headers['Authorization'] = `Bearer ${token}`
  } catch { /* localStorage unavailable */ }

  fetch(ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({ event, properties }),
  }).catch(() => { /* analytics failures are silent */ })
}
```

**No deduplication on the client.** React's `useEffect` in StrictMode (development) double-fires effects. This will produce duplicate `page_view` events in dev. This is acceptable: queries should use `COUNT(DISTINCT session_id)` rather than `COUNT(*)` for funnel analysis. Server-side deduplication adds complexity with no meaningful benefit — the data is still queryable correctly without it.

### 6. Event Taxonomy and Properties

Each event below specifies its name, the component where it fires, the trigger condition, and the exact shape of its `properties` object. Events with no properties omit the `properties` key from the POST body.

---

#### `page_view`
**Fires in:** `src/App.tsx`, inside `AppContent` component.
**Trigger:** once on component mount, via `useEffect([], [])`.
**Properties:**
```typescript
{
  view: string  // the initial AppState view: 'form' | 'results' | etc.
}
```
**Purpose:** counts total sessions and entry points. The `view` property distinguishes users who arrive fresh (view: 'form') from returning users with cached birth data (view: 'form' with a home screen visible — `showCachedLanding === true` is a separate property to add).

A more precise version:
```typescript
{
  view: string,           // initial AppState view
  has_cached_data: boolean  // whether LocalStorage had prior birth data
}
```

---

#### `form_started`
**Fires in:** `src/components/form/FormWizard.tsx`.
**Trigger:** when the user first interacts with the birth data form (first field change or first step reached).
**Properties:** none.
**Purpose:** distinguishes users who engaged with data entry from those who bounced from the landing form without touching anything.

---

#### `form_completed`
**Fires in:** `src/App.tsx`, inside the `useEffect` that handles the `'loading'` view state — specifically when `dispatch({ type: 'SET_RESULTS', ... })` completes successfully.
**Trigger:** after the chart calculation succeeds and the app transitions to `'results'`.
**Properties:**
```typescript
{
  has_birth_time: boolean  // whether the user provided a birth time (unknownTime === false)
}
```
**Purpose:** measures the form completion rate. `has_birth_time` reveals whether users are engaging deeply (providing exact birth time) or using the approximate path.

---

#### `reading_viewed`
**Fires in:** each result page component, on mount.
**Trigger:** `useEffect([], [])` in the page component.
**Fires from (one call per component):**
- `src/components/results/ResultsPage.tsx` → `reading_type: 'natal'`
- `src/components/results/TransitReadingPage.tsx` → `reading_type: 'transit'`, with additional `period` property
- `src/components/results/SynastryPage.tsx` → `reading_type: 'synastry'`
- `src/components/results/SynastryTransitPage.tsx` → `reading_type: 'synastry_transit'`
- `src/components/results/SolarReturnPage.tsx` → `reading_type: 'solar_return'`
- `src/components/results/NumerologyPage.tsx` → `reading_type: 'numerology'`
- `src/components/reading/TodayPage.tsx` → `reading_type: 'today'`
- `src/components/journal/CosmicJournalPage.tsx` → `reading_type: 'journal'`

**Properties:**
```typescript
{
  reading_type: 'natal' | 'transit' | 'synastry' | 'synastry_transit' | 'solar_return' | 'numerology' | 'today' | 'journal',
  period?: 'daily' | 'weekly' | 'monthly'  // present only for transit and synastry_transit
}
```
**Purpose:** reveals which reading types are most popular and which users explore most. Cross-referencing with `gpt_limit_hit` properties reveals which reading type most frequently triggers the conversion moment.

---

#### `gpt_request_made`
**Fires in:** `src/services/gptInterpretation.ts`, inside `callProxy`, after a successful response (alongside the existing `_sessionCalls++` increment on line 65).
**Trigger:** every successful GPT response (non-error, non-429).
**Properties:**
```typescript
{
  gpt_type: string  // the `type` string passed to callProxy: 'transit-interpretation' | 'dream-interpretation' | 'daily-snapshot' | 'numerology-narrative' | etc.
}
```
**Purpose:** tracks total GPT consumption. With `user_id` populated on authenticated calls, this can be aggregated per user per day to cross-check against the rate limiter. `gpt_type` reveals which AI features are most used.

---

#### `gpt_limit_hit`
**Fires in:** `src/services/gptInterpretation.ts`, inside `callProxy`, when the server returns 429.
**Trigger:** the `response.status === 429` branch (lines 51-57 of the current `gptInterpretation.ts`).
**Properties:**
```typescript
{
  authenticated: boolean,  // whether the user had a JWT when the limit was hit
  gpt_type: string         // the `type` that was attempted (same values as gpt_request_made)
}
```
**Purpose:** the most important single event in the funnel. Knowing `gpt_type` at the limit hit tells the owner which reading type most often pushes users to the conversion moment. `authenticated` distinguishes anonymous limit hits (→ should trigger auth modal) from authenticated limit hits (→ should trigger upgrade modal).

The `gpt_type` value here is effectively the same as `gpt_limit_hit_position` (from the draft stub). The property name `gpt_type` is more consistent with `gpt_request_made` and carries identical information.

---

#### `upgrade_modal_shown`
**Fires in:** `src/components/subscription/UpgradeModal.tsx`.
**Trigger:** `useEffect` on the `isOpen` prop changing to `true`.
**Properties:**
```typescript
{
  trigger: 'gpt_limit_hit' | 'feature_gate',  // why the modal appeared
  current_tier: 'free' | 'basic' | 'advanced', // from AuthContext
  authenticated: boolean
}
```
**Purpose:** counts upgrade modal impressions. Combined with `checkout_started` over the same session, produces the modal-to-checkout conversion rate.

---

#### `upgrade_modal_dismissed`
**Fires in:** `src/components/subscription/UpgradeModal.tsx`.
**Trigger:** when the modal closes without a checkout being started — specifically when the close button is clicked, the backdrop is clicked, or Escape is pressed, and no `checkout_started` event was fired during this modal's open period.
**Properties:**
```typescript
{
  dwell_ms: number,         // milliseconds the modal was open before dismissal
  tier_hovered: string | null  // last tier the user hovered before closing, or null if none
}
```
**Purpose:** `dwell_ms` distinguishes an immediate dismiss (copy failed) from a considered dismiss (user read the tiers, chose not to upgrade). `tier_hovered` reveals which offer received attention.

---

#### `upgrade_modal_tier_hovered`
**Fires in:** `src/components/subscription/UpgradeModal.tsx`.
**Trigger:** `onMouseEnter` (or `onFocus` for keyboard navigation) on each tier card within the modal. Debounce to fire only once per tier per modal open (if the user hovers the same tier multiple times, fire once).
**Properties:**
```typescript
{
  tier: 'basic' | 'advanced'  // 'free' tier is current state, not a CTA, so no hover event
}
```
**Purpose:** tells the owner which tier card the user read. If most users hover basic then dismiss, the basic offer is being evaluated but failing. If users do not hover any tier, the modal is being dismissed without reading.

---

#### `checkout_started`
**Fires in:** `src/components/subscription/UpgradeModal.tsx`.
**Trigger:** immediately before the fetch to `POST /api/stripe/create-checkout-session`, before the redirect. Fire synchronously before the async call to ensure it is captured even if the redirect happens before the analytics POST completes.
**Properties:**
```typescript
{
  tier: 'basic' | 'advanced'  // which tier the user clicked
}
```
**Purpose:** measures the upgrade intent signal. Checkout completion rate = Stripe successful payments / `checkout_started` count. A low completion rate with a high `checkout_started` count points to Stripe friction, not modal copy friction.

---

#### `signup_completed`
**Fires in:** `src/context/AuthContext.tsx` or `src/services/authService.ts`.
**Trigger:** after a successful registration (email/password POST to `/api/auth/register` returns 201, or OAuth callback sets the JWT for the first time on a new account).
**Properties:**
```typescript
{
  method: 'email' | 'google' | 'facebook'
}
```
**Purpose:** tracks registration volume and method distribution. The `method` property reveals which OAuth providers are driving growth vs. email.

---

#### `login_completed`
**Fires in:** `src/context/AuthContext.tsx` or `src/services/authService.ts`.
**Trigger:** after a successful login (email/password or OAuth) for an existing account.
**Properties:**
```typescript
{
  method: 'email' | 'google' | 'facebook'
}
```
**Purpose:** tracks returning user engagement. A high `login_completed` count relative to `page_view` indicates a returning user base.

---

#### `auth_nudge_seen`
**Fires in:** `src/components/home/HomeScreen.tsx`.
**Trigger:** when the "Save your readings ✦" button (the unauthenticated nudge, lines 108-117 of `HomeScreen.tsx`) becomes visible in the viewport. Implemented using an `IntersectionObserver` on the nudge button element's ref. Fire once per page load, not repeatedly on scroll.
**Properties:**
```typescript
{
  nudge_copy: string  // the exact text content of the nudge at the time it was seen, to track A/B copy changes later
}
```
**Purpose:** the denominator for computing nudge click-through rate. `auth_nudge_clicked / auth_nudge_seen` is the metric that tells the owner whether the nudge is performing.

---

#### `auth_nudge_clicked`
**Fires in:** `src/components/home/HomeScreen.tsx`.
**Trigger:** the `onClick` handler of the unauthenticated nudge button, before `onOpenAuth()` is called.
**Properties:**
```typescript
{
  nudge_copy: string  // same value as auth_nudge_seen, for correlation
}
```
**Purpose:** the numerator for nudge click-through rate. If `auth_nudge_seen` is high but `auth_nudge_clicked` is low, the nudge copy is failing.

---

### 7. Component Integration Points Summary

| Event | File | Integration point |
|---|---|---|
| `page_view` | `src/App.tsx` | `useEffect([], [])` in `AppContent` |
| `form_started` | `src/components/form/FormWizard.tsx` | First field interaction handler |
| `form_completed` | `src/App.tsx` | After `dispatch({ type: 'SET_RESULTS' })` in the `loading` view effect |
| `reading_viewed` | Each result page component | `useEffect([], [])` on mount |
| `gpt_request_made` | `src/services/gptInterpretation.ts` | After `_sessionCalls++` on success |
| `gpt_limit_hit` | `src/services/gptInterpretation.ts` | Inside the `response.status === 429` branch |
| `upgrade_modal_shown` | `src/components/subscription/UpgradeModal.tsx` | `useEffect` on `isOpen` becoming true |
| `upgrade_modal_dismissed` | `src/components/subscription/UpgradeModal.tsx` | Close handler when no `checkout_started` was fired |
| `upgrade_modal_tier_hovered` | `src/components/subscription/UpgradeModal.tsx` | `onMouseEnter` on tier card, debounced |
| `checkout_started` | `src/components/subscription/UpgradeModal.tsx` | Before the Stripe checkout fetch |
| `signup_completed` | `src/context/AuthContext.tsx` | After successful register response |
| `login_completed` | `src/context/AuthContext.tsx` | After successful login response |
| `auth_nudge_seen` | `src/components/home/HomeScreen.tsx` | IntersectionObserver on nudge button ref |
| `auth_nudge_clicked` | `src/components/home/HomeScreen.tsx` | `onClick` of nudge button, before `onOpenAuth()` |

### 8. Dev Environment Notes

In development, Vite runs on port 5173 and the Express server on port 3002. The Vite dev server proxies `/api/*` requests to `http://localhost:3002` (configured in `vite.config.ts`). Cookies set by the Express server on `localhost:3002` are forwarded correctly through the Vite proxy because both origins are `localhost`. The `Secure` flag is omitted in dev (gated on `NODE_ENV === 'production'`), so the browser accepts the cookie over HTTP. This is not a problem to solve — it is already handled by the `SameSite=Lax` cookie design and the `NODE_ENV` guard.

React StrictMode in development double-invokes `useEffect`, which will fire `page_view` twice per page load in dev. This is a known behavior of StrictMode and does not require mitigation. Production builds do not exhibit this behavior. Analytics queries should always operate on session-level aggregates (`COUNT(DISTINCT session_id)`) rather than raw event counts, which makes the double-fire irrelevant to the analytics output.

---

## Out of Scope

- **No external analytics service.** No Mixpanel, Amplitude, Google Analytics, PostHog, or equivalent. The SQLite `events` table is the v1 analytics backend. The owner reads it directly with SQL queries. An external service introduces GDPR/cookie-consent complexity, a third-party dependency, and cost. The raw SQLite approach is sufficient to answer the funnel questions that matter in the first 90 days.

- **No admin dashboard.** No custom UI for browsing events, drawing funnel charts, or exporting data. The owner uses a SQLite client (DB Browser for SQLite, Datasette, or `sqlite3` CLI) to run queries directly against the database file. A dashboard is a separate feature for after the first conversion data exists and the owner knows what questions they need answered most frequently.

- **No A/B testing infrastructure.** All events fire the same way for all users. No variant assignment, no experiment IDs, no holdout groups. The first month of data is a single-variant baseline. Experimentation comes after the baseline is understood.

- **No real-time event streaming.** Events are written to SQLite synchronously. There is no WebSocket feed, no pub/sub system, no streaming dashboard. SQLite is a batch-query store, not a streaming store.

- **No cookie consent UI.** This feature sets a first-party `HttpOnly; SameSite=Lax` session cookie for analytics purposes. The cookie is functional (it enables server-side session attribution, which is part of the service experience) and does not track users across third-party domains. Whether this requires a GDPR consent banner depends on legal jurisdiction and interpretation. The cookie design was chosen to minimize consent complexity. The legal determination is out of scope for this proposal.

---

## Open Questions

1. **Should `reading_viewed` fire for reading types that have no GPT component (e.g., `natal` chart, `numerology` before the GPT narrative loads)?** The natal chart renders synchronously without GPT. Firing `reading_viewed` on mount is still useful for understanding which reading types users navigate to, but it does not indicate GPT engagement. Should a separate `gpt_started` or `interpretation_loaded` event capture when the GPT content actually renders?

2. **Should `gpt_limit_hit` suppress `gpt_request_made` for the same call?** Currently the spec fires `gpt_request_made` only on success and `gpt_limit_hit` only on 429, so they are mutually exclusive. Confirm this is the intended behavior and not an unintentional gap (e.g., should there be a `gpt_request_attempted` event that fires on every call, succeeded or not?).

3. **What is the right `dwell_ms` threshold in `upgrade_modal_dismissed` to distinguish "skimmed the modal" from "read it carefully"?** The property is included, but the threshold for interpreting it is undefined. Is 5 seconds a considered read? 15 seconds? This is a product question, not a technical one.

4. **Should `auth_nudge_seen` fire on the `HomeScreen` only, or also when the `SessionBadge` "Sign in" button becomes visible in the header?** The header `SessionBadge` (in `src/App.tsx` lines 44-70) is also an auth entry point for unauthenticated users, but it is always visible. Treating an always-visible element as "seen" via `IntersectionObserver` is trivially true. Clarify which nudge surfaces the `auth_nudge_seen` event covers.

5. **How should session continuity work across the OAuth redirect flow?** When a user clicks "Continue with Google," they leave the React app entirely (top-level browser redirect), complete the OAuth flow on Google's domain, and return via a redirect to the app's callback URL. The session cookie is set before the redirect and should survive it (because `SameSite=Lax` allows the cookie to be sent on top-level GET navigations). The JWT handoff via `?token=` query param is specified in the OAuth proposal. Verify that the session cookie roundtrip through the OAuth redirect has been manually tested in both Chrome and Safari, as Safari's ITP may treat the cookie differently depending on the domain classification.
