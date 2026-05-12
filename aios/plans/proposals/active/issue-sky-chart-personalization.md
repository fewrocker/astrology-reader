# Proposal: Fix SkyTodayChart — Personalized or Honest

**Type:** Issue Fix
**Originated by:** Jobs + Taleb + Miyazaki
**Impact:** Medium
**Effort:** Low

## Problem

`SkyTodayChart` (used on the landing page for returning users) calculates today's sky at **Greenwich (latitude 51.4772, longitude -0.0005, timezone UTC)**. The code comment says "Renders today's sky as a decorative, read-only natal chart wheel."

The problem is threefold:
1. **It's not the user's sky** — it shows house cusps and planet positions for London, regardless of where the user is or was born. A user in Tokyo, Buenos Aires, or New York sees identical house structure, which is cosmographically wrong.
2. **It's not labeled as decorative** — it looks like a meaningful chart, positioned prominently on the landing page. Returning users may interpret it as their current sky or a transit overlay.
3. **It's a missed opportunity** — the user's birth data is already cached. The landing page already has their natal chart. Showing *their* natal chart with today's transits overlaid would be genuinely informative and beautiful.

A product that reads your soul should not open with someone else's sky.

## Proposed Solution

**Option A (Recommended):** Replace `SkyTodayChart` with a personalized chart that overlays today's transiting planet positions onto the user's natal chart wheel. This is already partially supported by the existing `ChartWheel` component's bi-wheel mode (used in `transit-bi-wheel` enhancement). Show a read-only, non-interactive version of the natal chart with today's transit positions as a subtle outer ring.

**Option B:** If the bi-wheel on the landing page is too heavy, replace `SkyTodayChart` with the user's natal chart alone (static, non-interactive) — at least showing *their* chart rather than a generic London sky.

**Option C:** If decorative-only is the intent, label it clearly: add a small caption "Today's Sky" and make it visually distinct from the personal charts (dimmer, watermark-style). At minimum, calculate it for the user's birth city timezone rather than UTC.

**Implementation for Option A:**
- Pass the user's cached `chartData` and `aspects` into `SkyTodayChart`
- Calculate today's transiting positions (already done by `calculateCurrentPositions` from `transits.ts`)
- Render via `ChartWheel` in bi-wheel mode (natal inner ring, transits outer ring) with reduced interactivity

## Why Issue Fix, Not Feature

This is correcting wrong/misleading behavior in an existing component. The chart is presenting incorrect data for the user's context. Making it accurate (or clearly decorative) is a fix, not a new capability.

## Impact Assessment
- **Impact:** Medium — affects landing page first impression for all returning users; currently shows incorrect data
- **Effort:** Low — modify one 32-line component to either pass existing natal data or accept the correct coordinates; bi-wheel rendering already exists

## Dependencies
- `src/components/chart/SkyTodayChart.tsx` — primary change
- `src/components/chart/ChartWheel.tsx` — already supports bi-wheel mode
- `src/engine/transits.ts` — `calculateCurrentPositions` already exists
- User's cached natal chart data available from `AppContext`

## Implementation Summary

**Modified files:**
- `src/components/chart/SkyTodayChart.tsx` — accept optional `chartData` prop; when provided, render as personalized transit overlay; when not provided, either hide or render at the user's cached city coordinates
- `src/App.tsx` — pass `chartData` from state to `SkyTodayChart`
