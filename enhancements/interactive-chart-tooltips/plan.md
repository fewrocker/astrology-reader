# Enhancement: Interactive Chart Tooltips

## What Exists Today

**ChartWheel.tsx** (`src/components/chart/ChartWheel.tsx`):
- 700×700 SVG viewBox with zodiac segments, house cusps, aspect lines, planet glyphs
- `hoveredPlanet` state tracks which planet is hovered
- Planet hover: glow increases, glyph turns gold, aspect lines dim for non-connected
- Tooltip shows: planet name (+ retrograde symbol), position (`degree° sign minute'`), house number
- Tooltip is a fixed-size rect (170×56) centered in the chart
- No hover behavior on aspect lines
- No interpretation text shown on hover
- No hover on houses or zodiac signs

**Props**: `{ chartData: ChartData, aspects: Aspect[] }` — no reading/interpretation data passed

**Used in**:
- `ResultsPage.tsx` — natal chart, has full `reading` (FullReading) available
- `SynastryPage.tsx` — individual charts (2x), has reading data
- `TransitReadingPage.tsx` — natal chart reference, has reading data
- `SkyTodayChart.tsx` — landing page, no reading data (decorative)

**Interpretation data available** (from `src/data/interpretations/`):
- `planetInSign.ts`: 120 entries `{ brief, detail }` keyed by `Planet_Sign`
- `planetInHouse.ts`: 120 entries `{ brief, detail }` keyed by `Planet_H{n}`
- `aspectInterpretations.ts`: 100+ entries `{ brief, detail }` keyed by `Planet1_Type_Planet2`
- `houseThemes.ts`: 12 entries `{ house, name, theme, naturalRuler, naturalSign, brief }`
- `dignities.ts`: Dignity info per planet/sign `{ type, label, symbol, description }`

## What the User Wants

1. **Bigger chart** — make the chart wheel larger
2. **Rich planet tooltips** — hovering a planet shows its name, position, AND interpretation (sign meaning, house meaning, dignity)
3. **Aspect line hover** — hovering an aspect line shows the aspect type, planets involved, orb, and interpretation
4. **Beautiful interactive experience** — make the chart a rich exploration tool everywhere it's displayed

## What Needs to Change

### File Changes

**`src/components/chart/ChartWheel.tsx`** — Major rework:
1. Increase chart container max-width from `max-w-2xl` (caller) — but also increase SVG viewBox to 800×800
2. Add optional `reading` prop for interpretation data
3. Add `hoveredAspect` state (index or null)
4. Rich planet tooltip:
   - Show planet glyph + name + retrograde status
   - Position: `degree° sign minute' — House N`
   - Sign interpretation brief text
   - House interpretation brief text (if known time)
   - Dignity badge (if dignified/debilitated)
   - Larger tooltip box with proper wrapping
5. Aspect line hover:
   - Make aspect lines hoverable (wider invisible hit area)
   - Show aspect tooltip: symbol + type name + planet1 ↔ planet2
   - Orb and applying/separating status
   - Interpretation brief text
   - Color matches aspect nature
6. House segment hover (bonus): hovering house number shows house theme
7. Use foreignObject for rich HTML tooltips inside SVG

**`src/components/results/ResultsPage.tsx`**:
- Pass `reading` prop to ChartWheel
- Increase container width for chart

**`src/components/results/SynastryPage.tsx`**:
- Pass reading data to ChartWheel instances where available
- Increase container width

**`src/components/results/TransitReadingPage.tsx`**:
- Pass reading data to ChartWheel
- Increase container width

## Implementation Checklist

- [ ] 1. Update ChartWheel props to accept optional `reading: FullReading`
- [ ] 2. Add `hoveredAspect` state and aspect hover detection with invisible wider hit lines
- [ ] 3. Build rich planet tooltip using foreignObject with interpretation data
- [ ] 4. Build aspect line tooltip using foreignObject with aspect interpretation data
- [ ] 5. Add house cusp hover showing house theme
- [ ] 6. Increase chart SVG size and container sizes across all pages
- [ ] 7. Pass reading data from ResultsPage, SynastryPage, TransitReadingPage
- [ ] 8. Style tooltips to match mystic theme with proper text wrapping
- [ ] 9. Verify build compiles cleanly
- [ ] 10. Test all pages for regressions
