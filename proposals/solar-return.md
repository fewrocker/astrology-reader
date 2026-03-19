# Proposal: Solar Return Chart (Birthday Forecast)

## Problem / Opportunity

A **Solar Return** is a chart cast for the exact moment the Sun returns to its natal position each year — essentially the astrological chart of your birthday year. It's one of the most popular predictive techniques in Western astrology and something every astrology enthusiast looks forward to exploring around their birthday.

This is a natural extension of the existing engine (which already calculates Sun positions) and would give users a compelling reason to return to the app annually. "What does my year ahead look like?" is universally appealing.

## Proposed Solution

1. **Solar Return calculation**: Find the exact date/time when the transiting Sun reaches the user's natal Sun longitude for the current (or selected) year. Cast a full chart for that moment at the user's current location.
2. **Solar Return chart wheel**: Render the Solar Return chart as a separate wheel using the existing ChartWheel component.
3. **Year-ahead themes**: Interpret key placements in the Solar Return chart:
   - Solar Return Ascendant sign (the "theme" of the year)
   - Moon sign and phase (emotional tone of the year)
   - Planets in angular houses (1st, 4th, 7th, 10th) — major life focus areas
   - Challenging aspects (areas of growth/tension)
   - Harmonious aspects (areas of ease/flow)
4. **Overlay with natal**: Show which natal houses the Solar Return planets fall in, connecting the yearly forecast to the user's natal blueprint.
5. **GPT synthesis**: Generate a narrative "Year Ahead" reading combining Solar Return placements with context from the natal chart.

## Impact & Effort

- **Impact**: HIGH — Universally appealing predictive feature. Users will return every year around their birthday. Shareable ("check out my year ahead!").
- **Effort**: MEDIUM — The astronomy-engine library can compute when the Sun reaches a specific longitude. Chart rendering is reusable. Main effort is the Solar Return interpretation content.
- **Dependencies**: astronomy-engine Sun position search, existing ChartWheel component, existing GPT interpretation service.

## Implementation Summary

- New file: `src/engine/solarReturn.ts` — find exact Solar Return date/time, calculate full chart for that moment
- New file: `src/data/interpretations/solarReturn.ts` — Solar Return Ascendant interpretations, angular planet meanings, year-theme interpretations
- New component: `src/components/results/SolarReturnPage.tsx` — Solar Return chart display + year-ahead reading
- Modify: `src/components/results/ResultsPage.tsx` — add "Year Ahead" button/tab to access Solar Return
- Modify: `src/context/appState.ts` — add Solar Return state branch
