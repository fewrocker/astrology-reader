# Sprint 0020 — Changelog

## Completed Tasks

---

### issue-couple-advance-cache-key
**Proposal:** issue-couple-advance-cache-key
**Problem:** The couple advance snapshot cache key used `.toFixed(2)` precision for ascendant longitudes and omitted midheaven longitude and `unknownTime` for both charts. Two couples whose partners had ascendants within 0.01° shared the same cache slot and received each other's pre-computed snapshots silently — silent data corruption with no error surfaced.
**Solution:** Cache key now uses `.toFixed(4)` precision for both ascendant and midheaven of each chart, plus `unknownTime` for each chart — matching the individual advance cache fix from sprint-0019. The fix is confined to a single line; no scoring or rendering logic changed.

---

### issue-couple-advance-banner-bold-fragment
**Proposal:** issue-couple-advance-banner-bold-fragment
**Problem:** The CoupleAdvanceTab banner used `categoryBanner.split(' ')[0]` to select the bold fragment — the pre-sprint-0019 pattern that `AdvanceTab` replaced. The couple reason builders returned bare `string` instead of structured `{ reason, bannerBoldFragment, guidance? }` objects, so the couple banner would bold whatever word happened to open the sentence ("the", "a", "during") once relational language was introduced.
**Solution:** All three couple builders (`buildCouplePowerReason`, `buildCoupleAspectReason`, `buildCoupleShiftReason`) now return `{ reason, bannerBoldFragment, guidance? }`. `bannerBoldFragment` is set explicitly to the transit planet name. The banner render block mirrors `AdvanceTab`'s `div` wrapper with explicit bold-fragment lookup and a conditional guidance paragraph.

---

### code-couple-advance-scoring-parity
**Proposal:** code-couple-advance-scoring-parity
**Problem:** `scoreCoupleSnapshot` Priorities 2–4 still used the `computeEnergyRating` gate that `scoreSnapshot` replaced with `computeCombinedWeight` in sprint-0019. Couple advance fired markers on fast-planet (Mercury, Venus) noise that individual advance suppressed, while Saturn+Pluto transits were underweighted. The same sky produced contradictory outputs on individual vs. couple advance strips.
**Solution:** Exported `computeCombinedWeight`, `COMBINATION_PLANETS`, `COMBINATION_WEIGHT_THRESHOLD`, and `COMBINATION_WEIGHT_NORMALIZE` from `AdvanceTab.tsx`. `scoreCoupleSnapshot` Priorities 2–4 now use the identical gate logic as `scoreSnapshot` — slow-planet-aware threshold, combination weight scoring. The individual and couple advance strips now agree on whether a given sky deserves a marker.

---

### code-advance-precompute-abstraction
**Proposal:** code-advance-precompute-abstraction
**Problem:** `preCalculateCoupleSnapshots` was a ~113-line structural duplicate of `preCalculateSnapshots` — same date-offset loop, hysteresis pass, and density cap, with only the scoring callback differing. The two density cap implementations had already silently diverged (the older couple path used a single-pass algorithm; the individual path used the correct two-phase category-reservation approach from sprint-0019). A third copy (SR advance) would have widened the maintenance liability further.
**Solution:** Extracted `runAdvancePreCalculation<S>` as an exported generic function in `AdvanceTab.tsx` that encapsulates all three shared phases and accepts a scoring callback. Both `preCalculateSnapshots` and `preCalculateCoupleSnapshots` are now thin wrappers (~15 lines each). The two-phase density cap is canonical and lives once. Net diff: +92 / -137 lines.

---

### code-transit-timeline-advance-coherence
**Proposal:** code-transit-timeline-advance-coherence
**Problem:** `TransitTimeline.tsx` computed "Power Day" using a raw event-count heuristic (`significantCount >= 3`) with no connection to the advance scoring engine. Three Moon ingresses produced a "Power Day" badge; a Saturn-on-Ascendant advance `power` marker produced nothing in the timeline. Both surfaces used the same "Power Day" label but defined it through entirely different logic, producing contradictory signals.
**Solution:** Snapshot computation lifted from `AdvanceTab`'s internal state to `TransitReadingPage`. A `scoreByDate: Map<string, MarkerCategory>` is derived from non-neutral snapshots and passed as an optional prop to `TransitTimeline`. When advance data is present for a date, the timeline overrides the event-count heuristic with the authoritative advance category label: gold "✦ Power Day" for `power`, emerald "◆ Favorable Window" for `favorable`, red "⚠ Challenging Period" for `challenging`. The event-count heuristic is retained as graceful fallback.

---

### feat-couple-advance-guidance
**What it is:** The couple advance banner now shows a second paragraph of relational guidance beneath the reason string — navigational language that tells both people what to do with the moment, written specifically for two people rather than one.
**Problem:** The three couple reason builders returned bare strings with no `guidance` field. Sprint-0019 added `guidance` to the individual advance; it was deferred for the couple tab. The banner had no second paragraph, and the individual advance guidance tables couldn't be reused because they address one person.
**Solution:** Three new relationship-native guidance tables: `COUPLE_POWER_PHRASES` (40 entries for Saturn/Jupiter/Pluto/Uranus × aspect type × ASC/MC), `COUPLE_ASPECT_GUIDANCE` (18 entries keyed by planet and aspect nature), and `COUPLE_SHIFT_GUIDANCE` (7 entries for planetary stations). Every guidance string uses "the two of you", "together", "between you", or "the relationship" — never "you" alone. The banner renders the guidance in a second paragraph with `text-xs text-mystic-muted/80 mt-1.5 font-light leading-relaxed`, mirroring the individual advance pattern.
**How to use it:** Open a couple transit reading → scroll to the Look Ahead section → navigate to any non-neutral marker. The banner now shows two paragraphs: the reason (what is happening) and the guidance (how to meet it together).

---

### feat-couple-advance-synastry-axis
**What it is:** The couple advance scorer now detects when a transiting slow planet also activates a tight cross-chart synastry aspect, augmenting the marker's intensity and adding a relational suffix that names which quality of the bond is being lit up.
**Problem:** `scoreCoupleSnapshot` evaluated transiting planets against composite chart positions only. The `synastryAspects` array (tight cross-chart aspects between the two individuals' natal planets) was passed in but completely unused. A Saturn transit to composite Venus registered as a generic composite contact — it never noted whether that transit simultaneously activated the real Venus-Mars attraction axis between the two people.
**Solution:** `preCalculateCoupleSnapshots` pre-filters tight synastry cross-aspects (≤ 2° orb) once before the snapshot loop. For Priorities 2–4, after the base score is determined, `findActivatedSynastryAxis` checks whether the triggering transit planet is within `angleContact` orb of a natal planet that participates in a tight synastry pair. If activated: intensity is multiplied by 1.25 (capped at 1.0) and the reason string gains a suffix — "— and resonates with the [harmonious/tense] [P1Planet]-[P2Planet] axis between the two of you." Only Saturn, Uranus, Neptune, Pluto trigger augmentation. Pure shift markers are excluded.
**How to use it:** Open a couple advance tab and navigate to a power or favorable marker. When the transiting outer planet also activates a tight synastry axis, the banner reason describes both the composite contact and the personal connection it echoes.

---

### feat-solar-return-advance-preview
**What it is:** The Solar Return reading now includes a "Peak Moments This Solar Year" section — a 12-month advance overview strip showing power, favorable, challenging, and shift markers across the entire solar return year, with Prev/Next navigation.
**Problem:** The Solar Return page was entirely static: GPT interpretation, bi-wheel chart, planet table. The SR chart is ChartData-compatible and the entire advance scoring and marker infrastructure was reusable with it, but nothing on the SR page used it. A person reading their solar return had no way to see which months of the year ahead carried notable astrological weight.
**Solution:** `preCalculateSnapshots` exported from `AdvanceTab.tsx`. A `SolarReturnAdvancePreview` component in `SolarReturnPage.tsx` calls it with the SR chart, a 12-step config, and a UTC-normalized base date from `srMoment` (preventing day-offset errors in non-UTC timezones). The section renders the overview strip, Prev/Next navigation, and a category banner with `bannerBoldFragment` / `guidance`. Cache key includes SR chart angles at `.toFixed(4)` precision and `targetYear`. Placed at the bottom of the Reading tab after the GPT interpretation.
**How to use it:** Open a Solar Return reading → Reading tab → scroll to "Peak Moments This Solar Year" at the bottom. The overview strip shows the 12 months of the solar year with colored markers at significant moments. Use Prev/Next to navigate between them and read the reason and guidance for each.

---

## Deferred

- **`computeCombinedWeight` reversion in task-0007**: The synastry-axis task reverted to `computeEnergyRating`-based intensity for couple scoring Priorities 2–4 during the conflict resolution. The combination-weight approach from task-0003 was displaced in the merge by task-0007's manual loop. Sprint-0021 should restore `computeCombinedWeight` gating in the synastry-augmented path.
