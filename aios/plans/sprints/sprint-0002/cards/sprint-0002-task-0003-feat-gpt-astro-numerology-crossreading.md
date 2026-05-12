# Feature: Live Astrology ↔ Numerology Cross-Reading Card

**Type:** Feature
**Originated by:** Jobs + Carmack + Taleb (strong convergence)

---

## Problem / Opportunity

The `generateAstroNumerologyCrossReading` function already exists in `src/services/gptInterpretation.ts` (added as an unstaged change) but is not wired to any component. It takes all numerology numbers + full natal chart data and returns a 2–3 paragraph synthesis showing where numbers and chart resonate and where they create tension.

The guidelines describe this as the real differentiator: "A second GPT call (run in parallel with the numerology interpretation call, not sequentially) weaves numerology and astrology together... This cross-reading is the real differentiator — no app does this well."

The current "Cosmic Connections" section uses hardcoded switch/case logic to generate per-Life-Path text — it creates the illusion of personalization but is actually a template. "Your Neptune in [sign] carries the frequency of your Life Path 7" is the same for every Life Path 7, regardless of whether Neptune is in Aquarius or Taurus, in the 1st or 12th house. The GPT cross-reading is genuinely personalized.

## Proposed Solution

Wire the existing `generateAstroNumerologyCrossReading` function into `NumerologyPage.tsx`, running **in parallel** with the numerology narrative GPT call (from `feat-gpt-numerology-narrative`).

**Loading and rendering behavior:**
- Both GPT calls start simultaneously using independent `useEffect` hooks or `Promise.all`
- Total user wait time = whichever call is slower (not sequential sum)
- Each call has its own skeleton placeholder card with distinct label ("Reading your chart connections…")
- Results render independently as each arrives — user sees whichever finishes first
- Both cards only appear if the user has chart data loaded (chart must exist)

**Replace static "Cosmic Connections":**
- Remove the current `buildChartCrossRef` and `buildPersonalYearCrossRef` functions from NumerologyPage
- Remove the static "Cosmic Connections" section
- The GPT cross-reading card replaces it with a heading like "✦ Astrology & Numerology" or "✦ Your Cosmic Portrait"
- If no chart data is available, show a graceful note: "Enter your birth data to unlock the astrology ↔ numerology synthesis"

**Abort handling:**
- Both GPT calls must use `AbortController` to clean up on component unmount
- If one call fails and the other succeeds: show the successful result, show an error state for the failed one with a retry button
- If chart data is not available: skip this call silently (don't show error, don't show placeholder)

## Why This Is a Feature

New user-visible capability: a personalized synthesis card that didn't exist in any working form. The function exists in the service layer but no UI integration exists.

## Impact / Effort

**Impact:** High — this is the key differentiator described in the guidelines. Weaving numerology + astrology together is what no other app does.
**Effort:** Low-Medium — the GPT function already exists and is well-written. Work is: component wiring + AbortController + remove static cross-ref code + visual treatment of the new card.

## Dependencies

- `generateAstroNumerologyCrossReading` in gptInterpretation.ts (already written)
- Chart data available in AppContext via `state.chartData` or computed from birth data
- Ideally coordinated with `feat-gpt-numerology-narrative` (both GPT calls wired together)

## Implementation Summary

1. `src/components/results/NumerologyPage.tsx`:
   - Import `generateAstroNumerologyCrossReading` from gptInterpretation.ts
   - Add second loading state for cross-reading
   - Launch both GPT calls in parallel on mount with AbortControllers
   - Render cross-reading skeleton + result card (conditional on chartData existing)
   - Remove `buildChartCrossRef`, `buildPersonalYearCrossRef`, and the static Cosmic Connections section
2. Visual treatment: cross-reading card gets slightly different border color (purple/celestial blue tint) to distinguish it from the numerology narrative (gold tint)

---

## Outcome

`generateAstroNumerologyCrossReading` was added to `src/services/gptInterpretation.ts` and wired into `NumerologyPage.tsx` via a `useEffect` with the cancelled-flag pattern to prevent state updates on unmounted components. The static `buildChartCrossRef`, `buildPersonalYearCrossRef`, and `ordinal` helpers were removed along with their `useMemo` calls, and the old "Cosmic Connections" section was replaced with a new GPT cross-reading card that shows a gold-shimmer skeleton while loading, the live personalized synthesis when complete, a human-friendly retry prompt on error, and graceful no-data notes when chart data or API key are absent. Build passes with zero TypeScript errors.
