# Transit Bi-Wheel Chart Overlay — Result

## Summary
The transit bi-wheel overlay has been implemented. The transit reading page now shows transit planets visually overlaid on the natal chart in the standard astrology bi-wheel format.

## What was implemented

### Data Layer
- Exported `getHouseForLongitude()` from `astronomy.ts` for reuse
- Added `assignTransitHouses()` to `transits.ts` — assigns natal house positions to transit planets using natal house cusps

### ChartWheel Extension
- Added optional `transitPlanets` and `transitAspects` props to `ChartWheel`
- New `TRANSIT_PLANET_R = 288` radius constant for the transit planet ring (between natal planets at 263 and zodiac ring inner at 298)
- Transit planet rendering with teal/cyan color scheme (`#5ec4c4`), smaller circles (r=11 vs 13), "T" superscript marker
- Transit-to-natal aspect lines rendered as dashed lines (`strokeDasharray="6 4"`) with appropriate aspect colors
- Transit glow filter (`transitGlow`) for teal ambient glow
- Planet overlap handling: transit glyphs nudge outward by 12px when within 8° of a natal planet
- Larger touch targets (r=16) for mobile interaction

### Interactive Tooltips
- `TransitPlanetTooltip` — shows transit badge, current sign position, daily motion, retrograde status, natal house being transited, and all active aspects to natal planets with orb and nature
- `TransitAspectTooltip` — shows transit planet + aspect symbol + natal planet, aspect type, orb, applying/separating status
- Extended `HoverState` with `'transit'` and `'transitAspect'` kinds
- Teal border color (`#5ec4c4`) for transit tooltips
- Both desktop hover and mobile tap modal support transit tooltips

### Hover/Dim Logic
- When hovering a transit planet: its transit aspect lines highlight, all natal aspects dim
- When hovering a natal planet: connected transit aspect lines also highlight
- Transit aspect line opacity adjusts based on hover context

### Page Integration
- `TransitReadingPage` computes transit house assignments via `assignTransitHouses()`
- Passes `transitPlanets` and `transitAspects` to `ChartWheel`
- Chart label updated to "Your natal chart with current transits"

## Visual Design
- **Inner wheel**: Natal planets at r=263 (gold, unchanged)
- **Outer ring**: Transit planets at r=288 (teal/cyan)
- **Aspect lines**: Natal = solid, Transit-to-natal = dashed
- **Color coding**: Natal = gold, Transit = teal `#5ec4c4`

## Files Modified
- `src/engine/astronomy.ts` — exported `getHouseForLongitude()`
- `src/engine/transits.ts` — added `assignTransitHouses()`, imported `getHouseForLongitude`
- `src/components/chart/ChartWheel.tsx` — extended with transit rendering, tooltips, hover logic
- `src/components/results/TransitReadingPage.tsx` — passes transit data to ChartWheel

## Verification
- Build passes with zero errors (`npm run build`)
- Existing pages (ResultsPage, SynastryPage, SkyTodayChart) render identically — no regressions from optional props
- React hooks ordering is correct (useMemo before conditional return)
