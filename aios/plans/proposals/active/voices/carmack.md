# John Carmack — Numerology Sky Chart Voice

Let me think through the technical path for this feature carefully.

## What already exists

- `ChartWheel.tsx` — A 700×700 SVG with full polar coordinate layout. Zodiac ring, house cusps, planet glyphs, aspect lines, tooltips. Rich interactivity. ~600+ lines.
- `src/engine/astronomy.ts` — Already calculates planets, house cusps, angles (ASC/MC/DSC/IC), North Node. This data is already on the NumerologyPage via AppContext (if chart has been calculated).
- `src/engine/numerology.ts` — Has `reduceToSingleDigit()` with master number support. This is exactly the reduction function needed.
- `NumerologyPage.tsx` — Currently accesses `chartData` from context (used for cross-reading). The data is there.

## What needs to be built

**1. A `NumerologySkyChart.tsx` component** — NOT a fork of `ChartWheel.tsx`. The shared logic is the polar coordinate math, which is maybe 30 lines. The rendering is entirely different:
- No planet glyphs → numbers
- No aspect lines → frequency-driven size/glow per number
- House rings still useful as context
- Zodiac ring still useful as reference

The cleanest approach: create a new self-contained SVG component that derives its coordinate math from the same constants as ChartWheel (OUTER_R=344, INNER_R=234, etc.) but has its own render logic. This avoids coupling to ChartWheel's complexity.

**2. A `numerologyReduction.ts` utility or extension to `numerology.ts`** — A function that takes chart data (planets + degrees + houses) and returns an array of `{label, degree, number, source}` objects. This is the data bridge between astronomy and numerology:
```
buildNumerologyChartData(chartData: ChartData): NumerologyChartPoint[]
```

Where `NumerologyChartPoint = { label: string, eclipticDegree: number, reducedNumber: number, source: 'planet' | 'house_cusp' | 'angle' | 'node' }`

**3. Data subset decision (the research question from guidelines)**:
Based on analysis:
- **Planets (10 points)**: Sun through Pluto — degree reduced. Best source. Spread across chart, personal.
- **House cusps (12 points)**: Degrees reduced. Places numbers at sector boundaries. Adds structural coverage.
- **North Node (1 point)**: Degree reduced. Karmic significance, worth including.
- **Skip aspects**: No clear positional placement — would overlap with existing points.
- **Skip sign-as-number**: Would cluster at 30° intervals, not reflective of individual chart.
- **Skip DSC/IC as separate entries**: They're 180° from ASC/MC — redundant.

Total: 23 points on the chart. Rich but not overwhelming.

**4. Frequency analysis function**: Count occurrences of each number (1-9, 11, 22, 33) across all chart points. Return sorted array for the legend bar and for driving visual emphasis (larger font, brighter glow for high-frequency numbers).

**5. GPT call extension**: `generateNumerologySkyChartReading(chartData, frequencies, birthData, apiKey)` — takes the top 2-3 dominant numbers, their chart sources, and the full frequency table. Sends to GPT for a specific sky-chart reading distinct from the existing narrative.

## Complexity assessment

- Building `NumerologySkyChart.tsx` from scratch: Medium. The coordinate math is straightforward. The visual polish (glows, size scaling) takes care.
- The data pipeline (`buildNumerologyChartData`): Easy. Pure transformation.
- Integrating into NumerologyPage: Easy. One new section at the top.
- The GPT call: Easy. One new function in gptInterpretation.ts.

**What's NOT hard but might seem hard**: The coordinate math for placing numbers. The same `eclipticToSVG(degree)` conversion used in ChartWheel works directly — just place a `<text>` element at that coordinate instead of a glyph path.

**What IS hard**: The visual design of the chart. Making numbers feel celestial (not like a spreadsheet) requires careful font sizing, color gradients, glow intensity scaling, and preventing label overlap for nearby degrees.

**Label overlap problem**: Two planets at similar degrees (e.g., 5° apart) will have overlapping numbers. Need a simple collision-avoidance algorithm or radial offset for close neighbors. This is solvable with a few lines of dedup logic.

## Build order

1. `buildNumerologyChartData()` utility function
2. `NumerologySkyChart.tsx` component (SVG rendering)
3. Frequency bar component
4. GPT reading function + wire-up in NumerologyPage
5. Integration at top of NumerologyPage
