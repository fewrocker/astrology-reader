# Sprint 0013 — Vision

**Theme:** Production-Readiness

---

## Sprint Focus

Make the app safe to receive real paying users by hardening the free-to-paid conversion funnel, making reading limits visible and understandable at every surface, and expanding the analytics event layer to give the team data on where users drop off and what moves them toward upgrading.

---

## Why Now

The past three sprints (0010–0012) poured enormous depth into the reading engine: server-sovereign calculations, synastry, solar return, transit timelines, house-aware briefs, aspect calendar. The product is feature-rich. What has not kept pace is the commercial layer around it.

Specifically:

- **Limits are invisible until they hit.** A free user who opens the app and reads their natal chart, then immediately tries transit, will hit the 3-reading wall mid-session with no prior warning. The `SessionBadge` in `App.tsx` shows "2 readings left today" only in a dropdown the user must click open. The home screen auth nudge (`HomeScreen.tsx`) only activates when `todayUsed >= 2`, which means the user is one reading from the wall before any signal appears.

- **The UpgradeModal has zero analytics.** The modal in `src/components/subscription/UpgradeModal.tsx` is the single most conversion-critical surface in the product, but it fires no `track()` calls — no `upgrade_modal_seen`, no `upgrade_cta_clicked`, no `upgrade_dismissed`. The `gptInterpretation.ts` service fires `gpt_limit_hit` before the modal opens, but nothing inside the modal itself tracks the user's decision.

- **The auth funnel is only partially tracked.** `signup_completed` and `login_completed` are tracked in `AuthContext.tsx`, but `auth_modal_seen`, `auth_modal_dismissed`, and the OAuth paths have no tracking. There is no event for when a free authenticated user hits their limit versus an unauthenticated user — the `gpt_limit_hit` event carries `authenticated` as a property, but there is no `upgrade_modal_seen` to correlate it against.

- **The SEO/landing surface is under-optimized.** `index.html` uses a generic `<title>Astral Chart — Birth Chart Reading</title>`, a placeholder `vite.svg` favicon, and no Open Graph / Twitter Card meta tags. No `<meta name="description">`. No canonical URL. For a product preparing to receive organic users, this is a gap.

- **There is no read-only analytics query interface.** All analytics events land in the `events` SQLite table (confirmed in `server/db.ts`). The server's `server/routes/analytics.ts` only accepts `POST /event` writes — there is no `GET /admin/funnel` or equivalent query endpoint. The team cannot currently inspect conversion data without raw DB access.

- **The `todayUsed` counter is session-loaded only.** In `AuthContext.tsx`, `fetchUsage()` runs once at login and once at session restore. If a user makes 2 readings in a tab and opens a second tab, the second tab's `todayUsed` is stale. The limit is enforced server-side correctly, but the UI counter in `SessionBadge` and `HomeScreen` can show wrong remaining counts.

---

## Where to Look

**Conversion funnel surfaces — front-end:**
- `src/components/subscription/UpgradeModal.tsx` — add `track()` calls for `upgrade_modal_seen`, `upgrade_cta_clicked`, `upgrade_dismissed`, `upgrade_checkout_started`
- `src/components/auth/AuthModal.tsx` — add `track('auth_modal_seen')` on open, `track('auth_modal_dismissed')` on close without action, `track('auth_tab_switched')` when user flips login/register
- `src/components/home/HomeScreen.tsx` — the auth nudge already tracks `auth_nudge_seen` / `auth_nudge_clicked`, but the limit-aware copy logic (`todayUsed === 2`, `todayUsed >= 3`) should be pulled earlier: show "1 reading left" when `todayUsed === 2` visually inline under the CTA, not just in the small nudge button above it
- `src/App.tsx` `SessionBadge` component — the remaining-reads label is only visible inside a dropdown click; it should be persistent (always visible, not requiring a click) for free-tier users near or at their limit

**Limit clarity:**
- `src/App.tsx` `SessionBadge` — currently shows `${remaining} reading${...} left today` only inside the dropdown. Make `≤1 reading left` show inline in the header bar itself, adjacent to the sign-in/star icon, so a user sees it without interaction.
- `src/components/subscription/UpgradeModal.tsx` — the tier feature lists in `TierSection` are vague ("Twenty readings a day. Enough to explore..."). Add concrete bullet points: which features are unlocked per tier, e.g., whether Synastry or Solar Return require a paid tier (currently they don't, but the copy should be accurate to reality).

**Analytics server layer:**
- `server/routes/analytics.ts` — add a `GET /api/analytics/funnel` endpoint (auth-gated, requires `ANALYTICS_ADMIN_SECRET` header) that returns aggregated counts for the key conversion events: `page_view`, `form_started`, `form_completed`, `gpt_limit_hit`, `upgrade_modal_seen` (once tracked), `upgrade_cta_clicked`, `signup_completed`
- `server/db.ts` — verify the `events` table has indices sufficient for the funnel query (index on `event` + `created_at` already exists at `idx_events_created_at` and `idx_events_user_event`; the funnel query by event name + date range will use these)

**SEO/landing:**
- `index.html` — add `<meta name="description">`, Open Graph tags (`og:title`, `og:description`, `og:image`), Twitter Card meta, canonical URL, and replace the placeholder `vite.svg` favicon reference with an actual favicon asset (or at minimum a data-URI star glyph SVG)

**UsageSync:**
- `src/context/AuthContext.tsx` — after every successful GPT call (trackable via the `gpt_request_made` event that already fires in `gptInterpretation.ts`), increment `todayUsed` locally so the `SessionBadge` and `HomeScreen` nudge stay accurate without a server round-trip. Currently `todayUsed` is never updated after session load.

---

## Quality Bar

"Deep, not shallow" for this sprint means:

1. **Every conversion-critical action has a `track()` call with enough context to reconstruct the funnel.** The upgrade modal must emit at minimum: seen, CTA clicked (with which tier), dismissed (with which tier was shown). The auth modal must emit: seen (with `initialTab`), completed (already done), dismissed. These are not nice-to-haves — without them, the team cannot tell if the UpgradeModal is being dismissed 80% of the time or 20%.

2. **A first-time free user should always know how many readings they have left, without clicking anything.** The information must be in permanent view (header bar), not buried in a dropdown or a small nudge button that only appears at `todayUsed >= 2`.

3. **The funnel analytics endpoint must return real aggregated data.** It is not enough to add `track()` calls if there is no way to read them. A single read-only admin endpoint with date-range filtering is the minimum bar for "the team can now measure conversion."

4. **The `todayUsed` counter in the UI must match the server's count after every reading.** Stale UI counts undermine trust. The fix is a local increment (not a full refetch) so it's instant and always correct within a session.

5. **`index.html` meta tags must be complete enough that a link paste into iMessage, Slack, or Twitter produces a proper preview card.** This is the minimum bar for organic sharing.

---

## What This Sprint Is NOT

- **Not more reading features.** No new chart types, no new GPT prompts, no new timeline events, no new aspect tables. Sprint 0010–0012 added enormous depth. This sprint is about harvesting that investment through better conversion.

- **Not a full marketing site or landing page redesign.** The `index.html` SEO work is about meta tags only — not rebuilding the home screen layout, not adding a hero section, not A/B testing copy.

- **Not a Stripe subscription management UI.** No "manage subscription" page, no cancellation flow, no invoice history. The Stripe customer portal URL can be added as a low-friction link if it falls out naturally, but building a full billing management surface is out of scope.

- **Not backend infrastructure hardening.** The server is already production-capable (helmet, compression, morgan, WAL mode, rate limiting, Stripe webhook with signature verification). This sprint does not touch deployment, environment management, SSL, or monitoring.

- **Not a real-time analytics dashboard.** The funnel endpoint returns aggregated counts in JSON — it is a developer/operator tool, not a polished admin UI. Building charts or a dashboard UI is out of scope.
