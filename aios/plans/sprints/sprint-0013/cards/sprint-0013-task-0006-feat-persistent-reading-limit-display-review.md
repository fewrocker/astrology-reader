---
**Task:** sprint-0013-task-0006-feat-persistent-reading-limit-display
**Reviewer:** Self (implementation agent)
**Date:** 2026-05-14
---

## Summary

Implemented all 16 specs from the sprint card. Four files changed: `AuthContext.tsx`, `App.tsx`, `HomeScreen.tsx`, `UpgradeModal.tsx`. TypeScript clean (`npx tsc --noEmit` exits 0).

---

## Spec-by-spec checklist

### Spec 1 — incrementTodayUsed fix (prerequisite)
- ✅ `incrementTodayUsed: () => void` added to `AuthContextType` interface
- ✅ `useCallback(() => setTodayUsed(prev => prev + 1), [])` created in `AuthProvider`
- ✅ Exposed via context value
- ✅ Called in `AppContent` after each successful GPT interpretation: transit (`SET_TRANSIT_INTERPRETATION`), synastry (`SET_SYNASTRY_INTERPRETATION`), synastry-transit (`SET_SYNASTRY_TRANSIT_RESULTS`), solar return (`SET_SOLAR_RETURN_INTERPRETATION`)
- ✅ Only called when `!cancelled` — no increment on stale/unmounted updates

### Spec 2 — SessionBadge inline counter threshold
- ✅ Renders `<span>` with `"1 left"` when `tier === 'free' && remaining === 1`
- ✅ Renders `<span>` with `"0 left"` when `tier === 'free' && remaining === 0` (i.e. `remaining <= 1 && remaining !== 1`)
- ✅ Nothing rendered inline when `remaining >= 2`
- ✅ CSS matches spec: `fontSize: '0.65rem'`, `color: 'rgba(201,168,76,0.55)'`, `letterSpacing: '0.04em'`, `marginRight: '0.35rem'`, `lineHeight: 1`
- ✅ `className="font-heading"` applied to span
- ✅ `aria-hidden="true"` — screen readers already covered by `role="status"` `aria-live="polite"` in dropdown (line 114)
- ✅ Button gains `flex items-center` so span + glyph align vertically without expanding header height

### Spec 3 — Dropdown unchanged
- ✅ `{open && (...)}` dropdown block is untouched; `readingsLabel` and `tierLabel` render unchanged

### Spec 4 — HomeScreen todayUsed===0 ambient text
- ✅ `<p>` "3 readings free today." replaces spacer for free authenticated `todayUsed === 0`
- ✅ Classes: `text-xs text-mystic-gold/40 mb-6 self-start`
- ✅ No `onClick`, no CTA — purely informational
- ✅ No `auth_nudge_seen` tracking

### Spec 5 — HomeScreen todayUsed===1 ambient text
- ✅ `<p>` "2 readings left in your sky today." replaces spacer for free authenticated `todayUsed === 1`
- ✅ Same style classes as Spec 4
- ✅ No interaction, no tracking

### Spec 6 — HomeScreen todayUsed===2 authenticated nudge
- ✅ Copy: `"You've come back twice today. One more reading awaits. ✦"`
- ✅ `aria-label`: `"One reading remaining today — upgrade for unlimited access"`
- ✅ `track('auth_nudge_clicked', { nudge_copy: "You've come back twice today. One more reading awaits. ✦" })` fires on click (added — was missing in original code)
- ✅ `onClick={onOpenAuth}` preserved

### Spec 7 — HomeScreen todayUsed>=3 authenticated nudge
- ✅ Copy: `"You've read your sky for today. Continue tomorrow, or open the full sky now. ✦"`
- ✅ `aria-label`: `"Daily limit reached — upgrade to continue reading today"`
- ✅ Track call added with matching nudge_copy

### Spec 8 (card Spec 7) — HomeScreen todayUsed===2 unauthenticated
- ✅ Copy: `"One reading left today. Sign in to pick up where you left off. ✦"`
- ✅ `aria-label`: `"One reading remaining today — sign in to continue"`
- ✅ `track()` updated from old copy to new copy string

### Spec 9 (card Spec 8) — HomeScreen todayUsed>=3 unauthenticated
- ✅ Copy: `"You've had three readings today — that's a good beginning. Sign in for tomorrow. ✦"`
- ✅ `aria-label`: `"Daily limit reached — sign in for tomorrow"`
- ✅ `track()` updated from old copy to new copy string

### Spec 10 (card Spec 9) — Preserve unauthenticated nudge at todayUsed 0/1
- ✅ `NUDGE_COPY` button with `ref={nudgeRef}`, `auth_nudge_seen` observer, and `auth_nudge_clicked` tracking unchanged

### Spec 11 (card Spec 10) — UpgradeModal getHeading() free states
- ✅ Free + authenticated: `"You've read your sky for today."` (was `"Your readings for today have ended."`)
- ✅ Free + unauthenticated: `"You've had three readings today — that's a good beginning."` (was `"Three free readings per day. You've used yours."`)
- ✅ Basic tier: `"You've explored the full sky today."` unchanged
- ✅ `intendedTier === 'advanced'` gate untouched

### Spec 12 (card Spec 11) — TierSection descriptions
- ✅ Basic: prepended feature-parity sentence + revised count: `"Every feature — natal chart, transits, synastry, solar return, journal, and dreams — is available on every plan. Basic adds twenty readings per day, enough to explore your chart from multiple angles."`
- ✅ Advanced: same preamble + `"Advanced gives you a hundred readings per day — the depth for an astrologer's practice or a season of intensive inquiry."`
- ✅ Free description unchanged: `"Three readings a day — a morning consultation with the sky. No cost, no card."`

### Spec 13 (card Spec 12) — Voice/tone constraints
- ✅ No "sorry", no apologetic language
- ✅ No "free plan" / "free tier" framing
- ✅ Written numbers in body copy ("three readings", "one more", "twenty", "hundred")
- ✅ Numerals only in header span ("1 left", "0 left")
- ✅ ✦ glyph used as sentence-ender, never as sole content

### Spec 14 (card Spec 13) — Paid tiers no nudge change
- ✅ `tier === 'basic' || tier === 'advanced'` returns `<div className="mb-6" />` — unchanged

### Spec 15 (card Spec 14) — SessionBadge paid tiers not affected
- ✅ Inline span guard is `tier === 'free' && remaining <= 1` — paid tiers never enter this branch

### Spec 16 (card Spec 15) — Accessibility
- ✅ Inline span: `aria-hidden="true"` (dropdown's `role="status"` covers screen readers)
- ✅ All nudge buttons have updated `aria-label` strings matching new copy intent

### Spec 17 (card Spec 16) — Analytics
- ✅ `nudge_copy` values in all four `track('auth_nudge_clicked', ...)` calls updated to match new strings
- ✅ No new event names introduced

---

## Potential concerns

1. **`todayUsed <= 1` split** — original code handled `todayUsed <= 1` as one branch. The new code splits into `=== 0` and `=== 1`. If `todayUsed` could somehow be negative (e.g. on error reset), neither branch renders — the function falls through to `=== 2`. This is a safe failure: no nudge shown. Not a regression.

2. **Inline counter and button height** — added `flex items-center` to the ✦ button. The button is `position: absolute` inside a positioned parent, so height expansion doesn't affect document flow. Visual regression is minimal; the span is `0.65rem` vs `text-xl` (1.25rem) for the glyph, and `lineHeight: 1` on the span keeps it tight.

3. **`incrementTodayUsed` on cancelled effects** — all four GPT call sites guard with `if (!cancelled)` before dispatching and incrementing. No stale increment on component unmount or view change mid-flight.

4. **Duplicate fix with task-0003** — per Spec 1, `incrementTodayUsed` is intentionally duplicated here. The consolidation agent resolves the conflict by keeping both worktrees' implementations.
