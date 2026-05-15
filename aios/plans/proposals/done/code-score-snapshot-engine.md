## Type
Code Enhancement

## Originated by
Carmack, Jobs

## Problem / Opportunity

`computePowerDayBanner` in `src/components/reading/AdvanceTab.tsx` (lines 106–163) is a 57-line function that conflates two responsibilities: it detects astrological conditions (slow planet within 1° of natal angle; 3+ tight applying aspects) and then formats those conditions into a pre-formatted banner string. Because detection and formatting are fused, the scoring result is opaque — it is a `string | null`, not a typed fact about the snapshot. This blocks every other consumer that needs to know whether and why a snapshot is notable.

The practical consequence is that `computePowerDayBanner` is called only for the currently selected slider position (via `useMemo([snapshot, chartData])` at line 238). The 30–52 other snapshots already sitting in `snapshots[]` each contain a fully computed `transitAspects[]` array and `retrogrades[]` array — all the data needed to score them — but no score is ever computed for them. The only way to discover whether another position is notable is to drag the slider to it. The scoring intelligence is inaccessible to any layer that needs to operate over the full snapshot set.

Two specific problems compound this:

**1. The detection logic cannot be reused.** The marker layer described in the sprint vision needs to classify every snapshot as `power | favorable | challenging | shift | neutral` so it can render colored dots on the slider track before the user drags there. Building the marker layer on top of `computePowerDayBanner` is impossible because `computePowerDayBanner` returns a string (or null), not a structured category. The marker layer would have to re-implement the same detection logic a second time, or call the banner function and pattern-match on its return value — both are wrong.

**2. The `AdvanceSnapshot` interface carries no score.** Defined at line 17, it holds raw ephemeris data but has no derived field. This means scoring is always a re-computation: the marker layer, the overview strip, the banner, and any future consumer each need to re-derive the category independently. A snapshot that has already been scored should carry that score; computing it once and storing it is correct architecture.

The secondary trigger in `computePowerDayBanner` also has a category precision problem: it detects 3+ tight applying aspects and reports them as the same banner text regardless of whether they are harmonious or challenging. A cluster of three tight squares has the same narrative consequence as three tight trines under the current logic. `computeEnergyRating` in `src/engine/transits.ts` (line 480) already distinguishes harmonious from challenging on a 1–5 scale; it is not called from `computePowerDayBanner` at all.

## Desired state

The refactor introduces a typed scoring primitive, `scoreSnapshot()`, that performs all detection and returns structured data. `computePowerDayBanner` is reduced to a formatting function that delegates detection to `scoreSnapshot`. The `AdvanceSnapshot` interface gains a `score` field so each snapshot is classified exactly once — during `preCalculateSnapshots` — and the result is reused by every consumer downstream.

---

### New type: `SnapshotScore`

```typescript
export type MarkerCategory = 'power' | 'favorable' | 'challenging' | 'shift' | 'neutral'

export interface SnapshotScore {
  category: MarkerCategory
  intensity: number        // 0.0–1.0; drives marker dot size and animation speed
  reason: string           // human-readable sentence for banner and tooltip
  triggerAspect?: string   // the tightest aspect or planet that triggered the category
  coShift: boolean         // true when a station co-occurs with favorable or challenging
  shiftPlanet?: string     // the stationing planet when coShift is true
  shiftDirection?: 'retrograde' | 'direct'
}
```

`coShift` decouples the `shift` category from the primary category: a snapshot that is both `favorable` and contains a planetary station carries `category: 'favorable'` and `coShift: true`. The marker layer renders a blue ring around the green dot rather than a second dot, avoiding layout complexity while preserving both signals.

---

### Extended interface: `AdvanceSnapshot`

```typescript
interface AdvanceSnapshot {
  offset: number
  date: Date
  dateStr: string
  transitPlanets: TransitPosition[]
  housedTransitPlanets: TransitPosition[]
  transitAspects: TransitAspect[]
  retrogrades: { planet: PlanetName; isRetro: boolean; status: string }[]
  score: SnapshotScore   // NEW — computed once in preCalculateSnapshots
}
```

The `score` field is computed inside `preCalculateSnapshots` at the end of each loop iteration, using the `transitAspects` and `retrogrades` that were just computed. Because those arrays are already in memory, scoring adds zero additional WASM calls.

---

### New function: `scoreSnapshot()`

```typescript
function scoreSnapshot(
  snapshot: Pick<AdvanceSnapshot, 'offset' | 'transitPlanets' | 'transitAspects' | 'retrogrades'>,
  prev: AdvanceSnapshot | null,
  chartData: ChartData,
  period: TransitPeriod,
): SnapshotScore
```

**Guard — offset 0 is always neutral.** The current date is a reference point. `computePowerDayBanner` already enforces this; `scoreSnapshot` must carry the same discipline:

```typescript
if (snapshot.offset === 0) {
  return { category: 'neutral', intensity: 0, reason: '', coShift: false }
}
```

**Category detection — priority order:**

**1. `power`:** A slow planet (Saturn / Uranus / Neptune / Pluto — the existing `SLOW_PLANETS_FOR_BANNER` set at line 43) forms any aspect within `orbThresholds.angleContact` degrees of the natal ASC or MC. Detection reuses the existing `detectAngleContact` helper (line 82) and the existing `angleEntries` pattern from `computePowerDayBanner`. Intensity: `1.0 - (orb / orbThresholds.angleContact)` — tighter contact = higher intensity.

```typescript
// power detection (reuses detectAngleContact and SLOW_PLANETS_FOR_BANNER)
if (!chartData.unknownTime) {
  for (const tp of snapshot.transitPlanets) {
    if (!SLOW_PLANETS_FOR_BANNER.has(tp.name as PlanetName)) continue
    for (const { key, lon } of angleEntries) {
      const contact = detectAngleContact(tp.longitude, lon, orbThresholds.angleContact)
      if (contact && (!best || contact.orb < best.orb)) {
        best = { planet: tp.name, angleKey: key, ...contact }
      }
    }
  }
  if (best) {
    const verb = ASPECT_VERB_BANNER[best.aspectType] ?? 'contacts'
    const angleName = best.angleKey === 'ASC' ? 'your Ascendant' : 'your Midheaven'
    return {
      category: 'power',
      intensity: 1.0 - (best.orb / orbThresholds.angleContact),
      reason: `${best.planet} ${verb} ${angleName} — ${ANGLE_DOMAIN[best.angleKey]}.`,
      triggerAspect: best.aspectType,
      coShift: hasStation,
      shiftPlanet: stationPlanet,
      shiftDirection: stationDirection,
    }
  }
}
```

**2. Station detection for `shift` / `coShift`:** Detecting a station from `getRetrogradeStatus` at a single point in time is unreliable — it reports current retrograde *state*, not a state *crossing*. The correct approach is to compare consecutive snapshots. If `prev` is provided and `prev.retrogrades[planet].isRetro !== snapshot.retrogrades[planet].isRetro`, a station occurred between those two steps:

```typescript
let hasStation = false, stationPlanet: string | undefined, stationDirection: 'retrograde' | 'direct' | undefined
if (prev) {
  for (const r of snapshot.retrogrades) {
    const prevR = prev.retrogrades.find(pr => pr.planet === r.planet)
    if (prevR && prevR.isRetro !== r.isRetro) {
      hasStation = true
      stationPlanet = r.planet
      stationDirection = r.isRetro ? 'retrograde' : 'direct'
      break
    }
  }
}
```

If the primary category is `neutral` but `hasStation` is true, return `category: 'shift'`, `intensity: 0.8` (stations are categorically significant regardless of orb), `coShift: false`.

**3. `favorable` and `challenging`:** Call `computeEnergyRating(snapshot.transitAspects)` from `transits.ts:480`. Its `.score` field is on a 1–5 scale (5 = Highly Favorable, 1 = Demanding). Then count tight applying aspects by nature:

```typescript
const energyRating = computeEnergyRating(snapshot.transitAspects)
const tightApplyingHarmonious = snapshot.transitAspects.filter(
  a => a.applying && a.orb <= orbThresholds.applyingTight && a.nature === 'harmonious'
)
const tightApplyingChallenging = snapshot.transitAspects.filter(
  a => a.applying && a.orb <= orbThresholds.applyingTight && a.nature === 'challenging'
)

if (energyRating.score >= 4 && tightApplyingHarmonious.length >= orbThresholds.energyMinAspects) {
  const tightest = tightApplyingHarmonious[0]
  return {
    category: 'favorable',
    intensity: (energyRating.score - 3) / 2,
    reason: `${tightApplyingHarmonious.length} harmonious aspects applying — ${tightest.transitPlanet} ${tightest.type} ${tightest.natalPlanet}.`,
    triggerAspect: tightest.type,
    coShift: hasStation,
    shiftPlanet: stationPlanet,
    shiftDirection: stationDirection,
  }
}

if (energyRating.score <= 2 && tightApplyingChallenging.length >= orbThresholds.energyMinAspects) {
  const tightest = tightApplyingChallenging[0]
  return {
    category: 'challenging',
    intensity: (3 - energyRating.score) / 2,
    reason: `${tightApplyingChallenging.length} tense aspects applying — ${tightest.transitPlanet} ${tightest.type} ${tightest.natalPlanet}.`,
    triggerAspect: tightest.type,
    coShift: hasStation,
    shiftPlanet: stationPlanet,
    shiftDirection: stationDirection,
  }
}
```

Note: `computeEnergyRating` already filters asteroid aspects and takes the top 8 classical aspects. Do not replicate this filter in `scoreSnapshot` — call the existing function.

**Orb thresholds by period:** The detection thresholds are period-sensitive. Daily resolution justifies tight orbs; monthly resolution is coarse and requires looser thresholds to catch anything meaningful. A single constant table covers all three periods:

```typescript
const ORB_THRESHOLDS: Record<TransitPeriod, {
  angleContact: number
  applyingTight: number
  energyMinAspects: number
}> = {
  daily:   { angleContact: 1.0, applyingTight: 2.0, energyMinAspects: 2 },
  weekly:  { angleContact: 2.0, applyingTight: 3.0, energyMinAspects: 3 },
  monthly: { angleContact: 3.0, applyingTight: 4.0, energyMinAspects: 2 },
}
```

For monthly periods, the `power` trigger also requires slow planets only (Jupiter remains excluded, consistent with the existing `SLOW_PLANETS_FOR_BANNER` set). The `favorable`/`challenging` energy score thresholds tighten for monthly: require `energyRating.score >= 5` (Highly Favorable) for `favorable` and `energyRating.score === 1` (Demanding) for `challenging` — reserve month-level markers for genuinely extreme readings.

---

### Refactored function: `computePowerDayBanner()`

After the refactor, this function becomes a pure formatter that reads from the pre-scored snapshot:

```typescript
function computePowerDayBanner(snapshot: AdvanceSnapshot): string | null {
  if (snapshot.offset === 0) return null
  if (snapshot.score.category === 'neutral') return null
  return formatScoreAsBannerText(snapshot.score)
}
```

It no longer takes `chartData` as a parameter — chart-specific detection context was used for scoring, which is now `scoreSnapshot`'s responsibility. The banner function only needs the pre-scored snapshot.

The existing text-formatting helpers (`ASPECT_VERB_BANNER`, `ANGLE_DOMAIN`, `spellCount`) stay in place and move into a new `formatScoreAsBannerText(score: SnapshotScore): string` function. Detection logic (the `detectAngleContact` loop, the `tightApplying.filter()`) moves wholesale into `scoreSnapshot`.

The call site at line 238 simplifies:

```typescript
// Before:
const powerDayBanner = useMemo(() => {
  if (!snapshot || !chartData) return null
  return computePowerDayBanner(snapshot, chartData)
}, [snapshot, chartData])

// After:
const powerDayBanner = useMemo(() => {
  if (!snapshot) return null
  return computePowerDayBanner(snapshot) // chartData no longer needed here
}, [snapshot])
```

---

### Integration in `preCalculateSnapshots()`

Scoring is added at the end of the loop, after all ephemeris data for step `i` has been computed. The previous snapshot `snapshots[i - 1]` is available for station detection:

```typescript
for (let i = 0; i <= config.max; i++) {
  // ... existing: targetDate, transitPlanets, transitAspects, retrogrades, housedTransitPlanets ...

  const prev = snapshots[i - 1] ?? null
  const score = scoreSnapshot(
    { offset: i, transitPlanets, transitAspects, retrogrades },
    prev,
    chartData,
    period,
  )

  snapshots.push({
    offset: i,
    date: targetDate,
    dateStr: targetDate.toISOString().split('T')[0],
    transitPlanets,
    housedTransitPlanets,
    transitAspects,
    retrogrades,
    score,
  })
}
```

The scoring pass adds zero WASM calls — it operates entirely on the `transitAspects[]` and `retrogrades[]` arrays already in memory. The `computeEnergyRating` call inside `scoreSnapshot` is pure arithmetic over those arrays.

---

### Downstream: marker layer and overview strip

With `score` stored on each snapshot, the marker layer computation becomes a single `useMemo` filter that runs once after snapshots settle and never again during slider drag:

```typescript
const markers = useMemo(() => {
  if (snapshots.length === 0) return []
  return snapshots.filter(s => s.score.category !== 'neutral')
}, [snapshots])
```

The marker layer and overview strip both read from `markers`. Neither re-scores. Neither touches `chartData`. The slider's `offset` state does not affect `markers` — it only controls which snapshot is displayed and which marker dot is shown as `active`.

---

### Why this is cleaner

The current structure has a single function that knows too much: it knows how to detect planetary conditions, how to evaluate aspect quality, and how to turn both into English. The result is a string that cannot be interrogated structurally — a downstream consumer cannot ask "is this a power day because of an angle contact, or because of tight aspects?" without parsing the text.

The proposed structure has clear ownership: `scoreSnapshot` knows the astrological facts, `formatScoreAsBannerText` knows English, `AdvanceSnapshot.score` stores the result, and every consumer reads from the stored result. Changing a scoring threshold means changing one constant table. Changing banner wording means changing one formatting function. Adding a new marker category means adding a branch to `scoreSnapshot` and a color to the marker renderer — none of these changes touch each other.

The `computePowerDayBanner` function's secondary trigger (3+ tight applying aspects → "notable concentration") also gains category specificity it currently lacks: a cluster of harmonious aspects becomes `favorable`; a cluster of challenging aspects becomes `challenging`. The banner wording changes accordingly, which is a correctness improvement over the current binary treatment.
