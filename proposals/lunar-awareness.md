# Proposal: Lunar Awareness — Moon Phase, Void-of-Course & Lunar Context

## Problem / Opportunity

The Moon is the most emotionally significant body in astrology and the one that changes fastest — shifting sign every ~2.5 days and cycling through phases every ~29.5 days. Astrology lovers track the Moon more than any other body. Yet the app only shows the natal Moon sign placement and ignores:

- **Current Moon phase** (new, waxing crescent, first quarter, etc.)
- **Void-of-course Moon** (when the Moon makes no more major aspects before changing sign — a period astrologers avoid for important decisions)
- **Natal Moon phase** (the phase at birth, which describes the soul's developmental stage)
- **Moon in daily transits** (the Moon's current sign and house transit)

For astrology lovers, lunar awareness is not a nice-to-have — it's the heartbeat of daily practice.

## Proposed Solution

1. **Current Moon phase widget**: A beautiful visual Moon phase indicator on the results page and transit page showing the current phase with name, percentage illumination, and a one-line meaning (e.g., "Waxing Gibbous — refine and adjust before the full moon").
2. **Natal Moon phase**: Calculate what phase the Moon was in at birth (based on Sun-Moon angle) and display it as part of the Big Three / Moon interpretation with meaning (e.g., "Born under a Last Quarter Moon — you carry wisdom from endings and know when to release").
3. **Void-of-course indicator**: In transit readings, flag when the Moon is void-of-course with a tooltip explaining what it means and what to avoid.
4. **Moon sign transit**: Show what sign the Moon is currently in and which natal house it's transiting, updated daily.
5. **Lunar calendar mini-view**: A 7-day lunar outlook showing upcoming Moon sign changes and phases.

## Impact & Effort

- **Impact**: HIGH — Lunar tracking is the #1 daily astrology practice. This makes the app a tool users return to every day, not just once for their birth chart.
- **Effort**: MEDIUM — Moon phase calculation from Sun-Moon angle is straightforward. Void-of-course requires checking upcoming Moon aspects. The astronomy-engine library supports all needed calculations.
- **Dependencies**: astronomy-engine Moon/Sun position calculations, transit system.

## Implementation Summary

- New file: `src/engine/lunar.ts` — Moon phase calculation (Sun-Moon angle → phase name), void-of-course detection, upcoming Moon sign changes
- New file: `src/data/interpretations/lunarPhases.ts` — interpretations for each of the 8 Moon phases (natal + transit)
- New component: `src/components/reading/MoonPhaseWidget.tsx` — visual Moon phase display with SVG moon illustration
- Modify: `src/components/results/ResultsPage.tsx` — add natal Moon phase to Big Three section
- Modify: `src/components/results/TransitReadingPage.tsx` — add current Moon phase widget, void-of-course indicator, Moon sign transit info
