# Feature: Solar Return / Year Ahead Chart

**Type:** Feature
**Originated by:** Jobs + Miyazaki + Carmack

---

## Problem / Opportunity

"What does this year hold for me?" is the most natural question in astrology — and the product doesn't answer it. The Solar Return chart is the astrologer's primary tool for annual forecasting: it's calculated for the exact moment the Sun returns to its natal longitude in the current (or any) year, creating a new chart that describes the themes, opportunities, and challenges of the coming 12 months.

The product already has everything needed to build this:
- The astronomical calculation engine (`astronomy.ts`) can find the exact Sun return moment using the same bisection approach used in `transitTimeline.ts`
- The bi-wheel SVG rendering is already built (from the transit bi-wheel enhancement)
- The GPT interpretation layer is already built
- The results page pattern is already established

This is a composition of existing patterns, not a new direction.

## What It Is

A "Year Ahead" reading accessible from the landing page. It:

1. Calculates the exact moment the Sun returns to its natal longitude in the current year (the "Solar Return moment")
2. Calculates a full natal chart for that moment (Solar Return chart)
3. Renders a bi-wheel: natal chart inner ring, solar return chart outer ring
4. Shows a Solar Return positions table (SR planets in signs and houses)
5. Highlights key Solar Return placements: SR Ascendant, SR Sun house, SR Moon, SR chart ruler
6. Delivers a GPT-powered "Year Ahead" reading covering:
   - SR Ascendant sign (overall year theme and presentation)
   - SR Sun house (primary area of life focus)
   - SR Moon sign/house (emotional climate)
   - Major SR aspects and their year-long themes
   - SR vs natal chart tensions (where this year differs from your baseline)

The Solar Return date and time is shown prominently ("Your Sun returns on June 14, 2025 at 3:42 AM UTC") — this specificity is beautiful and personal.

## Why This is a Feature

This introduces a completely new reading type (annual forecast vs. current snapshot), requires new calculations (bisection for exact Sun return), new rendering context (SR bi-wheel), new interpretation framework (annual vs. transit), and new GPT prompting. It is a self-contained new capability.

## How to Use It

- "Year Ahead ☀" button on the landing page menu
- Option to view current year's solar return or next year's
- Displays the exact solar return date/time and location note ("calculated for your birth coordinates")
- GPT-powered interpretation requires OpenAI API key (same pattern as transits)
- "Discuss ✦" button for follow-up questions (same modal pattern)

## Impact

**High** — answers the most common astrology question; premium annual reading
**Effort** — Medium-High (new calculation method, new rendering context, new GPT prompt architecture, new page component)

## Dependencies

- `src/engine/astronomy.ts` — needs `findSolarReturn(natalSunLongitude, year, approxDate)` function
- Bi-wheel SVG rendering pattern from `TransitBiWheel` component
- GPT interpretation service (already built)
- `AppContext` for natal chart data

## Implementation Summary

- Modified: `src/engine/astronomy.ts` — add `findSolarReturn()` using bisection search
- New file: `src/engine/solarReturn.ts` — solar return chart calculation and interpretation prompt building
- New file: `src/components/results/SolarReturnPage.tsx` — the reading display with bi-wheel + SR positions + GPT reading + Discuss
- Modified: `src/App.tsx` — add solar-return view and landing page button, handle SR loading state
- Modified: `src/context/AppContext.tsx` — add solar return data to state
