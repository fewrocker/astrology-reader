# Sprint 0020 — Vision

## Sprint Focus

Sprint 0020 completes the couple advance feature and brings the `CoupleAdvanceTab` to full parity with `AdvanceTab`, then turns attention to two genuinely new product areas: synastry axis overlay scoring (activating cross-chart aspect patterns in the couple advance engine) and the first forward-looking advance capability for the Solar Return page. The advance system has been the main investment axis for five sprints; this sprint finishes its couple layer and looks for the next surface that will reward the same depth.

---

## Where to Look

### 1. Deferred from Sprint 0019 — must ship

**`guidance` field on `CoupleAdvanceTab`**
- File: `/projects/astrology-reader/src/components/reading/CoupleAdvanceTab.tsx`
- The `SnapshotScore.guidance` field was added to the shared type in sprint-0019 and is fully rendered in `AdvanceTab`'s banner (second paragraph, `text-mystic-muted/80` style). `CoupleAdvanceTab` does not yet populate or render it — the banner renders only `categoryBanner.split(' ')[0]` as bold with no guidance paragraph.
- Work: add `guidance?: string` return values to `buildCouplePowerReason`, `buildCoupleAspectReason`, `buildCoupleShiftReason`; render the guidance paragraph in the banner block (mirror the `AdvanceTab` pattern exactly — the field and render path already exist there as a reference).

**Synastry axis overlay scoring**
- Files: `/projects/astrology-reader/src/components/reading/CoupleAdvanceTab.tsx`, `/projects/astrology-reader/src/engine/synastry.ts`
- Current state: `scoreCoupleSnapshot` evaluates transiting planets against **composite chart positions only**. Synastry aspects (Person 1 planet ↔ Person 2 planet) are computed in `synastryData.synastryAspects` (static) and available in the component, but the forward-looking scorer ignores them entirely.
- What "synastry axis activation" means: a transiting planet crossing a degree that is simultaneously significant in the synastry grid — e.g. transiting Saturn at the degree of a natal Venus-Mars synastry conjunction — is more significant than the composite hit alone. The scorer should optionally weight snapshots where a transiting slow planet is within a tight orb of a sensitive synastry axis degree (midpoint of a tight synastry aspect pair, or the exact degree of a tight cross-chart aspect).
- This is architecturally additive: the existing priority ladder stays; a new sub-check within Priority 1 (power) or as a Priority 1.5 augment adds intensity when a transit also activates a synastry axis.
- Do not attempt a full synastry-axis detection framework in one sprint — scope to a focused augment: if the transiting planet's degree is within `angleContact` orb of a synastry aspect's midpoint degree AND that synastry aspect has `orb <= 2.0`, increase the intensity of the power/favorable/challenging score by a capped multiplier and add a relationship-specific reason suffix ("and activates the bond between [Person1Planet] and [Person2Planet]").

### 2. New area — Solar Return advance preview

- File: `/projects/astrology-reader/src/components/results/SolarReturnPage.tsx`
- Current state: The Solar Return page has a GPT interpretation, a bi-wheel chart, a planet table, and a Discuss button. It is static — no forward-looking markers, no time navigation.
- Opportunity: The Solar Return year has a known start date (the SR itself) and end date (next birthday). A lightweight "Peak Moments This Solar Year" strip could run the existing advance marker engine against the SR chart data across the SR year's 12 months. This would use the same `preCalculateSnapshots` infrastructure with the SR chart as `chartData` and a 12-step monthly advance from the SR date.
- This is high-leverage: the entire scoring, density cap, category diversity, and marker rendering system can be reused with almost no new code — the SR chart is already a `ChartData` compatible object (it has planets, angles, houses).
- Scope limit: surface only the overview strip and Prev/Next navigation, no per-snapshot chart wheel (same approach as `CoupleAdvanceTab` which omits the wheel). Full SR advance slider can come in a later sprint.

### 3. Code quality — `CoupleAdvanceTab` scoring parity

- File: `/projects/astrology-reader/src/components/reading/CoupleAdvanceTab.tsx`
- `scoreCoupleSnapshot` still uses the old `computeEnergyRating` gate for Priority 2/3/4 (shift co-occur, favorable, challenging) rather than the upgraded `computeCombinedWeight` approach shipped in sprint-0019 for `AdvanceTab`. This means couple advance markers for non-power categories fire on weaker criteria and miss the slow-planet threshold nuance.
- Work: port the `computeCombinedWeight` function (it's already exported-compatible in `AdvanceTab.tsx`) into the couple scoring path, replacing the `computeEnergyRating` + energy score gates in `scoreCoupleSnapshot` Priorities 2–4.

### 4. New area — Transit Timeline notable-moment integration

- File: `/projects/astrology-reader/src/components/reading/TransitTimeline.tsx`
- Current state: The Timeline tab shows a chronological list of transit events (aspect perfections, ingresses, stations, lunar phases). Notable "Power Day" highlights fire when 3+ events cluster on a date — but this is independent of the scoring engine that now powers the advance marker system.
- Opportunity: Align the Timeline's Power Day concept with the `SnapshotScore` system. A date already surfaced as a `power` or high-intensity `favorable/challenging` marker by the advance engine should carry that label in the Timeline view — removing the mismatch where the Timeline says "Power Day" (event count) but the Advance strip says otherwise. Low code cost: the snapshots are pre-computed and accessible; augmenting each timeline event card with the advance score category would create product coherence.

---

## Quality Bar

"Deep, not shallow" for this sprint means:

- **Couple advance guidance is contextually relational** — it must not be a generic reuse of `ASPECT_GUIDANCE`. Couple guidance sentences should name the relationship ("this is a window to deepen how the two of you...") rather than speaking to an individual.
- **Synastry axis scoring must not fire on noise** — the augment should require both (a) a transiting slow planet within tight orb AND (b) a tight synastry cross-aspect (≤ 2° orb) at or near the transit degree. Loose synastry aspects must not generate false activations.
- **Solar Return advance is architecturally reused, not copy-pasted** — the SR preview strip should import and call `preCalculateSnapshots` with the SR chart, not duplicate the pre-calculation logic.
- **Timeline/advance coherence is visible** — when a date shows as a `power` advance marker, it must show something meaningful in the Timeline view, not just a generic event count marker.

---

## What This Sprint Is NOT

- Not a rebuild of any existing advance mechanic — the scoring priority ladder, marker density cap, category diversity, and hysteresis are done.
- Not a new GPT interpretation surface for the advance system — the individual and couple advance banners use rule-based strings. No GPT calls for advance markers.
- Not a full Solar Return advance tab with slider, chart wheel, and aspect list — that is a future sprint. Sprint 0020 ships only the overview strip and Prev/Next navigation.
- Not new product surfaces outside the advance/timeline/SR stack (no numerology advance, no new form features, no onboarding changes).
- Not a refactor of the synastry page's static compatibility view — the synastry axis work is confined to the couple advance scorer, not the SynastryPage rendering.
