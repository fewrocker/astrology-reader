# code-daily-snapshot-numerology

**Type:** Code Enhancement
**Originated by:** Jobs + Miyazaki + Carmack (all three flagged the landing page as the primary daily touchpoint that currently ignores numerology)

---

## Problem or Opportunity

`DailySnapshotCard.tsx` is the daily oracle on the landing page — the first thing a returning user sees. It shows Moon position, key transits, and active aspects. It's astrological only.

But the numerology engine computes a Personal Day number that changes every day and could appear right there in the same card with minimal effort. A returning user who opens the app on Tuesday wants to know both their transits AND their personal day number. Right now they have to navigate to Numerology separately to find out. The two features live in the same app, computed from the same birth data, but the landing page doesn't weave them together.

This is a code/integration enhancement, not a new feature — DailySnapshotCard already exists and works, and Personal Day calculation (proposed in `feat-personal-year-month-day-numerology`) will be implemented in the same sprint. This card integrates that data into an existing component.

**Note:** This proposal depends on `feat-personal-year-month-day-numerology` being implemented first (or in parallel) — the `personalDay` calculation must exist before it can be used here.

---

## Proposed Solution

1. **Pass birth data to DailySnapshotCard** — the component currently receives only `chart: ChartData`. Add `birthDate?: string` as a prop (the date is needed to compute Personal Day). In `App.tsx` and `CachedDataLanding`, pass `birthData.date` where DailySnapshotCard is rendered.

2. **Compute Personal Day inside DailySnapshotCard** — import `calculateNumerology` (or the new `calculatePersonalDay` standalone function) and compute the personal day from birthDate. This is a pure synchronous function — no async, no loading state.

3. **Add Personal Day line to the card UI** — one additional line after the Moon information, in a slightly muted style: 
   ```
   Personal Day 3  ·  The Communicator
   ```
   Use mystic-gold color, same text size as existing transit lines. Keep it understated — a whisper, not a headline.

4. **Guard for missing birth date** — if `birthDate` is not provided or is falsy, simply don't render the personal day line. The card should work the same as before when birth data isn't available.

---

## Why this is a Code Enhancement, not a Feature

The feature (Personal Year/Month/Day) is defined in `feat-personal-year-month-day-numerology`. This proposal is purely about integrating existing/incoming computed data into an existing component. The DailySnapshotCard gains one new line — the user experience improvement is real but the change is structural integration, not new capability invention.

---

## Impact / Effort

- **Impact:** Medium — improves the daily-oracle quality of the landing page without changing its character
- **Effort:** Very Low — ~30 lines of code, no new systems

---

## Dependencies

- **Depends on:** `feat-personal-year-month-day-numerology` (the `calculatePersonalDay` function must exist)
- `src/components/reading/DailySnapshotCard.tsx` — add `birthDate` prop, compute and display personal day
- `src/App.tsx` — pass `birthData.date` to DailySnapshotCard invocations
- Potentially `src/components/results/NumerologyPage.tsx` → `numerologyInterpretations.ts` for the archetype label ("The Communicator")

---

## Implementation Summary

Key files to modify:
- `src/components/reading/DailySnapshotCard.tsx` — add `birthDate?: string` prop, import `calculatePersonalDay`, render one new line with personal day number + archetype label
- `src/App.tsx` — in `CachedDataLanding`, pass `birthData.date` to `<DailySnapshotCard>`
- No new files needed

Effort: ~30 lines. No architectural changes. Should be implemented after `feat-personal-year-month-day-numerology` since it depends on that function.
