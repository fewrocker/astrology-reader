# feat-advance-couple-tab

**Type:** Feature
**Originated by:** Jobs, Miyazaki, Taleb
**Sprint vision:** sprint-0019

## Problem / Opportunity

The Advance slider exists only in `TransitReadingPage.tsx`, which passes a single `chartData: ChartData` to `AdvanceTab`. The synastry transit page (`src/components/results/SynastryTransitPage.tsx`) has no advance slider at all — not as a tab, not as a section, not as a future stub. The page shows a GPT interpretation block, a `TransitAspectsToComposite` list, a `CurrentPlanetsTable`, and navigation buttons. Looking ahead is structurally impossible for a couple using this product today.

This matters because the question couples actually bring is not "what do our transits look like right now?" It is "when is a good week for us?" — when is the relationship's emotional center lit up, when might we be under pressure, when is this the right month for the conversation we've been avoiding. The product cannot answer any of these questions for couples. The individual advance tab answers them for individuals. The gap is exact and the feature set is well-defined.

The raw material is already computed and in app state. `SynastryTransitPage` pulls `state.synastryTransitData`, `state.birthData`, `state.partnerBirthData` from `useApp()`. The state also carries `state.chartData` (person 1's natal chart), `state.partnerChartData` (person 2's natal chart), and `state.synastryData` which contains `compositeChart: CompositeChart` (midpoint planets and angles), `synastryAspects: SynastryAspect[]` (cross-chart aspects between the two individuals), and `houseOverlay: HouseOverlay` (each person's planets in the other's houses). None of this is used for forward projection today. The transit aspects to the composite chart are computed via `buildCoupleTransitPrompt` / `calculateTransitAspects` against the composite planet list, but only for a static snapshot. There is no snapshot engine running across future positions.

Two concrete structural gaps make couple advance scoring distinct from individual advance scoring and harder:

**Composite planets have `house: 0` by design.** The comment in `src/engine/synastry.ts` at line 201 is explicit: `house: 0, // Deferred: composite house cusps require Placidus derivation from composite Ascendant.` Every composite `PlanetPosition` has `house: 0`. Any couple advance reason string that calls `getHouseTheme(compositePlanet.house)` without guarding `house > 0` will return `undefined` and throw. The individual advance tab already handles this: `src/components/reading/AdvanceTab.tsx` line 1093–1096 guards `rawHouse > 0` before passing to `computeTransitAspectBrief`. The couple scoring function must apply the same guard everywhere — but more than that, it must not rely on house context for its core signal at all, since no composite house is ever populated.

**Composite angles are phantoms when either partner's birth time is unknown.** `calculateCompositeChart` in `src/engine/synastry.ts` at line 208 computes composite angles as midpoints of the two individual charts' angles. If either person has `unknownTime: true`, their individual Ascendant is derived from noon on their birth date — a structurally valid but astronomically meaningless number. The midpoint composite Ascendant is then wrong. A couple power-day marker based on transit-to-composite-angle contact will fire on this phantom angle. The existing individual advance tab guards this with `if (!chartData.unknownTime)` at line 231 of `AdvanceTab.tsx`. The couple advance must require *both* partners to have known birth times before enabling angle-contact power markers on the composite. If either is unknown, angle-contact detection is skipped entirely.

The opportunity is real and concrete: a feature that lets a couple look at the next 36 months and see which weeks are favorable for the relationship, which months may bring friction, and where a planetary shift is arriving. Jobs' voice is precise about this: "This is the feature that makes someone show the app to their partner. 'Look at this — it found us a good week.' That is a real human moment." Miyazaki's is equally precise: "The couple advance can say: Jupiter is transiting your composite Venus while simultaneously lighting up the Venus-Mars synastry axis between you — this is one of the rarer moments when the relationship's own fortune and the two of you personally are all pointing in the same direction." The architecture to produce that sentence is present. The implementation is absent.

## Vision

A couple lands on the synastry transit page after completing a compatibility reading. They've seen the GPT interpretation. Now they want to know what's coming. Below the GPT block, there is an "Advance" section — the same visual shape as the individual advance tab, but tuned to the relationship's vocabulary.

They drag the slider to a gold marker. The banner reads: "Jupiter reaches the relationship's Venus — a rare window when shared pleasure, connection, and creative joy are all pointing in the same direction. The bond's romantic axis is lit from both ends." Beneath it, the aspect list shows which composite planet is being activated. They look at each other. One says: "Is that next month? We should plan that trip." The product did what it was supposed to do.

They drag to a red marker. The banner reads: "Saturn is pressing the relationship's Moon — an emotional pattern the bond has relied on is being tested. What you've used to feel close and settled together may not be enough for the next few weeks. The question being asked is whether the way you comfort each other is still working." This is not a warning. It is an invitation. They now know the month is not the time to add new pressure on top of an already tense situation. They adjust their plans.

They slide through a quiet stretch. No markers. The strip note reads: "A steady period for the relationship — no exceptional signals in this window." That is not "no exceptional moments detected." It is an astrological observation: the relationship is in a consolidating phase. That is information.

The couple advance does not replace the personal advance for each individual. It answers a different question: not "what is happening to me?" but "what is happening to us?" The scoring reflects that distinction — it evaluates the composite chart (the relationship as its own entity) and the synastry axis activation (the personal planets of both individuals as they relate to each other), not the individual natal charts independently. The reason strings speak in "we" and "the relationship" and "the bond" — not "your natal Moon" but "the relationship's emotional center."

The experience is warm, specific, and actionable. It tells the couple something they did not already know, and it gives them a sense of what to do with the window.

## Specifications

### 1. Data Access and Architecture

**1.1** `SynastryTransitPage` currently destructures `{ birthData, partnerBirthData, synastryTransitData, synastryTransitInterpretation, synastryTransitPeriod }` from `state`. It must also destructure `chartData`, `partnerChartData`, and `synastryData` for the couple advance feature. All three are already in app state (`appState.ts` lines 55, 66, 68). No new state fields are needed.

**1.2** A new component `CoupleAdvanceTab` is created, parallel to `AdvanceTab` in its React structure. It accepts:
```typescript
interface CoupleAdvanceTabProps {
  chart1: ChartData           // person 1 natal chart
  chart2: ChartData           // person 2 natal chart
  synastryData: SynastryData  // compositeChart, synastryAspects, houseOverlay
  period: TransitPeriod
  baseDate: Date
}
```

**1.3** `CoupleAdvanceTab` reuses `preCalculateSnapshots`'s time-stepping logic (daily/weekly/monthly intervals, noon normalization for monthly, the `AdvanceConfig` table) but calls a new `preCalculateCoupleSnapshots` function that accepts `chart1`, `chart2`, and `synastryData` in place of a single `chartData`. The snapshot loop calls `calculateTransitAspects(transitPlanets, synastryData.compositeChart.planets, period)` to produce transit aspects against composite planet positions — the same computation already used by `buildCoupleTransitPrompt` for the static snapshot.

**1.4** The `AdvanceSnapshot` type is reused without modification. The `transitAspects` field in each couple snapshot contains aspects of transiting planets to composite planets, not to either individual's natal planets. The `housedTransitPlanets` field is computed normally but used only for the chart wheel, not for house-based reason string generation (because composite planets have `house: 0`).

**1.5** The snapshot cache key for couple advance includes both birth dates and both birth times to ensure partner-switching invalidates the cache: `${period}:${baseDate.toISOString()}:${chart1.angles.ascendant.longitude.toFixed(2)}:${chart2.angles.ascendant.longitude.toFixed(2)}`.

### 2. Couple Scoring Function: `scoreCoupleSnapshot`

**2.1** A new pure function `scoreCoupleSnapshot(snapshot, prev, chart1, chart2, synastryData, period)` replaces `scoreSnapshot` in the couple advance context. It returns a `SnapshotScore` (same type as individual advance) but with couple-voice reason strings.

**2.2 Priority 1 — Composite angle contact (power):** Fires only when both `chart1.unknownTime === false` AND `chart2.unknownTime === false`. When this condition is met, check whether any `SLOW_PLANETS_FOR_BANNER` transit planet falls within `orbs.angleContact` of the composite chart's `ascendant.longitude` or `midheaven.longitude`. If triggered, return category `'power'` with intensity derived from the orb. The power reason string uses couple voice: `"${planet} reaches the relationship's Ascendant — a significant crossing for how this bond presents itself to the world."` Do not evaluate composite angles when either partner's birth time is unknown.

**2.3 Priority 2 — Station crossing (shift):** Station detection is identical to the individual advance: compare `snapshot.retrogrades` with `prev.retrogrades` to detect direction changes. When a station is detected, shift reason strings use couple voice: `"${planet} stations ${direction} — the relationship feels this shift; ${stationBrief} is the territory."` The `stationBrief` is drawn from `TRANSIT_RETROGRADE[planet].brief` in `src/data/interpretations/retrogrades.ts`, which already exists and is used by the individual advance tab's retrograde section.

**2.4 Priority 3 — Composite relationship planet activation (favorable/challenging):** This is the core of couple advance scoring. Identify which composite planets are activated by tight applying transit aspects. The relationship-sensitive planets in priority order are: composite Venus, composite Moon, composite Sun, composite Mars, composite Mercury, composite Jupiter, composite Saturn. For each activated planet, compute a weight using the existing `PLANET_WEIGHT` table applied to the *composite* planet being hit (not the transit planet). A composite Venus activation outweighs a composite Saturn activation for the "favorable" category; the reverse is true for "challenging." Filter to tight applying aspects only (`a.applying && a.orb <= orbs.applyingTight`) from non-asteroid transit planets. Require at least `orbs.energyMinAspects` tight applying aspects of the same nature to fire a favorable or challenging marker (same threshold as individual advance).

**2.5 Synastry axis overlay check:** After detecting tight applying transit aspects to composite planets, run a second check: for each tight applying transit planet, compute whether that transit planet's longitude falls within 3° of any `synastryAspects` entry's midpoint. A "synastry axis activation" occurs when the transit planet is within orb of a natal planet in person 1's chart *and* that same natal planet is part of a tight synastry aspect with a planet in person 2's chart. Concretely: if transit Jupiter is within `applyingTight` orb of composite Venus, check whether composite Venus longitude is close to any `synastryAspect` that involves Venus from either chart. If yes, set a flag `synastryAxisActivated: boolean` and store the participating synastry aspect for use in the reason string. This flag upgrades the intensity of the snapshot score by 0.15 (capped at 1.0) and enriches the reason string.

**2.6 Combination intensity:** When two or more composite relationship planets are simultaneously activated by tight applying aspects of the same nature, the intensity is computed as the normalized sum of `PLANET_WEIGHT[transitPlanet]` values across the tight applying aspects (same approach as the individual advance combination scoring proposed in sprint 0019). A single Jupiter trine to composite Venus produces moderate intensity. Jupiter trine composite Venus *plus* Venus trine composite Moon produces high intensity. The reason string for combinations names both activations in a single unified statement rather than reporting only the heaviest.

### 3. Couple Reason String Vocabulary

**3.1 Voice rule:** All couple advance reason strings speak in the voice of the relationship, not of either individual. The standard individual voice "your natal Moon" becomes "the relationship's emotional center." "Your 7th house" has no equivalent (composite houses are not computed); instead use the composite planet's archetype: "the bond's Venus" or "the relationship's romantic axis." The personal pronoun "your" is never used in couple advance reason strings.

**3.2 Composite planet archetypes for reason strings:** Each composite planet carries a relational noun phrase used in reason string construction:
- composite Sun: "the relationship's core identity and shared purpose"
- composite Moon: "the relationship's emotional center" or "the bond's inner world"
- composite Venus: "the relationship's romantic axis" or "the bond's capacity for joy and connection"
- composite Mars: "the relationship's drive and desire"
- composite Mercury: "the bond's communication channel"
- composite Jupiter: "the relationship's expansive potential"
- composite Saturn: "the bond's structures and commitments"
- composite Uranus: "the relationship's axis of change and independence"
- composite Neptune: "the bond's idealism and spiritual depth"
- composite Pluto: "the relationship's transformative core"

**3.3 Favorable reason string pattern:**
```
${transitPlanet} ${verbPhrase} ${compositePlanetPhrase} — ${life experience for the couple}.
```
Example (Jupiter trine composite Venus): "Jupiter opens to the relationship's romantic axis — a window when shared pleasure, connection, and joy are genuinely supported. This is a week the bond's capacity for warmth is lit from the outside."

Example (synastry axis also activated): "Jupiter opens to the relationship's romantic axis while also touching the Venus-Mars synastry axis between you — one of the rarer moments when the relationship's own chart and both of your personal charts are pointing in the same favorable direction."

**3.4 Challenging reason string pattern:**
```
${transitPlanet} ${challengeVerb} ${compositePlanetPhrase} — ${what the couple will feel and what it asks}.
```
Example (Saturn square composite Moon): "Saturn presses the relationship's emotional center — a pattern of closeness the bond has relied on is being tested. What has usually worked to feel settled together may not be enough for this period. The question being asked is honest: is the way you comfort each other still working?"

**3.5 Shift reason string pattern:**
```
${planet} stations ${direction} — the relationship feels this shift in [relevant dimension]. ${brief from TRANSIT_RETROGRADE}.
```
Example (Venus stations retrograde): "Venus stations retrograde — the relationship feels this shift in how it values and expresses affection. What has felt natural in the romantic dimension is pausing to be reconsidered. This is not a disruption; it is a review."

**3.6 Power reason string pattern (composite angle contact):**
```
${planet} ${verb} the relationship's ${angle name} — ${what this means for the bond as a public entity}.
```
Example: "Saturn reaches the relationship's Midheaven — a significant moment for how this bond is recognized and defined in the world. Decisions about commitment, shared purpose, or public identity are arriving with weight."

**3.7 No house language in couple advance reason strings.** Because composite planets have `house: 0`, no reason string should reference a house number or house theme. The composite planet archetype phrases defined in spec 3.2 are the sole locating language. Any code path that would call `getHouseTheme(compositePlanet.house)` must guard `house > 0` first and fall back to the archetype phrase when the house is 0.

### 4. Unknown Birth Time Guards

**4.1 Both times known:** Full feature available — composite angle contact power markers enabled, relationship planet activation scoring enabled, synastry axis overlay check enabled.

**4.2 One or both birth times unknown:** Composite angle contact power markers disabled entirely. The overview strip shows no power markers. The individual advance tab's existing annotation "Birth time unknown — angle-contact power days not available" is adapted for couple voice: "One or both birth times unknown — composite angle markers not available." Favorable and challenging markers based on composite relationship planet activation remain enabled (they do not use house data or angles). Shift markers remain enabled.

**4.3 Both times unknown:** Same as 4.2. The relationship planet activation scoring does not depend on house data at all, only on composite planet longitudes (which are valid as midpoints of natal longitudes regardless of birth time), so favorable and challenging markers still fire.

### 5. Component Placement in SynastryTransitPage

**5.1** `CoupleAdvanceTab` is rendered as a collapsible section in `SynastryTransitPage`, inserted after the GPT interpretation block and before `CurrentMoonWidget`. The section header is "Look Ahead" or "Advance" with a subtitle: "Notable moments ahead for this relationship."

**5.2** The period used for couple advance is `synastryTransitPeriod` (already in state — the same period the user selected for their couple transit reading). The base date is `new Date()` at render time, same as the individual advance tab.

**5.3** The `CoupleAdvanceTab` does not render if `synastryData` is null. If either `chartData` or `partnerChartData` is null, the component also does not render. These are existing preconditions for the synastry transit page to display at all.

**5.4** The overview strip displays the same visual as individual advance: a horizontal bar with colored marker dots. The "Quiet period" message when no markers are present uses couple voice: "A steady period for the relationship — no exceptional signals in this window."

**5.5** The banner below the slider renders the couple reason string using the same CSS structure as the individual advance banner (`src/components/reading/AdvanceTab.tsx` lines 1019–1054) — same color scheme, same left-border accent, same icon (`✦` for power/favorable, `⚠` for challenging, `◆` for shift).

**5.6** The aspect list below the banner shows transit aspects to composite planets, reusing the `TransitAspectsToComposite` component already defined in `SynastryTransitPage`. The brief strings use the existing pattern of replacing "your" with "the relationship's" (line 40 of `SynastryTransitPage.tsx`).

**5.7** The chart wheel is not shown in the couple advance section. The composite chart wheel is not implemented. Show only the aspect list and planet positions table for the selected snapshot, without the `ChartWheel` component.

**5.8** Prev/Next navigation buttons and the "Notable moments" overview strip are included, identical in behavior to the individual advance.

### 6. Density Cap and Category Diversity

**6.1** The 20% density cap applies to couple advance snapshots with the same per-period maximums as individual advance (monthly: 7 of 36, weekly: 10 of 52).

**6.2** The category diversity rule from sprint 0019's individual advance upgrade applies here too: if the scored set contains at least one marker from each non-neutral category (power, favorable, challenging, shift), the cap should prefer including one representative of each category before filling remaining slots by intensity. This prevents a long Jupiter-in-trine-to-composite-Venus stretch from filling all 7 monthly slots with green favorable markers while a single Saturn-challenging-composite-Moon marker gets dropped.

**6.3** Hysteresis post-processing: apply the same hysteresis pass as individual advance — if two consecutive non-neutral snapshots of the same category bracket a neutral snapshot and the trigger aspect's orb has moved less than `MARKER_HYSTERESIS_ORB` (0.5°), inherit the bracketing category. This smooths flickering near stations.

### 7. Synastry Axis Activation Detail

**7.1** The synastry axis check is a secondary signal, not a primary scoring gate. A couple advance snapshot can fire a favorable or challenging marker without any synastry axis activation. When activation is detected, it modifies the intensity and enriches the reason string; it does not change the category.

**7.2** Synastry axis activation algorithm: For each tight applying transit aspect to a composite planet, extract the composite planet's longitude. Look through `synastryData.synastryAspects` for any aspect where `person1Planet` or `person2Planet` has a natal longitude within 5° of the composite planet's longitude. If found, the transit is also activating a synastry axis. Store the highest-weight matching synastry aspect (by `PLANET_WEIGHT` of the synastry planet pair) for use in the reason string.

**7.3** The synastry axis check requires access to the individual natal planet longitudes, which are in `chart1.planets` and `chart2.planets`. These are passed as `chart1` and `chart2` to `scoreCoupleSnapshot`. No new data structures are required.

**7.4** When a synastry axis is activated, the reason string appends a second clause: "...while also touching the [person1Planet]-[person2Planet] synastry axis between you." The synastry axis name uses planet names only, not house references, because individual house data may not be available for one or both partners.

### 8. Relationship Between CoupleAdvanceTab and AdvanceTab

**8.1** `CoupleAdvanceTab` is a new component, not a modification of `AdvanceTab`. `AdvanceTab` accepts a single `chartData: ChartData` and operates against individual natal planets. The couple version requires fundamentally different inputs and a different scoring function. Do not add conditional props or overloaded signatures to `AdvanceTab` — the components remain separate.

**8.2** `CoupleAdvanceTab` reuses from `AdvanceTab` via import:
- `MarkerCategory`, `SnapshotScore`, `MARKER_COLORS`, `CATEGORY_LABELS`, `CATEGORY_HALO`, `ADVANCE_CONFIG`, `ORB_THRESHOLDS`, `MARKER_HYSTERESIS_ORB`, `PLANET_WEIGHT`, `detectAngleContact`, `SLOW_PLANETS_FOR_BANNER`, `ASPECT_VERB_BANNER`, `CATEGORY_PRIORITY`
- `MarkerDot`, `OverviewStrip`, `MarkerTooltip` (the visual subcomponents are identical)

**8.3** `CoupleAdvanceTab` implements its own: `scoreCoupleSnapshot`, `buildCoupleAspectReason`, `buildCoupleShiftReason`, `buildCouplePowerReason`, `preCalculateCoupleSnapshots`. These functions are not shared with `AdvanceTab` because the data shapes and voice are different.

**8.4** The `AdvanceSnapshot` interface is reused without modification. The `transitAspects` in couple snapshots contain `TransitAspect` objects where `natalPlanet` refers to a composite planet name and `natalHouse` is always 0 or null. Code that reads `natalHouse` for house-anchored language must guard against this.

### 9. Interpretation Data for Couple Advance

**9.1** Composite planet archetype phrases (spec 3.2) are defined as a constant lookup table in `CoupleAdvanceTab.tsx`:
```typescript
const COMPOSITE_PLANET_PHRASES: Partial<Record<string, { relationship: string; romantic: string; brief: string }>> = {
  Venus:   { relationship: "the relationship's romantic axis", romantic: "the bond's capacity for joy and connection", brief: "shared pleasure, warmth, and beauty" },
  Moon:    { relationship: "the relationship's emotional center", romantic: "the bond's inner world", brief: "shared feeling and emotional safety" },
  Sun:     { relationship: "the relationship's core identity", romantic: "the bond's sense of shared purpose", brief: "shared vitality and direction" },
  Mars:    { relationship: "the relationship's drive and desire", romantic: "the bond's assertive energy", brief: "shared momentum and physical charge" },
  Mercury: { relationship: "the bond's communication channel", romantic: "the relationship's shared mind", brief: "how you think and speak together" },
  Jupiter: { relationship: "the relationship's expansive potential", romantic: "the bond's capacity for growth and joy", brief: "shared optimism and abundance" },
  Saturn:  { relationship: "the bond's structures and commitments", romantic: "what holds the relationship together", brief: "shared responsibility and long-term shape" },
  // outer planets use archetype phrases without romantic variant
  Uranus:  { relationship: "the relationship's axis of change", romantic: "the bond's need for freedom and novelty", brief: "shared disruption and evolution" },
  Neptune: { relationship: "the bond's idealism and depth", romantic: "the relationship's spiritual dimension", brief: "shared dreams and dissolution" },
  Pluto:   { relationship: "the relationship's transformative core", romantic: "what fundamentally changes between you", brief: "shared depth and irreversible growth" },
}
```

**9.2** Transit verb phrases for couple advance are drawn from the same `ASPECT_VERB_BANNER` table already defined in `AdvanceTab.tsx` (conjunction: 'reaches', opposition: 'opposes', square: 'presses', trine: 'flows through', sextile: 'opens to', etc.). The couple reason string builder uses these verbs identically.

**9.3** For the synastry axis activation clause in reason strings, the synastry aspect vocabulary from `SYNASTRY_ASPECT_BRIEFS` in `src/data/interpretations/synastryAspectBriefs.ts` is *not* used verbatim in the couple advance reason strings. It is the quality reference, not the content source. The couple advance reason strings are shorter (banner context) and forward-looking (what is about to happen), while synastry briefs are static (what the aspect means as a fixed contact). A short custom template per pair type is used instead: `"the [p1Planet]-[p2Planet] synastry axis"` with no brief expansion in the tooltip.

**9.4** For the banner expanded context, the `guidance` field proposed in sprint 0019 for individual advance is also added to couple advance `SnapshotScore`-equivalent. Couple guidance examples:
- Favorable (Jupiter to composite Venus): "This is a window for shared experiences that feel genuinely enjoyable — travel, creative projects together, or simply setting time aside to celebrate what the relationship is. The energy supports pleasure-taking rather than productivity."
- Challenging (Saturn to composite Moon): "The emotional foundation of the bond is under pressure this period. Trying to proceed as normal may not settle the tension. The period rewards honesty about whether the emotional dynamic between you is still meeting both people's needs."
- Shift (Venus retrograde): "This is a review period for the relationship's values and affections — not a time to make permanent decisions about the bond, but a time to understand what each of you actually needs from it."

### 10. UI States and Edge Cases

**10.1 No synastryData:** If `state.synastryData` is null (synastry reading not yet completed), `CoupleAdvanceTab` renders nothing. This can happen if a user navigates to `synastry-transit-results` without first completing a compatibility reading — an unusual but possible state. Guard: `if (!synastryData) return null`.

**10.2 No composite planets:** If `synastryData.compositeChart.planets.length === 0`, the snapshot engine has nothing to evaluate. `preCalculateCoupleSnapshots` returns an array of all-neutral snapshots. The overview strip shows the quiet-period message. This edge case should not occur in practice but must not crash.

**10.3 Identical birth dates:** Two people with the same birth date will have a composite chart identical to their individual charts. The scoring will fire correctly, but the reason strings remain couple-voiced. No special handling required.

**10.4 Period mismatch:** If `synastryTransitPeriod` is null, `CoupleAdvanceTab` does not render. This is already guarded by the `SynastryTransitPage` early return `if (!synastryTransitData || !synastryTransitPeriod) return null`.

**10.5 Retrograde composite transit aspects:** The `applying` flag for transit aspects against composite planets is computed by `calculateTransitAspects` in `src/engine/transits.ts` using the same `dailyMotion` logic as for individual transits. Retrograde transit planets near a station produce the known `applying` flag instability described in Taleb's voice. The hysteresis pass mitigates this for couple snapshots exactly as for individual snapshots.

**10.6 Fast planets at monthly resolution:** At monthly resolution, fast planets (Moon, Mercury, Sun, Venus) can appear with tight orbs simply because the snapshot is taken at a moment when they happen to aspect a composite planet. The same fast-planet noise problem that affects individual advance scoring affects couple advance. The `PLANET_WEIGHT` combination intensity formula naturally down-weights fast-planet-only configurations, because a Mercury sextile to composite Jupiter produces a much lower planet-weight sum than a Saturn square to composite Moon. This is not a complete fix but substantially reduces false positives.

**10.7 Quiet composite period:** If no tight applying aspects to composite relationship planets are found across 36 monthly snapshots (which can happen if the composite chart is not strongly activated by any slow transit in the window), all snapshots score neutral. The overview strip displays the couple-voice quiet message. This is a valid and correct output, not a bug.

**10.8 Tooltip size:** Couple reason strings are designed to the same length budget as individual advance reason strings — a single sentence of 80–120 characters for the tooltip, a fuller sentence of 120–180 characters for the banner. The `guidance` field, if implemented, appears only in the banner, not the tooltip.

### 11. Acceptance Checks

- [ ] A couple where both birth times are known sees power markers (gold diamond) when a slow planet crosses within the angle-contact orb of the composite Ascendant or Midheaven.
- [ ] A couple where at least one birth time is unknown sees no power markers. The overview strip annotation reads correctly.
- [ ] Favorable markers (green circle) fire when two or more tight applying harmonious transit aspects to composite relationship planets are present at the same snapshot.
- [ ] Challenging markers (red circle) fire when two or more tight applying challenging transit aspects to composite relationship planets are present.
- [ ] Shift markers (blue diamond) fire when a planet changes retrograde direction between consecutive snapshots.
- [ ] When a synastry axis is activated (a transit planet is within orb of both a composite planet and a synastry aspect between the two individuals), the reason string includes the synastry axis clause.
- [ ] All reason strings use "the relationship's", "the bond's", or the composite planet archetype phrase. No reason string contains "your natal" or "your [planet]."
- [ ] When composite planets have `house: 0`, no house theme lookup is attempted; no runtime error occurs.
- [ ] The density cap keeps at most 7 markers for a 36-month monthly view. When markers of multiple categories are present in the scored set, the final visible set includes representatives of each non-neutral category present.
- [ ] The overview strip quiet-period message reads "A steady period for the relationship — no exceptional signals in this window." (not the individual-voice "no exceptional moments detected").
- [ ] Dragging the slider to a marker and pressing Prev/Next navigation correctly moves between couple markers.
- [ ] Switching between daily, weekly, and monthly periods (by navigating back to period selection and re-entering the couple transit page) produces appropriately different marker densities.
- [ ] `CoupleAdvanceTab` does not render if `synastryData`, `chartData`, or `partnerChartData` is null.
- [ ] No console errors during snapshot computation for any combination of known/unknown birth times.

## Out of Scope

- Computing composite house cusps from the composite Ascendant. This is noted as deferred technical debt in `synastry.ts` (line 201) and tagged in a prior proposal. Couple advance reason strings are designed to work correctly without house context — they use composite planet archetype phrases instead.
- Showing the composite chart wheel inside `CoupleAdvanceTab`. The chart wheel in individual advance requires `ChartData` with proper house cusps. The composite chart has `house: 0` for all planets and no house cusps array. Displaying the composite wheel is a separate feature requiring composite house computation.
- Individual advance scoring for each partner inside the couple advance tab. The couple advance evaluates the relationship entity (composite chart) and cross-chart activation (synastry aspects). Each partner's personal advance remains on their individual transit page.
- GPT-generated couple advance interpretations. The couple advance uses algorithmic reason strings, not GPT. Adding GPT to the advance layer is a separate proposal.
- Composite house computation (Placidus derivation from composite Ascendant). Marked as deferred in `synastry.ts` and requires its own proposal.
- Solar arc or secondary progression scoring in the couple advance. Only real-time transits to the composite are evaluated.
- Filtering which composite planets count as "relationship-sensitive" beyond what is specified in spec 2.4. All ten composite planet positions are eligible for activation scoring, weighted by the `PLANET_WEIGHT` table.
- Replacing or modifying the individual `AdvanceTab` component. The couple advance is additive.

## Open Questions

1. **Where exactly in `SynastryTransitPage` does `CoupleAdvanceTab` appear?** Spec 5.1 places it after the GPT interpretation block and before `CurrentMoonWidget`. Is this the right position? The alternative is after the transit aspect list, closer to the data. The answer affects whether the advance tab is seen before or after the user reads the GPT text.

2. **Should `CoupleAdvanceTab` use the same `synastryTransitPeriod` as the static reading, or offer its own period selector?** Using the same period avoids a new UI control but limits couples to whatever period they chose for the static reading. A separate period dropdown inside the advance section would be more flexible but adds complexity. The individual `AdvanceTab` inherits the period from `TransitReadingPage`'s tab selector.

3. **Is `synastryAxisActivated` worth implementing in sprint 0019, or should couple advance ship first with composite-only scoring and synastry axis activation come in a follow-up?** The composite-only path (spec 2.4) is complete and independently useful. The synastry axis overlay check (spec 2.5 and 7.x) adds meaningful specificity but requires cross-referencing two additional data structures and enriching the reason string. Taleb's voice warns against building complex multi-signal scoring without validating the simpler path first. Recommended: ship composite-only scoring in sprint 0019, defer synastry axis activation to sprint 0020.

4. **The `guidance` field on `SnapshotScore` (spec 9.4) is proposed in the individual advance upgrade as well.** If the individual advance upgrade ships `guidance` in sprint 0019, couple advance can populate it. If the individual upgrade slips, should couple advance still add `guidance` to its couple-specific SnapshotScore? Or should it wait for the shared field to land first? The dependency should be resolved before implementation begins.

5. **Composite planet archetype phrases (spec 3.2 and 9.1) are defined as constants in `CoupleAdvanceTab.tsx`.** Should they live in `src/data/interpretations/` as a standalone data file (e.g., `compositePlanetPhrases.ts`) for future reuse? The interpretation data pattern in this codebase consistently lives in `src/data/interpretations/` — keeping couple advance phrase data there would be consistent. But it is a small lookup table and could reasonably live inline for now.

6. **Does the 5° longitude proximity threshold for synastry axis detection (spec 7.2) produce too many false activations?** A 5° window means that if person 1's Venus is at 12° Taurus and the composite Venus is at 15° Taurus (a plausible midpoint result), every transit within orb of composite Venus would also activate the person 1 Venus-to-person 2 Mars synastry axis. Is this desirable or will it make synastry axis activation feel too common? The threshold should be validated against real chart data before shipping.

## Outcome — sprint-0019-task-0007 (completed 2026-05-16)

### What was built

**`src/components/reading/CoupleAdvanceTab.tsx`** — New standalone component (spec 8.1 confirmed: not a modification of `AdvanceTab`). Implements:
- `preCalculateCoupleSnapshots`: time-stepping loop (daily/weekly/monthly with noon normalization) computing transit aspects against composite chart planets via `calculateTransitAspects(transitPlanets, synastryData.compositeChart.planets, period)`.
- `scoreCoupleSnapshot`: priority-ordered scoring (power → shift → favorable → challenging) with all Taleb guards enforced:
  - Composite house: 0 guard — `natalHouse` is set to `null` everywhere in couple aspect briefs, no `getHouseTheme` call is ever attempted.
  - Angle-contact power markers: require `chart1.unknownTime === false && chart2.unknownTime === false` before checking composite ASC/MC.
- `buildCouplePowerReason`, `buildCoupleAspectReason`, `buildCoupleShiftReason` — couple-voice reason strings using `COMPOSITE_PLANET_PHRASES` table (defined inline per open question 5 resolution).
- `COMPOSITE_PLANET_PHRASES` lookup table for all 10 composite planets.
- Density cap with category diversity (spec 6.2): when multiple non-neutral categories are present in the scored set, one representative per category is guaranteed in the final visible set before filling remaining slots by intensity.
- Hysteresis post-processing pass (identical to individual advance).
- Cache key includes both chart ascendant longitudes: `${period}:${baseDate.toISOString()}:${chart1.angles.ascendant.longitude.toFixed(2)}:${chart2.angles.ascendant.longitude.toFixed(2)}`.
- `OverviewStrip` with couple-voice quiet message ("A steady period for the relationship — no exceptional signals in this window.") and unknown-time annotation ("One or both birth times unknown — composite angle markers not available.").
- `<style>` block defining `marker-anim-*` keyframe classes (same names as AdvanceTab, which is not rendered on SynastryTransitPage — no conflict).
- No chart wheel rendered (spec 5.7 confirmed).

**`src/components/reading/AdvanceTab.tsx`** — Added `export` to all reusable pieces required by CoupleAdvanceTab (spec 8.2): `AdvanceSnapshot`, `AdvanceConfig`, `ADVANCE_CONFIG`, `MARKER_COLORS`, `CATEGORY_LABELS`, `CATEGORY_HALO`, `ORB_THRESHOLDS`, `MARKER_HYSTERESIS_ORB`, `SLOW_PLANETS_FOR_BANNER`, `ASPECT_VERB_BANNER`, `PLANET_WEIGHT`, `CATEGORY_PRIORITY`, `detectAngleContact`, `MarkerDot`, `OverviewStrip` (with new optional `quietMessage?` and `unknownTimeAnnotation?` props), `MarkerTooltip`. No behavioral changes to existing individual advance logic.

**`src/components/results/SynastryTransitPage.tsx`** — Added destructuring of `chartData`, `partnerChartData`, `synastryData` from state. Added stable `baseDate` via `useMemo(() => new Date(), [])`. Added "Look Ahead" section after GPT interpretation block, before `CurrentMoonWidget`, guarded by `chartData && partnerChartData && synastryData`.

### Open questions resolved

1. **Placement**: Implemented after GPT interpretation, before `CurrentMoonWidget` (spec 5.1). Resolved: couples see the advance before the static data — consistent with the vision of the feature being a primary forward-looking element.
2. **Period**: Uses `synastryTransitPeriod` from state (same as the static reading). Resolved: no extra UI control needed; period selector is inherited.
3. **Synastry axis activation** (spec 2.5 / 7.x): **Deferred to sprint 0020**. Shipped composite-only scoring. Taleb's recommendation followed: validate simpler path first.
4. **`guidance` field** (spec 9.4): **Deferred**. The individual advance upgrade in sprint 0019 (task-0006) did not add a `guidance` field to `SnapshotScore`. Couple advance waits for the shared field to land.
5. **Composite planet phrase location**: Resolved as inline in `CoupleAdvanceTab.tsx` — small lookup table, no cross-file reuse needed yet.
6. **Synastry axis threshold** (spec 7.2): Moot since synastry axis activation was deferred (open question 3 resolution).

### Specs deferred

- **Spec 2.5 / 7.x — Synastry axis overlay check**: Not implemented. Deferred to sprint 0020 per the card's own open question 3 recommendation. The composite-only path is complete and independently useful.
- **Spec 9.4 — `guidance` field on SnapshotScore**: Not added. Depends on individual advance upgrade landing the shared field first.

### Build status

Zero TypeScript errors. Clean `npm run build` in worktree. Bundle includes `CoupleAdvanceTab` in the main chunk.
