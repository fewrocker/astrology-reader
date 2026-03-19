# Enhancement Result: Aspect Patterns Display

## Summary

Added a new "Aspect Patterns" section to the birth chart reading that displays detected Grand Trines, T-Squares, Grand Crosses, and Yods — configurations that were already calculated by the engine but never shown to users.

## What Changed

### New Files
- **`src/data/interpretations/patternInterpretations.ts`** — Interpretation database for 4 pattern types (Grand Trine, T-Square, Grand Cross, Yod). Each has a symbol, brief summary, and detailed explanation. Includes element-specific flavor text for Grand Trines (Fire/Earth/Air/Water).

### Modified Files
- **`src/data/interpretations/index.ts`** — Added `PatternReading` interface and `patterns` field to `FullReading`. `assembleReading()` now calls `detectPatterns()` from the aspects engine, looks up interpretations, determines element flavor for Grand Trines, and includes pattern readings in the output.
- **`src/components/reading/ReadingDisplay.tsx`** — Added `AspectPatternsSection` component with collapsible pattern cards. Each card shows pattern type, symbol, involved planets with their signs/glyphs, brief interpretation, and expandable detail. Color-coded by pattern nature (green for Grand Trine, red for T-Square/Grand Cross, purple for Yod).
- **`src/components/results/ResultsPage.tsx`** — Imported and rendered `AspectPatternsSection` between the Aspects and Element/Modality Balance sections.

## Regression Testing
- `tsc -b`: zero errors
- `vite build`: 64 modules, successful
- Existing reading sections (planets, aspects, balance, focus) unchanged
- Pattern section gracefully hidden when no patterns detected (returns null)
