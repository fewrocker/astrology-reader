# Sprint-0019 Proposal Drafts

## Draft 1 — code-advance-combination-scoring
**Type:** Code Enhancement
**Originated by:** All four voices (strongest convergence)
**What it is:** The current `scoreSnapshot()` function evaluates the single tightest applying aspect and stops, producing identical scores for a Saturn+Pluto double-whammy and a Mercury+Mars minor transit. The scoring must be rebuilt to evaluate the *constellation* of concurrent applying aspects together — detecting when multiple natal houses are activated simultaneously, when slow-planet weight stacks, and when the combined signal is genuinely significant vs. a statistical cluster of minor contacts.

---

## Draft 2 — code-advance-house-anchored-interpretation
**Type:** Code Enhancement
**Originated by:** All four voices
**What it is:** `buildAspectReason()` and `buildPowerReason()` ignore `natalHouse` — data that is already present on the `TransitAspect` struct — producing house-blind reason strings. The functions must be rebuilt to name the natal house being activated (e.g., "your 7th house — partnership and commitment") and to incorporate the tone of the moment into actionable guidance ("this is a window for initiating" / "watch for pressure on these relationships"). The duplicate interpretation path vs. `computeTransitAspectBrief` must be consolidated. Shift marker reason strings, currently "Saturn stations retrograde" labels, should also surface what natal planet the station sits on and what that means in plain language.

---

## Draft 3 — code-advance-category-diversity
**Type:** Code Enhancement
**Originated by:** Jobs, Carmack, Taleb
**What it is:** The 20% density cap sorts markers by intensity and takes the top N globally — producing timelines of five consecutive green favorable markers while power and challenging markers are suppressed. The selection algorithm needs a category-aware two-phase approach: reserve one slot per category present before filling remaining capacity by intensity. This prevents the overview strip from becoming monochromatic and ensures the user sees the variety of what the advance period actually contains.

---

## Draft 4 — feat-advance-couple-tab
**Type:** Feature
**Originated by:** Jobs, Miyazaki, Taleb
**What it is:** The Advance slider exists only on the personal transit page. The synastry (couple) reading has no advance slider despite having all the data needed: composite chart, synastry aspects, house overlays, and partner profiles. A couple advance tab must evaluate composite chart planet activations in combination with synastry axis activations and surface moments that are genuinely significant for the relationship — not just individual transit contacts to composite positions.

---

## Draft 5 — issue-advance-applying-aspect-accuracy
**Type:** Issue Fix
**Originated by:** Carmack, Taleb
**What it is:** Two accuracy bugs in the snapshot's transit pipeline. (1) `computeEnergyRating` does not filter out separating aspects — including them inflates the energy score for snapshots past their peak and can fire a marker on a window that already closed. (2) The `applying` flag in `calculateTransitAspects` reverses at retrograde station dates (daily motion crosses zero), causing the same aspect geometry to alternate between applying and separating on consecutive monthly snapshots — producing flickering markers at exactly the moments that matter most.

---

## Draft 6 — issue-advance-snapshot-cache-key
**Type:** Issue Fix
**Originated by:** Taleb
**What it is:** The snapshot cache in `AdvanceTab` is keyed by `${period}:${baseDate.toISOString()}`. When the same component instance is reused across different chart contexts (e.g., if the couple advance tab reuses `AdvanceTab`), switching partner identity will silently serve stale snapshots computed for the previous chart. The cache key must include the chart identity (birth data hash or chart ID) to prevent cross-chart contamination.

---

## Draft 7 — issue-advance-tooltip-overflow
**Type:** Issue Fix
**Originated by:** Taleb
**What it is:** The marker tooltip container is `maxWidth: 200px` at `text-[10px]`, sized for the current 60–80 character reason strings. The improved house-anchored reason strings from code-advance-house-anchored-interpretation will be 150+ characters and will wrap into 3–4 lines, breaking the tooltip layout. The banner's bold-first-word logic (`categoryBanner.split(' ')[0]`) is similarly sized for short planet-name-leading sentences and will break with multi-clause improved reasons. Both must be updated before the interpretation improvements ship.
