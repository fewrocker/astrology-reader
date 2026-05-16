# Fragility Analysis: Sprint 0019 — Scoring Engine Upgrade and Synastry Advance
## By Nassim Taleb's Lens

Sprint 0018 shipped the infrastructure. Sprint 0019 proposes to fill it with better content and extend it to couples. Both sound reasonable. Neither is as simple as the vision suggests. What follows is the adversarial reading — what the code actually does, where the assumptions fail, and what will break in a way that is silent enough to escape a demo but loud enough to erode user trust over months.

The prior analysis (sprint 0018) identified several systemic fragilities: the `applying` flag being wrong for retrograde planets, `computeEnergyRating` being fast-planet dominated, the stationing threshold firing false positives for outer planets, and the monthly midnight-reset corrupting Moon positions. The sprint 0018 changelog confirms two were fixed — the midnight reset and the per-planet station threshold. The `applying` flag problem and the energy rating bias remain in the engine. Sprint 0019 proposes to build combination scoring and synastry advance on top of these unfixed foundations. That is the central structural risk.

---

## 1. The Scoring Engine Is Scoring the Wrong Things

### 1.1 `computeEnergyRating` Is Dominated by Fast Planets at Monthly Resolution

`computeEnergyRating` in `transits.ts` takes `classicalAspects.slice(0, 8)` — the 8 tightest aspects by orb, already sorted ascending. At monthly resolution, `orbScale = 0.7`, meaning each aspect definition's maximum orb is scaled to 70%. The sort is by absolute orb, not by planet weight.

The consequence: fast planets (Moon, Mercury, Venus, Sun) form and dissolve aspects within days. At a monthly snapshot, these fast planets have tight orbs precisely because they happen to be at a transit moment — they are not necessarily significant for the month. Slow planets (Saturn, Neptune, Pluto, Uranus) are in aspect all month, but their orbs may be wider because the orbScale permits wider windows for slow-moving bodies that stay within orb for extended periods.

In practice, the top-8 list at monthly resolution is frequently crowded with Moon, Mercury, and Sun aspects that reflect where those planets happen to be on the specific noon of the snapshot, not what defines the month. Saturn opposing natal Moon at 2.1° orb — the defining transit of the month — sits at position 10 in the sorted list and is excluded from the energy score. A Mercury sextile at 0.4° orb sits at position 3 and contributes to a "favorable" classification. The marker fires green for a Mercury transit, not for the Saturn opposition that is the actual story.

The vision identifies this as a gap ("no multi-aspect combination logic") but frames it as a content problem. It is a measurement problem. You can write all the house-anchored language you want, but if the score fires on Mercury-Venus transient noise rather than Saturn-Moon structure, the marker is placed at the wrong moment. The improved reason strings will be eloquent about the wrong transit.

### 1.2 The `applying` Filter Misclassifies Retrograde Transits

The `scoreSnapshot` favorable/challenging logic requires `a.applying === true`. The `applying` boolean in `calculateTransitAspects` (`transits.ts:176`) is:

```typescript
const applying = tp.dailyMotion > 0
  ? (angle > def.angle ? false : true)
  : (angle > def.angle ? true : false)
```

For a direct planet: applying means the angle is decreasing toward exact. For a retrograde planet: applying means the angle is increasing toward exact from the other direction. This is geometrically reasonable for simple cases. It fails for retrograde planets in opposition or conjunction when the angular distance wraps.

More practically: when a planet is at or near a station — daily motion near zero but not yet negative — the classification flips between "applying" and "separating" across two consecutive snapshots for the same physical sky geometry. Saturn at 0.001°/day classified as direct: the applying direction follows the direct formula. Saturn at -0.001°/day the next day: classified retrograde, applying direction reverses. The same aspect at the same orb in consecutive snapshots has opposite `applying` values.

Sprint 0019 wants to score based on "multi-aspect constellations" of applying aspects. A constellation of three Saturn aspects that are all "applying" at one snapshot and "separating" at the next — because Saturn is near its station — will fire a marker at snapshot N and not at snapshot N+1. The user sees a challenging period marker, slides past it, sees neutral, slides back, sees challenging again. The marker flicker is at the exact station date — the most astrologically meaningful moment — where the stability should be highest.

This is not fixed by the hysteresis pass. The hysteresis pass (`preCalculateSnapshots` lines 462–489) looks for a neutral snapshot sandwiched between two non-neutral snapshots of the same category. A pattern of non-neutral / non-neutral / neutral / non-neutral will not be caught by it. And the orb delta condition (`Math.abs(currAspect.orb - prevOrb) < MARKER_HYSTERESIS_ORB`) depends on finding the same transit-to-natal pair in the current snapshot's aspect list — if the pair's `applying` status changed, the pair may not match the trigger condition and the hysteresis will not fire.

### 1.3 The Density Cap Destroys Variety by Intensity, Not by Category

The 20% density cap (`preCalculateSnapshots` lines 492–509) sorts all non-neutral markers by `intensity` descending and keeps the top 20%. Intensity for power is `1.0 - (orb / angleContactMaxOrb)`. Intensity for favorable/challenging is `Math.abs(rating.score - 3) / 2` — maximum 1.0.

The vision says the sprint should "prefer surfacing one each of power, favorable, challenging, and shift across a 36-month range." The density cap makes no such guarantee. It sorts by intensity and keeps the top N. If a user's chart has Saturn transiting their Ascendant for two months at tight orb — producing monthly power markers at intensity 0.85–0.95 across five consecutive snapshots — those five markers will all rank above a favorable marker at intensity 0.7 and a challenging marker at intensity 0.65. The cap will keep the five power markers and discard the favorable and challenging. The user sees a gold-only advance timeline for the first quarter. The vision's stated goal of variety is mechanically impossible under the current cap implementation for any chart where a slow planet is near an angle for an extended period. This is not a rare chart configuration.

---

## 2. The Synastry Advance Surface Is Harder Than It Looks

### 2.1 Unknown Birth Time Is a Compound Problem for Couples

The personal advance tab correctly guards angle-contact power markers with `if (!chartData.unknownTime)`. The vision proposes couple advance scoring that evaluates "composite chart planets being activated and whether the transit simultaneously triggers synastry aspects."

The composite chart angles — Ascendant, Midheaven — are computed as midpoints of the two individual charts' angles (`synastry.ts:208`). If either person has `unknownTime: true`, their individual Ascendant is computed from noon on their birth date — a number that is meaningless as an actual angle but structurally valid. The midpoint composite Ascendant will then be a midpoint between a real angle and a phantom, producing a composite Ascendant that is wrong. Any couple advance scoring that fires power markers on transit-to-composite-angle contact will produce false positives whenever one partner's birth time is unknown.

The vision does not mention this guard requirement. The developer implementing couple advance will see the working guard in personal advance and may reason: "the composite chart is already built, the angles are already computed, I will evaluate them." The composite chart's house 0 planets (every planet has `house: 0` per the explicit comment in `synastry.ts:200`) are a related trap — `getHouseTheme(0)` returns `HOUSE_THEMES[-1]` which is `undefined`. Any house-anchored reason string generation that calls `getHouseTheme(compositePlanet.house)` without the guard `rawHouse > 0` will throw at runtime when the planet house is 0.

This is not a theoretical gap. Every composite planet has house 0 by design (`house: 0, // Deferred`). Every attempt to generate house-contextualized couple advance reason strings will hit this bug unless explicitly guarded.

### 2.2 The Synastry Advance Scoring Needs Three Data Structures Simultaneously

The vision's quality bar for couple advance is: "this week Jupiter transits your composite Venus while also hitting the Venus-Mars synastry axis — favorable for romance." This requires cross-referencing:

1. Current transit planet positions (computed per snapshot)
2. Composite chart planet positions (static, computed once)
3. Synastry aspects between person 1 and person 2 natal planets (static, computed once)

The first is already available in the advance snapshot. The second and third must be passed to the scoring function. The current `scoreSnapshot` signature is `(snapshot, prev, chartData, period)`. For couple advance, it would need something like `(snapshot, prev, compositeChart, synastryData, period)`. This is a signature change to the scoring function.

The deeper problem: the synastry aspects in `SynastryData` relate person 1's natal planet to person 2's natal planet — they carry no house information for either person unless the individual charts have known birth times. The vision wants to say "the Venus-Mars synastry axis." But if person 1 has unknown birth time, person 1's Mars has `house: 0`. The synastry aspect between person 1's Mars and person 2's Venus exists (it is computed from longitudes, not houses), but the house context that would make it meaningful — "person 1's Mars in the 7th house" — is unavailable.

The scoring function will need to operate in degraded mode for charts with unknown times — correctly computed but without house anchoring — and the reason strings will need to handle this gracefully. The vision's examples all implicitly assume known birth times.

### 2.3 The Composite Advance Tab Requires a New Entry Point in `SynastryTransitPage`

The vision says the Advance tab "is imported and used only in `TransitReadingPage.tsx`." This is correct. `SynastryTransitPage.tsx` has no Advance tab. To add it, the developer needs to:

1. Pass both `chartData` (person 1) and `partnerChartData` (person 2) to the couple advance component, since both are needed to build composite scoring.
2. Pass `synastryData` (which contains `compositeChart`, `synastryAspects`, `houseOverlay`) to the couple advance component.
3. Either reuse `AdvanceTab` with new props (breaking its current signature) or create a parallel `CoupleAdvanceTab` component.

The current `SynastryTransitPage` receives `synastryTransitData` (transit data against the composite chart) and `synastryTransitInterpretation`. It does not have direct access to `chartData`, `partnerChartData`, or `synastryData` from the app state — it uses `useApp()` and pulls from `state`. So the data is technically accessible. But the component was designed to display static transit data, not to run a real-time snapshot engine. Adding `preCalculateSnapshots` to `SynastryTransitPage` means adding the full snapshot engine cost to a page that currently has no computation of its own.

There is no obvious place in `appState.ts` to cache couple advance snapshots. The personal advance cache lives inside `AdvanceTab` as a `useRef` keyed by `${period}:${baseDate.toISOString()}`. A parallel structure for couple advance would need a third dimension: the partner chart identity. If the user switches partners mid-session, the cache must be invalidated. The partner chart identity is not part of the current cache key pattern.

---

## 3. The Reason String Upgrade Will Break the Tooltip UI

### 3.1 The Tooltip Is Designed for One-Line Reasons

The current `MarkerTooltip` component (AdvanceTab.tsx line 748) renders `score.reason` in a container with `maxWidth: '200px'` and `text-[10px]`. The current reason strings are 60–80 characters — one line in this container. The `textWrap: 'balance'` style distributes text evenly but does not change the container width.

The vision's quality bar gives examples like: "The next three weeks are a pressure test for one specific emotional pattern you've carried since childhood — Saturn is asking you to restructure how you handle it, and the timing is deliberate." This is approximately 175 characters. At `text-[10px]` and `maxWidth: 200px`, this wraps into 3–4 lines. The tooltip box will be substantially taller than its current design assumes. The connector line (8px, hardcoded at line 740) and the overall vertical layout will be wrong.

Additionally, the banner display (AdvanceTab.tsx line 1050) does `categoryBanner.split(' ')[0]` to bold the first word in the `font-heading` treatment. For a sentence like "The next three weeks..." the first word is "The" — bolded, which is visually meaningless. The pattern of "first word bolded" was designed for sentences like "Saturn presses your Ascendant" where "Saturn" is the meaningful anchor. For the improved sentences the vision wants, this rendering assumption is wrong.

The vision explicitly says "not a UI redesign." But if the reason strings grow to the quality the vision describes, the UI must change or the strings must be truncated. The constraint is internally inconsistent.

### 3.2 The Banner and Tooltip Show the Same String — Which Is Also Wrong

`formatScoreAsBannerText` (AdvanceTab.tsx line 396) returns `score.reason` unchanged. The tooltip shows `score.reason` unchanged. The banner shows `score.reason` in a slightly larger context. If the reason string is improved to be multi-sentence and house-anchored, it will appear identically in:

- The tooltip on hover (small, 200px-wide, appears above the slider)
- The banner below the slider (full width, more context)
- The `aria-label` on the marker dot wrapper

A banner can accommodate a longer sentence with context. A tooltip cannot. A house-anchored, action-oriented reason string needs different representations at different sizes. The current architecture uses one string for all surfaces. This was correct when the string was brief. It is incorrect as the string becomes the paragraph-quality text the vision wants.

---

## 4. The Combination Scoring Logic Will Create New Edge Cases

### 4.1 Two Challenging Aspects Involving Saturn and Pluto Versus Two Minor Harmonious Aspects — The System Will Not Reliably Distinguish

The vision correctly identifies that "a snapshot with two tight challenging aspects involving Saturn + Pluto to personal natal planets is categorically indistinguishable from a snapshot with two minor harmonious aspects" under the current scoring. The proposed fix is combination scoring — weighting by planet significance, identifying multi-signal constellations.

Any such weighting system creates a new class of edge cases: what is the exact threshold that separates "meaningfully combined" from "coincidentally concurrent"? The vision provides no specification for this. If the combination threshold is too high — requiring Saturn + Pluto + challenging aspect all within 2° applying — the system fires very rarely. If too low — any two slow planets in aspect simultaneously — the system fires everywhere. The calibration will be done by feel during implementation, which means it will be wrong for some fraction of real charts in ways that are not caught in testing.

The specific risk: a chart that has natal Moon and natal Venus within 15° of each other in the same house. Any transit to that zone hits both planets simultaneously and produces two aspects with similar orbs in the same category. The combination scorer will fire at maximum strength every time a slow planet transits that zone. If the natal Moon-Venus proximity is 10°, the combination scorer fires for approximately 10/360 = 2.8% of all slow planet positions — potentially multiple consecutive monthly markers. The density cap will reduce this, but it will still produce a cluster that makes that one chart zone appear disproportionately significant.

This is not a bug. It may be correct astrology. But it is not accounted for in the vision's reasoning, and the implementation will need a conscious design decision about whether to treat tight natal planet clusters as amplifiers or to normalize them.

### 4.2 Jupiter Is Excluded from Power Markers but the Vision Wants It in Combination Scoring

The current `SLOW_PLANETS_FOR_BANNER` set explicitly excludes Jupiter (`Jupiter excluded intentionally`, AdvanceTab.tsx line 100). The vision gives as an example of the current system's failure: "Jupiter transiting natal Venus in the 5th with a simultaneous Venus-trine-Sun would score neutral under the current rules despite being a genuine high-compatibility window."

The vision wants Jupiter included in combination scoring for favorable moments. This creates an asymmetry: Jupiter excluded from power markers (angle contact) but included in combination favorable scoring. A developer implementing this will need to track two different planet sets — `SLOW_PLANETS_FOR_BANNER` (no Jupiter) for power triggers, and a separate planet set (with Jupiter) for combination favorable triggers. If they update `SLOW_PLANETS_FOR_BANNER` to include Jupiter thinking that's the right place, power markers will suddenly fire on Jupiter-ASC contacts, which may not be the intent. If they create a parallel constant without documenting the split, future developers will not understand why Jupiter appears in one context and not another.

The Jupiter exclusion from power markers was intentional but undocumented in the original architecture decisions. The combination scoring expansion must make the Jupiter treatment explicit at every new use site.

---

## 5. The Thing Everyone Is Ignoring: The Scoring Engine Has No Tests

The entire scoring pipeline — `scoreSnapshot`, `detectAngleContact`, `computeEnergyRating`, the density cap, the hysteresis pass — is pure TypeScript with no test suite. I have read the full `AdvanceTab.tsx`. There is no test harness. There are no unit tests.

Sprint 0019 proposes to significantly restructure `scoreSnapshot` to add combination logic, house context, new intensity calculations, and category-balanced density behavior. A pure-function scoring engine without tests will regress in the following predictable ways:

**Regression 1:** A developer adds combination scoring logic and changes the condition for firing a `challenging` marker to require at least one slow planet aspect in the combination. They accidentally break the existing path where two tight Mercury aspects produce a challenging score. No test catches it because there was no test for the old behavior.

**Regression 2:** The density cap is modified to category-balance (the vision's stated goal — one each of power, favorable, challenging, shift). A boundary condition is broken: what happens when there are exactly 7 candidates and `maxMarkers = 7`? The category-balance logic fails silently, keeping 7 markers of the same category. No test catches it.

**Regression 3:** The hysteresis pass inherits a score from a power marker. The power marker's `triggerAspect` references `natalPlanet: 'Ascendant'`. In a later code path, someone looks up `chartData.planets.find(p => p.name === triggerAspect.natalPlanet)` to get the house. The lookup fails because 'Ascendant' is not in `chartData.planets`. The code handles `undefined` gracefully in one path but not in another. A specific combination of marker categories produces a null-reference crash in production. No test caught it because no test exercised that combination.

The correct sequence before touching the scoring engine is: extract it to a pure module (`src/engine/scoring.ts`), write parameterized tests against known chart configurations and known transit dates with expected output categories, and then modify the logic. Without this, sprint 0019 is retrofitting a complex multi-signal scoring engine while flying blind.

---

## Summary of Risks by Severity

**Blocker-class for synastry advance:**
- Composite planets have `house: 0`; `getHouseTheme(0)` returns `undefined`; any house-anchored couple reason string will throw without an explicit `house > 0` guard that the vision does not mention.
- One partner with `unknownTime: true` makes the composite Ascendant meaningless; couple power markers against composite angles will fire on phantom angles unless the guard requires both charts to have known times.

**High: incorrect scoring in the base engine:**
- The `applying` flag misclassifies retrograde transits at station dates, causing marker flicker at the most astrologically meaningful moments.
- `computeEnergyRating` is dominated by fast planets at monthly resolution; slow-planet defining transits are excluded from the score by orb sort order.
- The density cap sorts by intensity not by category diversity; a slow planet near an angle produces month-long power marker clusters that suppress all favorable and challenging markers.

**Medium: structural gaps in the proposed synastry advance:**
- The scoring function signature must change to accept composite chart and synastry data; the vision does not specify this signature.
- Couple advance snapshots have no cache key dimension for partner chart identity; switching partners mid-session will silently use stale snapshots.
- Jupiter's intentional exclusion from power markers must be explicitly handled in combination scoring code; the vision implies Jupiter is now included in favorable combinations but does not update the exclusion constant.

**Medium: UI inconsistency from reason string upgrade:**
- Tooltip is designed for 60–80 character one-line reasons; the vision's quality bar examples are 150+ characters.
- Banner splits on the first word for `font-heading` treatment; multi-sentence reasons make this split meaningless.
- No test suite for the scoring engine means all combination scoring changes are regression-blind.

---

## The Bottom Line

A scoring system that generates eloquent, house-anchored, action-oriented reason strings is more dangerous than one that generates terse formula sentences — if the scoring is wrong. With the terse system, the user dismisses the output as generic. With the eloquent system, the user trusts the output and acts on it. If the eloquent output fires on the wrong transit (Mercury noise instead of Saturn structure), the user will take advice based on a misidentified moment. They will not know the reason string was built on a fast-planet sextile that perfected at noon on the snapshot date rather than on the Saturn transit that defines their month. They will come back in six months and say the system does not resonate. That is the slow-acting failure mode of an interpretive system with a confident voice and unreliable scoring.

Fix the foundation first. Fix the `applying` flag for retrograde planets. Fix the energy score to weight by planet significance rather than orb proximity. Fix the density cap to prefer variety over intensity. Then upgrade the reason strings. Then extend to synastry. In that order.

---

*—Nassim Taleb*

*Every system that makes confident predictions from unvalidated heuristics eventually exhausts the trust it borrowed on launch day. The question is whether you spend that trust capital on calibration or on aesthetics. This sprint is proposing both simultaneously. That is the fragility.*
