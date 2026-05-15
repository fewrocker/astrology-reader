# Code Review — sprint-0016-task-0003-feat-synastry-bi-wheel

**Reviewed by:** Task agent (self-review)
**Date:** 2026-05-15
**Build status:** PASS (zero TypeScript errors)

---

## Summary

The bi-wheel implementation extends `ChartWheel.tsx` with two new props (`synastryPlanets?: PlanetPosition[]` and `synastryAspects?: SynastryAspect[]`) and adds a `SynastryPage.tsx` layout change replacing the side-by-side grid with a single bi-wheel. The approach correctly reuses all existing coordinate infrastructure (polarToXY, offset, zodiac ring, house lines) rather than duplicating them.

---

## Blocking Issues

None. Build passes cleanly.

---

## Non-Blocking Issues

1. **Superscript "2" placement when retrograde.** Spec 3.4 places the "2" at (+10, -8); spec 3.5 places Rx at (+10, +2). These positions match the transit planet pattern exactly. If a synastry planet is both hovered (glyph font-size 14) and retrograde, the "2" and "R" will appear close together at slightly different y positions. This is acceptable — it matches the transit planet behavior and was not flagged in the transit implementation.

2. **`synastryAspects` prop used in `SynastryPlanetTooltip`.** The component receives the full unfiltered `synastryAspects` prop (not `filteredSynastryAspects`) for the tooltip's "Cross-Aspects to Person 1" list. This means minor aspects (quincunx, semi-sextile) that are filtered out of the line render will still appear in the planet tooltip's aspect list. This is arguably more informative in the tooltip context, but could cause mild visual inconsistency (a tooltip shows an aspect that has no corresponding line). Consider documenting this as intentional or filtering to major types in the tooltip.

3. **`isSynastryMode` gate prevents transit ring.** The `!isSynastryMode &&` guard on transit planet rendering is correct per spec 1.4, but transit aspect lines (lines 959–1008) are still gated on `transitPlanets && transitAspects` — they don't have the `!isSynastryMode` guard. In practice this is safe because both props would not be passed together, but adding the guard would make the exclusivity explicit.

---

## Observations

- **Type correctness:** `synastryPlanets` is `PlanetPosition[]` throughout — `dailyMotion` is never accessed. `SynastryAspect` type used without casting to `TransitAspect`. Clean.
- **`filteredSynastryAspects` useMemo:** Correctly keyed on `synastryAspects` prop. `origIdx` preserved in the mapped array so hover state correctly indexes into the original array.
- **Hover dimming logic:** The `isConnectedToHoveredSynastry` / `isConnectedToHoveredPlanet` logic mirrors the transit dimming pattern. Base opacity 0.30 is within the spec's 0.25–0.35 range.
- **Cross-aspect line color spec:** Uses `getAspectColor()` which returns `#4a7fb5` / `#b54a4a` / `#c9a84c` — matches spec 4.6 exactly.
- **No radial nudge:** The `tooClose` nudge block is only in the transit planet render path; synastry planets render directly at `SYNASTRY_PLANET_R` — spec 2.3 satisfied.
- **Aria labels:** `aria-label` on `<svg>` updated dynamically; each synastry `<g>` has `aria-label="{name} in {sign} — Partner planet"` — spec 8.1 and 8.2 satisfied.
- **CurrentMoonWidget removal:** Import removed along with usage — no dead import.
- **SynastryAspectsSection:** `defaultOpen` removed from `<CollapsibleSection>` — correctly collapsed.
- **IndividualChartSection:** Was already using `<CollapsibleSection>` without `defaultOpen` — correctly collapsed.

---

## Verdict

**APPROVE.** All 14 spec groups are implemented. Build passes. No blocking issues. The two non-blocking issues are minor and do not affect correctness or user experience materially.
