# Enhancement Result: Sky Today Landing Page

## Summary
Redesigned the landing page (`CachedDataLanding`) into a beautiful split layout:
- **Left 40%**: The existing Welcome Back menu card with birth details and action buttons
- **Right 60%**: A decorative, read-only astral chart showing today's sky — real planetary positions calculated for the current moment (Greenwich Observatory coordinates)

## Changes Made

### New Component: `src/components/chart/SkyTodayChart.tsx`
- Calculates today's chart using `calculateChart` with current date/time at Greenwich (51.4772°N, 0.0005°W)
- Uses `useMemo` for efficient single-render calculation
- Wraps `ChartWheel` with a subtle radial glow background
- Marked as `pointer-events-none` and `select-none` for a read-only decorative feel

### Modified: `src/App.tsx`
- Imported `SkyTodayChart` component
- Restructured `CachedDataLanding` from single centered column to a Flexbox 40/60 split:
  - Left side: menu card (unchanged buttons/content)
  - Right side: `SkyTodayChart` centered with "The Sky Today" label overlay
- Responsive: stacks vertically on mobile (column), splits horizontally on `lg` breakpoint
- Reduced vertical padding on the landing page variant for more space

### Modified: `src/index.css`
- Added `.sky-today-chart` with reveal animation (scale + fade in)
- Added `.sky-chart-glow` with drop-shadow filters (gold + purple aurora)
- Chart renders at 85% opacity for decorative softness
- Planets have `pointer-events: none` to prevent interactivity
- Slower ambient ring sweep (45s) for a contemplative feel
- Added `.bg-gradient-radial` utility class

## Build Verification
- **Build**: ✅ Zero errors, zero warnings (apart from pre-existing chunk size note)
- **TypeScript**: ✅ No type errors

## Regression Check
- All existing features (form wizard, chart calculation, results, transits, synastry) remain untouched
- The sky chart only appears on the cached data landing page (returning users)
- No changes to routing, state management, or other components
