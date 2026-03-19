# Proposal: Transit Timeline & Aspect Calendar

## Problem / Opportunity

The transit reading shows which aspects are active *right now*, but astrology lovers want to look ahead. "When will this Saturn square end?" "When does Venus enter my 5th house?" "What's happening next week?" These are the questions that drive daily astrology practice.

Currently, the user sees a snapshot — a moment frozen in time. A timeline or calendar view showing when each transit aspect perfects (becomes exact), when planets change signs, and when retrograde periods begin/end would turn this from a static reading into a planning tool.

## Proposed Solution

1. **Transit timeline view**: A horizontal scrollable timeline (or vertical list) for the selected period (daily → 3 days, weekly → 7 days, monthly → 30 days) showing key astrological events plotted on a date axis.
2. **Events tracked**:
   - Transit aspects to natal planets (with exact date of perfection)
   - Planet sign ingresses (planet enters a new sign)
   - Retrograde stations (planet goes retrograde or direct)
   - Lunar phases (new moon, full moon, quarters)
   - Moon sign changes (every ~2.5 days)
3. **Event cards**: Each event on the timeline is a tappable card showing: planet involved, aspect/event type, date, brief interpretation.
4. **"Important days" highlight**: Days with multiple significant transits are highlighted (e.g., "Power Day" when 3+ aspects perfect simultaneously).
5. **Integration with existing transit reading**: The timeline appears as a new tab alongside the current narrative transit reading, giving users both story and schedule.

## Impact & Effort

- **Impact**: HIGH — Makes the app a daily-use tool. Users will return to check upcoming transits, creating engagement loops.
- **Effort**: HIGH — Requires computing transit positions across a date range (multiple days of calculation), building a timeline UI component, and generating event interpretations.
- **Dependencies**: Transit calculation engine, astronomy-engine library (position calculations at multiple dates), transit interpretations.

## Implementation Summary

- New file: `src/engine/transitTimeline.ts` — calculate transit aspects/events across a date range, find exact perfection dates via binary search
- New component: `src/components/reading/TransitTimeline.tsx` — scrollable timeline UI with event cards
- New file: `src/data/interpretations/transitEvents.ts` — brief interpretations for sign ingresses, stations, and perfecting aspects
- Modify: `src/components/results/TransitReadingPage.tsx` — add timeline tab alongside existing narrative view
