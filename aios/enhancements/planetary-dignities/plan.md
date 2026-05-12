> Imported from proposals/planetary-dignities.md

# Enhancement: Planetary Dignities & Strength Analysis

## What Exists Today
- Planet-in-sign cards show planet name, sign, house, retrograde status, and sign interpretation (brief + detail)
- `ReadingDisplay.tsx` renders `PlanetCard` components in `PlanetSection`
- `src/data/interpretations/index.ts` assembles a `FullReading` with planet readings, aspects, patterns, elements, modalities
- `src/engine/types.ts` defines `PlanetName`, `ZodiacSign`, and related types
- `ResultsPage.tsx` renders sections in order: Summary → Focus → Planets → Aspects → Patterns → Balance → Houses

## What the User Wants
- Essential dignity labels (Domicile, Exalted, Detriment, Fall) on each planet card
- A Planetary Strength Overview section with visual heatmap/bars ranking planets by dignity
- Brief dignity-aware interpretation snippets
- Mutual reception detection and display

## Implementation Checklist

- [ ] 1. Create `src/data/interpretations/dignities.ts` with:
  - Rulership mapping (planet → domicile/exaltation/detriment/fall signs)
  - Dignity type enum/type
  - `getDignity(planet, sign)` function
  - `detectMutualReceptions(planets)` function
  - Brief interpretation snippets for each dignity level
  - Mutual reception interpretation text

- [ ] 2. Update `src/data/interpretations/index.ts`:
  - Add dignity info to `PlanetReading` interface
  - Add mutual reception data to `FullReading` interface
  - Call dignity functions in `assembleReading()`

- [ ] 3. Update `src/components/reading/ReadingDisplay.tsx`:
  - Add dignity badge to `PlanetCard` header row
  - Add dignity flavor text in expanded card view
  - Create `PlanetaryStrengthSection` component with strength bars
  - Create `MutualReceptionsCard` inside the strength section
  - Export `PlanetaryStrengthSection`

- [ ] 4. Update `src/components/results/ResultsPage.tsx`:
  - Import and render `PlanetaryStrengthSection` after Balance section

- [ ] 5. Build & verify zero errors, test with various charts

- [ ] 6. Update `planning/define-product.md` with F18 feature entry

- [ ] 7. Write `enhancements/planetary-dignities/result.md`
