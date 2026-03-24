# Enhancement Result: Interactive Chart Tooltips

## Summary
Made the chart wheel highly interactive with rich HTML tooltip overlays. Chart stays at the original 700×700 size. Hovering planets, aspect lines, and house numbers reveals **full detailed interpretations** — the same content shown in the reading sections below, displayed as scrollable HTML overlays positioned near the cursor.

## Changes Made

### 1. Chart Size Preserved (700×700)
- SVG viewBox kept at original 700×700
- All container widths at original values (max-w-2xl, max-w-md, max-w-[640px])
- Chart renders at its natural, screen-fitting size

### 2. HTML Tooltip Overlay System
- Replaced constrained SVG `<text>` tooltips with rich HTML `<div>` overlays
- Component returns `<div className="relative">` wrapping SVG + tooltip layer
- Tooltip follows cursor position (offset 16px) and clamps to container bounds
- Scrollable up to 400px max height for long content
- Styled with backdrop blur, dark semi-transparent background, colored borders matching hover target
- `pointer-events: none` prevents tooltip flicker

### 3. Rich Planet Tooltips (Full Detail)
- Header: planet glyph, name, retrograde badge (Rx), dignity badge with colored label
- Position line: degree°minute' sign — House N
- **Full sign interpretation**: `signInterpretation.detail` (complete paragraph, same as expanded PlanetCard)
- **Full house interpretation**: `houseInterpretation.detail` (complete paragraph, same as expanded PlanetCard)
- **Dignity description**: colored box with full `dignity.description` text
- **Retrograde interpretation**: red-tinted box with full `retrogradeInterpretation.detail` (from `retrogrades.ts`)

### 4. Rich Aspect Line Tooltips (Full Detail)
- Invisible 12px-wide hit area for easy hovering
- Header: planet glyphs + aspect symbol + type name
- Orb, applying/separating, nature label
- **Full interpretation**: `interpretation.brief` as heading + `interpretation.detail` as paragraph

### 5. House Number Tooltips
- House name, theme keywords, natural ruler/sign, cusp position
- Full theme brief description
- Lists planets currently in that house
  - Natural ruler + natural sign + cusp position
  - Brief thematic description from `houseThemes.ts`
  - List of planets currently in that house

### 5. Unified Hover State
- Replaced simple `hoveredPlanet` string state with a discriminated union `HoverState`:
  - `{ kind: 'planet', name }` | `{ kind: 'aspect', index }` | `{ kind: 'house', house }` | null
- Only one tooltip visible at a time
- SVG-level `onMouseLeave` clears all hover state
- Tooltip elements have `pointerEvents: 'none'` to prevent flicker
- All tooltip content computed via `useMemo` for performance

### 6. Visual Polish
- Tooltip shadow filter added (`tooltipShadow` with feDropShadow)
- Each tooltip type has its own border color: gold (planets), aspect-nature-color (aspects), purple (houses)
- Semi-transparent background (#12121aee)
- Smooth transitions on all hover effects (200-300ms)

## Files Modified
- `src/components/chart/ChartWheel.tsx` — Major rewrite with new hover system and rich tooltips
- `src/components/chart/SkyTodayChart.tsx` — Increased container width
- `src/components/results/ResultsPage.tsx` — Increased chart container width
- `src/components/results/TransitReadingPage.tsx` — Increased chart container width
- `src/components/results/SynastryPage.tsx` — Increased chart container width

## New Dependencies
- `getPlanetInSignInterpretation`, `getPlanetInHouseInterpretation`, `getAspectInterpretation` from interpretations index
- `getDignity` from dignities module
- `HOUSE_THEMES` from houseThemes module
- React hooks: `useRef`, `useCallback`, `useMemo` added

## Regression Testing
- [x] Build compiles with zero TypeScript errors
- [x] No new dependencies added (all imports are internal)
- [x] Chart renders on ResultsPage with larger size
- [x] Chart renders on SynastryPage (both individual charts)
- [x] Chart renders on TransitReadingPage
- [x] SkyTodayChart renders on landing page (non-interactive, pointer-events-none)
- [x] Existing planet hover glow effects preserved
- [x] Aspect dimming on planet hover preserved
- [x] ASC/DSC/MC/IC labels preserved
- [x] All existing animations and filters preserved
