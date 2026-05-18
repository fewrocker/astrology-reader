# code-advance-scoring-extraction

**Type:** Code Enhancement
**Originated by:** Jobs

## Problem / Opportunity

`src/components/reading/AdvanceTab.tsx` is a 700+ line file that mixes two distinct responsibilities: a React component tree (the slider UI, marker dots, category banner, aspect rows, chart wheel, planet table) and a self-contained scoring engine. The engine is not a few helper functions — it is the load-bearing logic of the entire advance feature:

- `computeCombinedWeight` — the planet-weighted, orb-adjusted constellation scorer
- `scoreSnapshot` — the priority-ordered decision tree (power → shift → favorable → challenging → neutral)
- `runAdvancePreCalculation` — the generic loop shared by both solo and couple advance tabs (hysteresis pass, density cap, category reservation)
- `preCalculateSnapshots` — the solo-chart entry point for `runAdvancePreCalculation`
- `PLANET_WEIGHT` — the weighting table that determines how Saturn at 0.5° orb dominates a Venus trine at 2°
- `COMBINATION_PLANETS`, `COMBINATION_WEIGHT_THRESHOLD`, `COMBINATION_WEIGHT_NORMALIZE` — the three constants that define when a constellation of aspects crosses the threshold to fire a marker
- `ORB_THRESHOLDS`, `MARKER_HYSTERESIS_ORB`, `SLOW_PLANETS_FOR_BANNER` — the tuning constants that govern orb windows, hysteresis smoothing, and which planets qualify as slow
- `ASPECT_VERB_BANNER` — the verb archetype table used inside reason strings
- `detectAngleContact` — the utility that checks whether a transit planet is within orb of a natal angle

All of these are exported from `AdvanceTab.tsx` and consumed by `CoupleAdvanceTab.tsx`, which imports them explicitly at lines 16–22:

```ts
import {
  ADVANCE_CONFIG, CATEGORY_HALO,
  ORB_THRESHOLDS, MARKER_HYSTERESIS_ORB, SLOW_PLANETS_FOR_BANNER,
  ASPECT_VERB_BANNER, PLANET_WEIGHT,
  COMBINATION_PLANETS, COMBINATION_WEIGHT_THRESHOLD, COMBINATION_WEIGHT_NORMALIZE,
  computeCombinedWeight,
  detectAngleContact, MarkerDot, OverviewStrip, MarkerTooltip,
} from './AdvanceTab'
```

This import conflates two unrelated concerns in a single statement: scoring engine symbols (`computeCombinedWeight`, `COMBINATION_PLANETS`, `PLANET_WEIGHT`, etc.) and UI component symbols (`MarkerDot`, `OverviewStrip`, `MarkerTooltip`). Any change to how `AdvanceTab.tsx` is organized — splitting the component, converting it to lazy-loaded, extracting the interpretation tables — risks breaking `CoupleAdvanceTab`'s import chain at the module level. The engine functions cannot be tested or reused without importing a React component file. The scoring logic is invisible to the `src/engine/` directory, where the rest of the codebase's calculation layer lives (`transits.ts`, `synastry.ts`, `aspects.ts`, `zodiac.ts`).

The coupling also creates a false dependency direction. `CoupleAdvanceTab` is a peer of `AdvanceTab` in the component tree — both are reading-tab components. Having `CoupleAdvanceTab` import its core scoring primitives *from* `AdvanceTab` implies that `AdvanceTab` is a library module for `CoupleAdvanceTab`, when in reality both tabs use the same engine. The component boundary is not where it should be.

## Desired State

A new file, `src/engine/advanceScoring.ts`, owns the advance scoring engine. All pure computation and scoring constants move there:

- **Scoring constants:** `PLANET_WEIGHT`, `COMBINATION_PLANETS`, `COMBINATION_WEIGHT_THRESHOLD`, `COMBINATION_WEIGHT_NORMALIZE`, `ORB_THRESHOLDS`, `MARKER_HYSTERESIS_ORB`, `SLOW_PLANETS_FOR_BANNER`, `ASPECT_VERB_BANNER`
- **Scoring types:** `MarkerCategory`, `SnapshotScore`, `AdvanceSnapshot`, `AdvanceConfig`
- **Scoring functions:** `computeCombinedWeight`, `detectAngleContact`, `scoreSnapshot`, `runAdvancePreCalculation`, `preCalculateSnapshots`
- **Config table:** `ADVANCE_CONFIG` (drives the loop parameters for both component tabs)

`src/engine/advanceScoring.ts` has no React imports. It depends only on engine types (`transits.ts`, `types.ts`, `aspects.ts`), data interpretation modules (`retrogrades.ts`, `transitAspectBriefs.ts`, `houseThemes.ts`), and utilities (`lruMap.ts`).

Both `AdvanceTab.tsx` and `CoupleAdvanceTab.tsx` import their scoring primitives from `src/engine/advanceScoring.ts`. The import from `AdvanceTab` in `CoupleAdvanceTab` narrows to UI-only symbols: `MarkerDot`, `OverviewStrip`, `MarkerTooltip`, and the shared type re-exports that belong to the component boundary.

The result is a codebase where the directory structure tells the truth: `src/engine/` contains calculation logic, `src/components/` contains React UI. A developer looking for "how does the advance scoring algorithm work?" navigates to `src/engine/advanceScoring.ts` — not into a 700-line component file. The scoring logic is testable in isolation. The component files become thinner and focused on rendering. The next addition to the scoring engine (a new threshold, a new category, an additional orb table) has an unambiguous home that neither component file needs to change to accommodate.

## Outcome

**Status:** completed
**Branch:** sprint-0022-task-0007-code-advance-scoring-extraction
**Commit:** 126cdcc

### Symbols moved to `src/engine/advanceScoring.ts`

**Types:**
- `MarkerCategory`
- `SnapshotScore`
- `AdvanceSnapshot`
- `AdvanceConfig`

**Constants:**
- `ADVANCE_CONFIG`
- `PLANET_WEIGHT`
- `COMBINATION_PLANETS`
- `COMBINATION_WEIGHT_THRESHOLD`
- `COMBINATION_WEIGHT_NORMALIZE`
- `ORB_THRESHOLDS`
- `MARKER_HYSTERESIS_ORB`
- `SLOW_PLANETS_FOR_BANNER`
- `ASPECT_VERB_BANNER`

**Functions:**
- `computeCombinedWeight`
- `detectAngleContact`
- `scoreSnapshot`
- `runAdvancePreCalculation`
- `preCalculateSnapshots`

### Files updated

- `src/engine/advanceScoring.ts` — created; pure engine module, no React imports
- `src/components/reading/AdvanceTab.tsx` — removed scoring symbols; imports from engine; retains `MarkerDot`, `OverviewStrip`, `MarkerTooltip`, `MARKER_COLORS`, `CATEGORY_LABELS`, `CATEGORY_HALO`, `CATEGORY_PRIORITY`, `advanceSnapshotSessionCache`
- `src/components/reading/CoupleAdvanceTab.tsx` — scoring imports from `../../engine/advanceScoring`; UI imports from `./AdvanceTab`
- `src/components/reading/DailySnapshotCard.tsx` — `MarkerCategory` from engine
- `src/components/reading/TodayPage.tsx` — `SnapshotScore` from engine
- `src/components/reading/TransitTimeline.tsx` — `MarkerCategory` from engine
- `src/components/results/SolarReturnPage.tsx` — `AdvanceConfig`, `AdvanceSnapshot`, `ADVANCE_CONFIG`, `preCalculateSnapshots` from engine
- `src/components/results/TransitReadingPage.tsx` — `AdvanceSnapshot`, `MarkerCategory`, `preCalculateSnapshots` from engine

Build: `npm run build` passes with zero TypeScript errors.
