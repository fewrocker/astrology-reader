# Transit Bi-Wheel Chart Overlay

## Status: Implemented

See [enhancements/transit-bi-wheel/result.md](../../enhancements/transit-bi-wheel/result.md) for implementation results.

## Vision

> Please include that bi-wheel or transit overlay for the transits with complete understanding of what it is and how to implement

The transit reading page currently shows the natal chart as a static reference and lists transit data as text below. The user wants to **see transit planets visually overlaid on their natal chart** — the standard astrology bi-wheel format where:

- The **inner wheel** shows your birth chart (houses, signs, natal planet positions)
- The **outer ring** shows where the planets are *right now* (transit positions)
- **Cross-chart aspect lines** connect transit planets to natal planets they're aspecting

This is how every professional astrology app (Co-Star, TimePassages, Astro.com) presents transits. It transforms the transit reading from "reading a report" into "seeing the sky interacting with your chart."

## Research

### What is a Bi-Wheel Chart?

A bi-wheel is two concentric astrological charts sharing the same zodiac/house framework. In a transit bi-wheel:

1. **Inner wheel** — the natal chart. Houses are defined by the natal ascendant. Natal planets are placed at their birth positions. This never changes.
2. **Outer wheel** — transit (current sky) planets placed at their present ecliptic longitudes on the same zodiac framework. They share the natal chart's house system, meaning a transit planet's position tells you which natal house it's transiting through.
3. **Cross-aspect lines** — dashed or dotted lines connecting a transit planet to a natal planet when they form an aspect (conjunction, square, trine, etc.). These are the transit-to-natal aspects already calculated in `transitData.transitAspects`.

### Key UX patterns from professional apps:
- Transit planets are visually distinct from natal planets (different color, smaller, or different ring)
- Transit-to-natal aspect lines use a different style from natal-to-natal (dashed vs solid)
- Transit planet glyphs often include a "T" marker or use a distinct color (green, cyan, or lighter tone)
- The natal chart remains the visual anchor — transit overlay never obscures it
- Hovering/tapping a transit planet shows what sign it's in, which natal house it's transiting, and active aspects to natal planets

### Transit house placement
Transit planets have `house: 0` in the current system because house assignment was skipped. For the bi-wheel, we need to calculate which natal house each transit planet falls in. This can be done using the existing `getHouseForLongitude()` function from `astronomy.ts` (currently not exported) applied to transit longitudes against natal house cusps.

## Current State

### What exists:
- **ChartWheel.tsx** — Renders natal chart as SVG (700×700 viewBox) with interactive hover/tap tooltips. Supports planets at `PLANET_R` (263) radius, aspect lines at `ASPECT_R` (210), house cusps, zodiac ring
- **TransitReadingPage.tsx** — Has access to both `chartData` (natal) and `transitData` (transits). Currently passes only natal data to ChartWheel. Transit info displayed as text sections below
- **Transit engine** (`transits.ts`) — Calculates `TransitPosition[]` (same shape as `PlanetPosition` plus `dailyMotion`) and `TransitAspect[]` (transit-to-natal cross-aspects with orb, applying status, nature)
- **Interactive tooltip system** — Desktop hover + mobile tap modal for planets, aspects, houses. Dual-mode with cursor-following tooltip and bottom-sheet modal
- **Synastry bi-wheel proposal** (unimplemented) — Similar concept for couple charts, planned as a separate `BiWheelChart.tsx` component

### Key file paths:
- `src/components/chart/ChartWheel.tsx` — main chart component to extend
- `src/components/results/TransitReadingPage.tsx` — consumer page, needs to pass transit data
- `src/engine/transits.ts` — transit calculation, `TransitPosition` type, `TransitAspect` type
- `src/engine/astronomy.ts` — `getHouseForLongitude()` function (currently not exported)
- `src/engine/types.ts` — `ChartData`, `PlanetPosition`, `PlanetName` types
- `src/data/interpretations/` — interpretation database (planet-in-sign, planet-in-house used by tooltips)

### Relevant constants:
```
SIZE = 700, CX/CY = 350
OUTER_R = 338  (outermost ring)
SIGN_R = 298   (zodiac sign ring inner edge)
INNER_R = 228  (house circle)
PLANET_R = 263 (natal planet orbit)
ASPECT_R = 210 (natal aspect line endpoints)
```

### Data available for transit planets:
- `transitData.currentPlanets: TransitPosition[]` — each has: `name`, `longitude`, `sign`, `degree`, `minute`, `retrograde`, `dailyMotion`, `house` (currently 0)
- `transitData.transitAspects: TransitAspect[]` — each has: `transitPlanet`, `natalPlanet`, `type`, `orb`, `applying`, `nature`, `symbol`

## Approach

**Extend ChartWheel with optional transit overlay** rather than creating a separate component. This preserves all existing interactivity (natal hover/tap tooltips) while adding transit-specific rendering on top.

### Why extend ChartWheel (not a new component):
- The existing component already handles all zodiac/house/planet rendering, coordinate math, tooltip system, and mobile support
- A transit bi-wheel shares 90% of the rendering code with the natal chart — it's the same chart with an extra ring of planets on top
- Creating a separate component would duplicate hundreds of lines and diverge over time
- The synastry bi-wheel proposal also suggested this approach ("refactor ChartWheel to accept optional `outerPlanets` prop")

### Rejected alternative: separate BiWheelChart component
- Would duplicate all SVG rendering, coordinate math, filter definitions, tooltip logic
- Any future chart enhancements would need to be applied in two places
- More code to maintain for the same result

### Architecture:

**New optional props on ChartWheel:**
```
transitPlanets?: TransitPosition[]
transitAspects?: TransitAspect[]
```

When these props are provided, ChartWheel renders the additional transit layers:

1. **Transit planet ring** — at a new `TRANSIT_PLANET_R` radius (between natal planets and zodiac ring, approximately 288) — placing transit glyphs in the space between natal planets and the zodiac sign band
2. **Transit-to-natal aspect lines** — dashed lines from transit planet positions to natal planet positions, using the same color coding but dashed stroke
3. **Transit tooltip hover/tap** — new HoverState kind `'transit'` with dedicated tooltip content showing transit-specific info (planet in sign, which natal house it's transiting, active aspects to natal planets)

**Visual distinction of transit planets:**
- Teal/cyan color scheme (`#5ec4c4`) vs gold for natal
- Slightly smaller planet circles (radius 11 vs 13 for natal)
- A subtle "T" superscript marker
- Transit aspect lines use `strokeDasharray="6 4"` (dashed) vs solid for natal

## Architecture

### Data flow:
```
TransitReadingPage
  ├─ state.chartData (natal)         ─┐
  ├─ state.aspects (natal aspects)    ─┼─→ ChartWheel
  ├─ state.transitData.currentPlanets ─┤    (renders both layers)
  └─ state.transitData.transitAspects ─┘
```

### Files to modify:

1. **`src/engine/astronomy.ts`** — Export `getHouseForLongitude()` so transit planets can be assigned to natal houses
2. **`src/engine/transits.ts`** — Add function to calculate natal house for each transit planet using natal house cusps; add helper `assignTransitHouses(transits, natalHouses)`
3. **`src/components/chart/ChartWheel.tsx`** — Add optional `transitPlanets`/`transitAspects` props, new radius constants, transit planet rendering layer, transit aspect lines layer, extended HoverState with `'transit'` kind, transit tooltip component
4. **`src/components/results/TransitReadingPage.tsx`** — Pass transit data to ChartWheel; compute transit house assignments before passing

### New radius constants:
```
TRANSIT_PLANET_R = 288  // Between natal planets (263) and zodiac ring inner (298)
```

This creates the classic bi-wheel layering: zodiac ring → transit planets → natal planets → aspect center.

### Extended HoverState:
```typescript
type HoverState =
  | { kind: 'planet'; name: string }
  | { kind: 'transit'; name: string }        // NEW
  | { kind: 'aspect'; index: number }
  | { kind: 'transitAspect'; index: number } // NEW
  | { kind: 'house'; house: number }
  | null
```

### TransitPlanetTooltip content:
- Planet glyph + name + "Transit" label
- Current position (degree° sign)
- Daily motion + direction (direct/retrograde)
- **Natal house transiting**: "Currently transiting your Nth house" (using computed house from natal cusps)
- **Active aspects to natal planets**: List all transit aspects involving this planet, each showing the natal planet, aspect type, orb, applying/separating

## Scope

### In scope:
- Transit planet ring on the chart wheel (outer ring with distinct visual style)
- Transit-to-natal dashed aspect lines
- Transit planet hover/tap tooltips with transit-specific content
- Transit-to-natal aspect hover/tap tooltips
- Transit planet natal house assignment
- Visual distinction (color, size, line style) between natal and transit elements
- Mobile touch support (same tap-to-modal pattern)

### Out of scope:
- Transit-specific interpretation database (e.g., "Transit Mars in your 7th house means...") — this could be a follow-up enhancement
- Transit-to-transit aspects (aspects between transit planets themselves)
- Animated transit motion (showing planets moving over time)
- Synastry bi-wheel reuse (separate proposal, different data source)
- Transit timeline/calendar view (separate proposal)

## Risks

1. **Visual clutter** — Adding 11 more planet glyphs + dashed aspect lines could make the chart busy. Mitigation: transit elements are more transparent by default, dimming when not hovered; hovering a transit planet highlights only its aspects.
2. **Planet overlap** — Transit planets may overlap with natal planets (especially when conjunct). Mitigation: use collision detection to nudge overlapping transit glyphs slightly outward, or show at different radii when too close.
3. **Touch target overlap** — On mobile, transit and natal planet circles may be close together. Mitigation: transit planets get slightly larger touch targets; when ambiguous, tap opens a disambiguation menu showing both options.
4. **Performance** — Additional SVG elements (11 circles, 11 glyphs, potentially 20+ dashed lines). Minimal risk — SVG handles this easily.

## Implementation Checklist

### Phase 1: Data Layer
- [ ] **1.1** Export `getHouseForLongitude()` from `src/engine/astronomy.ts` (add `export` keyword to the existing function)
- [ ] **1.2** Add `assignTransitHouses(transitPlanets: TransitPosition[], natalHouses: HouseCusp[]): TransitPosition[]` to `src/engine/transits.ts` — maps each transit planet's `house` field by calling `getHouseForLongitude(tp.longitude, cusps)` with natal house cusp longitudes

### Phase 2: ChartWheel Extension
- [ ] **2.1** Add optional props to ChartWheel: `transitPlanets?: TransitPosition[]`, `transitAspects?: TransitAspect[]`
- [ ] **2.2** Add new radius constants: `TRANSIT_PLANET_R = 288` (between natal planets at 263 and zodiac ring inner at 298)
- [ ] **2.3** Add SVG filter definitions for transit planet glow (teal/cyan `#5ec4c4` glow, softer than natal gold)
- [ ] **2.4** Extend `HoverState` type with `{ kind: 'transit'; name: string }` and `{ kind: 'transitAspect'; index: number }`
- [ ] **2.5** Render transit planet circles and glyphs at `TRANSIT_PLANET_R` — smaller circles (r=11), teal stroke, teal glyph color, "T" superscript marker. Place after natal planets in SVG order (renders on top)
- [ ] **2.6** Render transit-to-natal aspect lines — dashed lines (`strokeDasharray="6 4"`) from transit planet position (at `TRANSIT_PLANET_R`) to natal planet position (at `ASPECT_R`), color-coded by aspect nature. Include invisible 12px hit area lines for hover/tap. Place after natal aspect lines in SVG order but before planets
- [ ] **2.7** Add hover/tap handlers for transit planets (`onMouseEnter`, `onClick` calling `handleHoverEnter`/`handleTap` with `kind: 'transit'`)
- [ ] **2.8** Add hover/tap handlers for transit aspect lines (`kind: 'transitAspect'`)
- [ ] **2.9** Update `hoveredPlanet` logic to also dim natal aspect lines when a transit planet is hovered (show only aspects involving that transit planet)
- [ ] **2.10** Update aspect line opacity logic — when a transit planet is hovered, highlight transit aspect lines connected to it and dim the rest (both natal and transit)

### Phase 3: Transit Tooltips
- [ ] **3.1** Create `TransitPlanetTooltip` component (similar to `PlanetTooltip`) showing: planet glyph + "Transit" badge, current sign position, daily motion, retrograde status, natal house being transited, list of active transit aspects to natal planets with orb and nature
- [ ] **3.2** Create `TransitAspectTooltip` component showing: transit planet glyph + aspect symbol + natal planet glyph, aspect type name, orb, applying/separating, nature
- [ ] **3.3** Wire tooltips into the desktop hover tooltip rendering section (cursor-following div) and the mobile tapped modal section
- [ ] **3.4** Update `tooltipBorderColor` to return teal `#5ec4c4` for `kind: 'transit'` and `kind: 'transitAspect'`

### Phase 4: Page Integration
- [ ] **4.1** In `TransitReadingPage.tsx`, compute transit house assignments: call `assignTransitHouses(transitData.currentPlanets, chartData.houses)` to get transit planets with correct natal house values
- [ ] **4.2** Pass `transitPlanets` and `transitAspects` props to `<ChartWheel>`: `<ChartWheel chartData={chartData} aspects={aspects} transitPlanets={housedTransitPlanets} transitAspects={transitData.transitAspects} />`
- [ ] **4.3** Update the label below the chart from "Your natal chart" to "Your natal chart with current transits" when transit data is present
- [ ] **4.4** Ensure couple transit page (`SynastryPage.tsx` transit section) also passes transit data if applicable

### Phase 5: Polish & Edge Cases
- [ ] **5.1** Handle planet overlap: when a transit planet is within 8° longitude of a natal planet, nudge the transit glyph outward by 12px to prevent overlap
- [ ] **5.2** Verify mobile touch targets — transit planets should have sufficient hit area (at least r=16 transparent circle for touch)
- [ ] **5.3** When no transit data is provided (natal chart page, synastry page), ChartWheel renders identically to before — zero visual change
- [ ] **5.4** Build verification — `npm run build` with zero errors
- [ ] **5.5** Test on both desktop (hover) and mobile viewport (tap)
