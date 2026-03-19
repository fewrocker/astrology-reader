# Proposal: Synastry Bi-Wheel Chart Visualization

## Problem / Opportunity

The couple synastry feature calculates rich cross-chart data — aspects between partners, house overlays, composite chart — but presents everything as tables and text cards. In traditional astrology practice, synastry is understood visually through a **bi-wheel chart**: one person's chart in the inner wheel, the partner's planets placed on the outer wheel. This instantly shows how two people's energies interact spatially.

Without the bi-wheel, the synastry experience feels like reading a spreadsheet about love. Astrology lovers expect the visual "aha" moment of seeing their partner's Venus land on their 7th house cusp.

## Proposed Solution

1. **Bi-wheel chart**: Render the inner person's natal chart as the inner wheel (houses, signs, planets) and overlay the partner's planets on an outer ring, each connected by aspect lines to the inner chart's planets.
2. **Toggle perspective**: A button to swap who's inner vs. outer ("See from [Partner]'s perspective"), which flips the bi-wheel so the user can see both viewpoints.
3. **Cross-chart aspect lines**: Colored lines drawn between inner and outer planets showing synastry aspects (different line style from natal aspects — dashed vs. solid).
4. **House overlay visualization**: When a partner's planet falls in a house on the inner chart, that house sector subtly glows, making house overlay placements immediately visible.
5. **Composite chart option**: A toggle to switch from bi-wheel view to composite chart view (midpoint positions on a single wheel).

## Impact & Effort

- **Impact**: HIGH — This is *the* expected visualization for synastry in any serious astrology tool. It transforms the couple's reading from analytical to emotional.
- **Effort**: MEDIUM-HIGH — Extends the existing ChartWheel SVG with a second ring of planets and cross-chart aspect line rendering. The data is already calculated.
- **Dependencies**: Existing ChartWheel component, synastry calculation data (cross-aspects, house overlays, composite positions).

## Implementation Summary

- New component: `src/components/chart/BiWheelChart.tsx` — extends ChartWheel with outer planet ring, cross-aspect lines, perspective toggle
- Modify: `src/components/results/SynastryPage.tsx` — replace current single chart display with bi-wheel, add perspective toggle button, add composite chart toggle
- Modify: `src/components/chart/ChartWheel.tsx` — refactor to accept optional `outerPlanets` prop for reuse
- Reuse existing synastry data from `src/engine/synastry.ts`
