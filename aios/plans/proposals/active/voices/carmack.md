# John Carmack's Technical Analysis: Sprint 0018 — Advance Tab Marker System

## The Honest Summary

The vision document is unusually precise — it already knows where the code lives, what the primitives are called, and what the implementation shape should look like. That's good. It saves time I'd otherwise spend reading code and writing the same conclusions. My job here is to be the adversary: find what the vision gets wrong or understates, identify the failure modes before they happen, and propose the implementation path that closes those gaps.

The core premise is correct: the data already exists. `preCalculateSnapshots` at `AdvanceTab.tsx:167` computes `transitPlanets`, `transitAspects`, and `retrogrades` for every step — up to 53 entries for weekly, 37 for monthly, 31 for daily. The `computeEnergyRating` function at `transits.ts:480` already does harmonic scoring. `computePowerDayBanner` at `AdvanceTab.tsx:106` already detects slow-planet angle contacts and tight applying clusters. The marker layer is a read operation over already-computed data. There is no expensive new computation to introduce.

The risks are: (1) implementing the marker computation inside the render path and tanking slider performance, (2) the station detection being wrong — using `getRetrogradeStatus` per-snapshot instead of detecting the crossing between consecutive snapshots, (3) marker overlays intercepting pointer events on the native range input, and (4) the animation approach creating visual noise rather than mystical atmosphere. Let me work through each.

---

## The `preCalculateSnapshots` Cost Model: What's Actually Slow

First, measure the actual cost before optimizing it. The snapshot loop at `AdvanceTab.tsx:167` runs:

- `calculateCurrentPositions(targetDate)` — calls `getPlanetLongitude` for each of 10 planets plus 5 asteroids, each of which calls into the `astronomy-engine` WebAssembly module. For the Moon it uses `EclipticGeoMoon`, for the Sun `SunPosition`, for others `GeoVector` + `Ecliptic`. Then it calls `getDailyMotion` for each body, which doubles those calls by computing positions at T+24h too. Total: roughly 30 WASM calls per snapshot just for positions.

- `calculateTransitAspects(transitPlanets, chartData.planets, period)` — O(bodies × natal_planets × aspect_defs) = roughly 16 transit bodies × 16 natal bodies × 7 aspects = 1792 comparisons per snapshot. Each comparison is cheap arithmetic. For 53 snapshots (weekly): ~95,000 comparisons. This is negligible.

- `getRetrogradeStatus(targetDate)` — calls `getDailyMotion` for 8 planets + 5 asteroids, each of which calls `getPlanetLongitude` twice. That's another 26 WASM calls per snapshot.

- `assignTransitHouses` — 16 bodies × 12 house divisions, pure arithmetic.

Total WASM calls per snapshot: approximately 56. For 53 weekly snapshots: ~3000 WASM calls. For 37 monthly snapshots: ~2000 calls. These are not trivial — a single WASM call through the astronomy-engine FFI is not free. The `useTransition` wrapper correctly keeps this off the main thread for UI purposes. The snapshot computation probably takes 200–800ms on a mid-range mobile device. That's already a known cost.

**The scoring pass adds zero WASM calls.** A `scoreSnapshot()` function that operates on the already-computed `TransitAspect[]` array and `retrogrades[]` is pure arithmetic over in-memory data. For 53 snapshots, scoring takes microseconds total. This is the right architecture — run the expensive ephemeris work once in `preCalculateSnapshots`, then derive everything else from that output.

**Performance critical point:** the marker layer must be a `useMemo` keyed on `snapshots`, not on `offset`. The score array and marker array are properties of the full snapshot set, not of the current slider position. Computing markers on every slider drag would be wrong — you'd be re-running the O(n) scoring pass on every `onChange` event. The correct structure:

```typescript
// Computed once when snapshots settle — not on slider drag
const markers = useMemo(() => {
  if (snapshots.length === 0) return []
  return snapshots.map(s => scoreSnapshot(s, chartData)).filter(m => m.category !== 'neutral')
}, [snapshots, chartData])
```

This is a `useMemo` over `snapshots` (which only changes after the `useTransition` completes), not over `offset`. The slider thumb position changes on drag; `snapshots` does not.

---

## Station Detection: The Current Approach Is Wrong for This Use Case

`getRetrogradeStatus` at `transits.ts:227` detects whether a planet is retrograde at a specific date. It uses `getDailyMotion` at that point in time and the `isStationing = Math.abs(motion) < 0.02` threshold. This is what goes into `snapshot.retrogrades`.

The vision says: "Any planet stations (motion crosses zero — direct to retrograde or vice versa) within the step's window." The problem is that `getRetrogradeStatus` at a single point in time does not detect crossings. It detects current state. A planet could be stationing at offset 7 but by the time `getRetrogradeStatus(date_at_offset_7)` runs, it might already be retrograde — in which case `isStationing` is false and `isRetro` is true, and you miss the fact that the station happened near this snapshot.

The correct detection for the "shift" category in the marker system is to compare consecutive snapshots: if `snapshots[i-1].retrogrades.find(r => r.planet === X).isRetro !== snapshots[i].retrogrades.find(r => r.planet === X).isRetro`, then a station occurred between those two steps. For weekly resolution, this is accurate enough — the station happened somewhere in that week. For daily resolution, you know it happened on exactly that day.

Implementation — the `scoreSnapshot` function should receive both the current snapshot and the previous one:

```typescript
function scoreSnapshot(
  snapshot: AdvanceSnapshot,
  prev: AdvanceSnapshot | null,
  chartData: ChartData,
): SnapshotScore {
  // ...
  // Station detection: compare retrograde state to previous snapshot
  if (prev) {
    for (const r of snapshot.retrogrades) {
      const prevR = prev.retrogrades.find(pr => pr.planet === r.planet)
      if (prevR && prevR.isRetro !== r.isRetro) {
        hasStation = true
        stationPlanet = r.planet
        stationDirection = r.isRetro ? 'retrograde' : 'direct'
      }
    }
  }
}
```

This is more correct than the single-point approach and requires no additional WASM calls.

**A separate correctness issue with `getRetrogradeStatus`:** The `isStationing` threshold of `Math.abs(motion) < 0.02` degrees/day is applied uniformly across all planets. Saturn's normal daily motion is about 0.033 degrees/day. Near station, it slows to near-zero. Mercury's normal motion is about 1.6 degrees/day, and it slows to near-zero before stationing. The 0.02 threshold makes sense for slow planets but is far too tight for Mercury — Mercury stations when its daily motion is approaching zero from well above 0.02, and the function may flag "Stationing" for Mercury for a much shorter window than it should. For the marker system's purposes, this doesn't matter much because we're using the consecutive-snapshot comparison method instead, but the underlying `getRetrogradeStatus` function has this latent inaccuracy.

---

## The `scoreSnapshot` Function: Exact Implementation Shape

The vision document's table (power > favorable > challenging > shift > neutral, with shift able to co-display) is the right priority order. Here is the concrete implementation:

```typescript
export type MarkerCategory = 'power' | 'favorable' | 'challenging' | 'shift' | 'neutral'

export interface SnapshotScore {
  category: MarkerCategory
  coShift: boolean   // true when shift co-occurs with favorable/challenging
  intensity: number  // 0.0–1.0, used to scale dot size/glow
  reason: string
  shiftPlanet?: string
  shiftDirection?: 'retrograde' | 'direct'
}
```

The `computePowerDayBanner` function at `AdvanceTab.tsx:106` already implements the power-day logic cleanly. Rather than duplicate it, refactor it: extract the detection logic into `scoreSnapshot`, and have `computePowerDayBanner` call `scoreSnapshot` and format the result into banner text. This is the right factoring — one scoring function, one formatting function. Currently, `computePowerDayBanner` mixes detection and formatting, which is why it returns a pre-formatted string rather than structured data.

**On orb thresholds per period:**

The vision proposes loosening orbs for weekly (angle contact to 2°, applying threshold to 3°) and monthly (angle contact to 3°). This is correct but needs to be implemented carefully. The `ADVANCE_CONFIG` already knows the period — pass it to `scoreSnapshot`:

```typescript
const ORB_THRESHOLDS: Record<TransitPeriod, { angleContact: number; applyingTight: number; energyMinAspects: number }> = {
  daily:   { angleContact: 1.0, applyingTight: 2.0, energyMinAspects: 2 },
  weekly:  { angleContact: 2.0, applyingTight: 3.0, energyMinAspects: 3 },
  monthly: { angleContact: 3.0, applyingTight: 4.0, energyMinAspects: 2 }, // fewer aspects, but coarser
}
```

For monthly, require slow planets only (Saturn/Uranus/Neptune/Pluto) for the power category — Jupiter is already excluded from `SLOW_PLANETS_FOR_BANNER` (line 43) and should remain excluded for the power marker as well. The month-level favorable/challenging threshold should require `computeEnergyRating` score ≥ 3 (Highly Favorable) for green, or ≤ 1 (Demanding) for red — not 2 or 4. Reserve month-level markers for genuinely extreme readings.

**On the energy rating function:**

`computeEnergyRating` at `transits.ts:480` filters to classical aspects (excluding asteroids) and scores the top 8 by +1/-1. Its output scale is: score ≥ 3 = "Highly Favorable" (5), ≥ 1 = "Favorable" (4), 0 = "Mixed" (3), ≥ -2 = "Tense" (2), else = "Demanding" (1). The vision maps favorable ≥ 3 and challenging ≤ 1. That's scores of 5 (energy rating) for favorable and 1 for challenging. In actual usage, `computeEnergyRating` returns a `.score` field from 1–5. So "favorable marker" = `energyRating.score >= 4` AND 2+ tight applying harmonious, "challenging marker" = `energyRating.score <= 2` AND 2+ tight applying challenging. The vision's "≥ 3 AND 2+ applying harmonious" should read as: energy rating score (the 1-5 integer) ≥ 4, not the raw harmonic/challenging aspect count differential ≥ 3. Be explicit about which score scale is being compared.

---

## The Native Range Input Overlay: The Exact Layout Trap

The slider HTML at `AdvanceTab.tsx:265–276` is a plain `<input type="range">` inside a `<div className="bg-mystic-surface/50 border border-mystic-border rounded-xl p-5 mb-6">`. The vision's proposed wrapper div is correct, but there's a layout detail that will burn implementation time if not understood upfront.

**The problem:** The native `<input type="range">` in WebKit/Blink has a clickable area that extends a few pixels beyond the visible track — the hit area includes the thumb region and some padding. A `<div>` overlaid with `pointer-events-none` won't intercept clicks, but the native input's `<input>` element itself extends to fill its CSS width. The marker dots need to be positioned relative to the track width, not the input element's full width, because the track is inset from the input edges.

On Webkit, the slider track starts and ends at the thumb's center, which is inset by `thumb_width/2` from the input edges. With a 20px thumb (`[&::-webkit-slider-thumb]:w-5`), the track effectively starts at `10px` from the left and ends at `10px` from the right. A marker at `left: 0%` or `left: 100%` will be offset.

**The fix:** Use CSS padding on the marker container div to match the thumb inset:

```jsx
<div className="relative w-full">
  <input type="range" ... />
  <div 
    className="absolute pointer-events-none"
    style={{ top: '50%', transform: 'translateY(-50%)', left: '10px', right: '10px' }}
  >
    {markers.map(m => (
      <MarkerDot
        key={m.offset}
        marker={m}
        max={config.max}
        onClick={() => setOffset(m.offset)}
      />
    ))}
  </div>
</div>
```

And the `MarkerDot` positions at `left: (m.offset / config.max) * 100%` relative to this inset container — not relative to the full input width. This maps correctly to where the thumb would be at that offset.

**Click handlers on marker dots:** The marker container has `pointer-events-none`, which means individual child elements can override this with `pointer-events-auto`. The dots themselves should have `pointer-events-auto` and an `onClick` that calls `setOffset(m.offset)`. The native input still receives pointer events normally because the `pointer-events-none` is on the container, not on the input.

---

## The Overview Strip: Implementation Caution

The vision proposes an overview strip above the slider — a `w-full h-6` horizontal bar with colored dots at percentage positions. This is the right concept but has one practical problem: **dot density at the extremes**.

For 53 weekly snapshots in a `w-full` container on mobile (320–375px wide), each step represents about 6px of horizontal space. If two consecutive weeks are both marked (e.g., a favorable week followed by a power week), their dots are 6px apart on mobile — they will visually overlap. You need a collision-avoidance strategy.

Simple approach: for each marked step, check if `|marker.offset - prevRenderedMarker.offset| < minGapSteps` where `minGapSteps = Math.ceil(config.max / containerWidthPx * minGapPx)`. Skip rendering the lower-priority marker if it would overlap the higher-priority one. Priority order: power > shift > favorable > challenging.

For daily (30 steps in 320px = ~10px/step), there's no collision problem. For weekly (52 steps in 320px ≈ 6px/step), light overlap is possible. For monthly (36 steps in 320px ≈ 9px/step), mostly fine. The mobile case for weekly is the worst.

An alternative that sidesteps this: render the overview strip as a heat map using a `<canvas>` or an SVG `rect` per step rather than individual dots. Each step is a colored column, 1–2px wide, and the colors blend into each other. No collision, no overlap, and the visual density itself communicates the distribution better than discrete dots. For 52 weeks × 2px per step = 104px — this fits in any mobile viewport. However, a canvas adds complexity. The simpler approach (just filter overlapping dots) is correct for v1.

---

## Animation: What Not to Do

The codebase uses Tailwind's animation classes. The vision warns against `animate-bounce` and `animate-ping` — that's right, those look like notification badges and are too fast. But `animate-pulse` as-is also has a problem: Tailwind's default `animate-pulse` pulses opacity from 1 to 0.5 on a 2-second cycle. On a dark background with a small dot (6–8px), this makes the dot mostly invisible for half its cycle. That's wrong.

The right animation for "mystical breathing" is a glow/shadow pulse that keeps the dot fully opaque but breathes the shadow radius:

```css
@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 4px 1px currentColor; opacity: 0.85; }
  50%       { box-shadow: 0 0 8px 3px currentColor; opacity: 1.0; }
}
```

In Tailwind config, add this as a custom animation or use the `style` prop inline for the duration. The `animation` CSS property on the dot element: `animation: glow-pulse 3s ease-in-out infinite` for power/gold, `2s` for challenging/red, `4s` for shift/blue, and no animation for favorable/green (favorable is stable, not attention-seeking).

**The practical issue with CSS custom animations in Tailwind:** Adding custom keyframes requires `tailwind.config.js` changes (`theme.extend.keyframes` and `theme.extend.animation`). This is standard practice but requires coordination with whoever owns the Tailwind config. Alternatively, use `style={{ animation: '...' }}` inline for the initial implementation — it avoids the config change entirely. Inline animation strings are fine for one-off elements.

---

## Tooltip Architecture

The vision mentions a hover tooltip showing date, category label, and reason. There are two implementation approaches:

**Approach 1: CSS `:hover` tooltip.** The `MarkerDot` renders a sibling `<div>` that's `hidden group-hover:block` using Tailwind's group modifier. No React state needed. Limitation: the tooltip position is relative to the marker dot, which may overflow the slider container at the far left or right edges.

**Approach 2: React state tooltip.** A `hoveredMarker` state in `AdvanceTab`, set on `onMouseEnter`/`onFocus` of each dot, cleared on `onMouseLeave`/`onBlur`. The tooltip renders once, positioned absolutely relative to the slider container. Cleaner overflow behavior.

Approach 2 is right for this component — the tooltip is styled content, not a plain `title` attribute, and you need position clamping to avoid overflow at edges. One state variable is not expensive. The `hoveredMarker` state does not trigger `preCalculateSnapshots` to re-run (it only triggers a re-render of the tooltip div), so there's no performance concern.

**Don't show the tooltip when the slider thumb is at that offset.** The current date display already shows `formatDate(snapshot.date)` and the banner already shows the power day text. Showing both simultaneously creates redundancy. The tooltip is for off-position markers. When `offset === marker.offset`, suppress the tooltip and rely on the existing UI to communicate that position's meaning.

---

## `AdvanceSnapshot` Type Extension

The current `AdvanceSnapshot` interface at `AdvanceTab.tsx:17`:

```typescript
interface AdvanceSnapshot {
  offset: number
  date: Date
  dateStr: string
  transitPlanets: TransitPosition[]
  housedTransitPlanets: TransitPosition[]
  transitAspects: TransitAspect[]
  retrogrades: { planet: PlanetName; isRetro: boolean; status: string }[]
}
```

The vision proposes adding a pre-computed `score` field. I agree this is the right approach — scoring during `preCalculateSnapshots` instead of during the `useMemo([snapshots])` pass collapses the architecture from two passes to one. But it couples the scoring logic to the snapshot computation loop, making `preCalculateSnapshots` responsible for both data collection and analysis.

The trade-off: slightly more coupled code vs. a simpler data flow. I'd choose the coupled approach — add `score: SnapshotScore` to the interface and compute it in the `preCalculateSnapshots` loop. The benefit: the marker array derivation (`useMemo`) becomes a single filter over `snapshots` rather than a map+filter. The scoring is done when the data is fresh, the retrogrades are right there, and you avoid a second pass over 53 elements.

The one complication is station detection requires looking at the previous snapshot. In the loop, `snapshots[i-1]` is available — pass it to `scoreSnapshot`:

```typescript
for (let i = 0; i <= config.max; i++) {
  // ... compute transitPlanets, transitAspects, retrogrades, housedTransitPlanets ...
  const prev = snapshots[i - 1] ?? null
  const score = scoreSnapshot({ offset: i, date: targetDate, transitAspects, retrogrades }, prev, chartData, period)
  snapshots.push({ offset: i, date: targetDate, dateStr, transitPlanets, housedTransitPlanets, transitAspects, retrogrades, score })
}
```

This is clean. The `score` field is computed once, stored, and reused by both the marker layer and the power day banner.

---

## `computePowerDayBanner` Refactor

Currently `computePowerDayBanner` at `AdvanceTab.tsx:106` is ~57 lines that detect a condition and format a string. After adding `scoreSnapshot`, it should become a 5-line function:

```typescript
function computePowerDayBanner(snapshot: AdvanceSnapshot): string | null {
  if (snapshot.offset === 0) return null
  if (snapshot.score.category === 'neutral') return null
  return formatScoreAsBannerText(snapshot.score) // new formatting function
}
```

The existing detection logic inside `computePowerDayBanner` (the `detectAngleContact` call, the SLOW_PLANETS loop, the `tightApplying.length >= 3` check) moves into `scoreSnapshot`. The text-formatting logic (`ASPECT_VERB_BANNER`, `ANGLE_DOMAIN`, `spellCount`) stays as formatting helpers called from `formatScoreAsBannerText`. The detection and presentation concerns are now separate.

This means `computePowerDayBanner` no longer needs `chartData` as a parameter — the chart-specific context was used for detection, which is now in `scoreSnapshot`. The banner function only needs the pre-scored snapshot. That's a cleaner interface.

---

## One Thing the Vision Gets Wrong

The vision says "The `shift` category is orthogonal and should co-display with favorable or challenging if both conditions are met (a stacked or dual-dot treatment rather than suppression)."

This is correct in principle but I'd push back on implementing dual-dot in the initial sprint. A "stacked or dual-dot treatment" requires:
- Determining the vertical or horizontal offset between the two dots
- Ensuring neither dot is cut off by the slider container
- Defining hover behavior for a dual-dot position (which tooltip shows?)
- Testing on mobile where dots are already small

The simpler implementation: use a single dot with a mixed color indicator. If the category is `favorable` with `coShift = true`, render a blue border ring around the green dot (or a blue dot with a small shift indicator). This conveys both signals with one DOM element and avoids the layout complexity. Call it "category with modifier" rather than "dual dot." The `SnapshotScore` type already has `coShift: boolean` and `shiftPlanet`/`shiftDirection` fields — the data model is ready for this, the rendering just uses a ring instead of a second dot.

---

## Implementation Order

**Task 1 (foundation):** Refactor `computePowerDayBanner` into `scoreSnapshot` + `formatScoreAsBannerText`. Add `score: SnapshotScore` to `AdvanceSnapshot`. No UI changes — just restructure the scoring logic. Validate that the existing power day banner still renders correctly (regression check).

**Task 2 (marker layer):** Add the marker overlay to the slider wrapper. Wire `markers = useMemo(...)` over `snapshots`. Render static colored dots with no animation. Verify pointer events don't interfere with slider dragging. Add click-to-jump on marker dots.

**Task 3 (overview strip):** Add the horizontal strip above the slider. Wire dot positions. Add click-to-jump. Add the "Notable moments" label.

**Task 4 (polish):** Add animations to marker dots. Add tooltip system. Calibrate thresholds per period. Verify the visual system (color, shape, opacity) is internally consistent.

Tasks 1 and 2 are the core and should ship together. Tasks 3 and 4 are additive value on top of a working marker system.

---

## Key Files and Line Numbers for Implementation

- **Score computation goes here:** `AdvanceTab.tsx:167` — the `preCalculateSnapshots` function. Add `scoreSnapshot` call at the end of each loop iteration.
- **Score type comes from here:** New `scoreSnapshot` function lives at the top of `AdvanceTab.tsx`, after line 163 (current bottom of the banner section).
- **Detection primitives reuse:** `AdvanceTab.tsx:43` (`SLOW_PLANETS_FOR_BANNER`), `AdvanceTab.tsx:82` (`detectAngleContact`), `transits.ts:480` (`computeEnergyRating`).
- **Slider HTML to wrap:** `AdvanceTab.tsx:265–276`.
- **Overview strip inserts before slider container:** `AdvanceTab.tsx:259` (the `<div className="bg-mystic-surface/50 ...">` that wraps the slider section).
- **Marker layer sits inside the slider wrapper:** New `<div>` sibling of the `<input>` at `AdvanceTab.tsx:265`.
- **Power day banner refactors:** `AdvanceTab.tsx:106–163` (entire `computePowerDayBanner` function) — retain its structure, gut its body, have it delegate to `scoreSnapshot`.
- **Station detection requires consecutive snapshot comparison** — not a new primitive, just access to `snapshots[i-1]` in the loop.
- **`computeEnergyRating` (`transits.ts:480`) is the right primitive for favorable/challenging scoring** — do not replicate its logic.
- **Do not call `buildTransitTimeline` from `AdvanceTab`** — that function's `findAspectPerfection` binary-search approach is expensive and redundant given that `preCalculateSnapshots` already has the aspect data.
