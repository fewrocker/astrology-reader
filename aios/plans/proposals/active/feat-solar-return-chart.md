# Proposal: Solar Return Chart

**Type:** Feature
**Originated by:** Jobs + Miyazaki + Carmack
**Impact:** High
**Effort:** Medium

## Guidance
> Introduce features which make the astrology suite more complete with different cross interpretations of things such as dreams, numerology, astrology, as one encompassing suite that works separately but also together

## Problem or Opportunity

The solar return chart — the chart cast for the exact moment the Sun returns to its natal zodiac degree each year — is one of the most practically useful tools in astrology. It answers: "What is this specific year of my life about?" It's a birthday reading. Every person with a natal chart has a solar return, and every serious astrology app offers it.

Currently: not available. Users who want their solar return must go to a different app entirely. This is a clear gap in the suite.

## Proposed Solution

Add a **Solar Return Chart** accessible from the natal chart results page. The feature:

1. **Finds the exact solar return moment** for the current year (or next year if the birthday has passed) using binary search on the Sun's ecliptic longitude — similar to the binary search already implemented in `transitTimeline.ts` for aspect perfection dates.

2. **Renders the solar return chart** using the existing `ChartWheel` component and `calculateChart` engine. The chart is calculated for the solar return moment using the user's **current location** (or birth location as fallback).

3. **Interprets the solar return** with key highlights:
   - Solar return Ascendant (SR ASC) and what house of the natal chart it falls in
   - SR Sun house placement — which area of life is illuminated this year
   - SR Moon sign and house — emotional focus for the year
   - Most prominent SR planets (those near angles)
   - Strongest SR aspects
   - Optional GPT narrative: "This year, your solar return Ascendant in Sagittarius in your natal 3rd house suggests a year of expanded communication and learning..."

4. **Year selector** — let users view this year's or last year's solar return (simple +1/-1 year button).

**UI:** Accessible via a "Solar Return" button/tab from the natal results page. Displays the SR chart wheel side by side with key interpretations. Uses the same mystic design language.

## Why Feature, Not Issue Fix or Code Enhancement

Entirely new capability — new chart type, new calculation mode, new interpretation context. Reuses infrastructure but delivers a meaningfully new product feature.

## Impact Assessment
- **Impact:** High — a birthday reading is one of the most emotionally resonant astrology features; directly expands suite completeness
- **Effort:** Medium — binary search for SR moment (~50 lines), chart rendering (reuses ChartWheel), SR interpretation layer (new but moderate), UI (~100 lines)

## Dependencies
- `src/engine/astronomy.ts` — `calculateChart` function
- `src/engine/aspects.ts` — `calculateAspects`
- `src/components/chart/ChartWheel.tsx` — reused directly
- Birth date/time/location already in app state

## Implementation Summary

**New files:**
- `src/engine/solarReturn.ts` — function to find exact solar return datetime via binary search on Sun longitude
- `src/data/interpretations/solarReturn.ts` — SR interpretation templates (SR ASC by sign, SR Sun by house)
- `src/components/results/SolarReturnPage.tsx` or `src/components/reading/SolarReturnSection.tsx`

**Modified files:**
- `src/App.tsx` or `src/components/results/ResultsPage.tsx` — add Solar Return navigation
- `src/context/appState.ts` — add solar return state (srChartData, srAspects, srYear)
- `src/services/gptInterpretation.ts` — add SR GPT prompt builder
