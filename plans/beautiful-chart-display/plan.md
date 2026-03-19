# Beautiful Chart Display

## Vision

> Make all birth charts displayed more beautiful and clear to read, a little bigger, and even some small animations that make it alive (but not too much!)

The end result looks and feels like a living celestial map — the chart wheel is larger and more prominent on the page, with refined typography, subtle golden glows, and just enough motion to feel magical without being distracting. Zodiac glyphs are larger and easier to read. Planets have a soft breathing glow. Aspect lines fade in gracefully. The overall impression shifts from "an SVG diagram" to "a beautifully crafted astral instrument."

## Research

### Best practices in astrology chart UI design

- **Professional astrology software** (Astro.com, Solar Fire, TimePassages) uses charts that fill at least 60-70% of viewport width, with clear glyph sizing (never below 14px effective)
- **Readability**: The most common complaint with chart wheels is overlapping planet glyphs and hard-to-read zodiac symbols. Successful implementations use collision-avoidance for planets and ensure at minimum 14-16px glyph size
- **Aspect line clarity**: Best practice is to use varying opacity based on orb tightness (tighter = more visible) and dash patterns for minor aspects. Some charts use curved Bézier lines instead of straight lines for aesthetic appeal
- **Color coding**: Elemental colors for zodiac signs (Fire=warm red/orange, Earth=green/brown, Air=yellow/light, Water=blue/teal) adds instant visual information without clutter
- **Animation best practices**: CSS/SVG micro-animations should be ≤300ms for transitions, ≤3s for ambient loops. `prefers-reduced-motion` must be respected. Subtle is key — a slow pulse or gentle fade-in feels mystical; bouncing or spinning feels cheap
- **Glow effects**: SVG filters for soft outer glow on planets are common in premium astrology apps — creates a "celestial body" feel

### Animation patterns that feel alive but not distracting

1. **Entrance animation**: Chart elements appear progressively — outer ring first, then signs, then houses, then planets drop in, then aspect lines draw themselves. Total duration ~1.5-2s
2. **Ambient pulse**: Planets have a very slow, subtle luminosity pulse (5-8s cycle, ±10% opacity on glow). Different planets at different phases so they don't pulse in sync
3. **Hover enhancement**: On planet hover, a soft radial glow expands and the planet glyph scales up smoothly
4. **Aspect line hover**: When hovering a planet, its aspect lines brighten while others dim — already partially implemented but can be enhanced
5. **Parallax-like depth**: Subtle scale difference between outer ring (static) and inner elements (very slight float) can create depth perception

## Current State

### ChartWheel component ([src/components/chart/ChartWheel.tsx](src/components/chart/ChartWheel.tsx))
- SVG viewBox is 600×600, rendered via `max-w-[600px]` CSS class
- Constants: `SIZE=600`, `OUTER_R=290`, `SIGN_R=255`, `INNER_R=195`, `PLANET_R=225`, `ASPECT_R=180`
- Zodiac glyphs: 16px serif, color `#8a8694` (quite muted/hard to read)
- Planet glyphs: 12px (14px on hover), color `#e8e6e3` with `#0a0a0f` background circle (r=11, 14 on hover)
- House numbers: 10px, color `#5a5666` (very faint)
- Aspect lines: Straight lines, color-coded (blue=harmonious, red=challenging, gold=conjunction), opacity based on orb
- Angular house cusps: Thin gold lines (`#c9a84c44`, 0.5-1px)
- Tooltip: Static rectangle at center when hovering a planet
- **No animations whatsoever** — purely static SVG
- No SVG filters (no glows, no shadows)
- No `<defs>` section for reusable gradients or filters

### Chart containers across pages
- **ResultsPage**: `max-w-lg` (~512px) — decent but could be larger
- **TransitReadingPage**: Same `max-w-lg`
- **SynastryPage individual**: `max-w-sm` (~384px) — quite small
- **SynastryPage side-by-side**: No max-width (grid-constrained) — fine

### Global CSS ([src/index.css](src/index.css))
- Has `@keyframes twinkle` for starfield and `@keyframes stepIn` for form transitions
- Has `.glow-gold` utility for box-shadow glow
- No chart-specific animations or styles

### Tailwind config ([tailwind.config.js](tailwind.config.js))
- Mystic color palette defined: gold `#c9a84c`, purple `#7c5cbf`, blue `#4a7fb5`
- Playfair Display heading font, Inter body font

## Approach

**Chosen approach: CSS animations + SVG filters + progressive enhancement in the existing ChartWheel component**

All changes are contained within:
1. The `ChartWheel.tsx` component (SVG structure, filters, animation classes)
2. `index.css` (keyframe definitions, animation classes)
3. Container wrappers in results pages (sizing adjustments)

### Why this approach
- **No new dependencies** — pure CSS animations and SVG filters are performant and lightweight
- **Progressive enhancement** — animations layer on top of the existing static chart; if CSS animations fail, the chart is still perfectly readable
- **Respects `prefers-reduced-motion`** — all ambient animations disabled automatically for users who prefer reduced motion
- **Single component** — ChartWheel is already the sole chart renderer; enhancing it improves all pages at once

### Alternatives considered and rejected
1. **Canvas/WebGL rendering**: Much more complex, loses SVG accessibility (screen readers, hover), overkill for subtle animations. Good for particle effects but not needed here
2. **Framer Motion / React Spring**: Adds a dependency, increases bundle size, would require refactoring the SVG to use motion components. The animations we need are simple enough for pure CSS
3. **Lottie/After Effects animations**: Beautiful results but inflexible — can't adapt to dynamic chart data. Would require pre-baked animation assets

## Architecture

### Modified files

#### 1. `src/components/chart/ChartWheel.tsx`
**Changes:**
- Increase `SIZE` from 600 to 700 for better proportions and readability
- Add `<defs>` section with SVG filters:
  - `planetGlow`: Soft gaussian blur + composite for planet luminosity
  - `goldGlow`: Gold-tinted glow for ASC/MC labels
  - `aspectGlow`: Subtle glow for tight aspect lines
- Add radial gradient for chart background (subtle depth instead of flat fill)
- Increase zodiac glyph font-size from 16 → 18, brighten color from `#8a8694` → `#a8a4b4`
- Increase planet glyph font-size from 12 → 14 (16 on hover), increase background circle r from 11 → 13 (16 on hover)
- Add element-based color tinting to zodiac sign segments (very subtle: Fire warm, Earth green, Air lavender, Water blue — at ~8% opacity)
- Add CSS class names to SVG groups for animation targeting:
  - `.chart-ring` on outer ring
  - `.chart-sign` on each zodiac segment
  - `.chart-house` on house cusps
  - `.chart-planet` on each planet group
  - `.chart-aspect` on each aspect line
- Add `filter="url(#planetGlow)"` to planet circles
- Enhance tooltip: Larger, better typography, subtle backdrop blur appearance
- Add degree tick marks on outer ring (every 5° or 10°) for precision reading

#### 2. `src/index.css`
**New keyframes and classes:**
- `@keyframes chartFadeIn`: Overall chart fade-in (opacity 0→1, 0.6s)
- `@keyframes planetAppear`: Planet drop-in with slight scale bounce (0→1, staggered per planet)
- `@keyframes aspectDraw`: Aspect lines stroke-dash animation (drawing themselves)
- `@keyframes planetPulse`: Very slow ambient glow pulse (6s cycle, infinite, opacity 0.4→0.7 on filter)
- `@keyframes ringReveal`: Outer ring draws itself via stroke-dasharray
- All wrapped in `@media (prefers-reduced-motion: no-preference)` — disabled for motion-sensitive users
- `.chart-planet:nth-child(n)` staggering for sequential appearance

#### 3. `src/components/results/ResultsPage.tsx`
- Change chart container from `max-w-lg` to `max-w-2xl` (~672px)

#### 4. `src/components/results/TransitReadingPage.tsx`
- Change chart container from `max-w-lg` to `max-w-2xl`

#### 5. `src/components/results/SynastryPage.tsx`
- Individual chart: `max-w-sm` → `max-w-md` (~448px)
- Side-by-side: Already fine (grid-constrained)

### Data flow
No changes to data flow. All modifications are purely visual — the same `ChartData` and `Aspect[]` props are consumed, just rendered with better styling and animations.

## Scope

### In scope
- Larger, more readable chart with better proportions
- Enhanced glyph sizing and colors for readability
- SVG glow filters on planets and key labels
- Element-based subtle color tinting on zodiac segments
- Entrance animations (progressive reveal of chart elements)
- Ambient planet pulse animation (very subtle)
- Enhanced hover interactions (smoother, with glow)
- Degree tick marks on outer ring
- Radial gradient background for depth
- `prefers-reduced-motion` support
- Bigger containers on all results pages
- Smooth tooltip appearance

### Out of scope
- Changing the chart's mathematical layout or calculation
- Adding new data to the chart (no new planets, aspects, etc.)
- Changing the overall page theme or color palette
- Adding drag/zoom/pan interactions
- Canvas or WebGL rendering
- Sound effects
- Mobile-specific alternative chart layouts

## Risks

1. **Planet glyph overlap**: Increasing sizes could make overlapping glyphs worse when planets are clustered. *Mitigation*: A collision-avoidance algorithm is out of scope for this plan, but increasing `PLANET_R` slightly and the background circle size will help. If overlap is severe in testing, the planet circle radius increase may need to be reduced.

2. **Performance on low-end devices**: SVG filters (gaussian blur) can be GPU-intensive on older phones. *Mitigation*: Keep blur radius small (stdDeviation ≤ 3), use `will-change: opacity` sparingly, and ensure `prefers-reduced-motion` disables filters too if needed.

3. **Animation timing sensitivity**: Too fast feels mechanical, too slow feels sluggish. *Mitigation*: Use `ease-out` curves, test at 1x and 0.5x speed, keep total entrance under 2s.

4. **Synastry page layout**: Bigger charts in the side-by-side view may push below the fold on smaller screens. *Mitigation*: Only increase individual chart size (`max-w-sm` → `max-w-md`), leave the grid layout unchanged.

## Implementation Checklist

### Phase 1: SVG Structure & Sizing Improvements
- [ ] **1.1** Increase `SIZE` constant from 600 to 700; recalculate derived radii (`OUTER_R`, `SIGN_R`, `INNER_R`, `PLANET_R`, `ASPECT_R`) proportionally
- [ ] **1.2** Add `<defs>` section with SVG filters: `planetGlow` (gaussian blur + composite), `goldGlow` for angular labels
- [ ] **1.3** Replace flat background circle fill with a radial gradient (center slightly lighter `#10101a`, edges `#0a0a0f`)
- [ ] **1.4** Add degree tick marks on the outer ring (small lines every 10°, tiny dots every 5°)
- [ ] **1.5** Increase zodiac glyph font-size to 18px, brighten fill to `#a8a4b4`
- [ ] **1.6** Add subtle element-based color fills to zodiac sign segments (Fire `rgba(180,80,50,0.06)`, Earth `rgba(80,140,60,0.06)`, Air `rgba(160,150,200,0.06)`, Water `rgba(60,100,170,0.06)`)
- [ ] **1.7** Increase planet glyph font-size to 14px (16px hovered), background circle r to 13 (16 hovered)
- [ ] **1.8** Apply `filter="url(#planetGlow)"` to planet background circles
- [ ] **1.9** Enhance angular house cusp lines — slightly thicker (1.5px), brighter gold (`#c9a84c66`)
- [ ] **1.10** Enhance ASC/MC/DSC/IC labels — larger font (11px), apply gold glow filter

### Phase 2: Animation System
- [ ] **2.1** Add CSS keyframes to `index.css`: `chartFadeIn`, `ringReveal`, `signAppear`, `planetAppear`, `aspectDraw`, `planetPulse`
- [ ] **2.2** Wrap all animation rules in `@media (prefers-reduced-motion: no-preference)`
- [ ] **2.3** Add CSS class names to ChartWheel SVG groups: `.chart-outer-ring`, `.chart-sign-group`, `.chart-houses`, `.chart-planet`, `.chart-aspect-line`
- [ ] **2.4** Apply entrance animations: outer ring reveals first (0-0.4s), signs fade in (0.2-0.6s), houses appear (0.3-0.7s), planets drop in staggered (0.5-1.2s), aspect lines draw last (0.8-1.5s)
- [ ] **2.5** Apply ambient `planetPulse` animation to planet glow filters (6-8s cycle, offset per planet using `animation-delay` based on index)
- [ ] **2.6** Enhance hover transition: smooth 200ms scale + glow increase on planet hover using CSS transitions

### Phase 3: Tooltip & Hover Improvements
- [ ] **3.1** Redesign tooltip: rounded corners (rx=8), slightly larger (170×55), subtle gold border glow, better font hierarchy (planet name bold 13px, position 11px)
- [ ] **3.2** Add smooth opacity transition on tooltip appear/disappear (CSS `transition: opacity 150ms`)
- [ ] **3.3** On planet hover, dim non-connected aspect lines (opacity → 0.05) and brighten connected ones (opacity → 0.8) — add logic to ChartWheel state

### Phase 4: Container Sizing Updates
- [ ] **4.1** ResultsPage: Change chart wrapper from `max-w-lg` to `max-w-2xl`
- [ ] **4.2** TransitReadingPage: Change chart wrapper from `max-w-lg` to `max-w-2xl`
- [ ] **4.3** SynastryPage `IndividualChartSection`: Change from `max-w-sm` to `max-w-md`

### Phase 5: Polish & Verification
- [ ] **5.1** Test chart rendering at various viewport sizes (375px, 768px, 1024px, 1440px) — verify no overflow or cut-off
- [ ] **5.2** Test `prefers-reduced-motion: reduce` — verify all animations are disabled and chart is fully static
- [ ] **5.3** Verify hover interactions work on touch devices (tap = hover)
- [ ] **5.4** Run build (`npm run build`) — confirm zero errors
- [ ] **5.5** Visual review: confirm the chart feels "alive but not too much" — no animation should draw attention away from reading the chart data
