# Fragility Analysis: Sprint 0020
## By Nassim Taleb's Lens

Sprint 0019 shipped real fixes. The cache collision bug — where two users with identical periods and base dates could share snapshots silently — was resolved by including ascendant/midheaven fingerprints in the individual advance cache key. The applying-flag station flip was fixed by forcing stationing planets to `applying: true`. The combination-weight scoring replaced the fast-planet-dominated `computeEnergyRating` gate for Priorities 3 and 4. The house-anchored reason strings are now live. These were not small repairs; they changed the product's scoring character substantially.

Sprint 0020 builds on this improved foundation. What follows is the adversarial reading. I am looking for what is still broken, what the new proposals introduce that will break, and what everyone is treating as low-cost that isn't.

---

## 1. The Couple Advance Cache Key Is Still Wrong

Sprint 0019 fixed the individual advance cache key to use `.toFixed(4)` precision for ascendant and midheaven fingerprints. The individual cache key in `AdvanceTab.tsx` (line 1247): `${chartData.angles.ascendant.longitude.toFixed(4)}:${chartData.angles.midheaven.longitude.toFixed(4)}:${chartData.unknownTime}`.

The couple advance cache key in `CoupleAdvanceTab.tsx` (line 421): `${period}:${baseDate.toISOString()}:${chart1.angles.ascendant.longitude.toFixed(2)}:${chart2.angles.ascendant.longitude.toFixed(2)}`.

The precision is `.toFixed(2)` — two decimal places instead of four. Two different couples whose first partners have ascendants at 43.178° and 43.183° produce identical fingerprints: `43.18` in both cases. Their cached snapshots collide. The cache collision bug sprint 0019 eliminated for individuals is still present for couple advance, just at a lower per-pair collision probability. In a session where a user has multiple saved couples — a completely normal use case for a couple compatibility product — this fires silently.

This is the same silent data corruption class as the sprint 0019 fix. One character: `.toFixed(2)` → `.toFixed(4)` on line 421 of `CoupleAdvanceTab.tsx`. This should be fixed before sprint 0020 ships any new couple advance features on top of it.

**Severity: high. Silent data corruption. No error thrown. Undetectable from the UI.**

---

## 2. `computeEnergyRating` Still Drives Couple Priorities 2–4 — This Is Not Just Code Quality, It Creates Incoherence

The vision correctly identifies that `scoreCoupleSnapshot` still uses `computeEnergyRating` (Priorities 2, 3, 4) while `scoreSnapshot` was upgraded to `computeCombinedWeight` in sprint 0019. The vision labels this a "code quality — scoring parity" issue. I label it a scoring incoherence issue that matters for the product.

Here is the concrete failure mode a user will observe:

A user has both the individual transit tab and the couple transit tab open. The same sky, same date, same planets. The individual advance system (using `computeCombinedWeight`) requires a slow planet in the aspect constellation plus a combined weight above `COMBINATION_WEIGHT_THRESHOLD = 3.0` to fire a favorable or challenging marker. A Mercury+Sun cluster at tight orbs produces weight ~5.0, which falls below `COMBINATION_WEIGHT_THRESHOLD * 2 = 6.0` (the fast-planet-only threshold), so the individual advance does not fire.

The couple advance system (using `computeEnergyRating`) for the same sky gives `score = 4` for two harmonious aspects regardless of which planets they are, and fires a favorable marker because `rating.score >= 4 && tightApplyingHarmonious.length >= 2`.

Same sky. Individual advance: quiet. Couple advance: green marker. Users who use both will notice this. The product claims to tell the truth about the sky; it is telling two different truths about the same sky.

Beyond the user experience: sprint 0020 plans to add synastry axis overlay scoring on top of `scoreCoupleSnapshot`. Synastry axis scoring is an augment — it layers additional intensity onto markers that already fired. If those base markers are firing on Mercury+Sun noise, the synastry augment will claim to be elevating noise to "this also activates the bond between your Venus and their Mars." This is worse than noise. It is confident-sounding misinformation.

The `computeCombinedWeight` function is already in `AdvanceTab.tsx` and is exported-compatible. Porting it to the couple path is mechanical. The vision is correct that it must be done. I am saying it must be done **as a prerequisite to synastry axis scoring**, not as a parallel optional task.

**Severity: high. Produces inconsistent outputs across individual and couple views. Makes synastry axis augmentation build on bad inputs.**

---

## 3. The Synastry Axis Midpoint Is a Ghost Target

The vision specifies: "if the transiting planet's degree is within `angleContact` orb of a synastry aspect's midpoint degree AND that synastry aspect has `orb <= 2.0`."

The "synastry aspect's midpoint degree" is not a real astrological concept with established meaning. A synastry aspect is a relationship between two natal planets — Person 1's Venus at 15° Aries and Person 2's Mars at 17° Aries form a 2° conjunction. The "midpoint" of this aspect, computed as `(15 + 17) / 2 = 16°`, is simply the average of two longitudes. This is not the same as the composite Venus (which is the midpoint of BOTH charts' Venus positions, not the midpoint of a cross-chart aspect). It is not a sensitive point in any established astrological technique.

What the implementation would actually detect: a transiting planet near 16° Aries. But near 16° Aries means within `angleContact` orb of both 15° and 17° (since they are only 2° apart and `angleContact` at weekly resolution is 2°). Which means the correct formulation — "the transit is within orb of EITHER the person 1 planet OR the person 2 planet in a tight synastry pair" — would detect the same transit, but without inventing a ghost degree.

The midpoint formulation fails silently in one edge case the direct formulation does not: when `angleContact` orb is smaller than the synastry aspect orb. If `angleContact = 1.0` (daily resolution) and the synastry aspect orb is 2.0°, the transit at the midpoint (1.0° from each natal planet) fires the augment. The transit at exactly 15° Aries (0.0° from P1 Venus, 2.0° from P2 Mars) does NOT fire the augment because it is 1.0° from the midpoint — outside the `angleContact` threshold. But this is the transit that most directly activates P1's natal Venus, the first pole of the synastry pair. The midpoint formulation misses the most direct activation.

The implementation should check: for each tight synastry aspect (orb ≤ 2.0°), look up the natal longitudes of both planets in their respective charts, and check whether the transiting slow planet is within `angleContact` orb of either one. This is directly computable from `synastryData.synastryAspects` paired with `chart1.planets` and `chart2.planets` lookups.

**Severity: medium. Produces plausible-looking augment activations that are systematically wrong for certain transit positions. The error is invisible without auditing the underlying longitudes.**

---

## 4. The Solar Return Advance Has a UTC/Local Time Mismatch

The SR advance proposal says: "run the existing advance marker engine against the SR chart data across the SR year's 12 months" using `preCalculateSnapshots` with `srMoment` as `baseDate` and 12 monthly steps.

`preCalculateSnapshots` for the monthly period constructs step 0 as:
```typescript
new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate())
```

This interprets `baseDate` in **local time**. `baseDate.getFullYear()` returns the local-time year; `baseDate.getMonth()` returns the local-time month.

`srMoment` in `calculateSolarReturn` (`solarReturn.ts` line 41) is returned by `findSolarReturn` — a Date object representing the precise UTC moment the Sun returns to its natal degree. It is a UTC astronomical event. `formatSRMoment` in `SolarReturnPage.tsx` (line 159) displays it using `.getUTCMonth()`, `.getUTCDate()`, etc. — correctly reading it as UTC.

When `srMoment` is passed as `baseDate` to `preCalculateSnapshots`, and `preCalculateSnapshots` reads `baseDate.getFullYear()` (local time), the step-0 date is in local time. For a user in UTC+3 whose SR occurs at 22:00 UTC on March 14 (which is 01:00 AM March 15 in UTC+3), the local-time reading of that Date gives March 15 as the start of the SR advance strip. The SR advance runs from March 15 through next March — but the actual SR year runs from March 14 through next March 14. The strip is offset by one day at the start, and this is invisible unless the user looks carefully at the displayed start date.

This affects all users in UTC-offset timezones when their SR falls after 9 PM UTC (UTC+3 and later) or before 3 AM UTC for the following day (UTC-3 and earlier). This is not a rare edge case — it is structural.

The fix: pass the SR advance a `baseDate` that is explicitly normalized to UTC midnight of the SR day (use `srMoment.toISOString().split('T')[0]` to extract the UTC date, then construct `new Date(utcDateString)` with no time offset). The monthly step construction will then be consistent with the UTC SR date.

**Severity: medium. Incorrect advance window start for users in UTC-offset timezones. Silent — no error, just subtly wrong dates.**

---

## 5. The In-Memory Cache Is Unbounded and Has No Eviction

Both `AdvanceTab.tsx` and `CoupleAdvanceTab.tsx` use `useRef<Map<string, AdvanceSnapshot[]>>(new Map())` as the snapshot cache. The Map is written to on every new period/baseDate/chart combination. Nothing is ever evicted.

Each `AdvanceSnapshot` contains: `transitPlanets` (~15 objects), `transitAspects` (~40–60 objects at monthly), `retrogrades` (8 objects), `housedTransitPlanets` (~15 objects), and the `score` struct. A 36-month monthly cache entry is 37 snapshots × ~100 JS objects = ~3,700 objects. At 64 bytes per object reference estimate, one monthly cache entry is ~240 KB.

A user who compares multiple couples (3 partners × 3 periods = 9 cache entries × 240 KB) accumulates ~2 MB. A user who navigates back and forth with different baseDates (session persists across navigations while component is mounted) accumulates more. The cache lives on the component ref and is cleared only when the component unmounts. On a mobile device with 4 GB RAM where the browser has 1–2 GB working set, this degrades performance over a long session.

The bound is behavioral (users don't cycle through 50 combinations), not architectural. A simple LRU cap of 6 entries (2 couples × 3 periods) would fix this with a 4-line change. Sprint 0020 is adding the SR advance, which creates a third component with its own unbounded cache. The accumulation compounds.

**Severity: low-medium. Memory bloat in extended sessions on mobile. Does not crash; degrades performance gradually.**

---

## 6. The Couple Banner Still Uses the Fragile First-Word Split

Sprint 0019 added `bannerBoldFragment` to `SnapshotScore` specifically to fix the problem of `split(' ')[0]` bolding meaningless words like "The" or "A." The individual advance banner (line 1513 of `AdvanceTab.tsx`) now uses `snapshot.score.bannerBoldFragment ?? categoryBanner.split(' ')[0]`, so if the builder explicitly sets the bold fragment (all current individual builders do), the split is never used.

The couple advance banner (line 678 of `CoupleAdvanceTab.tsx`) uses the legacy pattern directly:
```typescript
<span className="font-heading">{categoryBanner.split(' ')[0]}</span>
{' ' + categoryBanner.split(' ').slice(1).join(' ')}
```

There is no `bannerBoldFragment` usage. The current couple reason strings happen to start with planet names ("Saturn reaches the relationship's Ascendant..."), so the split currently produces correct bolding. But sprint 0020 adds guidance text and may modify the couple reason string vocabulary. If any couple reason string ever begins with "A" or "The" or "During" — a natural phrasing for relational context — the banner bolds a meaningless word.

The sprint 0019 fix exists precisely because this pattern is fragile. The couple banner should use the same `bannerBoldFragment` field and render path as the individual banner. The fix is 3 lines.

**Severity: low. Latent fragility. Will break when couple reason string phrasing changes, which sprint 0020 plans to do (guidance language).**

---

## 7. The Timeline/Advance Coherence Proposal Has Unexamined State Coupling

The vision calls Timeline/advance coherence "low code cost." This estimate ignores the state synchronization problem.

The TransitTimeline renders synchronously from precomputed timeline events. The advance snapshots compute asynchronously under `useTransition`. These two systems are currently independent.

Adding advance score annotations to Timeline event cards creates a dependency: the Timeline needs the snapshots to decide which events to annotate. Two cases:

**Case A: user opens Timeline first, without having opened Advance tab.** Snapshots are not cached (the cache is in `AdvanceTab`'s `useRef`, which does not exist until the Advance tab mounts). The Timeline has no snapshot data. The annotation cannot appear. The implementation must either show nothing (invisible degraded state, no loading indicator), show a loading indicator that resolves when... nothing triggers the computation, or trigger snapshot computation from the Timeline component (a new computation surface with its own pending state).

**Case B: user opens Advance tab first, then Timeline.** Snapshots are cached in `AdvanceTab`'s `useRef`. But that ref is inside the `AdvanceTab` component. The Timeline component has no access to it. To share cached snapshot data between components, the cache must be lifted to a shared context or passed down through props. This is a component architecture change.

The vision says "the snapshots are pre-computed and accessible." They are accessible only if the Advance tab has already run and its internal cache ref is not in a separate component tree. The "accessibility" assumption is false for Case A and requires architecture changes for Case B.

The easy version — annotate timeline cards when snapshots happen to be available via some shared state — is possible. But it requires deciding what "shared state" means here: a new context, a prop-drilled snapshot array, or nothing (annotations simply never appear on first load). None of these are zero-cost, and the vision does not name which one.

**Severity: medium. The "low code cost" estimate will not survive first implementation contact.**

---

## 8. What Nobody Is Naming: Composite Houses Have Been Deferred for Nine Sprints

`synastry.ts` line 200: `house: 0, // Deferred: composite house cusps require Placidus derivation from composite Ascendant. Until computed, computeTransitAspectBrief falls to generic ASPECT_BRIEFS fallback. See feat-couple-transit-aspect-rows proposal — known gap, sprint 0011.`

That note was written in sprint 0011. This is sprint 0020. The composite chart has had `house: 0` on every planet for nine sprints.

`CoupleAdvanceTab.tsx` handles this defensively (line 699: `const natalHouse: number | null = null`). The aspect briefs shown in the couple advance transit list fall back to generic archetype phrases: "planetary energy," "shared vitality," etc. The individual advance transit list shows house-anchored sentences like "Saturn pressing on your Moon in your 7th house (partnership)." A user who reads both will notice the couple briefs are qualitatively weaker.

Sprint 0020 adds synastry axis scoring, which produces reason strings naming the synastry aspect ("and activates the bond between your Venus and their Mars"). This new layer is house-aware at the synastry level. But the underlying composite transit briefs are still house-blind. The product will have a split quality floor: relationship-specific language from synastry augment, archetype-only language from composite aspect rows. The contrast makes the archetype language look more generic by comparison.

This is not sprint 0020's problem to solve — computing composite house cusps from the composite Ascendant is a non-trivial astronomical calculation. But sprint 0020 should not add features that make the gap more visible without acknowledging that the gap exists and will eventually need to be closed. The nine-sprint deferral has accumulated enough surface area that the next sprint that adds couple advance features should put composite house computation on the explicit roadmap, not continue to defer it silently.

---

## Evaluation of the Four Sprint 0020 Candidates

### Candidate 1: Guidance field on `CoupleAdvanceTab`

Straightforward. The `SnapshotScore.guidance` field exists, the render path in `AdvanceTab` is the reference implementation. The fragility is in the guidance content: the vision specifies couple guidance must use relational language, not individual language. If the implementation simply calls the existing `ASPECT_GUIDANCE` table from `AdvanceTab.tsx`, it will produce "Face the pattern directly rather than managing around it" for a couple's Saturn challenging marker. That sentence speaks to an individual. A couple guidance table with relational framings must be explicitly written. The task spec should require this table before implementation.

Also: the couple banner currently uses `split(' ')[0]` for bolding (fragility point 6 above). Adding guidance text to the couple banner without fixing the bold logic is building on a known fragility. Fix both together.

**Verdict: ship, but require the couple guidance table to be specified in the task and fix the banner bold logic in the same task.**

### Candidate 2: Synastry axis overlay scoring

See fragility points 2 and 3. The combination weight parity (Candidate 3) must be done first — building synastry augmentation on top of `computeEnergyRating` paths produces augmented noise, not augmented signal. The midpoint design should be replaced with the correct formulation (transit within orb of either natal planet in a tight synastry pair).

Performance note: the synastry aspects list can be 50–100 entries. Pre-filtering to `orb <= 2.0` aspects before entering the snapshot loop avoids iterating the full list for each of the 52 weekly (or 37 monthly) snapshots. This filter should run once when `preCalculateCoupleSnapshots` is called, not inside `scoreCoupleSnapshot`.

**Verdict: ship, contingent on Candidate 3 first, and with the midpoint formulation corrected.**

### Candidate 3: `computeCombinedWeight` parity for couple scoring

This is not optional and is not a code quality task. It is a prerequisite for Candidate 2 and a product correctness requirement for the couple advance system standing on its own. The inconsistency between individual and couple scoring (fragility point 2) is a user-visible problem for any user who uses both tabs.

**Verdict: must ship. Prerequisite for Candidate 2. Should be listed first in sprint execution order.**

### Candidate 4: Timeline/advance coherence

The value is real — a date that shows as a power advance marker should mean something in the Timeline view. But the vision's "low code cost" estimate is wrong (fragility point 7). The state-sharing problem must be resolved. The easiest correct solution: the Timeline reads advance scores from application state (a new context field), which gets populated when the Advance tab computes its snapshots. The Timeline annotates from that state if present, shows nothing if absent. This requires lifting the snapshot cache out of the Advance tab's `useRef` into shared state — which is the architecture change the vision is not naming.

Alternatively, scope it to: the Timeline generates its own power-day heuristic (currently: 3+ events on a date) and adds the advance score label as an optional augment shown only when the advance strip has already been loaded in the same session. This avoids the state-sharing architecture change and degrades gracefully. But it means first-time Timeline viewers never see advance annotations.

**Verdict: ship the degraded version (annotate from cached data when available, nothing when not). Document the limitation explicitly. Do not trigger snapshot computation from the Timeline.**

---

## The Risk Nobody Is Naming

The cache precision asymmetry (fragility point 1) is a silent data corruption defect that will affect couple advance users in the current sprint's deliverables. Every other fragility in this analysis degrades quality or creates edge case failures. This one swaps one user's data for another user's data silently. It should be treated as a bug fix, not a code quality item, and should be verified fixed before any other couple advance features ship.

The composite house deferral (fragility point 8) is not a sprint 0020 task, but the compound effect of nine sprints of couple advance features on top of house-blind composite planets is creating a widening quality gap between individual and couple advance outputs. At some point the deferral cost exceeds the implementation cost. Sprint 0020 is not that sprint, but it is moving closer.

---

*—Nassim Taleb*

*A system that speaks with confidence about the wrong data is more damaging than a system that speaks tentatively about correct data. The cache collision and the scoring asymmetry are not polish items. They are trust items. Fix them before building on them.*
