# Sprint 0018 — Vision

## Sprint Focus

Transform the Advance tab's plain range slider into a predictive intelligence layer: pre-score every step in the slider journey (up to 30 days, 52 weeks, or 36 months), annotate the track with colored dot markers that signal the character of each moment before the user lands there, and provide an at-a-glance overview strip that lets a user scan the entire period for peaks and valleys without dragging the slider step by step. The experience shifts from "explore by dragging" to "the chart tells you where to look."

---

## Why Now

The Advance tab was built in a recent sprint and is already architecturally complete: `AdvanceTab.tsx` pre-calculates all snapshots for the entire slider range in a single `useTransition` pass (`preCalculateSnapshots`), stores them in a `snapshots[]` array, and has a working `computePowerDayBanner` function that can already score any given snapshot as a power day or not. The data exists. The problem is that the user has to drag the slider to each position to discover what lives there — there is no bird's-eye view of which moments are worth visiting.

Three sprints of synastry work (0015–0017) deepened one feature family to production quality. The transit reading side of the product has received incremental fixes but no deliberate experience investment since the Advance tab and TransitTimeline were introduced. The guidelines are explicit: help the user understand what is coming in the future — power days, important weeks, impactful months — and mark them on the slider before the user has to find them manually.

The calculation substrate for scoring every position is already in place. This sprint is a UI and intelligence sprint, not an engine sprint.

---

## Where to Look

### Primary target: AdvanceTab.tsx
`/projects/astrology-reader/src/components/reading/AdvanceTab.tsx`

This is the entire Advance tab component. Key sections to understand:

- **`preCalculateSnapshots` (line 168):** Runs `calculateTransitAspects` and `getRetrogradeStatus` for every step in the range. After this sprint, each snapshot should also carry a pre-computed `score` — a signed integer summarizing its character — so the marker layer can render without re-scoring on scroll.
- **`computePowerDayBanner` (line 106):** Already contains two scoring triggers — slow planet within 1° of natal angle, and 3+ applying aspects with orb ≤ 2°. This function's logic is the seed for the broader scoring system. The sprint should generalize it into a `scoreSnapshot()` function that returns a typed result: `{ category: 'power' | 'favorable' | 'challenging' | 'shift' | 'neutral', intensity: number, reason: string }`.
- **The slider HTML (line 265–276):** Currently a plain `<input type="range">` with a single gold thumb. The markers must be overlaid on top of this track as absolutely-positioned dots. The track is `w-full h-2`; a positioned `<div>` wrapper containing the input and the marker layer gives full control without fighting the native range element. Each marker dot sits at `left: (step / max) * 100%`.
- **`ADVANCE_CONFIG` (line 34):** Controls `max` and `msPerStep` per period — daily max 30, weekly max 52, monthly max 36. Marker density should reflect these ranges: daily markers for notable days; weekly markers for key weeks; monthly markers only for impactful months (a higher threshold since each month is a coarser unit).

### Scoring data: transits.ts
`/projects/astrology-reader/src/engine/transits.ts`

- **`computeEnergyRating` (line 480):** Already scores a snapshot's harmoniousness on a 1–5 scale from transit aspects. The scoring output (`{ label, score, dotColor, textColor }`) maps neatly to the favorable/challenging axis. This function is the right primitive for the green/red dimension of the marker system.
- **`calculateTransitAspects` (line 133):** Returns `TransitAspect[]` already sorted by orb ascending, with `applying` boolean and `nature` field. The combination of applying + tight orb + slow planet + angle contact is what currently drives `computePowerDayBanner`. The same data feeds the new scorer.
- **`getRetrogradeStatus` (line 227):** Already used in each snapshot. Station events (very slow motion, sign change from direct to retrograde or vice versa) are the "blue shift" category the guidelines mention — they mark a qualitative change in planetary motion regardless of harmoniousness.

### Timeline events: transitTimeline.ts
`/projects/astrology-reader/src/engine/transitTimeline.ts`

- **`TimelineDay.isPowerDay` (line 46):** The timeline engine already marks a day as a power day when it has 3+ significant events. This threshold logic parallels the Advance tab's secondary trigger. The two systems currently compute independently — aligning them would be a small improvement. The key insight: the timeline engine's `findAspectPerfections` (line 155) already identifies the exact moment an aspect becomes exact. These perfection dates are the highest-confidence signal for "something notable happens here."
- **`buildTransitTimeline` (line 446):** Not used in `AdvanceTab` — the Advance tab does its own per-step snapshot calculation rather than the precise event-detection approach of the timeline. The marker system should primarily use the Advance tab's existing snapshot data (it's already computed) rather than calling `buildTransitTimeline` again, which would be expensive.

### Color and design conventions
`/projects/astrology-reader/src/components/chart/ChartWheel.tsx` and inline Tailwind classes throughout the app.

The color vocabulary already in use:
- `text-mystic-gold` / `bg-mystic-gold` — gold (#c9a84c): the primary accent, used for neutral-positive emphasis
- `text-green-400` / `bg-emerald-400` — harmonious/favorable
- `text-red-400` — challenging/retrograde
- `text-blue-400` / `bg-blue-500` — the mystic-blue family, used for timeline tab accent and lunar phase cards

The guidelines propose green for very favorable, red for very challenging, and blue for power shifts. This maps directly onto the existing color vocabulary — no new colors need to be introduced. The gold/amber family can serve neutral highlights.

### Transit reading page (integration context)
`/projects/astrology-reader/src/components/results/TransitReadingPage.tsx`

The three-tab layout (`reading | timeline | advance`) is defined here (line 282–314). The Advance tab is rendered without any summary context (line 366–374). An optional pre-tab summary strip — a compact horizontal ribbon above the tab bar that shows the highest-intensity upcoming moment — would give users a reason to open Advance even when they came for the Reading tab.

### Period selection
`/projects/astrology-reader/src/components/form/PeriodSelectPanel.tsx`

No changes needed here. The period is already selected before the user reaches the Advance tab.

---

## The Marker System: Design and Implementation

### Scoring categories

Each snapshot in the pre-calculated array should be classified into one of five categories (in priority order when multiple conditions are met):

| Category | Trigger | Color | Icon |
|----------|---------|-------|------|
| `power` | Slow planet (Saturn/Uranus/Neptune/Pluto) within 1° of natal ASC or MC | Gold / amber | ✦ |
| `favorable` | Energy rating score ≥ 3 AND 2+ applying harmonious aspects with orb ≤ 1.5° | Green | • |
| `challenging` | Energy rating score ≤ 1 AND 2+ applying challenging aspects with orb ≤ 1.5° | Red | • |
| `shift` | Any planet stations (motion crosses zero — direct to retrograde or vice versa) within the step's window | Blue | ◆ |
| `neutral` | Everything else | (no marker) | — |

The `power` category takes precedence: a day that is both favorable and has a slow planet on an angle is a gold marker, not green. The `shift` category is orthogonal and should co-display with favorable or challenging if both conditions are met (a stacked or dual-dot treatment rather than suppression).

### Marker rendering on the slider track

The slider container becomes a positioned wrapper:

```
<div className="relative w-full">
  <input type="range" ... />           {/* existing input */}
  <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
    {markers.map(m => (
      <MarkerDot key={m.offset} marker={m} max={config.max} />
    ))}
  </div>
</div>
```

Each `MarkerDot` positions itself at `left: (offset / max) * 100%` (adjusted by a few pixels to center on the track). On hover or when the slider is at that offset, it expands or glows. Clicking a marker dot should jump the slider to that offset (pass a click handler that calls `setOffset(m.offset)`).

### Animated markers

The guidelines explicitly mention animations. The right approach for this mystical aesthetic is a CSS `animation: pulse` keyframe on the dot's glow/shadow, applied at reduced intensity when idle and brighter when the thumb is nearby or hovering. Tailwind's `animate-pulse` class is available. For gold/power markers, a slow `animate-[pulse_3s_ease-in-out_infinite]` creates the "breathing" quality without being distracting. Challenging (red) markers should pulse faster. Favorable (green) markers can have a static glow without animation.

### Marker tooltip

When a marker is hovered (or when the slider thumb is at a marked position), a small tooltip above the track should show:
- The date (already formatted by `formatDate`)
- The category label ("Power Day", "Favorable Window", "Challenging Period", "Planetary Shift")
- A one-line reason derived from `scoreSnapshot`'s `reason` field

This replaces the current bottom-of-slider date display for marked positions, or can augment it.

### Marker overview strip

Above the slider, before the quick-stats row, a compact horizontal strip shows all markers across the entire range as small colored dots on a miniature timeline. This serves as the "scan the whole period" tool. The strip is `w-full h-6` with dots positioned by percentage. Clicking a dot in the strip jumps the slider to that offset. The strip is labeled "Notable moments" on the left and shows the period range label on the right.

For weekly and monthly periods, this strip is the primary navigation affordance — a user planning a month can see at a glance that week 3 is a challenging red cluster and week 7 is a gold power moment, and navigate directly.

### Threshold calibration per period

- **Daily (max 30):** Apply all four categories. The 1° orb on angle contact is appropriate at daily resolution. 3+ applying aspects at ≤ 2° orb is correct.
- **Weekly (max 52):** Loosen angle contact to 2° (a week-level resolution is coarser). Require 3+ applying aspects at ≤ 3° for the favorable/challenging categories. Station events are high-value at weekly resolution — a planet stationing retrograde mid-week is definitionally significant.
- **Monthly (max 36):** Only mark months where either (a) a slow planet is within 3° of a natal angle or (b) the month contains a station of Saturn/Uranus/Neptune/Pluto or (c) the energy score is extreme (≥ 4 or ≤ 1). Most months should be neutral — reserve markers for genuinely notable months or the strip becomes noise.

---

## Quality Bar

"Deep, not shallow" for this sprint means:

- **Markers must be computed from real chart data, not approximations.** The scoring logic in `scoreSnapshot` must use the same `TransitAspect[]` and retrograde data already present in each `AdvanceSnapshot`. A marker that says "Power Day" must point to a day where a slow planet is demonstrably within 1° of the natal ASC or MC — not a generic "this looks significant" heuristic.
- **The slider must remain fully functional.** The marker layer is decorative from the browser's perspective — it must not intercept pointer events on the range input itself. Use `pointer-events-none` on the marker container and attach click handlers separately if jump-to-offset is supported.
- **Markers must not fire on offset 0.** The current date (offset 0) is a reference point, not a future opportunity. `computePowerDayBanner` already enforces this; `scoreSnapshot` must carry the same guard.
- **Performance must not regress.** `preCalculateSnapshots` is already wrapped in `useTransition` to prevent blocking the main thread. The scoring pass adds a small constant per snapshot (it works on the already-computed `TransitAspect[]`). The marker layer must not trigger re-renders on slider drag — it should be a `useMemo` over the full `snapshots` array.
- **The color system must be internally consistent.** Green favorable, red challenging, gold power, blue shift — these must not be mixed with the existing mystic-gold accent in a way that makes red markers look like errors or green markers look like UI affordances. Use dot shapes (circles for favorable/challenging, diamond ✦ for power, square ◆ for shift) to differentiate by shape as well as color for accessibility.
- **The animations must feel mystical, not app-like.** Avoid `animate-bounce` or `animate-ping` (these read as notification badges). Prefer slow glows and breathing pulses. The Advance tab is a contemplative feature — its animations should feel like starlight, not a notification counter.

---

## What This Sprint Is NOT

- **Not a synastry sprint.** The bi-wheel, couple profile, synastry GPT, and all partner-related code are out of scope. Three sprints (0015–0017) deepened synastry; this sprint shifts focus.
- **Not a Reading tab or Timeline tab sprint.** The GPT interpretation, aspect list, retrograde section, and TransitTimeline component are not targeted. The Advance tab is the exclusive focus.
- **Not a new period type sprint.** No new transit periods are introduced. Daily/weekly/monthly stay as-is.
- **Not a server sprint.** No backend changes. Scoring happens entirely client-side using the same ephemeris engine already running in `AdvanceTab`.
- **Not a natal chart or solar return sprint.** Those pages are not touched.
- **Not a subscription or auth sprint.** No changes to UpgradeModal, rate limits, tiers, or analytics events.
- **Not a full redesign of the transit reading page.** The tab structure, header, chart wheel, and navigation buttons are not restructured. Only the Advance tab's slider section and its immediate container are modified.
- **Not a retrograde interpretation sprint.** Retrograde station events are used as a signal for the "shift" marker category only. The interpretation copy for retrograde periods (in `TRANSIT_RETROGRADE`) is not revised.
- **Not a "gamification" sprint.** The markers are astrological signals derived from the chart, not achievements, badges, or progress indicators. The power day concept must remain grounded in planetary positions relative to the natal chart — not in streaks, points, or social features.
