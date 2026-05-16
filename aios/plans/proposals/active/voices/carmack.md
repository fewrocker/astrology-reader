# John Carmack's Technical Analysis: Sprint 0019 — Scoring Engine Upgrade & Synastry Advance

## State of the Code

Sprint 0018 got the infrastructure right. `scoreSnapshot` is a pure function over pre-computed snapshot data, the `SnapshotScore` type carries structured output, `preCalculateSnapshots` runs under `useTransition` and caches via `useRef`. The marker system renders correctly without tanking slider performance. The bones are solid.

What's broken is the content layer. I've read `scoreSnapshot` in full (lines 202–390 of `AdvanceTab.tsx`) and I can tell you exactly where it fails.

---

## The Scoring Pipeline: Three Concrete Failures

### Failure 1: `buildAspectReason` ignores the house dimension that's already in the data

`buildAspectReason` at line 175 receives a `TransitAspect`. Look at what `TransitAspect` carries: it has `natalHouse: number | null` already computed by `calculateTransitAspects` in `transits.ts:179`. The function ignores it entirely and reaches for a `domainMap` keyed on transit planet name instead.

The result is: "Saturn opposition your natal Moon — tension around structure and discipline." This tells the person nothing about *their* chart. The natal Moon's house determines whether this is hitting their domestic life, their career zone, their partnership axis, or their 12th-house inner world. That information is already in the `TransitAspect` struct sitting right there in the function parameter.

The fix is straightforward. The `houseThemes.ts` file has `HOUSE_THEMES[house-1]` returning a `HouseTheme` with `.name` and `.brief`. `buildAspectReason` should pull `tightest.natalHouse`, look it up in `HOUSE_THEMES`, and use the house name in the reason string. This is a 5-line change that immediately makes every favorable/challenging reason sentence house-specific.

Critically, `computeTransitAspectBrief` in `transitAspectBriefs.ts` already does exactly this — it builds `"${transitPlanet} ${verbPhrase} your ${houseTheme.name} — ${contextBrief}"` (line 151). The scoring engine should call `computeTransitAspectBrief` for its reason strings, or at minimum replicate its house-lookup pattern. Right now there are two separate text-generation paths for the same transit aspect — one in `transitAspectBriefs.ts` (house-aware, used by `AspectRow`) and one in `buildAspectReason` (house-blind, used by scoring). This divergence will drift further unless it's collapsed.

The clean solution: make `buildAspectReason` call `computeTransitAspectBrief` directly, passing `tightest.natalHouse`. Done. One source of truth, immediate house context.

### Failure 2: The scoring gate is binary — it cannot distinguish a Saturn+Pluto pile-up from two Venus trines

Look at lines 361–387: the challenging path filters for `a.applying && a.orb <= orbs.applyingTight && a.nature === 'challenging'`, counts them, and if there are `>= 2`, it picks the heaviest by `PLANET_WEIGHT` and calls that the trigger. The "trigger" is reported but everything else is invisible.

The actual scoring weight of the constellation is zero. A snapshot with Saturn square natal Sun (1.2° applying) and Pluto opposition natal Moon (0.8° applying) scores the same as a snapshot with Mercury square natal Venus (1.1° applying) and Mars square natal Jupiter (0.9° applying). Those are categorically different events in a person's life — one is a year-defining pressure pattern, one is a cranky Wednesday.

The planetary weight system (`PLANET_WEIGHT` at line 122) is used only for *selecting the trigger aspect for the tooltip*. It doesn't affect whether the snapshot scores at all, or what intensity it gets. Intensity at line 373 is `Math.abs(rating.score - 3) / 2` — it comes entirely from the energy rating score, not from the planet weights.

The fix: weight the intensity calculation by the planets involved. The sum of `PLANET_WEIGHT[transitPlanet]` values across the tight applying aspects gives you a real measure of the event's significance. Normalize it. A Saturn+Pluto cluster should produce `intensity: 0.9+`. A double Mercury/Mars configuration might produce `intensity: 0.4`. This affects both the dot size on the marker and (critically) the density cap, which keeps the top 20% by intensity. Saturn+Pluto windows should survive the density cap when Mercury/Mars windows get dropped.

Concrete implementation: replace the energy-rating-only intensity formula with a weighted sum:

```typescript
const planetWeightSum = tightAspects.reduce((acc, a) => acc + (PLANET_WEIGHT[a.transitPlanet as string] ?? 1), 0)
const maxPossibleWeight = 2 * (PLANET_WEIGHT.Pluto! + PLANET_WEIGHT.Neptune!) // two heaviest
const intensity = Math.min(1.0, planetWeightSum / maxPossibleWeight)
```

This doesn't require any new data — `PLANET_WEIGHT` is already defined at line 122.

### Failure 3: The favorable/challenging gate requires the energy rating AND tight applying aspects, but they're computed independently and double-filtered

Lines 333–360 (favorable path): it calls `computeEnergyRating(snapshot.transitAspects)` which internally filters to classical aspects and takes the top 8. Then separately it filters `snapshot.transitAspects` for `applying && orb <= applyingTight && nature === 'harmonious'`. These are parallel filters over the same array, computed sequentially.

The subtle bug: `computeEnergyRating` (in `transits.ts:503`) takes the top 8 by the sort order of `snapshot.transitAspects` — which is sorted by orb ascending. The energy rating and the applying filter may not be counting the same aspects. If 3 of the 8 tightest aspects are separating harmonious aspects, they count toward the energy rating but not toward `tightApplyingHarmonious`. You could have a rating.score of 4 (favorable) driven by 3 tight separating trines, but `tightApplyingHarmonious.length < 2`, so the snapshot doesn't mark. Meanwhile the separating trines represent a window that already peaked — exactly the wrong moment to mark as "coming up."

The fix: compute the favorable/challenging score solely from applying aspects. Rewrite the energy rating for the scoring path to count only applying aspects:

```typescript
const applyingHarmonious = snapshot.transitAspects.filter(
  a => a.applying && a.orb <= orbs.applyingTight && a.nature === 'harmonious'
    && !isAsteroid(a.transitPlanet as BodyName)
)
const applyingChallenging = snapshot.transitAspects.filter(
  a => a.applying && a.orb <= orbs.applyingTight && a.nature === 'challenging'
    && !isAsteroid(a.transitPlanet as BodyName)
)
const applyingScore = applyingHarmonious.length - applyingChallenging.length
```

Drop the `computeEnergyRating` call from `scoreSnapshot` entirely. The overall energy rating is the right tool for the daily energy widget on the main transit page — it's not the right tool for forward-looking snapshot marking where applying direction is everything.

---

## Combination Logic: The Architecture Gap

The current code has no data structure for "what combinations of concurrent aspects create emergent significance." It just picks the tightest/heaviest individual aspect and reports it.

The vision is right that a Jupiter transit to natal Venus in the 5th while a Venus-trine-Sun is simultaneously applying is a different event than either in isolation. But implementing this as a lookup table across all possible pairs would be a huge combinatoric space. The practical approach is tier-based combination scoring:

**Tier 1 — Single outer planet to personal planet, tight applying:**
Saturn/Uranus/Neptune/Pluto to Sun/Moon/Venus/Mars/ASC/MC. Already detected. Add house context.

**Tier 2 — Mutual reinforcement: two+ applying aspects to planets in the same house:**
If transit Jupiter is applying to natal Venus in the 5th, and simultaneously transit Sun is applying to natal Moon in the 5th, both activating the same house within the same snapshot — that's a genuine doubling of the 5th house signal. Detect this by grouping applying aspects by natal house and checking for 2+ tight hits in a single house.

**Tier 3 — Cross-domain tension: challenging outer + personal planet AND challenging outer + personal planet in different houses:**
Saturn challenging natal Mars (3rd house, communication friction) and simultaneously Pluto opposing natal Moon (4th house, home transformation) is two parallel pressure tracks. The combination is more draining than either alone. Score it by counting the total planet weight of the challenging cluster.

None of these tiers requires new data. They require grouping the already-computed `TransitAspect[]` differently. The implementation is:

```typescript
// Group tight applying aspects by natal house
const byNatalHouse = new Map<number, TransitAspect[]>()
for (const a of tightApplying) {
  if (a.natalHouse) {
    const existing = byNatalHouse.get(a.natalHouse) ?? []
    byNatalHouse.set(a.natalHouse, [...existing, a])
  }
}

// Find house with 2+ activations
const doubledHouse = [...byNatalHouse.entries()].find(([, aspects]) => aspects.length >= 2)
```

If `doubledHouse` exists, the reason string can say: "Jupiter and the Sun are both activating your 5th house (creativity, romance) in the same window — rare doubling of this life zone." That's a specific, meaningful statement, not a formula.

---

## The House Context Wiring: What's Already There vs. What's Missing

`computeTransitAspectBrief` at `transitAspectBriefs.ts:115` does everything the vision wants for individual aspect rows. It's house-aware, it uses verb phrases by planet/nature/applying, it outputs house names in plain English. It's used correctly in `AdvanceTab.tsx:1098` for the `AspectRow` components.

The scoring engine (`buildAspectReason`) doesn't use it. `buildPowerReason` (line 161) doesn't use it either — it has its own `ANGLE_DOMAIN` lookup (lines 114–117) that's hard-coded to only ASC and MC.

The divergence means: a user looking at the "Transit Aspects" section sees "Saturn pressing on your House of Home — [relevant brief]" in the aspect row, but the marker banner says "Saturn presses your Midheaven — a significant moment for career decisions." These are parallel text-generation systems that will drift in quality.

The right call is to make `buildAspectReason` a thin wrapper over `computeTransitAspectBrief` with a different voice/length. The `transitAspectBriefs.ts` function already has a 200-character truncation limit — the reason string for a marker tooltip needs to be shorter and more punchy than an aspect row brief. Consider a `reason` variant that generates 1 sentence max, pulling from `houseTheme.name` and the verb phrase table already in `transitAspectBriefs.ts`.

---

## The Density Cap Is Broken in Practice

The 20% density cap at lines 492–508 sorts by intensity descending and keeps the top `Math.ceil(config.max * 0.2)` markers. For monthly (36 steps, max 7 markers), that's fine. For weekly (52 steps, max 10 markers), fine.

The problem: when all markers share the same category (all favorable, or all neutral except one shift), the cap doesn't enforce variety. The vision says: "the scoring system should prefer surfacing one each of power, favorable, challenging, and shift." The current cap has no category awareness.

After the intensity sort and keep-set construction, there's nothing preventing 7 of the 7 monthly markers being `favorable` if Jupiter is making a long series of harmonious transits. That defeats the purpose.

The fix: modify the density cap pass to enforce category caps before the intensity sort:

```typescript
// Category-aware density cap
const maxPerCategory: Partial<Record<MarkerCategory, number>> = {
  favorable: Math.ceil(maxMarkers * 0.4),
  challenging: Math.ceil(maxMarkers * 0.4),
  power: maxMarkers, // uncapped — power days are rare by nature
  shift: maxMarkers, // uncapped — stations are rare
}
```

Sort within each category by intensity, keep the top N per category, then fill remaining slots from any category by intensity if slots remain. This guarantees variety without removing real peaks.

---

## Synastry Advance: The Architecture Decision

The Advance tab is a React component that takes `{ chartData, aspects, period, baseDate }`. `SynastryTransitPage.tsx` has none of this. The `synastryTransitData` in state is a `TransitData` (computed against the composite chart via `buildCoupleTransitPrompt`), not the composite `ChartData` itself.

To bolt a couple-advance onto `SynastryTransitPage.tsx`, you need:

1. The composite `ChartData` in state — not just the computed transit aspects. The state has `synastryTransitData: TransitData` (lines 97 in `SynastryTransitPage.tsx`) but I don't see a `compositeChartData: ChartData` in state. Check `appState.ts` to confirm.

2. A modified `scoreSnapshot` function (or a separate `scoreCoupleSnapshot`) that evaluates composite chart planetary contacts rather than individual natal contacts. The `chartData.angles.ascendant` and `chartData.angles.midheaven` for power-day detection need to be the composite angles.

3. Composite chart house computation — `TransitAspectsToComposite` in `SynastryTransitPage.tsx` already notes this at line 29: "Composite planets have house: 0 — computeTransitAspectBrief falls to generic ASPECT_BRIEFS fallback. When composite house calculation is implemented, briefs will auto-upgrade." This is the existing technical debt for composite house context. Without it, the couple-advance reason strings will have no house language, exactly the same gap that exists for personal charts when birth time is unknown.

4. The vision also wants synastry-axis activation detection — "this week Jupiter transits your composite Venus while also hitting the Venus-Mars synastry axis." This requires access to the raw synastry aspects between person A and person B's charts, not just the composite chart transits. That data is in `SynastryData` (from the synastry reading), not in `TransitData`.

The architectural shape I'd propose: create `preCalculateCoupleSnapshots` as a thin wrapper over `preCalculateSnapshots` that passes the composite `ChartData`. For the synastry-axis detection, you need a second input: the `synastryAspects` array from the compatibility reading. Pass it as an optional parameter. In `scoreCoupleSnapshot`, after the standard composite contact checks, run an additional pass: for each tight transit activating a composite planet, check if that same composite planet participates in a tight synastry aspect between the two individuals. If yes, the combination score gets a multiplier.

This is additive architecture — `preCalculateSnapshots` doesn't change, the couple version calls the same engine with different inputs plus an extra synastry-check layer. Clean.

The prerequisite that must be solved first: the composite `ChartData` needs to be available in state or computable on the synastry transit page. Without this, none of the advance slider mechanics work for couples because `AdvanceTab` requires `chartData: ChartData` as its primary input.

---

## Performance: The Synastry Advance Cost

Composite `preCalculateSnapshots` for weekly (52 snapshots) costs roughly the same as individual: ~3000 WASM calls. The synastry-axis overlay check is pure arithmetic over an in-memory array — negligible. The couple advance will have the same 200–800ms compute time as the individual advance. This is acceptable under `useTransition`.

One new cost: if you want to check whether a transit activates synastry aspects, you need to compare transit planet positions against the synastry aspect array (which is pre-computed at reading time). This is O(synastry_aspects × transit_planets) per snapshot — maybe 50 aspects × 15 planets = 750 comparisons per snapshot, 39,000 total. Trivial.

The expensive thing to avoid: don't recompute synastry aspects inside the couple advance. They're already computed. Pass them in as a static input to `preCalculateCoupleSnapshots`.

---

## Technical Debt Accumulating

**1. Two parallel text-generation paths**

`transitAspectBriefs.ts` (house-aware, phrase-table-based) and `buildAspectReason` in `AdvanceTab.tsx` (house-blind, domainMap-based) will drift apart. Every future improvement to one needs to be replicated in the other. This is the most immediate cleanup target — collapse them into one.

**2. `computeEnergyRating` is the wrong primitive for forward-looking scoring**

It's used in two contexts: the energy widget on the main transit page (appropriate — it scores the present state) and in `scoreSnapshot` for forward snapshots (inappropriate — it doesn't prefer applying over separating). The name should be a hint: "energy rating" is a present-tense concept. Future-snapshot marking needs "momentum rating" — which weights applying aspects heavily and discounts separating ones.

**3. The `SLOW_PLANETS_FOR_BANNER` set excludes Jupiter intentionally** (line 99–100 comment: "Jupiter excluded intentionally"). But the vision says "Jupiter transiting natal Venus in the 5th with a simultaneous Venus-trine-Sun would score neutral under the current rules." Jupiter is excluded from power-day detection by an arbitrary policy choice that was correct for Saturn-to-ASC/MC angle contacts but wrong for Jupiter-to-personal-planet detection. The exclusion needs to be scoped to "Jupiter excluded from ASC/MC angle contact power day detection" not "Jupiter excluded from all significance scoring." These are different things. Right now the code implements the broader exclusion by accident.

**4. The hysteresis pass (lines 462–489) only inherits from left neighbor**

It checks if both `snapshots[i-1]` and `snapshots[i+1]` have the same non-neutral category and if so fills in `snapshots[i]`. But it only looks at `prev.score.triggerAspect.orb` — it doesn't check whether the trigger aspect is still present in snapshot `i`. The `currAspect` lookup at line 479 finds the aspect by planet name pair, which could match a different aspect of the same type if there are multiple aspects between the same planet pair. Unlikely in practice, but the condition `a.transitPlanet === triggerPlanet && a.natalPlanet === triggerNatal` isn't tight enough — it should also check `a.type === triggerType` to avoid false matches.

**5. Monthly snapshot date normalization**

The comment at lines 428–432 notes: "JavaScript normalizes out-of-range dates (e.g., Feb 31 → Mar 3). This is a known limitation." This is fine as-is for now, but means that in February, the monthly advance for "month 3 from February 28" could silently compute to March 3 when the label says "month 3." For a 36-month range starting in January, this could cause 2–3 misaligned labels near month-end dates. Not sprint-critical but not invisible to users who read the date display carefully.

---

## What to Build in Sprint 0019

In priority order, from a pure engineering standpoint:

**1. House-aware reason strings in `buildAspectReason`** — call `computeTransitAspectBrief` or extract its house lookup pattern. This is a 1-day change with immediate visible quality improvement. No architecture risk.

**2. Combination-weighted intensity** — replace the energy-rating-derived intensity with the planet-weight-sum formula. This makes the density cap filter correctly: Saturn+Pluto events survive, Mercury/Mars events get dropped. Also fixes the scoring gate for combinations.

**3. Applying-only energy scoring in `scoreSnapshot`** — drop `computeEnergyRating` from the forward snapshot scorer, replace with applying-only aspect counts. Prevents marking events that have already peaked.

**4. Category-aware density cap** — enforce per-category maximums so the timeline shows variety. Purely a post-processing change to the cap pass, no ephemeris changes.

**5. Jupiter inclusion in combination scoring** — distinguish "Jupiter excluded from ASC/MC power-day detection" from "Jupiter included in combination scoring when it contacts personal planets in tight applying aspects."

**6. Composite ChartData in state, then `preCalculateCoupleSnapshots`** — this is the couple-advance prerequisite. Once the composite chart is addressable as `ChartData`, the couple-advance is a wrapper call over the existing engine. Estimate: getting the composite ChartData into state is 1-2 days, the couple advance tab wiring is another 1-2 days. The synastry-axis overlay detection is additional but can ship in a follow-up.

Items 1–4 are content improvements to the existing individual advance. Item 5 is a scoring logic fix. Item 6 is new surface area. The vision tries to do all of these in one sprint — that's technically feasible if the sprint is scoped correctly, but items 1–4 are the ones that directly address the "thin and repetitive" output complaint, so they should ship first even if item 6 slips.

---

## Key File Paths

- Scoring engine: `/projects/astrology-reader/src/components/reading/AdvanceTab.tsx`, lines 161–390
- Transit aspect engine: `/projects/astrology-reader/src/engine/transits.ts`, `calculateTransitAspects` at line 150
- House-aware brief generation: `/projects/astrology-reader/src/data/interpretations/transitAspectBriefs.ts`, `computeTransitAspectBrief` at line 115
- House theme data: `/projects/astrology-reader/src/data/interpretations/houseThemes.ts`, `HOUSE_THEMES` array and `getHouseTheme` function
- Synastry transit surface: `/projects/astrology-reader/src/components/results/SynastryTransitPage.tsx` — no advance tab, no composite ChartData in scope
- Energy rating primitive: `/projects/astrology-reader/src/engine/transits.ts`, `computeEnergyRating` at line 498
- Synastry vocabulary: `/projects/astrology-reader/src/data/interpretations/synastryAspectBriefs.ts` and `synastryHouseOverlayBriefs.ts` — rich material for couple-advance reason strings when composite house placement is available
