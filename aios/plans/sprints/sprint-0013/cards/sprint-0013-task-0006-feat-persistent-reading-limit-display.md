---
**Type:** Feature
**Originated by:** All four voices
**Sprint:** 0013

## Problem / Opportunity

Free users can exhaust their three daily readings with zero proactive signal from the product. The UX currently does two things wrong: it hides the remaining-reads count behind an interaction, and it stays silent during the sessions where users are most engaged.

**The hidden counter (`SessionBadge` — `src/App.tsx`, lines 78–119)**

`readingsLabel` is computed at line 81 as `"${remaining} reading${remaining !== 1 ? 's' : ''} left today"`. It is rendered only inside the click-to-open dropdown — behind `{open && (...)}` at line 95. The `✦` glyph button that controls the dropdown gives no visible hint that a count exists inside. A user who does not know to click the glyph will never see the counter until the server returns HTTP 429 and the `UpgradeModal` fires.

**The silent `HomeScreen` (`src/components/home/HomeScreen.tsx`, lines 122–205)**

`renderAuthNudge()` returns `<div className="mb-6" />` for any free authenticated user where `todayUsed <= 1` (lines 129–131). This means a user who has used 0 or 1 readings — and is therefore still inside the session where a warning would have the most value — sees nothing. The nudge only activates at `todayUsed === 2` (one reading left) and `todayUsed >= 3` (at limit). By the time the nudge appears, the user has already consumed two-thirds of their allowance.

**The compounding staleness bug (`src/context/AuthContext.tsx`, line 91)**

`todayUsed` is initialized at `useState(0)` and updated only by `fetchUsage()`, which runs solely at login and session restore (lines 160, 208). It is never incremented after a successful GPT call during the session. As a result, the nudge thresholds in `HomeScreen.tsx` and the remaining count in `SessionBadge` are both derived from a counter that is frozen at its session-start value. In practice, `todayUsed` never crosses the `=== 2` threshold during a session — meaning the nudge never fires proactively, even if the user has done 2 readings in that session. (The staleness fix is tracked in `issue-todayused-counter-staleness.md` and is a prerequisite for this feature to function.)

**The `HomeScreen` nudge copy is functional, not felt**

When the nudge does render (for unauthenticated users at `todayUsed === 2`: `"1 reading left today ✦ Sign in to save more"`, for authenticated free users at `todayUsed === 2`: `"1 reading left today ✦ Upgrade for more"`), the copy is accurate but does not speak to what the user has done. It reports a count; it does not acknowledge the person. The voices unanimously identified this as a missed opportunity to create connection at the precise moment users are weighing engagement against cost.

**The `UpgradeModal` tier descriptions are vague at the moment of decision**

`UpgradeModal.tsx` presents three `TierSection` cards when users hit their limit. The Basic description currently reads: "Twenty readings a day. Enough to explore every corner of your chart across a full day's reflection." This describes a quantity, not an experience, and does not clarify whether features like Synastry or Solar Return require a paid tier (they do not — all features are available on all tiers, only reading count differs). A user standing at this modal, deciding if $9/month is worth it, cannot tell whether upgrading unlocks new capabilities or merely more uses of what they already have access to. This ambiguity produces hesitation and dismissal.

---

## Vision

**State: 0 readings used (free authenticated, session start)**

The user returns to the home screen. Their identity line shows their placements. Below it, instead of a silent spacer, a small ambient line reads: "3 readings in your sky today." The product has acknowledged them. There is no urgency, no CTA — just honesty about what is available. The `SessionBadge` glyph in the header is just the `✦` — no inline text — because there is no pressure yet.

**State: 1 reading used (free authenticated, mid-session)**

The user has run their natal chart. They are back on the home screen, deciding whether to run a transit or try synastry. The home screen shows: "You've looked at your chart once today. 2 readings remain." The `SessionBadge` glyph is still just `✦` — the user has runway, and the product trusts them with it. The nudge does not push; it informs.

**State: 2 readings used (free authenticated, one left)**

The user has done two readings this session. They are engaged. The home screen nudge shows: "You've come back twice today. One more reading awaits. ✦" This copy acknowledges the behavior — not just the count. Adjacent to the `✦` glyph in the header, an inline text fragment appears without requiring a click: `"1 left"` in dim gold, rendered directly in the button row. The user can see this number from any view in the app.

**State: 3 readings used (free authenticated, at limit)**

The user attempts a reading. The `UpgradeModal` appears. But this time, they were not blindsided — they saw the "1 left" indicator in the header before they started. The nudge on the home screen said "One more reading awaits." They chose to use it knowing it was their last. The UpgradeModal heading reads: "You've read your sky for today." Not "Your readings for today have ended" — a passive system announcement — but an acknowledgment of what the person did. The tier cards explain clearly that all features are available on every plan, and that upgrading adds reading frequency, not capability unlocks.

**State: 0 readings used (unauthenticated, first visit)**

The home screen shows the sign-in nudge as before (existing `NUDGE_COPY`). No remaining-reads count is shown — the product does not yet know how many this session has used. The nudge remains a soft invitation to save their chart, not a pressure campaign.

**State: 1–2 readings used (unauthenticated)**

The IP-based `todayUsed` from context activates the nudge at `todayUsed === 2` (existing behavior): `"1 reading left today ✦ Sign in to save more"`. This copy is improved to: `"One reading left today. Sign in to pick up where you left off. ✦"` — softer phrasing, connecting to continuity rather than counting down.

**State: at limit (unauthenticated)**

Existing copy: `"Daily limit reached ✦ Sign in for more readings"`. Improved: `"You've had three readings today — that's a good beginning. ✦ Sign in for tomorrow."` This reframes the limit as an accomplishment and makes return feel like the natural next step.

---

## Specifications

### 1. Prerequisite: `todayUsed` staleness fix

This feature depends on `todayUsed` being accurate within a session. The persistent display is misleading if it shows a frozen count. The staleness fix described in `issue-todayused-counter-staleness.md` — exposing `incrementTodayUsed()` from `AuthContext` and calling it after each successful GPT interpretation in `App.tsx` — must land in the same sprint, as a blocking dependency, before this feature is considered shippable.

### 2. `SessionBadge` inline counter — threshold and trigger

`SessionBadge` in `src/App.tsx` must render an inline text fragment adjacent to the `✦` glyph when `tier === 'free'` and `remaining <= 1`. Specifically:

- When `remaining === 1`: render `"1 left"` inline in the header button row, to the left of the `✦` glyph, without requiring the dropdown to be open.
- When `remaining === 0`: render `"0 left"` inline (or `"done for today"` — see copy guidance below).
- When `remaining >= 2`: render nothing inline; the dropdown continues to show the count on click.

The inline fragment must be visually distinct from the glyph but not alarming. Suggested CSS: `fontSize: '0.65rem'`, `color: 'rgba(201,168,76,0.55)'`, `letterSpacing: '0.04em'`, `fontFamily: font-heading`, rendered as a `<span>` immediately before the `✦` glyph with `marginRight: '0.35rem'`.

The fragment must not break the button's click target or expand the header height. It must remain within the existing absolute-positioned container at line 84 of `App.tsx`.

### 3. `SessionBadge` — do not change the dropdown

The click-to-open dropdown behavior must remain unchanged. The dropdown continues to show the full `readingsLabel` string (e.g., "1 reading left today") in the signed-in user's panel at lines 110–119. Removing the dropdown or the count from it is out of scope. The inline fragment is additive — it provides ambient visibility; the dropdown continues to provide the authoritative label with fuller context.

### 4. `HomeScreen` — replace the `todayUsed <= 1` spacer for free authenticated users

`renderAuthNudge()` at line 129 in `HomeScreen.tsx` returns `<div className="mb-6" />` when `isAuthenticated && tier === 'free' && todayUsed <= 1`. This spacer must be replaced with informational text (not a button) for both sub-states:

- **`todayUsed === 0`**: Render a `<p>` or `<span>` element with copy: `"3 readings free today."` Style: `text-xs`, `text-mystic-gold/40`, `mb-6`, `self-start`. No click target, no upgrade CTA. This is ambient information only.
- **`todayUsed === 1`**: Render the same element with copy: `"2 readings left in your sky today."` Same style. No CTA.

These elements must not carry `onClick` handlers. They are informational, not conversion triggers. The `auth_nudge_seen` analytics event must not fire for these states — they are not nudges.

### 5. `HomeScreen` — improve nudge copy for `todayUsed === 2` (free authenticated)

Current copy: `"1 reading left today ✦ Upgrade for more"`

Required copy: `"You've come back twice today. One more reading awaits. ✦"`

The element remains a `<button>` with `onClick={onOpenAuth}` (which opens the `UpgradeModal`). `aria-label` should be updated to: `"One reading remaining today — upgrade for unlimited access"`. The `auth_nudge_clicked` analytics event must fire with `nudge_copy` matching the new string.

### 6. `HomeScreen` — improve nudge copy for `todayUsed >= 3` (free authenticated)

Current copy: `"Daily limit reached ✦ Upgrade to continue"`

Required copy: `"You've read your sky for today. Continue tomorrow, or open the full sky now. ✦"`

Same element structure (button, `onClick={onOpenAuth}`), `aria-label`: `"Daily limit reached — upgrade to continue reading today"`.

### 7. `HomeScreen` — improve nudge copy for `todayUsed === 2` (unauthenticated)

Current copy: `"1 reading left today ✦ Sign in to save more"`

Required copy: `"One reading left today. Sign in to pick up where you left off. ✦"`

The `auth_nudge_clicked` event must fire with the updated `nudge_copy` value.

### 8. `HomeScreen` — improve nudge copy for `todayUsed >= 3` (unauthenticated)

Current copy: `"Daily limit reached ✦ Sign in for more readings"`

Required copy: `"You've had three readings today — that's a good beginning. Sign in for tomorrow. ✦"`

### 9. `HomeScreen` — preserve existing unauthenticated nudge for `todayUsed === 0` and `todayUsed === 1`

The existing behavior for unauthenticated users at `todayUsed === 0` and `todayUsed === 1` — showing the `NUDGE_COPY` button with `ref={nudgeRef}` and `auth_nudge_clicked` tracking — must not change. The nudge in this state is a sign-in invitation, not a limit signal.

### 10. `UpgradeModal` — rewrite the `getHeading()` copy for free authenticated users at limit

`UpgradeModal.tsx` `getHeading()` function (lines 34–52) produces headings per tier and state. The following changes are required:

- **Free authenticated, limit hit** (`currentTier === 'free'` and `authenticated`): Change from `"Your readings for today have ended."` to `"You've read your sky for today."` This mirrors the home screen nudge copy and uses the product's established voice.
- **Free unauthenticated, limit hit** (`currentTier === 'free'` and `!authenticated`): Change from `"Three free readings per day. You've used yours."` to `"You've had three readings today — that's a good beginning."` The dismissive "You've used yours" framing is replaced with acknowledgment.
- **Basic tier, limit hit**: The existing copy `"You've explored the full sky today."` is correct and must not change.

### 11. `UpgradeModal` — add a clarity sentence to each paid `TierSection`

The `TierSection` component renders a `description` paragraph for each tier. The Basic and Advanced description paragraphs must each begin with a new first sentence that clarifies the feature access model before describing reading count:

- **Basic description**: Prepend: `"Every feature — natal chart, transits, synastry, solar return, journal, and dreams — is available on every plan."` Then retain the existing count sentence, revised to: `"Basic adds twenty readings per day, enough to explore your chart from multiple angles."` Full result: `"Every feature — natal chart, transits, synastry, solar return, journal, and dreams — is available on every plan. Basic adds twenty readings per day, enough to explore your chart from multiple angles."`
- **Advanced description**: Prepend the same feature-parity sentence. Revise the count description to: `"Advanced gives you a hundred readings per day — the depth for an astrologer's practice or a season of intensive inquiry."` Full result: `"Every feature — natal chart, transits, synastry, solar return, journal, and dreams — is available on every plan. Advanced gives you a hundred readings per day — the depth for an astrologer's practice or a season of intensive inquiry."`
- **Free description**: Do not change. `"Three readings a day — a morning consultation with the sky. No cost, no card."` is accurate and appropriately warm.

### 12. Voice and tone constraints for all limit-adjacent copy

All copy added by this feature must comply with the product's established voice:

- Use first-person plural constructions for the product speaking (`"your sky"`, `"the sky"`) and second-person for addressing the user directly (`"you've"`, `"your"`).
- Never frame limits as confiscation. The sky does not run out — the reading session for today ends. Prefer `"you've read your sky for today"` over `"your readings have ended"`.
- Never use the word "sorry" or apologetic hedging.
- The `✦` glyph may be used as a sentence-ender or divider in nudge copy. It must not appear as the sole content of a UI element.
- Counts of readings should prefer written-out words for small numbers in body copy (`"three readings"`, `"one more"`) and numerals only for the inline header fragment where space is constrained (`"1 left"`).
- Never refer to "the free plan" or "the free tier" in copy visible to free users. The product should speak about what they have available, not about the commercial tier they are on.

### 13. Paid-tier users — no change to nudge behavior

When `tier === 'basic'` or `tier === 'advanced'`, `renderAuthNudge()` must continue to return `<div className="mb-6" />` unchanged. No reading count or upgrade prompt is shown to paid users on the home screen.

### 14. `SessionBadge` — paid tiers not affected

The inline counter spec (Spec 2) applies only when `tier === 'free'`. When `tier === 'basic'` or `tier === 'advanced'`, the `tierLabel` badge (e.g., `"Basic ✦"`) continues to be shown only in the dropdown, and no inline fragment is rendered in the header button.

### 15. Accessibility

- The inline `<span>` in `SessionBadge` must have `aria-hidden="true"` if the dropdown's `role="status"` `aria-live="polite"` element (existing at line 114) already covers the count for screen readers. Alternatively, if the inline fragment is the only visible representation of the count (when the dropdown is closed), it must carry `aria-label="1 reading left today"` and `role="status"`.
- Updated nudge `<button>` elements in `HomeScreen.tsx` must have `aria-label` strings updated to match the new copy (see Specs 5, 6, 7, 8).

### 16. Analytics — no new events required for this feature

The nudge copy changes in Specs 5–8 must update the `nudge_copy` property values passed to the existing `track('auth_nudge_clicked', { nudge_copy })` calls to match the new strings. No new event names are introduced by this feature. The analytics-gap work (adding `upgrade_modal_seen`, `upgrade_cta_clicked`, `upgrade_dismissed` to `UpgradeModal.tsx`) is tracked separately and is not part of this proposal's scope.

---

## Out of Scope

- **`todayUsed` staleness fix implementation.** This feature depends on it but does not own it. The staleness fix is specified in `issue-todayused-counter-staleness.md`.
- **`UpgradeModal` analytics instrumentation.** Adding `track()` calls to `UpgradeModal.tsx` is tracked separately in the sprint and not part of this proposal.
- **Visual design changes to the dismiss button** in `UpgradeModal`. Miyazaki noted that the dismiss button (`"Continue with free — your sky resets at {resetTime}"`) has too little visual weight. Adjusting the visual hierarchy of the modal — making the dismiss feel less like an afterthought — is a separate design decision not covered here.
- **Loading state copy improvements.** Miyazaki proposed that loading-screen copy ("Consulting the stars…", "Aligning two cosmic blueprints…") could better address the person waiting rather than narrating the machine. This is out of scope for this proposal.
- **`UpgradeModal` `intendedTier`-aware copy.** Jobs proposed that when the modal fires after a feature-gate (rather than a daily limit), the heading should reference what the user was attempting. The modal's `intendedTier` prop would support this. That is a deeper copy personalization effort deferred to a future sprint.
- **Real-time server sync after readings.** The counter update is local-only (optimistic increment). Multi-tab consistency and true server-side sync after readings are not addressed by this feature.
- **Unauthenticated counter accuracy.** IP-based `todayUsed` tracking for unauthenticated users is handled server-side. This feature does not change how that count is derived or surfaced — only the copy shown when its thresholds are crossed.
- **New `SessionBadge` visual states for paid tiers near limit.** Paid users near their daily limit (e.g., a Basic user at 18/20 readings) receive no inline header signal in this proposal. Limit warnings for paid tiers are a future enhancement.

---

## Open Questions

1. **"1 left" vs. "1 sky left today" in the inline header fragment.** Carmack proposed `"1 left"` for the inline fragment due to space constraints. Miyazaki proposed `"1 sky left today"` to use the product's vocabulary. Jobs' framing of `"2 readings in your sky today"` suggests the full phrasing is worth the space. Which copy wins in the header, where space is tight? Decision needed: does the inline fragment use numerals + abbreviated context (`"1 left"`) or the product's full voice (`"1 sky left"`)? Recommendation: use `"1 left"` at `remaining === 1` and `"last one"` at `remaining === 0` — short enough for the header, still not a parking meter.

2. **Should the `todayUsed === 1` home screen state show a nudge-as-button or informational text?** Spec 4 proposes a `<p>` tag (non-interactive). If there is evidence that engagement at the `todayUsed === 1` state is a meaningful conversion moment, making it a soft button (opening the `UpgradeModal`) could be considered. However, the Jobs/Miyazaki framing strongly favors building trust over optimizing conversions at early-session states. Default to non-interactive text unless A/B data shows conversion value.

3. **Should the `"Every feature is available on every plan"` sentence in `TierSection` (Spec 11) include Dreams?** Dreams is currently a journal-adjacent feature. Verify that Dreams is not tier-gated before finalizing the feature list in that sentence. If any feature is tier-gated (even partially), the sentence must be modified to be accurate.

4. **Copy validation: does "You've come back twice today" require `todayUsed === 2` to be always a second-visit?** If a user starts a new session with `todayUsed` loaded from server as `2` (from yesterday's count being reset, or a same-day multi-session scenario), "twice today" could be factually wrong. Confirm whether `todayUsed` is always a within-day count (it appears to be, based on `fetchUsage()` returning today's server-side count) before shipping this copy.

5. **Does `renderAuthNudge()` track `auth_nudge_seen` for the `todayUsed === 0` and `todayUsed === 1` informational text added in Spec 4?** The spec says no — these are not nudges. But if the product later wants to measure how often users saw this ambient signal, an `info_display_seen` event could be added. For now, no tracking is recommended for the ambient text states.
