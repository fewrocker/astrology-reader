# Sprint 0021 — Vision

## Sprint Focus

Sprint 0021 is a consolidation and deepening sprint. The advance engine, couple scoring, solar return preview, and transit timeline have all shipped — now they must be made internally consistent, surfaced more beautifully, and extended in directions that improve daily-use value rather than adding new infrastructure. Concretely: fix the deferred intensity divergence in the couple advance path, deepen the Solar Return reading surface, and find one or two places in the product where insightful prose, visual refinement, or small precision fixes would meaningfully raise what users actually experience when they open the app.

---

## Why Now

Five sprints of advance-engine work have left two classes of debt: (1) a known scoring inconsistency in `CoupleAdvanceTab` where the gate uses `computeCombinedWeight` but intensity still derives from `computeEnergyRating` — a silent divergence from `AdvanceTab` identified in the sprint-0020 deferred note; and (2) surfaces that shipped feature-complete but without interpretive depth (the Solar Return reading is static prose with no house-by-house briefs beyond Sun/Moon; the Today page is functional but thin). The guidelines call for "more round, reliable, insightful, and beautiful" — which maps precisely to: close the couple advance intensity gap (reliable), deepen what the Solar Return reading tells its user (insightful), and look at visual and prose polish across one or two well-chosen surfaces (round and beautiful). This is the right sprint for consolidation because all the infrastructure to do it already exists; no new engine primitives are needed.

---

## Where to Look

### 1. Deferred fix — couple advance intensity parity (must ship)

**File:** `/projects/astrology-reader/src/components/reading/CoupleAdvanceTab.tsx`

The gate in Priorities 2–4 of `scoreCoupleSnapshot` correctly uses `computeCombinedWeight` and `COMBINATION_WEIGHT_THRESHOLD`, but `baseIntensity` at lines 555, 619, and 669 is still `Math.abs(rating.score - 3) / 2` — derived from `computeEnergyRating`, not `combinedWeight`. In `AdvanceTab`, intensity for the same priorities is `Math.min(1, combinedWeight / COMBINATION_WEIGHT_NORMALIZE)`. The import of `COMBINATION_WEIGHT_NORMALIZE` is absent from `CoupleAdvanceTab` entirely. This means a Saturn+Pluto cluster that passes the gate can produce arbitrarily low or high intensity depending on the old energy rating rather than the weight of the slow-planet constellation. Fix: import `COMBINATION_WEIGHT_NORMALIZE`, replace the three `baseIntensity` derivations with `Math.min(1, combinedWeight / COMBINATION_WEIGHT_NORMALIZE)`, remove the now-unnecessary `computeEnergyRating` import and `rating` variable.

### 2. Solar Return reading depth

**File:** `/projects/astrology-reader/src/components/results/SolarReturnPage.tsx`

The Solar Return page ships the advance preview strip (sprint-0020), the bi-wheel chart, the planet table, and GPT interpretation. What it lacks is house-by-house SR interpretation depth: the SR planets are already placed in houses; static briefs for SR planets in those houses already exist in `PLANET_IN_HOUSE` but only Sun and Moon are shown. A "This Year's Themes" section surfacing all significant SR placements (SR planets in angular houses — 1, 4, 7, 10 — with their `PLANET_IN_HOUSE` briefs, plus SR Ascendant and MC sign meaning) would make the reading dramatically more useful without any new data. The SR static reading at the bottom currently shows only Sun/Moon briefs (the `SRStaticBriefs` component, lines 352–388); expanding this to all major planets in angular or notable houses would be low-cost and high-value. Also consider: the SR advance preview (`SolarReturnAdvancePreview`) is at the bottom of the Reading tab — evaluate whether it should move higher to make the year's timeline immediately visible when the tab loads.

### 3. Today page — advance-powered daily intensity signal

**File:** `/projects/astrology-reader/src/components/reading/TodayPage.tsx`

The Today page computes transit aspects and an energy rating but presents no connection to the advance marker system. A user who has a natal chart sees their daily snapshot independently of whether today is a "power day" or "challenging period" as scored by the advance engine. A lightweight integration — pre-scoring today's offset in the existing `preCalculateSnapshots` infrastructure and surfacing the category label alongside the energy bar — would make the Today page feel like it belongs to the same product as the Advance tab. This is low-code: the snapshots for the current period may already be in cache if the user visited Advance today. The category label and reason string from the scored snapshot could appear as a small banner at the top of the Today reading.

### 4. Visual and prose polish candidates

Evaluate one or two of the following; do not attempt all:

- **Aspect row interpretations on the Synastry page** (`/projects/astrology-reader/src/components/results/SynastryPage.tsx`): synastry aspect rows already have briefs via `synastryAspectBriefs.ts`, but the expand/collapse pattern for showing house-aware context (as done for transit aspect rows in sprint-0019) may not be fully realized.
- **Home screen Daily Snapshot card visual depth** (`/projects/astrology-reader/src/components/reading/DailySnapshotCard.tsx`): the card shows moon phase, personal day, and a brief GPT nudge. The marker category for today (from the advance engine, if a natal chart exists) would add a signal layer that the home screen currently lacks.
- **Solar Return bi-wheel readability** (`/projects/astrology-reader/src/components/chart/SolarReturnBiWheel.tsx`): compare visual treatment to the main chart wheel — the bi-wheel may benefit from consistency improvements (glow, tooltip, label styling) introduced in F17.

---

## Quality Bar

"Deep, not shallow" for sprint 0021 means:

- **The couple advance intensity fix must produce measurable parity** — after the fix, a Saturn+Pluto cluster on a couple advance marker should produce the same relative intensity as the same constellation on an individual advance marker. Verify by comparing intensity values for identical skies on both paths.
- **SR house briefs must be selective, not exhaustive** — showing every planet in every house would flood the reading. Prioritize angular houses (1, 4, 7, 10) and luminaries; skip fast planets in cadent houses that carry little annual weight. The SR reading should feel curated, not comprehensive.
- **Today page integration must not force a recalculation** — if the advance snapshots are already in the component-level cache (from an Advance tab visit), the Today page should read from that cache, not re-run `preCalculateSnapshots`. If no cache exists, the signal is simply absent rather than forcing a blocking computation on Today page load.
- **Polish tasks must land on surfaces that a daily user actually sees** — the Home screen and Today page are opened every time the app is used; the SR bi-wheel is opened occasionally. Weight effort accordingly.

---

## What This Sprint Is NOT

- Not a new scoring primitive or advance engine change beyond the couple intensity fix — the priority ladder, `computeCombinedWeight`, density cap, category diversity, and synastry axis augmentation are all done.
- Not a new GPT prompt for the advance system — advance markers remain rule-based. No new GPT surfaces for couple or SR advance output.
- Not a full Solar Return advance tab with slider and aspect list — sprint-0020 shipped the overview strip and Prev/Next; sprint-0021 deepens the static reading layer, not the advance slider.
- Not new product pages, form changes, or authentication/subscription changes.
- Not numerology advance or numerology page depth — the numerology surface is stable; this sprint works on the astrology side.
- Not a refactor of `AdvanceTab` itself — the generic `runAdvancePreCalculation` abstraction shipped in sprint-0020 is the final form; no further structural changes to the core advance engine.
