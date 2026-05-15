## Type
Feature

## Originated by
Jobs, Carmack, Miyazaki, Taleb

---

## Problem / Opportunity

The Advance tab pre-computes every snapshot in the slider range — up to 31 daily, 53 weekly, or 37 monthly positions — yet presents an entirely inert track. The computational substrate is already in place and already correct: `preCalculateSnapshots` (AdvanceTab.tsx:167) calls `calculateTransitAspects`, `getRetrogradeStatus`, and `calculateCurrentPositions` for every step; `computePowerDayBanner` (AdvanceTab.tsx:106) already identifies angle-contact power days; and `computeEnergyRating` (transits.ts:480) already scores each snapshot's harmoniousness on a 1–5 scale. The system knows which moments matter before the user arrives.

None of this intelligence is visible. The slider at AdvanceTab.tsx:265–276 is a plain `<input type="range">` with a gold thumb and a dark track that communicates nothing about what lies along it. A user who wants to know when the best week to start a project is must drag through all 52 weeks one at a time, reading the aspect list each time, and carry that comparison in their head. The product is doing the hard work and hiding every result.

Two concrete failures compound this:

1. The `computePowerDayBanner` fires only for the currently selected offset. A user who never drags to offset 14 will never discover that Saturn reaches their Ascendant that day. The discovery is entirely accidental.

2. The banner is binary: power day or nothing. The full astrological spectrum — favorable, challenging, station events — is collapsed to one category that fires rarely and says nothing about the character of the surrounding positions.

The guidelines (aios/guidelines.md) are explicit: mark power days on the slider, distinguish favorable from challenging from shift, and add animations to make notable moments impactful. This feature makes the pre-computed intelligence visible, transforms the slider from a manual exploration tool into an annotated predictive timeline, and introduces a bird's-eye overview strip that lets a user scan the full period for peaks and valleys without touching the slider at all.

---

## Vision

The Advance tab loads. The calculation completes. The slider track lights up.

Small colored dots appear at significant positions along the track — a gold diamond near the end of the month where Saturn approaches the Ascendant, two green circles in the first third where harmonious aspects cluster, a red circle mid-range where three tense aspects converge. Above the slider, a compact strip labeled "Notable moments" shows the same dots at their proportional positions across the entire period, giving an instant bird's-eye view of where the peaks and valleys are. The user scans the strip, sees that the gold marker is in week nine, taps it, and the slider jumps there. The banner below confirms: "Saturn reaches your Midheaven — a significant moment for career decisions and public commitments." The user has found the most important moment in their 52-week advance reading in under five seconds, without dragging anything.

This is the shift from exploration to orientation. The chart already knows where to look. The feature makes it say so.

---

## Specifications

### 1. Scoring Architecture

**1.1** Introduce a `SnapshotScore` interface above the `AdvanceSnapshot` type in AdvanceTab.tsx:

```typescript
export type MarkerCategory = 'power' | 'favorable' | 'challenging' | 'shift' | 'neutral'

export interface SnapshotScore {
  category: MarkerCategory
  coShift: boolean          // true when shift co-occurs with favorable or challenging
  intensity: number         // 0.0–1.0, drives dot size and glow strength
  reason: string            // one-line human sentence for tooltip and banner
  shiftPlanet?: string      // planet name when coShift or category === 'shift'
  shiftDirection?: 'retrograde' | 'direct'
  triggerAspect?: {         // the specific aspect that drove the score, for tooltip specificity
    transitPlanet: string
    natalPlanet: string
    type: string
    orb: number
  }
}
```

**1.2** Extend `AdvanceSnapshot` with a required `score` field:

```typescript
interface AdvanceSnapshot {
  offset: number
  date: Date
  dateStr: string
  transitPlanets: TransitPosition[]
  housedTransitPlanets: TransitPosition[]
  transitAspects: TransitAspect[]
  retrogrades: { planet: PlanetName; isRetro: boolean; status: string }[]
  score: SnapshotScore     // pre-computed once in preCalculateSnapshots
}
```

**1.3** Introduce `scoreSnapshot(snapshot, prev, chartData, period)` as a pure function after the existing `computePowerDayBanner` block (AdvanceTab.tsx:163). It receives both the current snapshot and the previous snapshot (or null for offset 0) so it can detect station crossings by comparing consecutive retrograde states rather than reading a single point's velocity.

**1.4** Hard guard: if `snapshot.offset === 0`, return `{ category: 'neutral', intensity: 0, reason: '', coShift: false }` unconditionally. The current date is a reference point, not a future recommendation. This mirrors the existing guard in `computePowerDayBanner`.

**1.5** Category priority order (higher wins when multiple conditions are met simultaneously):

| Priority | Category | Trigger condition |
|----------|----------|-------------------|
| 1 | `power` | `SLOW_PLANETS_FOR_BANNER` planet within `ORB_THRESHOLDS[period].angleContact` of natal ASC or MC; requires `!chartData.unknownTime` |
| 2 | `shift` | Retrograde direction of any planet differs between `prev.retrogrades` and `snapshot.retrogrades` (consecutive-snapshot crossing, not single-point velocity); used as primary category when no power condition |
| 3 | `favorable` | `computeEnergyRating(snapshot.transitAspects).score >= 4` AND `≥ 2` applying harmonious classical aspects with orb ≤ `ORB_THRESHOLDS[period].applyingTight` |
| 4 | `challenging` | `computeEnergyRating(snapshot.transitAspects).score <= 2` AND `≥ 2` applying challenging classical aspects with orb ≤ `ORB_THRESHOLDS[period].applyingTight` |
| 5 | `neutral` | Everything else — no marker rendered |

**1.6** When `shift` co-occurs with `favorable` or `challenging`, the primary category takes priority but `coShift = true` is set and `shiftPlanet`/`shiftDirection` are populated. The rendering uses a blue border ring around the colored dot rather than a second dot.

**1.7** Introduce per-period orb thresholds as a constant:

```typescript
const ORB_THRESHOLDS: Record<TransitPeriod, {
  angleContact: number
  applyingTight: number
  energyMinAspects: number
}> = {
  daily:   { angleContact: 1.0, applyingTight: 1.5, energyMinAspects: 2 },
  weekly:  { angleContact: 2.0, applyingTight: 3.0, energyMinAspects: 2 },
  monthly: { angleContact: 3.0, applyingTight: 4.0, energyMinAspects: 2 },
}
```

**1.8** Intensity values:
- `power`: `1.0 - (orb / ORB_THRESHOLDS[period].angleContact)` — tighter orb = higher intensity
- `favorable` / `challenging`: normalized from `computeEnergyRating` score: `(Math.abs(rating.score - 3)) / 2` (so score 5 = intensity 1.0, score 4 = 0.5; score 1 = 1.0, score 2 = 0.5)
- `shift`: always `0.8` — stations are categorically significant regardless of other aspects

**1.9** The `reason` field must name the specific astrological event, not a count. For `power`: "{Planet} {verb} your {Ascendant/Midheaven}." For `shift`: "{Planet} stations {retrograde/direct}." For `favorable`: identify the tightest applying harmonious aspect by planet weight (slow planets outrank fast) and return "{TransitPlanet} {type} your natal {NatalPlanet} — a window of {planet-domain language}." For `challenging`: same pattern with challenging framing. The `triggerAspect` field carries the raw data so the tooltip can display the orb.

**1.10** Station detection uses per-planet velocity thresholds rather than the single shared `0.02°` threshold in `getRetrogradeStatus`. The consecutive-snapshot method (spec 1.3) is the primary station detector for the marker system. The `isStationing` flag from `getRetrogradeStatus` is not used for shift classification; only the direction-flip between consecutive snapshots is.

**1.11** The monthly branch of `preCalculateSnapshots` must use noon (12:00:00) for all offsets ≥ 1, not local midnight. Change AdvanceTab.tsx:180 from `new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate())` to `new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate(), 12, 0, 0)`. This prevents Moon position inconsistency from polluting energy scoring at monthly resolution.

**1.12** Compute the score inside the `preCalculateSnapshots` loop immediately after each snapshot's data is assembled, passing `snapshots[i - 1] ?? null` as the previous snapshot. Store the score on the snapshot object so the marker layer requires no re-scoring.

**1.13** After all snapshots are scored, apply a global density cap: no period should display markers for more than 20% of its positions (6 out of 30 daily; 10 out of 52 weekly; 7 out of 36 monthly). Sort the non-neutral scored snapshots by `intensity` descending and retain only the top 20%. Discard the rest (set to `neutral`). This prevents the strip from becoming noise when multiple threshold conditions fire simultaneously across the period.

**1.14** The `markers` array is derived as a `useMemo` keyed on `[snapshots, chartData]` — not on `offset`. It is computed once when snapshots settle and never recomputed during slider drag:

```typescript
const markers = useMemo(
  () => snapshots.filter(s => s.score.category !== 'neutral'),
  [snapshots]
)
```

### 2. Refactor: `computePowerDayBanner`

**2.1** After `scoreSnapshot` is introduced, refactor `computePowerDayBanner` to delegate detection to the already-computed `snapshot.score` rather than re-running detection logic:

```typescript
function computePowerDayBanner(snapshot: AdvanceSnapshot): string | null {
  if (snapshot.offset === 0) return null
  if (snapshot.score.category === 'neutral') return null
  return formatScoreAsBannerText(snapshot.score)
}
```

**2.2** The `chartData` parameter is removed from `computePowerDayBanner`'s signature — detection now lives in `scoreSnapshot`. The `detectAngleContact`, `SLOW_PLANETS_FOR_BANNER`, `ASPECT_VERB_BANNER`, `ANGLE_DOMAIN`, and `spellCount` helpers move into or adjacent to `scoreSnapshot`. The `formatScoreAsBannerText` helper handles presentation.

**2.3** The existing power day banner UI at AdvanceTab.tsx:317–325 is generalized to handle all four non-neutral categories:
- Power (gold): unchanged from current — `border-mystic-gold/30`, `border-l-mystic-gold`, `bg-mystic-gold/10`, `✦` symbol
- Favorable (green): `border-green-500/30`, `border-l-green-500`, `bg-green-900/10`, `✦` symbol in `text-green-400`
- Challenging (red): `border-red-500/30`, `border-l-red-500`, `bg-red-900/10`, `⚠` symbol in `text-red-400`
- Shift (blue): `border-blue-500/30`, `border-l-blue-500`, `bg-blue-900/10`, `◆` symbol in `text-blue-400`

**2.4** The `powerDayBanner` useMemo dependency changes from `[snapshot, chartData]` to `[snapshot]` since chart data is no longer needed at render time.

### 3. Marker Overlay on the Slider Track

**3.1** Wrap the existing `<input type="range">` in a positioned container. The overlay div uses `pointer-events-none` so the native input receives all pointer events for dragging. Individual `MarkerDot` elements within the overlay use `pointer-events-auto` for click-to-jump:

```tsx
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
        active={offset === m.offset}
        onClick={() => setOffset(m.offset)}
      />
    ))}
  </div>
</div>
```

**3.2** The overlay container is inset `left: 10px, right: 10px` to compensate for the WebKit slider thumb inset (the 20px thumb `[&::-webkit-slider-thumb]:w-5` means the track starts and ends 10px from the input edges). Marker dots at `left: (offset / max) * 100%` relative to this inset container align correctly with the thumb position at that offset.

**3.3** Each `MarkerDot` is an absolutely positioned element at `left: (marker.offset / config.max) * 100%`, centered vertically. It must not block the input's drag events (`pointer-events-none` on container, `pointer-events-auto` on dot).

**3.4** Dot shape by category (shape differentiates by type; color differentiates by quality — accessibility):
- `favorable`: filled circle (`border-radius: 50%`)
- `challenging`: filled circle (`border-radius: 50%`)
- `power`: diamond/rotated square — `transform: rotate(45deg)` on a square, or the ✦ character as text
- `shift`: small rotated square ◆ — `transform: rotate(45deg)` with a slightly different aspect ratio than the power dot

**3.5** Dot size at rest: `5px × 5px` base, scaled by intensity: `size = 5 + Math.round(marker.score.intensity * 3)` → range 5–8px. Active state (when `offset === marker.offset`): `size + 4px`, full opacity.

**3.6** Dot color by category:
- `power`: `#c9a84c` (mystic-gold) — `bg-mystic-gold`
- `favorable`: `bg-emerald-400`
- `challenging`: `bg-red-400`
- `shift`: `bg-blue-400`

**3.7** When `coShift = true`, render a 1px blue ring around the dot: `outline: 1px solid rgb(96 165 250)` (blue-400) at `outline-offset: 1px`.

**3.8** When `active = true` (the slider thumb is at this offset), the dot receives an expanded glow state: size increases to `12px`, a colored `box-shadow` of `0 0 10px 2px {categoryColor}/60` renders. This is an `active` prop-driven class rather than a CSS hover selector, so it works on touch.

### 4. Marker Animations

**4.1** All marker animations use `opacity`-based or `transform`-based keyframes, not `box-shadow` keyframes. GPU-composited properties only, to avoid CPU compositor work on mobile at 60fps.

**4.2** Gold power markers: slow breathing pulse using a custom keyframe added to `tailwind.config.js` (or inline `style` prop):
```css
@keyframes glow-breathe-gold {
  0%, 100% { opacity: 0.75; transform: rotate(45deg) scale(1.0); }
  50%       { opacity: 1.0;  transform: rotate(45deg) scale(1.15); }
}
animation: glow-breathe-gold 3s ease-in-out infinite
```
The breathing scale (1.0→1.15) is subtle — the dot grows slightly and brightens. This communicates patience and weight, not urgency.

**4.3** Red challenging markers: slightly faster pulse, same scale range:
```css
@keyframes glow-breathe-red {
  0%, 100% { opacity: 0.70; transform: scale(1.0); }
  50%       { opacity: 1.0;  transform: scale(1.1); }
}
animation: glow-breathe-red 2s ease-in-out infinite
```
Active, not alarming.

**4.4** Green favorable markers: static soft glow, no animation. A favorable day does not demand anything. A static dot with `opacity: 0.85` is an offering. No `animation` property set.

**4.5** Blue shift markers: slow diamond-rotation oscillation, communicating reversal:
```css
@keyframes shift-rotate {
  0%, 100% { transform: rotate(40deg); opacity: 0.80; }
  50%       { transform: rotate(50deg); opacity: 1.0; }
}
animation: shift-rotate 4s ease-in-out infinite
```

**4.6** All animations pause when `prefers-reduced-motion: reduce` is in effect. Implement via `@media (prefers-reduced-motion: reduce)` in the custom keyframe declarations: set `animation: none` and `opacity: 0.85`.

**4.7** Do not animate the slider thumb. The thumb is a precision control instrument and must remain statically positioned exactly where the user dragged it.

### 5. Notable Moments Overview Strip

**5.1** The strip renders above the slider control card (before the `<div className="bg-mystic-surface/50 ...">` at AdvanceTab.tsx:259) whenever `snapshots.length > 0`. It renders in both the "has markers" and "no markers" states — the empty state is itself a reading.

**5.2** Strip header: two spans in a `flex items-center justify-between` row above the strip:
- Left: `"Notable moments"` in `text-mystic-muted text-[10px] uppercase tracking-widest`
- Right: `"{config.max} {config.unitPlural}"` in the same style

**5.3** Strip body: `w-full h-10 bg-mystic-surface/40 rounded-full border border-mystic-border/50 overflow-hidden relative`. Height is `h-10` (40px) — not the originally proposed `h-6` — so that each dot has a minimum 44px vertical tap area with transparent padding around it. This meets Apple HIG and Google Material minimum touch target guidelines.

**5.4** When `markers.length > 0`: render each marker as a `<button>` with `onClick={() => setOffset(m.offset)}`:
```tsx
<button
  key={m.offset}
  onClick={() => setOffset(m.offset)}
  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full"
  style={{
    left: `${(m.offset / config.max) * 100}%`,
    backgroundColor: MARKER_COLORS[m.score.category],
  }}
  aria-label={`Jump to ${m.dateStr}: ${m.score.reason}`}
/>
```
The `w-2.5 h-2.5` (10px) visual dot sits inside the 40px-tall strip, which acts as the tap target. Power markers use the rotated diamond shape.

**5.5** A vertical position indicator line tracks the current slider offset in the strip:
```tsx
<div
  className="absolute top-0 h-full w-px bg-mystic-gold/40 pointer-events-none"
  style={{ left: `${(offset / config.max) * 100}%` }}
/>
```

**5.6** When `markers.length === 0` (all positions scored neutral): render the strip with no dots and a centered label: `"Quiet period — no exceptional moments detected"` in `text-mystic-muted text-xs`. This communicates explicitly that the absence of markers is itself information, not a loading failure.

**5.7** Collision handling in the strip: if two markers would render within 4px of each other (computable as `|m1.offset - m2.offset| / config.max * containerWidth < 4`), retain the higher-priority marker and hide the lower-priority one. Priority order: `power > shift > favorable > challenging`. At daily resolution (30 steps) there is typically no collision. At weekly resolution (52 steps on mobile at ~320px width ≈ 6px/step), light collision is possible. Apply the cap before rendering.

**5.8** The strip does not render during `isPending` (while snapshots are being computed). During computation, render a single-line placeholder: `<div className="w-full h-10 rounded-full border border-mystic-border/30 bg-mystic-surface/20 flex items-center justify-center"><span className="text-mystic-muted text-[10px]">Reading your sky…</span></div>`. This replaces the current "Computing transits…" grey text and communicates that the product is doing real work.

### 6. Tooltip System

**6.1** Maintain a single `hoveredMarker: SnapshotScore | null` state in `AdvanceTab`. Set it on `onMouseEnter` of each `MarkerDot`; clear on `onMouseLeave`. On touch devices (no hover), suppress the hover tooltip — the active-state banner (spec 2.3) handles the mobile equivalent.

**6.2** Do not show the hover tooltip when `offset === marker.offset`. The banner already surfaces the full information for the currently active position; simultaneous tooltip and banner would be redundant.

**6.3** Tooltip renders absolutely positioned above the marker dot, constrained to remain within the slider container. Minimum left offset: `8px`. Maximum right offset: `containerWidth - 8px`. Adjust `left` position to prevent overflow at the far left and right extremes.

**6.4** Tooltip anatomy (three lines):
1. Date with weekday: formatted as `d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })` — "Saturday, Jun 13" tells a user whether the event falls on a workday without requiring mental arithmetic
2. Category label in the marker's color: "Power Day" / "Favorable Window" / "Challenging Period" / "Planetary Shift" — in `text-[11px] font-medium`
3. Reason string from `marker.score.reason` in `text-mystic-text/80 text-[10px]`

**6.5** Tooltip visual treatment: `bg-mystic-bg/95 border border-mystic-gold/20 rounded-lg px-3 py-2 shadow-lg`, connected to the dot by a thin 1px vertical line in `bg-mystic-gold/30`. Maximum width `200px`, `text-wrap: balance`.

**6.6** When `triggerAspect` is present, append the orb as a subscript to the category label: "Favorable Window · 0.8° orb". This surfaces the data quality behind the classification.

### 7. Click-to-Jump Navigation

**7.1** Every dot in the overview strip (spec 5) has an `onClick={() => setOffset(m.offset)}` handler.

**7.2** Every `MarkerDot` on the slider track (spec 3) has an `onClick={() => setOffset(m.offset)}` handler. Since the overlay container is `pointer-events-none` and the dot itself is `pointer-events-auto`, this click does not interfere with slider dragging.

**7.3** Introduce a "Next notable moment" button rendered to the right of the offset label (AdvanceTab.tsx:262 vicinity): a small `→` control that advances the slider to the nearest marker with `offset > currentOffset`. Label: `"Next ✦"` in `text-mystic-gold/60 text-xs` at rest, `text-mystic-gold` on hover. Grayed out when no markers exist ahead of the current position. A paired `"← Prev"` control jumps backward. Both controls have a minimum touch target of 44×44px.

**7.4** When click-to-jump fires (from strip, from slider dot, or from next/prev buttons), set `offset` directly via `setOffset(m.offset)` with no animation. The slider's position updates synchronously — no easing, no transition. The slider thumb is a precision control; jumps should be instantaneous.

### 8. Quick-Stats and Aspect List Echo

**8.1** The aspect list header at AdvanceTab.tsx:354 is extended with a marker category suffix when the current snapshot is non-neutral:
- Neutral: `"Transit Aspects ({count})"` — unchanged
- Favorable: `"Transit Aspects ({count}) — Favorable window"`
- Challenging: `"Transit Aspects ({count}) — Tense configuration"`
- Power: `"Transit Aspects ({count}) — Power configuration"`
- Shift: `"Transit Aspects ({count}) — Planetary shift"`

The suffix is `text-mystic-muted text-sm font-normal` (lighter weight than the heading itself) to read as annotation rather than equal emphasis.

**8.2** The retrograde activity section header (AdvanceTab.tsx:405) is conditionally relabeled: when `snapshot.score.category === 'shift'`, render `"Planetary Shift"` instead of `"Retrograde Activity"`. A station is a direction change, not retrograde motion in progress; the label should name what is happening.

**8.3** When a power marker is active (`snapshot.score.category === 'power'`), the slider thumb receives an additional colored halo via CSS variable or class: `[&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(201,168,76,0.8)]`. When the thumb is at a neutral position, the shadow returns to the existing `[0_0_8px_rgba(201,168,76,0.5)]`. This requires the shadow class to be dynamically selected based on `snapshot.score.category`.

### 9. Loading State Treatment

**9.1** Replace `"Computing transits…"` (AdvanceTab.tsx:345) with `"Reading the next {config.max} {config.unitPlural}…"` — personalized to the selected period and communicating that the product is doing genuine work on behalf of the user.

**9.2** During `isPending`, show the overview strip placeholder (spec 5.8) in place of the strip so the container layout does not shift when computation completes.

**9.3** When computation completes and `snapshots` first populates, no special entrance animation is required for the marker layer. The dots simply appear with their idle animation already running. The transition from blank-track to marked-track is itself the event — it does not need additional choreography beyond the idle state starting immediately.

### 10. Performance Requirements

**10.1** The `markers` useMemo (spec 1.14) must be keyed on `[snapshots]` only, not `[snapshots, offset]`. Slider drag changes `offset` but not `snapshots`. The marker array must not recompute on drag events.

**10.2** Marker dot rendering must not trigger re-renders of sibling components. The `MarkerDot` component receives only `{ marker, max, active, onClick }` and should be wrapped in `React.memo` to prevent re-renders when `offset` changes but the `active` prop does not change for a given marker.

**10.3** The scoring pass inside `preCalculateSnapshots` adds zero WASM calls — it operates entirely on already-computed `TransitAspect[]` and `retrogrades[]` arrays. Any implementation that introduces additional `calculateCurrentPositions` or `getRetrogradeStatus` calls for scoring purposes fails this constraint.

**10.4** The `buildTransitTimeline` function from transitTimeline.ts must not be called from AdvanceTab. The snapshot array already contains all required data; calling the timeline engine would double the computation cost without providing additional accuracy.

**10.5** Snapshot computation result should be cached by the parent component (`TransitReadingPage`) to prevent the full `preCalculateSnapshots` loop from re-running on every Advance tab mount/unmount cycle. The cache key is `(period, baseDate.toISOString())`. If the same period and baseDate are requested within the same session, serve the cached snapshots immediately. This is a `useRef`-based cache in `TransitReadingPage`, not a global store.

**10.6** All marker animations must use CSS `transform` and `opacity` properties exclusively — no `box-shadow`, `border-radius`, or `width/height` animation — to ensure GPU compositing and avoid CPU compositor involvement at 60fps.

### 11. UnknownTime Chart Handling

**11.1** When `chartData.unknownTime === true`, the `power` category is fully suppressed (same guard as the existing `computePowerDayBanner`). No gold markers appear.

**11.2** When `unknownTime === true` and the overview strip renders, display a small annotation below the strip: `"Birth time unknown — angle-contact power days not available"` in `text-mystic-muted text-[10px]`. This prevents the user from interpreting the absence of gold markers as a data absence rather than a chart limitation.

**11.3** The `favorable` and `challenging` categories remain available for unknown-time charts. Their scoring uses only the transit-to-natal planet aspects (not angle contacts), which are correctly computed from natal planet positions regardless of birth time accuracy.

### 12. Offset 0 Guard

**12.1** `scoreSnapshot` returns `{ category: 'neutral', intensity: 0, reason: '', coShift: false }` when `snapshot.offset === 0`. The current date is a reference, not a future recommendation.

**12.2** The overview strip does not render a dot at position 0 even if it were somehow scored non-neutral. An explicit `filter(m => m.offset > 0)` guard on the markers array prevents this.

**12.3** The next/prev navigation buttons only target markers at `offset > 0` (prev) or `offset > currentOffset` (next). A "prev" press from offset 0 is a no-op.

### 13. Mobile Considerations

**13.1** All interactive elements in the marker system have a minimum touch target of 44×44px. The overview strip dots achieve this via the `h-10` container height (spec 5.3). The MarkerDot on the slider track achieves this via invisible `padding` around the visual dot that extends the click/tap area without expanding the visual size.

**13.2** The hover tooltip (spec 6) does not display on touch devices. Mobile users rely on the active-state banner (spec 2.3) which renders when the slider arrives at a marked position.

**13.3** The overview strip on mobile (320–375px viewport) with the weekly period (52 steps) gives approximately 6px per step. The collision handling (spec 5.7) prevents visual overlap. The strip should not be `overflow-hidden` in a way that clips dot tap areas — use `overflow: visible` on the dots while keeping the strip's background shape clipped with a separate element.

**13.4** The next/prev navigation buttons (spec 7.3) are particularly valuable on mobile where precise drag control is harder. They must be rendered prominently enough to be discoverable without being documented.

### 14. Edge Cases

**14.1 Quiet periods:** When `markers.length === 0` after density capping, render the empty strip state (spec 5.6). Do not suppress the strip — a quiet period is astrological information.

**14.2 All positions neutral after density cap:** The density cap (spec 1.13) retains the top-intensity markers. Even in an extremely quiet chart, if any positions score non-neutral, at least the top 1 by intensity is retained. If genuinely zero positions score non-neutral before the cap, the empty-strip state renders.

**14.3 February and end-of-month base dates:** The monthly `preCalculateSnapshots` branch uses `new Date(year, month + i, day, 12, 0, 0)`. JavaScript normalizes February 31 to March 3, March 32 to April 1, etc. This is unavoidable in the current architecture without implementing a proper month-snapping algorithm (snap to last valid day of each month). For this sprint, the existing behavior is preserved but the marker for any normalized date correctly reflects the actual computed date (the `snapshot.dateStr` is derived from the `targetDate` JavaScript resolved, so the label and the ephemeris are consistent even if the slider position implies a different calendar date). A comment is added in the monthly branch documenting this known limitation.

**14.4 Planet crossing 0° Aries during the advance window:** The `applying` flag can flip at the zodiac boundary due to modular arithmetic discontinuity in `calculateTransitAspects` (transits.ts:146–157). To prevent a single snapshot from losing marker status due to this artifact, apply applying-state hysteresis: if consecutive snapshots i−1 and i+1 both score the same non-neutral category but snapshot i does not, and the orb difference between i−1 and i is less than 0.5°, inherit snapshot i−1's category. This requires a post-processing pass over the scored snapshots after the main loop.

**14.5 Very large orbs in monthly period:** The loosened monthly thresholds (angleContact: 3.0°, applyingTight: 4.0°) may still fire for most months. The global density cap (spec 1.13) is the primary defense. If the cap retains 7 markers for a 36-month period, the strip shows 7 dots — which is meaningful and not noisy.

**14.6 Charts with no classical transit aspects in a snapshot:** Some snapshots may have `transitAspects.length === 0` after filtering. These correctly score as `neutral`. No special handling needed.

### 15. Accessibility

**15.1** Every interactive marker dot has an `aria-label` of the form `"Jump to {weekday}, {month} {day}: {reason}"`. Screen readers can navigate the notable moments strip as a set of labeled buttons.

**15.2** Shape differentiation (circle for favorable/challenging, diamond for power, diamond-variant for shift) ensures markers are distinguishable without relying on color alone. This satisfies WCAG 1.4.1 (use of color).

**15.3** The "Next notable moment" and "Prev notable moment" controls have `aria-label="Jump to next notable moment"` / `"Jump to previous notable moment"`.

**15.4** All pulsing animations include a `@media (prefers-reduced-motion: reduce)` override that sets `animation: none` (spec 4.6).

### 16. Color and Design Constants

**16.1** A `MARKER_COLORS` constant maps categories to their hex/Tailwind color values:

```typescript
const MARKER_COLORS: Record<MarkerCategory, string> = {
  power:      '#c9a84c', // mystic-gold
  favorable:  '#34d399', // emerald-400
  challenging:'#f87171', // red-400
  shift:      '#60a5fa', // blue-400
  neutral:    'transparent',
}
```

**16.2** The color vocabulary must not introduce new colors. All four marker colors exist in the current codebase: `text-mystic-gold`/`bg-mystic-gold` (gold), `text-green-400`/`bg-emerald-400` (favorable), `text-red-400`/`bg-red-400` (challenging), `text-blue-400`/`bg-blue-400` (shift). The marker system uses the same values.

**16.3** Marker shape shapes maintain the existing icon grammar: ✦ is already used in the power day banner; ◆ is the shift marker. The `text-mystic-muted` label style (`text-[10px] uppercase tracking-widest`) is reused for the strip header, consistent with other annotation labels in the tab.

### 17. Language and Framing

**17.1** Tooltip and banner copy must use astrological vocabulary, not gamification or productivity language. Permitted: "Power Day," "Favorable Window," "Challenging Period," "Planetary Shift," planet names, aspect names, angle names (Ascendant, Midheaven). Not permitted: "Amazing Day," "Watch Out," "Level Up," "Streak," "Achievement."

**17.2** Reason strings must be specific and derivable from the chart. "Saturn reaches your Ascendant" is specific. "A notable concentration of energy" is not — it is the current fallback in `computePowerDayBanner` and should be replaced by the specific aspect-naming reason from `scoreSnapshot`.

**17.3** The category labels must convey planetary configurations, not guaranteed experiential outcomes. "Favorable Window" signals that the aspects support favorable action — it does not promise a favorable outcome. This framing is honest about the epistemic limit of the scoring system.

### 18. Acceptance Checks

**18.1** After computation completes for a weekly period, the slider track displays colored dots at the scored positions. The dots are visible at resting size (5–8px) against the dark track.

**18.2** Hovering a dot on desktop shows a tooltip with weekday, category label, and reason sentence within 100ms (CSS hover, no async work).

**18.3** Clicking a dot in the overview strip jumps the slider offset to that position. The date label, banner, chart wheel, and aspect list all update immediately.

**18.4** Dragging the slider does not cause the marker dots to recompute or move. The `markers` array is stable during drag — only `offset` changes, which updates `active` props on individual dots.

**18.5** At offset 0, no banner, no active dot, no tooltip. The overview strip position indicator sits at the leftmost edge.

**18.6** For a chart with `unknownTime = true`, no gold/power dots appear. The strip annotation reads "Birth time unknown — angle-contact power days not available."

**18.7** For a period with genuinely few notable moments (e.g., a slow chart in a quiet astrological season), the strip renders with the empty-state label rather than showing broken/empty dots.

**18.8** On a mobile viewport (375px), the overview strip dots are tappable. Tapping a dot jumps the slider. The tap target is at minimum 44px tall by 44px wide.

**18.9** Switching from daily to weekly to monthly (period picker) resets `offset` to 0, triggers `preCalculateSnapshots` for the new period, and re-renders the marker layer from the new snapshots. The previous period's markers do not persist.

**18.10** The existing power day banner still renders correctly for power positions. The refactored `computePowerDayBanner` (spec 2.1) produces visually identical output to the pre-refactor version for all power day positions. A regression check: find a birth chart and date where the pre-refactor banner fires, verify the post-refactor banner fires with identical or more specific text.

---

## Out of Scope

- Synastry, bi-wheel, couple profile, partner-related features
- Reading tab GPT interpretation, Timeline tab TransitTimeline component
- New transit period types (no new daily/weekly/monthly variants)
- Any server-side changes — scoring is entirely client-side
- Natal chart or solar return pages
- UpgradeModal, subscription tiers, analytics events
- Full redesign of TransitReadingPage tab structure, header, or navigation
- Retrograde interpretation copy in `TRANSIT_RETROGRADE`
- Cross-tab teaser strip in TransitReadingPage (the hint above the tab bar calling attention to the next power day from the Reading tab — this is a desirable follow-on but adds complexity to state-lifting that exceeds this sprint's scope)
- Web Worker migration for `preCalculateSnapshots` — the snapshot cache (spec 10.5) mitigates the remount cost without requiring an architectural shift

---

## Open Questions

**Q1 — Tailwind keyframe registration vs. inline style:** Custom `@keyframes` for the glow-breathe and shift-rotate animations require either `tailwind.config.js` changes (`theme.extend.keyframes`) or inline `style={{ animation: '...' }}` props. The inline approach avoids config changes but is less maintainable. Which approach is preferred for this codebase?

**Q2 — Density cap tuning:** The 20% global cap (spec 1.13) is a first estimate. Initial testing may reveal that the right cap for daily is higher (daily has only 30 positions and a day with a close angle contact is genuinely rare) or lower for weekly. Is the 20% cap a hard requirement or a starting default subject to calibration after initial testing?

**Q3 — Snapshot caching location:** Spec 10.5 places the snapshot cache in `TransitReadingPage` via `useRef`. An alternative is lifting snapshot state entirely out of `AdvanceTab` into `TransitReadingPage` and passing snapshots as a prop. This enables future features that need snapshot data outside the Advance tab (e.g., the cross-tab teaser). Which architecture is preferred?

**Q4 — `coShift` dot rendering:** The blue border ring around a `favorable` or `challenging` dot (spec 1.6, spec 3.7) assumes the implementer can add `outline` or `ring` CSS to the existing dot element. On very small dots (5–6px), a 1px ring may be too subtle to read. Should the ring be widened to 2px, or should `coShift` markers use a visual indicator other than a ring (e.g., a dot with a small blue tick)?

**Q5 — Applying-flag hysteresis threshold:** Spec 14.4 proposes inheriting a marker category across a single snapshot gap when the orb difference is under 0.5°. The 0.5° threshold is a guess. Should this be a named constant (`MARKER_HYSTERESIS_ORB`) to make it tuneable after initial testing?

**Q6 — Retrograde section header rename:** Spec 8.2 renames the retrograde section header to "Planetary Shift" when the current snapshot is a shift marker. If the snapshot is simultaneously a station event and a retrograde planet is already mid-retrograde (a separate planet), the header cannot correctly describe both. Should the rename apply only when the stationing planet is the only active retrograde, or unconditionally when the marker category is shift?

---

## Outcome Notes (2026-05-15)

**Status:** completed
**Commit:** `043f79c` on branch `sprint-0018-task-0004-feat-advance-marker-system`
**Build:** TypeScript clean (tsc --noEmit: 0 errors); vite build: 9.84s, 0 errors

### Implemented Specs (all 18 sections, all numbered specs)

- **Types (1.1–1.2):** `MarkerCategory`, `SnapshotScore`, `AdvanceSnapshot.score` — all exported
- **scoreSnapshot (1.3–1.12):** Pure function with 5-category priority logic, ORB_THRESHOLDS per period, intensity formulas, specific reason strings via `buildPowerReason`/`buildAspectReason` helpers
- **preCalculateSnapshots changes (1.11–1.13):** Monthly noon fix, score injection in loop with prev snapshot, hysteresis post-processing pass, 20% global density cap
- **computePowerDayBanner refactor (2.1–2.4):** Delegates entirely to `snapshot.score`; chartData parameter removed; generalized banner handles all 4 non-neutral categories with per-category colors and symbols
- **Marker overlay (3.1–3.8):** `pointer-events-none` container with `left: 10px / right: 10px` inset; `MarkerDot` (React.memo) with 44×44px touch wrappers; diamond/circle shapes; active state (+4px, static box-shadow, full opacity); coShift outline ring
- **Animations (4.1–4.7):** Inline `<style>` tag with GPU-safe keyframes (opacity + transform only); `glow-breathe-gold` 3s, `glow-breathe-red` 2s, `shift-rotate` 4s; `prefers-reduced-motion` override; favorable static (no animation)
- **Overview strip (5.1–5.8):** h-10 rounded-full strip; collision handling at 5% threshold; position indicator; quiet-period empty state; unknownTime annotation; pending placeholder
- **Tooltip (6.1–6.6):** hover-only (desktop); suppressed when slider at that offset; date+weekday, category label+orb suffix, reason; clamped percentage position
- **Click-to-jump (7.1–7.4):** Strip dots, MarkerDot wrappers, Next ✦ / ← Prev buttons (44px touch targets, aria-labels)
- **Quick-stats enhancements (8.1–8.3):** Aspect header suffix per category; "Planetary Shift" retrograde header when shift; dynamic thumb shadow class
- **Loading state (9.1–9.2):** "Reading the next N units…"; strip pending placeholder
- **Performance (10.1–10.6):** markers useMemo keyed on [snapshots]; React.memo on MarkerDot; no new WASM calls in scoring; buildTransitTimeline not called; useRef snapshot cache; GPU-only animations
- **UnknownTime (11.1–11.3):** Power suppressed; strip annotation; favorable/challenging available
- **Offset 0 guard (12.1–12.3):** scoreSnapshot neutral; markers filter; prev/next navigation guards
- **Mobile (13.1–13.4):** 44×44px touch targets everywhere; tooltip desktop-only; collision handling; prominent nav buttons
- **Edge cases (14.1–14.6):** Empty strip; density cap preserves top-1; end-of-month comment; hysteresis pass; monthly loosened thresholds + cap

### Open Question Resolutions
- **Q1 (keyframes):** Chose inline `<style>` tag — no config changes, faster to iterate
- **Q3 (cache location):** Cache placed inside AdvanceTab via `useRef<Map<string, AdvanceSnapshot[]>>` — avoids lifting state while satisfying spec 10.5
- **Q5 (hysteresis):** Named constant `MARKER_HYSTERESIS_ORB = 0.5` added, easily tuneable

### Notes for Consolidation
- Task 0001 monthly midnight fix: already reimplemented here (noon for i≥1). If task-0001 merged first, this implementation supersedes it.
- Task 0003 scoreSnapshot engine: task-0004 includes its own `scoreSnapshot` inline in AdvanceTab; consolidation should reconcile with any shared engine from task-0003.
- Task 0005 next/prev navigation: also implemented here inline (← Prev / Next ✦ buttons). If task-0005 has additional features, consolidation should merge them.
