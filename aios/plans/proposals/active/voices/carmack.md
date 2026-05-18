# John Carmack: Sprint 0022 — Technical Audit

---

## What I Read

I walked the full source tree: `src/engine/`, `src/services/gptInterpretation.ts`, `src/data/interpretations/`, `src/components/reading/`, `src/components/results/`, the sprint changelogs for 0019–0021, and the done-proposals index. The codebase is in better shape than most products at this stage. The LRU cache fix was correct, the cache-key corruption bugs were found and patched, the `runAdvancePreCalculation` abstraction was the right call. But there are specific technical problems worth naming precisely.

---

## What Is Slow or Fragile

### 1. `advanceSnapshotSessionCache` is a plain `Map`, not an `LruMap`, and it is unbounded

`src/components/reading/AdvanceTab.tsx`, line 128:

```ts
export const advanceSnapshotSessionCache = new Map<string, AdvanceSnapshot[]>()
```

The four per-component caches were fixed with `LruMap` in sprint-0021. This module-level singleton was not. It is exported and shared across `AdvanceTab`, `TransitReadingPage`, and `TodayPage`. Every unique `chartKey:period:baseDate` combo adds another entry and it never evicts. It is the same category of bug as the ones fixed in sprint-0021. An extended session browsing multiple solar return years, multiple transit periods, or switching between couple and individual charts will accumulate snapshot arrays here that are never reclaimed.

The fix is one line: change `new Map` to `new LruMap(12)` and import `LruMap`. The cap of 12 is generous — 3 periods × 2 base dates × 2 people. This is an oversight from the sprint-0021 scope definition, which specified the four `useRef<Map>` sites but omitted this singleton.

### 2. The Today page fires `calculateTransitAspects` twice for the same date

`src/components/reading/TodayPage.tsx`, lines 61–64:

```ts
const top = getTopActiveTransits(chartData, 3, 5)
...
const all = calculateTransitAspects(calculateCurrentPositions(now), chartData.planets, 'daily')
```

`getTopActiveTransits` calls `calculateCurrentPositions(now)` and `calculateTransitAspects` internally. Then the second call recomputes `calculateCurrentPositions(now)` from scratch and runs `calculateTransitAspects` again to produce `all` for the energy rating. Both calls hit the same astronomical functions for the same `now`. Positions are computed twice, aspects are computed twice. The fix is to hoist `calculateCurrentPositions(now)` before both calls, run `calculateTransitAspects` once on the result, then derive the top 3 from the full list manually.

### 3. Two parallel transit-to-natal interpretation systems doing the same job

This is the most significant architectural problem in the codebase. `src/data/interpretations/transitEvents.ts` contains `getPersonalizedEventBrief()` and the `HOUSE_BRIEF_BY_PLANET_ASPECT_HOUSE` table — 250 lines, 240 entries covering Sun, Moon, Mercury, Venus, Mars × 5 aspect types × 12 houses. `src/data/interpretations/transitAspectBriefs.ts` contains `computeTransitAspectBrief()`, which produces house-aware, planet-archetype, applying/separating sentences via `TRANSIT_PLANET_PHRASES` and `getHouseTheme`. Both functions describe the same event type: a transit planet forming an aspect to a natal planet. The Timeline calls `getPersonalizedEventBrief`. The reading tab's `AspectRow` calls `computeTransitAspectBrief`.

The maintenance problem: if a new planet or aspect type is added, it must be threaded through both systems. If the house theme names change in `houseThemes.ts`, the composed sentences in `transitAspectBriefs.ts` update automatically but `HOUSE_BRIEF_BY_PLANET_ASPECT_HOUSE` in `transitEvents.ts` does not — it has hardcoded house-theme words embedded in 240 string literals. These can silently diverge. The table was correct when it was written; `computeTransitAspectBrief` is strictly superior now, and the table is redundant debt.

The canonical path is `computeTransitAspectBrief`. Route Timeline aspect-perfection events through it. `transitEvents.ts` should retain only `getIngressBrief`, `getStationBrief`, and `getLunarPhaseBrief` — these have no counterpart in `transitAspectBriefs.ts`. The `HOUSE_BRIEF_BY_PLANET_ASPECT_HOUSE` table can be deleted after that migration. Net reduction: ~250 lines removed, zero behavior change for users (the output will be better, not just fewer lines).

### 4. `getTodayPageInterpretation` strips house context and advance signal before sending to GPT

`src/services/gptInterpretation.ts`, lines 207–224. The function signature:

```ts
export async function getTodayPageInterpretation(
  moon: { phaseName: string; moonSign: string; isVoid: boolean },
  aspects: Array<{ transitPlanet: string; symbol: string; natalPlanet: string; orb: number; nature: string }>,
  personalDay: number,
  personalDayArchetype: string,
): Promise<string>
```

The `aspects` array drops `natalHouse` and `applying` when it is constructed from `TransitAspect` objects in `TodayPage.tsx` at lines 81–86. The `TransitAspect` objects from `getTopActiveTransits` carry `natalHouse` and `applying` — they are just not passed through. The prompt therefore cannot name a house. "Saturn pressing on your Moon" is not the same sentence as "Saturn pressing on your Moon in your 7th house (partnership)." The house context is the difference between a generic horoscope and a personal reading.

Also absent from the payload: natal moon phase (the Sun-Moon elongation category, computed in `ResultsPage` and stored in chart data), the advance category (visible on the same page when the session cache is warm), and void-of-course practical context beyond the boolean flag.

The fix is not a new API endpoint. It is adding `natalHouse`, `applying`, and `natalSign` to the aspects payload; adding an optional `advanceCategory` string parameter; and adding an optional `natalMoonPhase` string. The server-side `today-synthesis` handler receives richer data and can produce a brief that actually names the house and acknowledges the advance signal in one coherent paragraph.

### 5. `computeEnergyRating` and the advance category answer the same question with different models and can contradict each other on screen

`src/engine/transits.ts`, lines 505–523. `computeEnergyRating` runs a +1/-1 vote count over the top 8 transit aspects. The advance engine scores the same day via `computeCombinedWeight` (planet-weighted, orb-adjusted, applying-only, slow-planet aware). When the advance cache is warm and the advance banner says "Challenging Period" for a Saturn opposition, the energy dot bar might say "Mixed" or "Favorable" if Venus trines are in the top 8. These two cards answer the same question ("what is today like energetically?") with contradictory answers on the same screen. The advance category is the more accurate signal. The right behavior: hide the energy rating card when an advance score for today is present in the session cache; show it only as a fallback when no advance data exists.

---

## What Is Over-Engineered

### The `ASPECT_HOUSE_CONTEXT` table in `AdvanceTab.tsx` is large, sparse, and partially redundant

The `ASPECT_HOUSE_CONTEXT` table at line 141 covers Saturn/Jupiter/Pluto/Uranus/Neptune × harmonious/challenging × up to 12 houses — but Neptune has only 8 entries while Saturn has 24. The fallback path when a key is missing composes a sentence using `TRANSIT_PLANET_PHRASES` and `getHouseTheme`, which is parametric and arguably better than the hard-coded table entries. The table exists to provide override quality, but the fallback is almost as good. Any new planet added to the advance scorer needs table entries or silently uses the fallback — there is no coverage test. This maintenance surface is larger than it needs to be.

---

## What Is Under-Engineered

### The synastry aspect expansion panel ignores house overlay data that is already computed

`src/components/results/SynastryPage.tsx`, `SynastryAspectsSection` at line 157. When a synastry aspect row is expanded, it shows the `computeSynastryAspectBrief` text. The `synastryData.houseOverlay` data is already computed — it contains which of partner 1's planets fall in which of partner 2's houses, with full briefs from `synastryHouseOverlayBriefs.ts`. A Venus-Mars trine is categorically different depending on whether one person's Venus is also in the other's 5th house versus their 8th house. The aspect row expansion is exactly the right place to surface this. The data lookup is trivial: `synastryData.houseOverlay.person2InPerson1Houses.find(e => e.planet === aspect.person2Planet && HIGH_SIGNAL_HOUSES.includes(e.house))` — `HIGH_SIGNAL_HOUSES` is already defined at line 185 of `SynastryPage.tsx`. This is a missing connection between two existing data structures, not a missing feature.

### The Today page has no static interpretive content while GPT loads

`TodayPage.tsx`, lines 269–283. The "Morning Synthesis" card is conditionally rendered only when `gptLoading || gptText` is true. Until the user has a chart and the GPT call is in flight, the bottom third of the Today page is blank. The top transit aspects are available synchronously from `getTopActiveTransits` — the `AspectRow` component with `computeTransitAspectBrief` briefs could render immediately. Users wait with nothing to read. The skeleton spinner is shown but there is no static layer of content. Adding the transit aspect rows to a "Today's Sky" section that renders synchronously would give the user something to read while GPT loads and make the page useful in offline or rate-limited states.

---

## Proposed Improvements for Sprint 0022

### Issue Fixes

**issue-advance-session-cache-unbounded**
The module-level `advanceSnapshotSessionCache` at `AdvanceTab.tsx` line 128 is a plain `Map` that was not converted to `LruMap` in sprint-0021 when the four per-component caches were fixed. Same failure mode, same class of bug, one-line fix. Change `new Map` to `new LruMap(12)`, import `LruMap`. This closes the remaining open instance of the sprint-0021 unbounded-cache class.

**issue-today-energy-rating-contradiction**
The "Transit Energy" dot bar on `TodayPage.tsx` can contradict the advance category banner when both are visible. When `advanceScore` is non-null and the category is non-neutral, hide the energy rating card. The energy rating is a fallback signal; the advance category is the authoritative one. Two contradictory quality signals on the same screen undermine both.

### Code Enhancements

**code-timeline-aspect-brief-consolidation**
Route `TransitTimeline.tsx`'s `EventCard` aspect-perfection branch through `computeTransitAspectBrief` instead of `getPersonalizedEventBrief`. This eliminates the dual-system maintenance liability and makes the Timeline briefs qualitatively identical to the reading tab briefs. After migration, delete `HOUSE_BRIEF_BY_PLANET_ASPECT_HOUSE` from `transitEvents.ts` — 250 lines of data that is now redundant. Retain `getIngressBrief`, `getStationBrief`, and `getLunarPhaseBrief`. The `computeTransitAspectBrief` function accepts `transitPlanet`, `aspectType`, `natalPlanet`, `natalHouse`, `nature`, and `applying` — all of these are available on `TimelineEvent` for aspect-perfection events.

**code-today-prompt-enrichment**
Add `natalHouse`, `applying`, and `natalSign` to the `aspects` objects in the `getTodayPageInterpretation` call at `TodayPage.tsx` lines 81–86. Add optional `advanceCategory: string | null` and `natalMoonPhase: string | null` parameters to `getTodayPageInterpretation`. The natal moon phase can be derived from `chartData.planets` (Sun and Moon longitude delta). The advance category comes from `advanceScore?.category` which is already in component state. These additions do not require a new API endpoint — only the server-side `today-synthesis` prompt constructor needs to use the new fields.

### Features

**feat-today-sky-summary-static-block**
Before or alongside the GPT brief, show the top 2–3 transit aspects as static `AspectRow` entries using `computeTransitAspectBrief` sentences. The aspect data is synchronously available after `getTopActiveTransits` runs. The user sees substantive content immediately; the GPT brief loads on top as synthesis. This makes the Today page useful in offline and rate-limited states and eliminates the "blank page waiting for API" problem. The `AspectRow` component and `computeTransitAspectBrief` are already in use on the Today page's existing "Sky Highlights" section — this is extending the existing pattern, not adding a new component.

**feat-synastry-aspect-house-overlay-note**
In `SynastryPage.tsx`'s `SynastryAspectsSection`, when an aspect row is expanded, check whether the aspect's `person2Planet` (or `person1Planet`) appears in the partner's house overlay at a relationship-significant house (1, 5, 7, 8 — `HIGH_SIGNAL_HOUSES` at line 185). If it does, append a one-line note to the expansion panel naming the house and its theme. The overlay data is in `synastryData.houseOverlay`; the brief is in `synastryHouseOverlayBriefs.ts`. This is wiring two existing data structures together, not adding new data. Scope: not every aspect gets a note — only inner planets (Sun, Moon, Venus, Mars, Mercury) in relationship-defining houses, matching the existing `isHighSignal` predicate at line 201.

---

## Bottom Line

The critical issues in priority order: the unbounded `advanceSnapshotSessionCache` is the same class of bug as sprint-0021's four LRU fixes — it was missed and should be closed immediately. The Today page dual transit computation is minor sloppy redundancy. The two-system transit brief problem is real technical debt with a clear consolidation path and net line-count reduction. The Today prompt impoverishment is the highest-leverage interpretive improvement: the house context, applying/separating state, natal moon phase, and advance category are all available in component state — they are just not being serialized into the server payload. The energy-rating/advance-category contradiction is a display coherence issue that undermines trust in both signals.

None of this is fundamental architecture failure. The codebase is coherent. The type system is being used. The performance characteristics are acceptable for the current feature set. But the five specific problems above will compound if not addressed, and four of them are single-file fixes.

---

## Previously Flagged Issues (Sprint 0021 — Now Resolved)

Sprint-0021 resolved: scoring parity fix, LRU cache bounds on four per-component caches, couple banner bold fragment, couple advance guidance tables, `runAdvancePreCalculation` abstraction. All delivered as specified. The `computeCombinedWeight` scope issue in the Priority 2 coShift branch (mentioned as a repair commit in the sprint-0021 changelog) was caught and fixed correctly.

---

*Audited: sprint-0022 cycle*

**File:** `src/components/reading/CoupleAdvanceTab.tsx`, lines 173–274

This is the clearest debt in the system. `scoreCoupleSnapshot` at Priorities 2, 3, and 4 calls `computeEnergyRating` (imported from `../../engine/transits`) and gates on `rating.score >= 4` or `rating.score <= 2`. The individual `scoreSnapshot` in `AdvanceTab.tsx` replaced this entire gate in sprint-0019 with `computeCombinedWeight` — but `CoupleAdvanceTab` was not updated.

The concrete problem is correctness, not style. `computeEnergyRating` counts applying + separating aspects equally, +1/-1 per aspect regardless of planet weight. `computeCombinedWeight` sums `PLANET_WEIGHT[planet] × (1 − orb/maxOrb)` for applying aspects only. A Saturn+Pluto double-whammy at 1° orb generates a combined weight of ~14+ under the new system — it fires as `challenging` on its own. Under the old `computeEnergyRating` system, the same configuration needs additional low-weight aspects to cross the score >= 4 threshold. Saturn+Pluto opposition to a composite planet can fail to surface as a marker while a cluster of Mercury+Sun aspects marks correctly. This inverts the astrology for couple readings.

The fix is mechanical. `computeCombinedWeight` is locally scoped in `AdvanceTab.tsx` — it needs to be exported (or inlined). The constants it depends on (`COMBINATION_PLANETS`, `COMBINATION_WEIGHT_THRESHOLD`, `COMBINATION_WEIGHT_NORMALIZE`) are also already defined and can be re-exported. The Priority 2/3/4 blocks in `scoreCoupleSnapshot` need to be rewritten to match lines 672–824 of `AdvanceTab.tsx` exactly.

**The guidance field and banner bold fragment are also missing from the couple path.**

All three couple reason builders — `buildCouplePowerReason` (line 44), `buildCoupleAspectReason` (line 57), `buildCoupleShiftReason` (line 79) — return `string`. The equivalent builders in `AdvanceTab.tsx` (`buildPowerReason` line 511, `buildAspectReason` line 533) return `{ reason: string; bannerBoldFragment: string; guidance?: string }`. The couple banner at lines 647–682 still uses `categoryBanner.split(' ')[0]` as the bold fragment — this is the pre-fix behavior that `bannerBoldFragment` was introduced to correct in sprint-0019 task-0003. So the couple banner has both missing guidance AND a regression to the split-word bolding that was fixed for the individual banner.

The structural fix:
- Change all three `build*` functions to return `{ reason: string; bannerBoldFragment: string; guidance?: string }` matching `AdvanceTab.tsx`'s return shape.
- Add `guidance` strings to each builder. The couple guidance must not be generic `ASPECT_GUIDANCE` reuse — it must use relational language ("this is a window to deepen how the two of you..."). Create a `COUPLE_ASPECT_GUIDANCE` table in `CoupleAdvanceTab.tsx` keyed the same way as `ASPECT_GUIDANCE` (`"${planet}|${nature}"`) but with relationship-first sentences.
- Update the couple banner block to render `score.bannerBoldFragment` and `score.guidance` using the same DOM pattern as `AdvanceTab.tsx` lines 1503–1522.

---

## 2. `preCalculateCoupleSnapshots` Duplicates `preCalculateSnapshots` — Third Copy Risk

**Files:** `CoupleAdvanceTab.tsx` lines 280–393, `AdvanceTab.tsx` lines 846–963

These two functions are structurally identical: same loop structure, same monthly date normalization comment, same hysteresis pass, same density cap algorithm with the two-phase category diversity logic. The only differences are that the couple version calls `scoreCoupleSnapshot` with a different signature, and it omits `assignTransitHouses` (correct — no chart wheel for couple advance).

This is ~120 lines of duplicated code that requires synchronized maintenance in every future sprint. The density cap alone is ~40 lines and changed significantly in sprint-0019 (added phase-1 category reservation). Changing it in one place but not the other will produce divergent density behavior between individual and couple advance.

The solar return advance preview (candidate 3 below) will add a third copy if implemented without addressing this first. Three copies of the same density cap algorithm is untenable.

**The right fix:** Extract a generic pre-calculation core that accepts a scoring callback:

```ts
// In AdvanceTab.tsx — export this
export function runAdvancePreCalculation(
  period: TransitPeriod,
  baseDate: Date,
  config: AdvanceConfig,
  buildSnapshot: (date: Date, offset: number) => Omit<AdvanceSnapshot, 'score'>,
  scoreFunc: (snap: AdvanceSnapshot, prev: AdvanceSnapshot | null) => SnapshotScore,
): AdvanceSnapshot[]
```

The hysteresis pass, density cap, and category diversity logic live once in this function. Callers pass `buildSnapshot` (which handles the ephemeris calls and what `chartData` to use) and `scoreFunc` (which contains the scoring logic). `preCalculateSnapshots`, `preCalculateCoupleSnapshots`, and the future SR advance all become thin callers.

This refactor has zero behavioral change — it's purely structural — and can be done in parallel with or before the SR advance work. If it slips to sprint-0021, the SR advance must not land as a third copy.

---

## 3. Solar Return Advance Preview — Architecture Is Correct, Details Matter

**File:** `src/components/results/SolarReturnPage.tsx` (new component to add within)

The vision's architectural claim is correct: `srChart` from `solarReturnData` is `ChartData`-compatible. Looking at `solarReturn.ts` line 49: `calculateChart(srDate, srTime, birthLat, birthLng, 'UTC', false)` — the SR chart has planets with houses, angles with longitudes, and `unknownTime: false`. `preCalculateSnapshots` in `AdvanceTab.tsx` accepts any `ChartData` — it will work with the SR chart without modification.

**`baseDate` must be `solarReturnData.srMoment`, not `new Date()`.**

The advance loop scans from `baseDate` forward. For a solar return year, the correct start point is the SR moment (when the Sun returns to natal longitude), not today. If `baseDate = new Date()` and the user is 3 months into their SR year, the strip would show 9 months of remaining SR year data starting from today — that's technically correct for showing what's left, but the full-year view (all 12 months from SR start) is more useful and matches the "Peak Moments This Solar Year" framing in the vision.

`solarReturnData.srMoment` is a `Date` — it's already the right value. The SR advance component should receive `baseDate={solarReturnData.srMoment}` as a prop.

**Use a local config, not `ADVANCE_CONFIG.monthly`.**

`ADVANCE_CONFIG.monthly.max = 36` (3 years). The SR year is 12 months. The strip needs a custom config:

```ts
const SR_MONTHLY_CONFIG: AdvanceConfig = {
  unit: 'month', unitPlural: 'months', max: 12, msPerStep: 30.44 * 86400000,
}
```

Do not modify the shared constant. The SR advance passes this config to `OverviewStrip` and the slider. The `preCalculateSnapshots` function takes `period: TransitPeriod` and derives config internally via `ADVANCE_CONFIG[period]` — this means the current API doesn't support a custom max. The refactor above (extracting `runAdvancePreCalculation` with an explicit `config` param) solves this cleanly. Alternatively, pass a hardcoded loop count of 12 into a wrapper that calls `preCalculateSnapshots` with `period: 'monthly'` and slices the result to 12. This is a workaround, not the right fix.

**Cache key must include SR chart angles, not natal chart angles.**

The SR advance scores the SR chart's transits. The cache key must fingerprint the SR chart (`srChart.angles.ascendant.longitude`, `srChart.angles.midheaven.longitude`) plus `targetYear`. If the natal chart angles are used by mistake, two different SR years for the same person get the same cache slot — silent staleness when the user switches year. The `targetYear` changes when the user clicks the year buttons (lines 202–225 of `SolarReturnPage.tsx`), so `targetYear` in the cache key is the correct invalidation trigger.

**Year selector integration:** The year selector already dispatches `START_SOLAR_RETURN` with a new `targetYear`, which recomputes `solarReturnData`. When `solarReturnData` changes, `srMoment` changes. The SR advance component receives `baseDate={solarReturnData.srMoment}` — the `useEffect` in the advance component sees `baseDate` change, misses the cache, and recomputes. This flow is correct without any new wiring.

---

## 4. Timeline/Advance Coherence — The `isPowerDay` Definition Is a Different Concept

**File:** `src/engine/transitTimeline.ts`, line 491

The current definition:

```ts
isPowerDay: significantCount >= 3,
```

where `significantCount` counts non-Moon-sign-change events. This is a purely structural count — three ingresses or retrograde stations on the same day produces a "Power Day" badge. It has nothing to do with slow planet angles to natal positions.

The advance strip's `power` category fires when Saturn, Uranus, Neptune, or Pluto is within `angleContact` orb of a natal angle (ASC or MC). These are categorically different concepts wearing the same label. A user who sees a "Power Day" badge in the Timeline and navigates to the advance strip expecting a gold diamond marker gets an incoherent experience.

**The fix the vision proposes is correct.** The snapshot scores are indexed by `dateStr` — a `Map<string, MarkerCategory>` keyed by date string is the minimal data structure needed. Pass it optionally to `buildTransitTimeline` or expose it as a prop to `TransitTimeline.tsx`.

The specific architectural question: where does the snapshot-to-date mapping come from? The snapshots are computed in `AdvanceTab.tsx` via `preCalculateSnapshots` and live in component state. `buildTransitTimeline` is called in a different code path (the tab-level reading infrastructure). They don't share state directly.

The cleanest solution without restructuring the data flow: compute `scoreByDate` in the component that renders both the advance strip and the timeline (the transit reading page), and pass it down as a prop to both. This means the parent component holds `snapshots` (or at least the scored subset) and derives the map:

```ts
const scoreByDate = useMemo(() => {
  const m = new Map<string, MarkerCategory>()
  for (const s of snapshots) {
    if (s.score.category !== 'neutral') m.set(s.dateStr, s.score.category)
  }
  return m
}, [snapshots])
```

Then pass `scoreByDate` to `TransitTimeline` as a prop, which passes it to `DaySection`, which overrides or supplements `isPowerDay` using the advance score.

**One correctness check:** the Timeline is generated for the current period's date range, and the advance snapshots are computed for the same period. For daily (30 steps), the overlap is small — 30 days out. For monthly (36 months), the Timeline only covers the current month but the advance covers 36 months. Align them: annotate only timeline days that fall within the advance snapshot range.

---

## 5. Synastry Axis Scoring — The Midpoint Interpretation Has a Precision Issue

**Files:** `CoupleAdvanceTab.tsx` `scoreCoupleSnapshot`, `synastry.ts` `calculateSynastryAspects`

The vision's architecture is correct: `synastryData.synastryAspects` is available, `SynastryAspect` has `person1Planet`, `person2Planet`, `orb`. The midpoint degree for a synastry pair is computable using the existing `midpointLongitude` function in `synastry.ts` (lines 164–173).

**The implementation should use the individual planets' longitudes, not derive them from the SynastryAspect.**

`SynastryAspect` (type at `synastry.ts` lines 11–19) stores `person1Planet` and `person2Planet` as planet *names*, not longitudes. To get the midpoint degree, you need to look up `chart1.planets.find(p => p.name === aspect.person1Planet)?.longitude` and `chart2.planets.find(p => p.name === aspect.person2Planet)?.longitude`. Both `chart1` and `chart2` are already parameters to `scoreCoupleSnapshot`. This lookup is cheap (one `.find()` each) and correct.

**Do not add a new priority branch. Implement as an intensity multiplier.**

A new `Priority 1.5` branch requires the density cap to potentially handle it as a new category or compete with Priority 1 differently. The vision's framing of "increase the intensity of the power/favorable/challenging score by a capped multiplier" is the right architecture. In practice:

```ts
// After computing baseIntensity for an existing marker category:
const synastryActivation = synastryAxesNearTransit(transitLon, synastryData.synastryAspects, chart1, chart2, orbs.angleContact)
const intensity = synastryActivation
  ? Math.min(1.0, baseIntensity * 1.25)  // cap at 1.0 after multiplier
  : baseIntensity
```

The `synastryAxesNearTransit` function checks: for each synastry aspect with `orb <= 2.0`, compute its midpoint longitude; if `|transitLon - midpoint| <= angleContact`, return the pair description for the reason suffix. This is pure arithmetic, no new data.

**The reason suffix must name the specific pair.** The vision specifies: "and activates the bond between [Person1Planet] and [Person2Planet]". The `COMPOSITE_PLANET_PHRASES` map in `CoupleAdvanceTab.tsx` covers relationship descriptions for individual planets — the synastry axis reason needs to describe the *interaction*, not the individual planets. A lookup like `"${p1}×${p2}"` won't scale. A simpler approach: build the suffix dynamically from the planet names and a brief nature description from the `SynastryAspect.nature` field. Example: "and resonates with the [harmonious/tense] axis between [P1]'s [planet1] and [P2]'s [planet2]."

---

## 6. Pre-Existing Issue: `calculateTransitAspects` Break-on-First-Match May Return the Wrong Aspect

**File:** `src/engine/transits.ts`, line 195

```ts
break // only strongest aspect between this pair
```

This `break` exits the `ASPECT_DEFINITIONS` loop after the first match within orb. If `ASPECT_DEFINITIONS` is ordered with conjunction first (0°), then proceeds to larger angles, a planet at 58° from natal could match sextile (60° ± 6°) OR semi-sextile (30° ± 2°) — but only if both are within orb simultaneously, which requires large orbs. At the orb scales used in transit scoring (0.3–0.7 scale factor), this double-match is rare. It's more likely to matter when a transit planet is within 1° of an exact sextile — the break fires on conjunction first only if the conjunction orb is also within threshold, which it wouldn't be.

The real risk is if two aspect definitions have overlapping orb ranges and similar target angles. For the current `ASPECT_DEFINITIONS` constants, this isn't causing visible bugs. But the `break` is logically incorrect — the loop should collect all matches and return the one with minimum orb. This is a 5-line fix. Low priority for sprint-0020 but worth tracking.

---

## 7. `CoupleAdvanceTab` Cache Key Has Lower Precision Than Individual Advance

**File:** `src/components/reading/CoupleAdvanceTab.tsx`, line 420

The couple cache key:
```ts
`${period}:${baseDate.toISOString()}:${chart1.angles.ascendant.longitude.toFixed(2)}:${chart2.angles.ascendant.longitude.toFixed(2)}`
```

The individual advance cache key (`AdvanceTab.tsx` line 1247):
```ts
`${chartData.angles.ascendant.longitude.toFixed(4)}:${chartData.angles.midheaven.longitude.toFixed(4)}:${chartData.unknownTime}`
```

The couple key is `toFixed(2)` versus `toFixed(4)`. The individual key includes midheaven longitude and `unknownTime`. The sprint-0019 fix (`issue-advance-snapshot-cache-key`) explicitly added midheaven and unknownTime to prevent cross-chart collision — the couple key omits these entirely.

At `toFixed(2)`, two charts with ascendants differing by < 0.005° share a cache slot. More importantly, the couple key does not include midheaven longitudes from either chart. If two couples have the same ascendant pair (rounded to 2 decimal places) but different midheavens, they share a cache slot — and if composite angle contact power day detection fires based on the midheaven (which it does, lines 124–125 of `CoupleAdvanceTab.tsx`), the cached results will be wrong for one of them.

Fix: align the couple cache key format with the individual advance:
```ts
const cacheKey = `${period}:${baseDate.toISOString()}:${chart1.angles.ascendant.longitude.toFixed(4)}:${chart1.angles.midheaven.longitude.toFixed(4)}:${chart1.unknownTime}:${chart2.angles.ascendant.longitude.toFixed(4)}:${chart2.angles.midheaven.longitude.toFixed(4)}:${chart2.unknownTime}`
```

---

## Summary: Technical Priority Order for Sprint 0020

**Must ship (correctness debt):**
1. Port `computeCombinedWeight` to `scoreCoupleSnapshot` Priorities 2–4 — restores scoring parity with the individual advance. Mechanical copy.
2. Fix couple reason builders to return structured objects with `guidance?` and `bannerBoldFragment`, replace `split(' ')[0]` bold logic in the couple banner.
3. Fix couple cache key precision — align to `toFixed(4)` + midheaven + unknownTime for both charts.

**New surfaces (reuse existing engine):**
4. SR advance preview — pass `srChart` as `chartData` to the existing `preCalculateSnapshots`, use `srMoment` as `baseDate`, use a local 12-step config. Do not copy the pre-calculation loop.
5. Timeline/advance coherence — compute `scoreByDate: Map<string, MarkerCategory>` from advance snapshots in the parent reading component, pass to `TransitTimeline` as a prop to annotate or replace the event-count `isPowerDay`.

**Additive scoring (bounded scope):**
6. Synastry axis overlay — intensity multiplier on existing markers when a transiting slow planet is within `angleContact` orb of a tight (≤ 2°) synastry pair's midpoint. Not a new priority branch.

**Refactor (prevents future debt):**
7. Extract `runAdvancePreCalculation` shared core — needed before SR advance creates a third copy of the density cap. Can ship in same sprint as SR advance with near-zero risk.

