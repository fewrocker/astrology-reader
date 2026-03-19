# Proposal: Interactive Chart-Driven Navigation

## Problem / Opportunity

The chart wheel is the visual centerpiece of astrology — it's what users are drawn to first. But currently it functions as a static illustration. All the real information lives in scrollable tables and cards *below* the chart. Astrology lovers want to *explore* their chart visually: click a planet, see its story; hover an aspect line, understand the dynamic.

The disconnect between the beautiful chart and the detailed reading creates a fragmented experience. Users see their chart, then scroll past it to read about it separately. Bridging this gap would make the experience feel immersive and modern.

## Proposed Solution

1. **Click-to-expand planet details**: Tapping/clicking a planet glyph on the chart wheel opens an inline panel (slide-out or overlay) showing that planet's sign, house, dignity, aspects, and full interpretation — without leaving the chart view.
2. **Aspect line interaction**: Hovering an aspect line highlights both connected planets and shows a tooltip with the aspect name, exact orb, and a one-line interpretation. Clicking opens the full aspect interpretation.
3. **House sector highlight**: Clicking a house segment highlights the sector and shows which planets occupy it, the house theme, and ruling planet info.
4. **Planet-to-planet connections**: When a planet is selected, all its aspect lines brighten while non-connected lines fade, revealing that planet's relational network at a glance.
5. **Smooth scroll anchor**: Clicking "See full details" in the chart overlay smoothly scrolls to the corresponding section in the reading below, maintaining the connection between visual and textual.
6. **Mobile-friendly**: On mobile, taps open a bottom sheet rather than hover tooltips.

## Impact & Effort

- **Impact**: HIGH — Transforms the chart from decoration to the primary navigation tool. This is the kind of feature that makes users say "wow" and share with friends.
- **Effort**: MEDIUM-HIGH — Requires significant SVG interaction work, state management for selected planet, and responsive overlay design.
- **Dependencies**: ChartWheel.tsx, ReadingDisplay.tsx, aspect data, interpretation data.

## Implementation Summary

- Modify: `src/components/chart/ChartWheel.tsx` — add click handlers, selection state, hover effects, aspect line dimming, info overlay rendering
- New component: `src/components/chart/ChartDetailPanel.tsx` — slide-out panel showing selected planet/aspect details
- Modify: `src/components/results/ResultsPage.tsx` — coordinate chart selection state with reading sections, scroll-to anchors
- New component: `src/components/chart/MobileChartSheet.tsx` — bottom sheet variant for mobile interaction
