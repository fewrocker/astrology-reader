# Sprint 0019 — Changelog

## Completed Tasks

---

### issue-advance-applying-aspect-accuracy
**Proposal:** issue-advance-applying-aspect-accuracy
**Problem:** The advance scoring engine evaluated the energy score for favorable/challenging moments using ALL aspects (including past-peak separating ones), inflating scores for windows that had already closed. Separately, the `applying` flag on transit aspects flipped sign at retrograde station boundaries — when a planet's daily motion crossed zero — causing markers to appear, vanish, and reappear at exactly the most significant moments in a planetary cycle.
**Solution:** All energy-gate calls inside `scoreSnapshot` now filter to `applying` aspects only before computing the combined weight, ensuring markers only fire on genuinely forward-looking momentum. In `calculateTransitAspects`, when a planet's absolute daily motion is below its per-planet `STATION_THRESHOLD`, the `applying` flag is forced to `true` — a stationing planet is maximally active, not switching direction.

---

### issue-advance-snapshot-cache-key
**Proposal:** issue-advance-snapshot-cache-key
**Problem:** The advance tab's snapshot cache used only `${period}:${baseDate}` as a key. Any two charts viewed in the same session with the same period and base date would share cached snapshots — loading one person's astrological profile for a completely different person. Silent, undetectable data corruption risk.
**Solution:** Cache key now includes the chart's angles as fingerprint: `${asc.toFixed(4)}:${mc.toFixed(4)}:${unknownTime}:${period}:${baseDate}`. Each unique natal chart gets its own isolated cache slot.

---

### issue-advance-tooltip-overflow
**Proposal:** issue-advance-tooltip-overflow
**Problem:** The `MarkerTooltip` was `maxWidth: 200px` — too narrow for the upgraded house-anchored reason strings (150+ characters). The banner's `split(' ')[0]` bold-first-word logic assumed planet-name-leading sentences and would produce meaningless bolded articles ("The", "A") with improved strings.
**Solution:** Tooltip widened to `280px`; reason text truncated to first sentence in tooltip (full text in banner). Added `bannerBoldFragment?: string` to `SnapshotScore` — builders populate it with the planet name; the banner renders it as the bold heading regardless of sentence structure.

---

### code-advance-category-diversity
**Proposal:** code-advance-category-diversity
**Problem:** The 20% density cap selected the top N markers by intensity only. When Jupiter was making a long favorable sequence, all marker slots filled with green dots. Power days and challenging periods that scored slightly lower were suppressed entirely. The overview strip told a single-note story about periods that had genuine variety.
**Solution:** Two-phase category-aware density cap. Phase 1 reserves one slot for the highest-intensity marker of each non-neutral category present (power, favorable, challenging, shift). Phase 2 fills remaining capacity by intensity. A 36-month strip now guarantees variety — one marker per present category before any second slot is filled.

---

### code-advance-combination-scoring
**Proposal:** code-advance-combination-scoring
**Problem:** `scoreSnapshot` used a first-match priority ladder, evaluating one aspect in isolation while discarding all concurrent aspects. A Saturn+Pluto double-whammy scored identically to a Mercury+Mars cluster. `PLANET_WEIGHT` values influenced only the tooltip display, not whether a marker fired. Jupiter was excluded from all slow-planet detection by an overly broad constant.
**Solution:** Replaced energy-rating gate with `computeCombinedWeight` — sum of `PLANET_WEIGHT[planet] × (1 − orb/maxOrb)` across all tight applying aspects. Saturn+Pluto at close orb produces weight ~15+; Mercury+Mars noise ~4. Added `COMBINATION_PLANETS` constant that includes Jupiter for combination scoring. Intensity now derives from combined weight; outer-planet constellations produce high-intensity markers that survive the density cap. Shift marker reason strings now identify the nearest natal planet to the station degree and append the planet's retrograde brief.

---

### code-advance-house-anchored-interpretation
**Proposal:** code-advance-house-anchored-interpretation
**Problem:** `buildAspectReason` produced house-blind sentences from a flat planet-archetype map. Saturn opposing the Moon in the 7th house (partnerships) and 4th house (home/family) produced identical output. The product never told users what to *do* with a favorable window or how to hold a challenging period.
**Solution:** `buildAspectReason` and `buildPowerReason` rebuilt to use `natalHouse` and `HOUSE_THEMES` data. Sample:
- **Before:** "Saturn opposition your natal Moon — tension around structure and discipline."
- **After reason:** "Saturn pressing on your Moon in your 7th house (partnership) — a committed relationship is being examined for durability — what isn't working can't be deferred."
- **After guidance:** "Face the pattern directly rather than managing around it — what gets restructured now builds a foundation that actually holds."
Added `guidance?: string` to `SnapshotScore` from a `ASPECT_GUIDANCE` table (all major planets × aspect natures). Guidance appears as a second paragraph in the banner only (not in the compact tooltip).

---

### feat-advance-couple-tab
**What it is:** The synastry (couple) transit reading now has a forward-looking advance section. It scans the selected time period, scores composite chart transit snapshots, and surfaces the moments most significant for the relationship — power configurations, favorable windows, challenging periods, and stations — as colored markers on a slider with an overview strip and Prev/Next navigation.
**Problem:** The advance slider existed only for individual transit readings. Couples had no way to look ahead from the synastry page despite all the composite chart, synastry, and partner data being in app state.
**Solution:** Created `CoupleAdvanceTab` — a dedicated component with `scoreCoupleSnapshot` function evaluating transiting planets against composite chart positions. Couple reason strings use relational language ("the relationship's," "as a couple," "the bond between you"). Composite planet house values are `0` by design — archetype phrases used instead. Power markers against composite angles require both partners' birth times. Cache key includes both charts' ascendant longitudes. The section appears on the synastry page after the GPT interpretation, before current planets widget.
**How to use it:** Open a couple transit reading → scroll below the interpretation → the "Look Ahead" section shows the advance slider for the relationship. Use the overview strip to spot significant moments, Prev/Next to jump between them. Hover a marker to see the relationship moment described.

---

## Deferred

- **Synastry axis overlay scoring** (concurrent composite transit + synastry axis activation): deferred to sprint 0020. Composite-only path ships first.
- **`guidance` field on couple advance**: depends on task-0006's shared field stabilizing. To be integrated in sprint 0020.
