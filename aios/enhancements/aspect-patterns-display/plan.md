> Imported from proposals/aspect-patterns-display.md

# Enhancement: Display Aspect Patterns

## What Exists Today
- `src/engine/aspects.ts` — `detectPatterns()` function detects Grand Trines, T-Squares, Grand Crosses, and Yods. Returns `AspectPattern[]` with `{ type, planets }`.
- The function is **never called** anywhere in the app.
- `src/components/reading/ReadingDisplay.tsx` — Has collapsible `Section` component used by all reading sections. Exports `AspectSection`, `PlanetSection`, `BalanceSection`, `FocusSection`.
- `src/components/results/ResultsPage.tsx` — Uses reading components in order: ReadingSummary → FocusSection → PlanetSection → AspectSection → BalanceSection.
- `src/data/interpretations/` — Has `types.ts`, `aspectInterpretations.ts`, `planetInSign.ts`, `planetInHouse.ts`, `index.ts`. No pattern interpretations exist.
- `src/context/appState.ts` — State has `aspects: Aspect[]` but no `patterns` field.
- `src/App.tsx` — Calls `calculateAspects()` but never `detectPatterns()`.

## What Needs to Change
1. Add pattern interpretation data
2. Call `detectPatterns()` and flow results through state into the UI
3. Add a new `AspectPatternsSection` component to the reading display
4. Show it in ResultsPage between AspectSection and BalanceSection

## Implementation Checklist

- [ ] 1. Create pattern interpretation data in `src/data/interpretations/patternInterpretations.ts`
  - Grand Trine: general interpretation (with element variants: Fire/Earth/Air/Water)
  - T-Square: general interpretation (with modality variants: Cardinal/Fixed/Mutable)
  - Grand Cross: general interpretation
  - Yod (Finger of God): general interpretation
  - Each entry has `brief` + `detail` fields matching `InterpretationEntry`

- [ ] 2. Wire pattern detection into the data flow
  - In `src/data/interpretations/index.ts`: add `PatternReading` interface, add `patterns` to `FullReading`, call `detectPatterns()` inside `assembleReading()`, look up interpretations
  - Import `detectPatterns` and `AspectPattern` from `../../engine/aspects`
  - Import pattern interpretations from `./patternInterpretations`

- [ ] 3. Build `AspectPatternsSection` in `src/components/reading/ReadingDisplay.tsx`
  - New exported component that receives `PatternReading[]`
  - Each pattern rendered as a highlighted card with:
    - Pattern name + icon/symbol
    - Planets involved with their glyphs and signs
    - Brief + expandable detail interpretation
  - Only rendered when patterns are detected (graceful no-op when empty)

- [ ] 4. Add `AspectPatternsSection` to `ResultsPage.tsx`
  - Import and render between AspectSection and BalanceSection
  - Pass `reading.patterns` as prop
  - Also add to `SynastryPage.tsx` for partner charts if patterns exist

- [ ] 5. Build & verify
  - `npx tsc -b` — zero errors
  - `npx vite build` — successful
  - Visually verify patterns appear for test chart data
