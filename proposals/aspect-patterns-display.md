# Proposal: Display Aspect Patterns

## Problem / Opportunity

The calculation engine already detects Grand Trines, T-Squares, Grand Crosses, and Yods (code exists in `src/engine/aspects.ts`), but these patterns are **never displayed** in the results UI. Aspect patterns are among the most significant features in a natal chart — astrologers consider them more important than individual aspects. This is essentially a finished feature that's invisible to users.

## Proposed Solution

Add a dedicated "Aspect Patterns" section to the reading display, shown between the aspects table and the element/modality analysis. Each detected pattern would be rendered as a visual callout card with:
- Pattern name and symbol (e.g., "Grand Trine △△△")
- The planets involved and their signs
- A brief interpretation of what the pattern means
- A mini-diagram showing the pattern geometry within the chart

## Impact & Effort

- **Impact**: HIGH — Reveals already-computed data; differentiates from basic astrology apps
- **Effort**: Low (2 hours — backend done, just needs UI + ~8 interpretation texts)
- **Dependencies**: F4 (Aspect Calculation — already complete), F7 (Detailed Breakdown)

## Implementation Summary

- Add pattern interpretation texts to `src/data/interpretations/` (~8 entries for 4 pattern types × general/specific)
- Add an "Aspect Patterns" section to `ReadingDisplay.tsx` with pattern cards
- Pass detected patterns from `aspects.ts` through to the results display
- Style cards with the mystic theme (golden borders, pattern-specific icons)

## Status: Implemented

Implemented via `/implement aspect-patterns-display`. See [enhancements/aspect-patterns-display/result.md](../enhancements/aspect-patterns-display/result.md).
