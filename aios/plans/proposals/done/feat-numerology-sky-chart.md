# feat-numerology-sky-chart

**Type**: Feature
**Originated by**: Jobs + Carmack + Miyazaki + Taleb (all four voices — unanimous priority)

---

## Problem / Opportunity

The numerology section is now rich with GPT readings, expanded number cards, and a Discuss modal. But it still lacks a visual centerpiece. When users open the astrology section, a chart wheel immediately communicates "this is about you, specifically — here is the universe at your birth." Numerology has no equivalent. It starts with text, not feeling.

The Numerology Sky Chart is the missing visual moment: a circular sky map where every chart element is rendered as its numerological number instead of a planet glyph. Users see their sky of numbers before reading a single word. Dominant numbers glow larger and brighter — the visual itself communicates what matters before the reading explains why.

---

## Research: Numerological Reduction of Birth Chart Elements

### What can be reduced

| Source | Example | Reduction | Count |
|--------|---------|-----------|-------|
| Planet ecliptic degree (0-360°) | Sun at 247° → 2+4+7=13 → 4 | Single digit | 10 planets |
| House cusp degree (0-360°) | H1 at 113° → 1+1+3=5 | Single digit | 12 cusps |
| North Node degree | Node at 88° → 8+8=16 → 7 | Single digit | 1 point |
| Aspects (degree between planets) | No clear positional placement | Skip | — |
| Sign-as-number (Aries=1…Pisces=12→3) | Would cluster at 30° intervals | Too noisy | Skip |
| Planet house number | Redundant with cusp data | Skip | — |

**Selected subset**: Planets (10) + House cusps (12) + North Node (1) = **23 chart points**

This subset is rich, varied, and non-redundant. Inner planets cluster naturally but the house cusps distribute across all 360°. 23 points gives the chart density without overwhelming it.

### Master number handling

Master numbers (11, 22, 33) are preserved — not reduced further — consistent with the existing `reduceToSingleDigit()` function in `src/engine/numerology.ts`. These receive special visual treatment (gold glow, distinct styling).

### System alignment

Pythagorean system, consistent with the existing numerology engine. No Chaldean variant.

### Prior art

In traditional Hellenistic astrology, each degree of the zodiac has a "term lord" that assigns a number-like quality. Some modern numerology-astrology hybrids (e.g., Dan Millman's *The Life You Were Born to Live*) cross-reference planetary degree positions. No existing web tool renders these positions visually as a sky chart. This is a genuine differentiator.

---

## Proposed Solution

A `NumerologySkyChart` component rendered at the top of `NumerologyPage`, immediately after the page header. The chart:

1. **Derives chart points** via a new `buildNumerologyChartData(chartData)` utility that:
   - Takes `chartData` from AppContext (already available on NumerologyPage)
   - For each planet, reduces its ecliptic degree to a single digit (preserving master numbers)
   - For each house cusp, reduces its degree
   - For the North Node, reduces its degree
   - Returns an array of `NumerologyChartPoint[]`: `{ label, eclipticDegree, reducedNumber, source }`

2. **Renders a new `NumerologySkyChart.tsx` SVG component** — NOT a fork of ChartWheel, but a new component using the same coordinate constants:
   - Same SIZE=700, CX/CY=350 center
   - Outer zodiac ring (cosmetic reference, same as ChartWheel's zodiac ring)
   - House dividers at cusp positions
   - Numbers plotted at their ecliptic positions using the same `eclipticToSVG(degree)` math
   - Collision avoidance: when two points fall within 8° of each other, offset one radially inward/outward
   - Frequency-driven visual emphasis: numbers appearing 3+ times get larger font (1.3×) and a subtle glow ring; the single most-frequent number gets an additional gold tint

3. **Frequency bar** — a minimal horizontal summary below the chart. Displays each number (1-9, plus 11/22/33 if present) with its count. Visual weight (size + brightness) communicates frequency. Numbers not present are dimmed. Tap/hover shows the chart sources for that number.

4. **GPT sky chart reading** — a new `generateNumerologySkyChartReading()` function in `gptInterpretation.ts`:
   - Fires after chart renders (never blocks it)
   - Receives: user name (if available), birth data, full frequency table, top 2-3 dominant numbers with their chart sources (e.g., "7 appears at Sun 247°, Venus 43°, MC 187°")
   - Prompt specifically asks: what does this pattern reveal? Why are these numbers dominant? What do they mean in combination given their chart sources?
   - Distinct from the existing narrative (which is about the numbers themselves) — this reading is about their distribution across the sky
   - Shows the gold-shimmer skeleton while loading; fades in when ready

5. **Null state handling**: If `chartData` is null (user has a birth date but hasn't generated a chart), show a gentle prompt card instead of the sky chart: "Generate your birth chart to see your sky of numbers." No crash, no empty circle.

---

## Impact / Effort

**Impact**: High — adds the visual centerpiece that numerology currently lacks; creates the "wow moment" that astrology has had from day one; differentiates this app from every other numerology tool

**Effort**: Medium — new SVG component, data pipeline utility, one GPT function, integration into NumerologyPage

---

## Why this is a Feature, not an Issue Fix or Code Enhancement

This adds a net-new, user-visible visual capability that changes how users experience the numerology section. It creates a new primary interaction: seeing your sky of numbers before reading about them.

---

## Dependencies

- F3 (Astronomical Calculation Engine) — must be complete (it is)
- F5 (Chart Wheel) — reuses coordinate constants and visual language
- F12 (GPT Integration) — reuses pattern from existing GPT calls
- NumerologyPage must have access to `chartData` from AppContext (it does, already used for cross-reading)

---

## Implementation Summary

**New files:**
- `src/components/chart/NumerologySkyChart.tsx` — the SVG chart component
- `src/engine/numerologyChart.ts` — `buildNumerologyChartData()` utility

**Modified files:**
- `src/services/gptInterpretation.ts` — add `generateNumerologySkyChartReading()`
- `src/components/results/NumerologyPage.tsx` — add chart at top, wire GPT call

**Key implementation details:**
- Coordinate math: `eclipticToSVG(deg) = { x: CX + R * cos(deg * π/180 - π/2), y: CY + R * sin(deg * π/180 - π/2) }` — standard polar conversion
- Collision avoidance: sort points by degree; for any pair within 8°, offset the second point to PLANET_R ± 20px radially
- Frequency emphasis: compute frequency map; scale font-size linearly from 14px (freq=1) to 20px (freq=dominant); opacity from 0.7 to 1.0
- Master number detection: numbers 11, 22, 33 get gold text color regardless of frequency
- No aspect lines — this chart speaks only numbers
