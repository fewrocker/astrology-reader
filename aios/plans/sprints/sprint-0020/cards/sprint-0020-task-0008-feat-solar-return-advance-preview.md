# Proposal: Solar Return Advance Preview — "Peak Moments This Solar Year"

**Type:** Feature
**Originated by:** Jobs, Carmack, Miyazaki, Taleb

---

## Problem / Opportunity

The Solar Return page (`/projects/astrology-reader/src/components/results/SolarReturnPage.tsx`) is entirely static. It presents the SR chart as a year-level document: key placements, static briefs for SR Sun and Moon house, a GPT interpretation of the year's themes, and a bi-wheel chart on the Chart tab. The user learns what the year is about, but has no way to find out *when* within the year the themes express most intensely.

This is the product's most urgent gap on the SR page. A user who reads "a year of professional visibility and career advancement" has no actionable information about timing. Is that Saturn-Midheaven pressure arriving in month three or month nine? Are the creative peaks in spring or fall? The SR page offers no answer.

The data to answer this question already exists:

- `solarReturnData.srChart` is `ChartData`-compatible: it has `planets`, `angles`, `houses`, and `unknownTime: false` (set explicitly in `calculateSolarReturn` at `solarReturn.ts` line 49: `calculateChart(srDate, srTime, birthLat, birthLng, 'UTC', false)`).
- `solarReturnData.srMoment` is the precise UTC `Date` of the solar return — the natural start of the SR year's 12-month advance window.
- `preCalculateSnapshots` in `AdvanceTab.tsx` (line 846) accepts any `ChartData` and any `TransitPeriod`. It runs the full scoring engine — combination-weight priority ladder, angle contact detection, hysteresis pass, density cap with category diversity — against any chart.
- `OverviewStrip` and `MarkerDot` are already exported from `AdvanceTab.tsx` and used in `CoupleAdvanceTab.tsx` without chart wheels.

The entire infrastructure for a 12-step monthly advance has been built over five sprints. The SR chart is plug-compatible with it. The implementation cost is minimal; the product impact is high.

---

## Vision

When a user opens the Solar Return Reading tab, they see the year-level framing they already have: key placements, static briefs, the GPT interpretation. At the bottom of the Reading tab, below the GPT interpretation and before the navigation buttons, a section titled "When This Year Intensifies" appears. It contains a single overview strip showing the SR year's 12 monthly steps as a bar of colored marker dots. Gold diamonds mark power months (a slow planet reaching the SR Ascendant or Midheaven). Green circles mark favorable windows. Red circles mark challenging periods. Blue diamonds mark planetary station shifts.

Below the strip, Prev and Next buttons let the user jump to the notable moments. When they land on a notable marker, a banner appears explaining what is happening that month — the same reason-string and guidance-paragraph infrastructure used in the individual advance tab, but scored against the SR chart instead of the natal chart.

The experience transforms the SR page from a static year description into a navigable map of the year. The user can find the hardest-looking month, discover that Saturn is sitting on the SR Ascendant in October, decide to keep that month clear. They can find the most favorable window in the year and use it.

---

## Specifications

### 1. Data Source

The advance preview scores transiting planets against `solarReturnData.srChart` — not the natal chart. The SR chart has its own Ascendant, Midheaven, and planet positions for the year. Transits to those positions show when the year's SR themes are activated. This is the architecturally correct source: the advance engine asks "what does the sky do to this chart at each monthly step," and the SR chart is the chart for the SR year.

The natal chart (`solarReturnData.natalChart`) is not used by the SR advance scorer. It is present in `solarReturnData` and referenced in `SRPlanetTable` but is irrelevant to the monthly advance scoring.

### 2. Base Date — UTC Normalization Required

`solarReturnData.srMoment` is a UTC `Date` returned by `findSolarReturn`. The SR page already formats it with `.getUTCMonth()`, `.getUTCDate()`, etc. (`SolarReturnPage.tsx` line 159 `formatSRMoment`).

`preCalculateSnapshots` at monthly period constructs step 0 as:
```ts
new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate())
```

These are **local-time** getters. If `srMoment` is passed directly, a user in UTC+3 whose SR falls at 22:00 UTC on March 14 will have `baseDate.getMonth()` return March 14 in UTC but `getDate()` return March 15 in local time — the advance strip starts one calendar day late and the first step is wrong.

The base date passed to `preCalculateSnapshots` (or to the future `runAdvancePreCalculation`) must be normalized to UTC midnight of the SR date before use:

```ts
const srUtcDate = solarReturnData.srMoment.toISOString().split('T')[0]
const srBaseDate = new Date(srUtcDate) // parsed as UTC midnight
```

This ensures the monthly step loop starts at the correct UTC calendar date regardless of the user's timezone.

### 3. Configuration — 12-Step Monthly Cap, Not ADVANCE_CONFIG.monthly

`ADVANCE_CONFIG.monthly.max` is 36 (3 years). The SR year is 12 months. A dedicated local config must be defined within the SR advance component:

```ts
const SR_ADVANCE_CONFIG: AdvanceConfig = {
  unit: 'month',
  unitPlural: 'months',
  max: 12,
  msPerStep: 30.44 * 86400000,
}
```

The shared `ADVANCE_CONFIG` constant must not be modified. If `preCalculateSnapshots` is called with `period: 'monthly'`, it reads `ADVANCE_CONFIG.monthly.max = 36` internally, computing 36 snapshots. The SR component should slice or cap at 12. However, if `code-advance-precompute-abstraction` lands first (the `runAdvancePreCalculation` refactor that accepts an explicit config param), the SR advance should call that function with `SR_ADVANCE_CONFIG` instead of slicing.

Until that abstraction lands: call `preCalculateSnapshots(srChart, 'monthly', srBaseDate)` and use only `snapshots.slice(0, 13)` (offsets 0–12). The density cap inside `preCalculateSnapshots` runs against `config.max = 36`, which is more permissive than 20% of 12. After slicing, apply a secondary density cap: no more than `Math.ceil(12 * 0.2) = 3` non-neutral markers. Reserve one per category present (phase-1), then fill by intensity (phase-2), matching the existing algorithm at `AdvanceTab.tsx` lines 930–960.

### 4. Calling preCalculateSnapshots — Architectural Constraint

The SR advance preview must import and call `preCalculateSnapshots` directly, not duplicate its loop. `preCalculateSnapshots` is currently a module-private function. Before this feature lands, it must be exported from `AdvanceTab.tsx`:

```ts
// In AdvanceTab.tsx — add 'export' keyword
export function preCalculateSnapshots(...)
```

The SR component then imports it:
```ts
import { preCalculateSnapshots, OverviewStrip, MarkerDot, MarkerTooltip,
         ADVANCE_CONFIG, CATEGORY_HALO, MARKER_COLORS, CATEGORY_LABELS } from '../reading/AdvanceTab'
```

This is the same import pattern already used by `CoupleAdvanceTab.tsx` (lines 14–19).

### 5. Snapshot Cache

The SR advance component maintains its own `useRef<Map<string, AdvanceSnapshot[]>>(new Map())` snapshot cache, matching the pattern in `AdvanceTab.tsx` (line 1240) and `CoupleAdvanceTab.tsx` (line 414).

The cache key must include the SR chart identity (not the natal chart identity) and the target year. The target year is included because when the user clicks the year selector buttons, `solarReturnData` recomputes with a new `targetYear`, `srMoment`, and `srChart`. The cache key:

```ts
const cacheKey = [
  'sr',
  solarReturnData.targetYear,
  solarReturnData.srChart.angles.ascendant.longitude.toFixed(4),
  solarReturnData.srChart.angles.midheaven.longitude.toFixed(4),
].join(':')
```

Using `.toFixed(4)` aligns with the individual advance cache key precision fixed in sprint-0019 (the couple advance cache key bug, `toFixed(2)`, was separately flagged in `issue-couple-advance-cache-key`).

### 6. Computation Trigger

The snapshot computation runs in a `useEffect` keyed on `solarReturnData` (or more precisely, on the cache key components: `srChart.angles.ascendant.longitude`, `srChart.angles.midheaven.longitude`, `solarReturnData.targetYear`). When the user changes the year selector, `dispatch({ type: 'START_SOLAR_RETURN', targetYear: year })` causes `solarReturnData` to update, which changes the cache key, which misses the cache, which triggers recomputation. No new wiring is needed — the year selector already drives this data flow correctly.

Computation runs inside `startTransition` (from `useTransition`) to keep the main thread responsive, exactly as in `AdvanceTab.tsx` (line 1251) and `CoupleAdvanceTab.tsx` (line 426).

### 7. Overview Strip Rendering

The `OverviewStrip` component is imported from `AdvanceTab.tsx` and rendered with:

```tsx
<OverviewStrip
  markers={markers}
  max={12}
  offset={offset}
  onJump={setOffset}
  isPending={isPending}
  config={SR_ADVANCE_CONFIG}
  unknownTime={false}
  quietMessage="A relatively even year — the intensity is distributed rather than concentrated in specific peaks."
/>
```

`unknownTime` is `false` because the SR chart is always computed with a full birth time (`calculateChart` is called with `unknownTime: false` at `solarReturn.ts` line 49). The angle-contact power day markers are always available for SR advance.

The `quietMessage` must be SR-year-specific, not a copy of the individual advance phrase. "A relatively even year — the intensity is distributed rather than concentrated in specific peaks" conveys something meaningful about the SR year's character (even distribution) rather than just "nothing happened."

The strip header label above the strip reads "When This Year Intensifies" — set as a local label within the SR advance section rather than using `OverviewStrip`'s internal "Notable moments" label. The section should have a heading visible to the user:

```tsx
<h3 className="font-heading text-amber-300 text-sm uppercase tracking-wider mb-3">
  When This Year Intensifies
</h3>
```

### 8. Prev/Next Navigation

The Prev and Next controls render exactly as in `CoupleAdvanceTab.tsx` (lines 546–563): two buttons flanking the current offset label, disabled when no previous/next marker exists, using identical ARIA labels and minimum tap target sizing (`min-w-[44px] min-h-[44px]`).

No slider is included in the SR advance strip. The slider is explicitly out of scope for this sprint. The offset can only be changed by clicking Prev/Next or clicking a dot on the overview strip.

Current offset state starts at 0 (the SR start moment). The offset label reads "Month 1" through "Month 12" rather than "+1 month" through "+12 months", because the SR year framing is forward-looking from the SR date, not relative to "now":

```ts
const offsetLabel = offset === 0 ? 'SR Start' : `Month ${offset}`
```

The date display below Prev/Next shows the computed date for the current offset in the same format used by `CoupleAdvanceTab`: `d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })`.

### 9. Category Banner

When the user navigates to a non-neutral marker offset, the category banner renders. The banner is identical in structure to the individual advance tab banner at `AdvanceTab.tsx` lines 1503–1522: a colored left-border card with a category icon, a bold-fragment heading (the trigger planet name), a reason sentence, and a guidance paragraph.

The banner uses `snapshot.score.bannerBoldFragment` for the bold fragment with a fallback to `snapshot.score.reason.split(' ')[0]` — the same pattern as `AdvanceTab.tsx` line 1513. It renders the `snapshot.score.guidance` paragraph as a second `<p>` element in `text-mystic-muted/80` style, same as `AdvanceTab.tsx` line 1519.

The reason strings and guidance strings come from the existing `POWER_DAY_PHRASES`, `ASPECT_HOUSE_CONTEXT`, and `ASPECT_GUIDANCE` tables in `AdvanceTab.tsx` — these are SR-chart-specific because the SR chart has its own houses and angles. No new guidance tables are needed for the SR advance. The scoring engine already operates correctly against any `ChartData`.

### 10. Page Layout Position

The SR advance section belongs inside the Reading tab, after the GPT interpretation and before the navigation buttons. It must not appear between the GPT interpretation and the planet table (which would break the reading's thematic flow). The planet table currently lives only on the Chart tab (`SolarReturnPage.tsx` lines 282–323), so no conflict exists.

Current Reading tab order (`SolarReturnPage.tsx` lines 256–279):
1. `SRStaticBriefs` (Sun/Moon house briefs)
2. GPT interpretation skeleton or `SRReading` prose

New Reading tab order:
1. `SRStaticBriefs`
2. GPT interpretation skeleton or `SRReading` prose
3. SR advance section ("When This Year Intensifies") — rendered only when `solarReturnData` is available
4. Navigation buttons (already after the tab content)

The SR advance section renders regardless of GPT interpretation state — it does not depend on the GPT response. If the GPT skeleton is still loading, the SR advance section still renders below it (or the GPT section renders below the SR advance section if the advance computes faster). Preferred order: GPT interpretation first (thematic framing), advance strip second (forward-looking close). The strip should not appear before the user has read the year's character.

### 11. Loading State

While `isPending` is true, `OverviewStrip` renders its built-in pending state: a full-width capsule bar with the text "Reading your sky…" centered in `text-mystic-muted text-[10px]`. No additional loading skeleton is needed.

The `useTransition` pattern ensures the rest of the page renders immediately; the strip capsule appears as pending until computation completes. On a mid-range device, the 12-snapshot monthly computation takes under 100ms — the pending state is brief.

### 12. Empty State

If all 12 snapshots score `neutral` after the density cap, `OverviewStrip` renders the `quietMessage` string inside the empty strip capsule. No error state, no additional UI. The `quietMessage` for the SR advance is:

> "A relatively even year — the intensity is distributed rather than concentrated in specific peaks."

### 13. Edge Cases

**Unknown birth time (`unknownTime: true`):** The SR chart is always computed with `unknownTime: false` (the SR calculation uses UTC date and time from the SR moment, not a noon approximation). If the natal chart has `unknownTime: true`, the SR chart itself is still fully computed — the SR moment is derived from the Sun's longitude, which is largely time-independent. The SR advance strip always has angle data available. `unknownTime={false}` is always passed to `OverviewStrip`.

However, if `solarReturnData.srChart.unknownTime` is somehow `true` in a future edge case (e.g. if SR calculation is changed), the `unknownTime` prop should read from the actual chart flag rather than hardcoded `false`:

```ts
unknownTime={solarReturnData.srChart.unknownTime === true}
```

**Missing SR chart (`solarReturnData === null`):** The SR advance section renders only when `solarReturnData` is available. The null guard at `SolarReturnPage.tsx` line 174 (`if (!solarReturnData) return null`) already prevents any render. No additional guard is needed inside the SR advance section.

**Year change while computation is running:** When the user clicks the year selector during an active `useTransition`, `solarReturnData` updates, the `useEffect` fires with the new cache key, and a new `startTransition` computation begins. React's concurrent mode handles this correctly — the previous transition is abandoned, the new one starts. No stale data is displayed.

**SR chart Ascendant at 0°:** No special case. The scoring engine handles all longitudes including 0° and 360° identically.

### 14. Scoring Behavior Against the SR Chart

`scoreSnapshot` (used internally by `preCalculateSnapshots`) evaluates:

- **Priority 1 (Power):** A slow planet (Saturn, Uranus, Neptune, Pluto) within `ORB_THRESHOLDS.monthly.angleContact = 3.0°` of the SR chart's Ascendant or Midheaven longitude. The SR chart has a distinct Ascendant and Midheaven (e.g., SR Ascendant in Cancer 12°) — these are the chart's sensitive angles for the year. A Saturn transit to SR Ascendant in month 7 is a power marker for month 7 of the SR year.

- **Priority 2 (Shift co-occurring with favorable/challenging):** A planet station (retrograde or direct) within the snapshot window, co-occurring with a `computeCombinedWeight ≥ COMBINATION_WEIGHT_THRESHOLD` constellation.

- **Priority 3 (Favorable):** A harmonious aspect constellation with `computeCombinedWeight ≥ COMBINATION_WEIGHT_THRESHOLD` and at least one planet in `COMBINATION_PLANETS`.

- **Priority 4 (Challenging):** A challenging aspect constellation with `computeCombinedWeight ≥ COMBINATION_WEIGHT_THRESHOLD` and at least one planet in `COMBINATION_PLANETS`.

- **Priority 5 (Shift):** A planet station (retrograde or direct) with no co-occurring constellation.

The house context in reason strings is derived from `snapshot.housedTransitPlanets` — these are transit planets assigned to SR chart houses. `assignTransitHouses` is called with `chartData.houses` which are the SR chart's house cusps. This is correct: a transit to the SR chart's 7th house is interpreted in the context of the SR year's relational themes, not natal house meanings.

### 15. Acceptance Checks

- The overview strip renders in the Reading tab (not Chart tab) after the GPT interpretation, before the navigation buttons.
- The strip shows 12 monthly steps from the SR date.
- The base date is UTC-normalized — for a user in UTC+5 whose SR falls at 20:00 UTC, the strip starts on the correct UTC calendar date, not the next local-time day.
- Clicking a dot jumps to that month's offset and reveals the category banner if non-neutral.
- Clicking Prev/Next navigates between non-neutral markers. Both buttons are disabled (`opacity-30`) when no marker exists in that direction.
- The quiet message appears when all 12 steps are neutral.
- Changing the year selector (2025 → 2026) recomputes the strip for the new SR year. The old strip is replaced with a pending state while the new one computes.
- The pending state ("Reading your sky…") is visible briefly while computation runs.
- The strip does not appear on the Chart tab.
- `unknownTime={false}` is passed to `OverviewStrip` (no "birth time unknown" annotation).
- The cache key uses `srChart.angles.ascendant.longitude.toFixed(4)` and `srChart.angles.midheaven.longitude.toFixed(4)` — not natal chart angles.
- At most 3 non-neutral markers appear (20% of 12, density cap).
- Category diversity: at minimum one marker per non-neutral category present survives the density cap.
- Power markers (gold diamond) fire only when a slow planet (Saturn, Uranus, Neptune, Pluto) is within 3° of SR Ascendant or SR Midheaven.
- The category banner uses `bannerBoldFragment` for the bold heading (not `split(' ')[0]`).
- The category banner renders a guidance paragraph when `snapshot.score.guidance` is present.
- The SR advance section renders even if the GPT interpretation is still loading (no dependency between the two).
- `preCalculateSnapshots` is called by import, not duplicated.

---

## Out of Scope

- **No slider control.** The SR advance preview exposes only the overview strip and Prev/Next navigation. The slider (for manual scrubbing through all 12 months) is deferred to a future sprint. Users navigate exclusively via the strip dots and Prev/Next buttons.
- **No per-snapshot chart wheel.** No chart wheel rendering for the SR advance snapshot. The composite transit aspect list from `CoupleAdvanceTab` is also omitted — only the banner reason and guidance paragraph are shown, not a detailed aspect row list. This matches the scoped approach of `CoupleAdvanceTab`.
- **No new guidance vocabulary.** The SR advance reuses the existing `POWER_DAY_PHRASES`, `ASPECT_HOUSE_CONTEXT`, and `ASPECT_GUIDANCE` tables from `AdvanceTab.tsx`. The SR chart's houses and angles are used for context lookup — no new table is needed.
- **No GPT integration.** The SR advance markers use the rule-based reason strings from the scoring engine. No GPT calls are made for advance markers.
- **No integration with the Transit Timeline.** The SR advance strip does not annotate any other UI component. The Timeline/advance coherence feature (`feat-transit-timeline-advance-integration`) is a separate proposal.
- **No daily or weekly SR advance view.** The SR advance operates at monthly granularity only (12 steps). Daily or weekly SR advance is future scope.
- **No `runAdvancePreCalculation` abstraction required to ship.** If the `code-advance-precompute-abstraction` proposal lands first, use it. If not, call `preCalculateSnapshots` directly with a post-slice density cap as described in Specification 3. Do not block this feature on the abstraction.

---

## Open Questions

1. **Section header wording.** "When This Year Intensifies" vs "Peak Moments This Solar Year" (from the vision). Both are accurate. "When This Year Intensifies" is shorter and more natural for a section heading inside a longer reading. Decision needed before implementation.

2. **Offset label format.** "Month 1"–"Month 12" vs "+1 month"–"+12 months". The "+N" format is used in both `AdvanceTab` and `CoupleAdvanceTab` and is relative to "now." For SR advance, the framing is relative to the SR date, not today. "Month 1" through "Month 12" is more legible for the year-ahead context. Final format should be decided and documented in the task spec.

3. **`preCalculateSnapshots` export.** This function is currently module-private (`function preCalculateSnapshots`). Exporting it from `AdvanceTab.tsx` is a minor API surface change. If the `code-advance-precompute-abstraction` refactor is in flight simultaneously, the export target may change. Coordinate with that task.

4. **Density cap post-slice behavior.** If `preCalculateSnapshots` is called with `period: 'monthly'` (producing 37 snapshots, offsets 0–36) and then sliced to 13 (offsets 0–12), the density cap inside `preCalculateSnapshots` runs against `max = 36`. After slicing, the 20%-of-12 cap should be re-enforced. Whether this secondary cap is implemented inside the SR component or inside a wrapper is a minor implementation detail, but must be explicitly handled to avoid more than 3 markers in the 12-step strip.

5. **Composite house context.** The SR chart's houses are computed correctly (full birth time, `unknownTime: false`). The `ASPECT_HOUSE_CONTEXT` table will produce house-anchored reason strings using SR chart house assignments. These are astronomically correct (e.g., transit Saturn in SR chart House 4 → "your foundations — home, family, and emotional roots — are being pressure-tested"). This is intentional and desirable. No question here, just worth documenting for the implementer.

6. **SR interpretation loading vs. advance strip render order.** If the GPT interpretation takes 3–5 seconds to load and the advance strip computes in under 100ms, the advance strip will appear before the GPT interpretation completes. This creates a layout shift. Two options: (a) render the strip below the GPT skeleton and let it resolve into position naturally — the layout shift is minor and the strip appearing early is acceptable; (b) defer the strip render until `solarReturnInterpretation !== null`. Option (a) is preferred since the strip is independent and users benefit from seeing it while waiting for the GPT response. Confirm preference before implementation.
