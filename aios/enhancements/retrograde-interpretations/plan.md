> Imported from proposals/retrograde-interpretations.md

# Enhancement: Retrograde Interpretation & Awareness

## What Exists Today
- Retrograde detection is fully implemented in `src/engine/astronomy.ts` (`isRetrograde()` function)
- Every `PlanetPosition` has a `retrograde: boolean` field
- "Rx" badge shown on planet cards in `ReadingDisplay.tsx`
- "R" marker + ℞ symbol shown on chart wheel in `ChartWheel.tsx`
- ℞ column in planet positions table on `ResultsPage.tsx`
- `RetrogradeSection` in `TransitReadingPage.tsx` shows retrograde activity status
- Transit retrogrades show status (Retrograde/Stationing) but no interpretation

## What the User Wants
- Natal retrograde interpretations: dedicated text explaining what each retrograde planet means at birth
- Retrograde summary card: a section listing all natal retrogrades together with overall pattern interpretation
- Transit retrograde context: explain what retrograde transits mean for the user's chart
- Visual ℞ indicator already exists on chart wheel — no changes needed there

## What Needs to Change

### New Files
- `src/data/interpretations/retrogrades.ts` — natal retrograde interpretations per planet + transit retrograde context + summary narratives

### Modified Files
- `src/data/interpretations/index.ts` — import retrogrades, add retrograde data to PlanetReading and FullReading, wire into assembleReading
- `src/components/reading/ReadingDisplay.tsx` — add Retrograde Summary section, show retrograde interpretation in expanded planet cards
- `src/components/results/TransitReadingPage.tsx` — add interpretive text to RetrogradeSection

## Implementation Checklist

- [x] Create `src/data/interpretations/retrogrades.ts` with natal retrograde interpretations for all 8 planets (Sun/Moon never retrograde), transit retrograde context per planet, and summary narratives
- [x] Update `src/data/interpretations/index.ts`: add `retrogradeInterpretation` to `PlanetReading`, add `retrogradeCount`/`retrogradeSummary` to `FullReading`, wire into `assembleReading()`
- [x] Update `ReadingDisplay.tsx`: show retrograde interpretation in expanded planet card, add "Retrograde Planets" summary section
- [x] Update `TransitReadingPage.tsx`: add interpretive text to each retrograde activity entry
- [x] Build and verify zero errors
- [x] Test full reading flow and transit reading flow
