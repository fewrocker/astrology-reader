# Proposal: `code-couple-advance-scoring-parity`

**Type:** Code Enhancement
**Originated by:** Jobs, Carmack, Taleb, Miyazaki

---

## Problem / Opportunity

Sprint-0019 replaced `computeEnergyRating` with `computeCombinedWeight` in `scoreSnapshot` (`AdvanceTab.tsx`). The couple advance scorer, `scoreCoupleSnapshot` in `CoupleAdvanceTab.tsx`, was not updated. Three priority branches in the couple path still call the old gate; two structural fields introduced to `SnapshotScore` in sprint-0019 are absent from the couple reason builders; and the couple banner's bold-fragment logic regresses to a fragile word-split that the individual banner fixed in the same sprint.

### 1. Scoring logic: `computeEnergyRating` still drives Priorities 2–4

`scoreCoupleSnapshot` at Priorities 2, 3, and 4 (`CoupleAdvanceTab.tsx` lines 173–274) calls `computeEnergyRating` (imported from `../../engine/transits` at line 3) and gates on `rating.score >= 4` (favorable) or `rating.score <= 2` (challenging). `computeEnergyRating` counts applying and separating aspects equally at +1 / −1 per aspect, regardless of planet weight.

`scoreSnapshot` in `AdvanceTab.tsx` replaced this entire mechanism with `computeCombinedWeight` (lines 476–481), which computes `sum(PLANET_WEIGHT[planet] × (1 − orb/maxOrb))` across applying aspects only. The couple path has not been updated.

**Concrete consequence.** For Priority 3 (favorable), the couple gate reads (lines 226–244):

```ts
const rating = computeEnergyRating(snapshot.transitAspects)
// ...
if (rating.score >= 4 && tightApplyingHarmonious.length >= orbs.energyMinAspects) {
```

The individual gate in `AdvanceTab.tsx` lines 760–791 reads:

```ts
const combinedWeight = computeCombinedWeight(tightApplyingHarmonious, orbs.applyingTight)
const hasSlowPlanet = tightApplyingHarmonious.some(a => COMBINATION_PLANETS.has(a.transitPlanet as string))
const favorableThreshold = hasSlowPlanet ? COMBINATION_WEIGHT_THRESHOLD : COMBINATION_WEIGHT_THRESHOLD * 2
if (combinedWeight >= favorableThreshold) {
```

`COMBINATION_WEIGHT_THRESHOLD = 3.0` (`AdvanceTab.tsx` line 109). A cluster of Mercury + Sun applying aspects at tight orbs produces `computeEnergyRating` score 4 (two harmonious aspects) and fires a couple favorable marker. The same cluster produces `combinedWeight ≈ 3.5` with no slow planet present, requiring `COMBINATION_WEIGHT_THRESHOLD * 2 = 6.0` on the individual path — so the individual advance stays quiet. The same sky produces a green marker on the couple strip and nothing on the individual strip. Saturn + Pluto at 1° orb produces `computeCombinedWeight` weight ≈ 14+, firing on its own. Under `computeEnergyRating` it needs additional supporting aspects to reach score `<= 2` or `>= 4`. The ranking inverts the astrology: slow-planet weight is silenced, fast-planet noise is amplified.

The same gate regression appears in Priority 2 (shift co-occur, lines 173–217) and Priority 4 (challenging, lines 247–273). All three call `computeEnergyRating` and use `rating.score >= 4` / `<= 2` as the threshold.

`computeCombinedWeight` is locally scoped in `AdvanceTab.tsx` (line 476). It depends on `COMBINATION_PLANETS` (line 106), `COMBINATION_WEIGHT_THRESHOLD` (line 109), and `COMBINATION_WEIGHT_NORMALIZE` (line 112), all also locally scoped. The fix requires exporting these four identifiers from `AdvanceTab.tsx` and importing them in `CoupleAdvanceTab.tsx`, then rewriting the three priority blocks to match the individual path.

### 2. Reason builders: missing `bannerBoldFragment` and `guidance` fields

`SnapshotScore` in `AdvanceTab.tsx` (lines 20–35) carries two fields added in sprint-0019:

```ts
bannerBoldFragment?: string  // token to bold in the banner; falls back to first word
guidance?: string            // navigational sentence shown in banner only
```

The three couple reason builders (`buildCouplePowerReason` line 44, `buildCoupleAspectReason` line 57, `buildCoupleShiftReason` line 79) still return plain `string`. Their counterparts in `AdvanceTab.tsx` — `buildPowerReason` (line 511) and `buildAspectReason` (line 533) — return `{ reason: string; bannerBoldFragment: string; guidance?: string }`.

As a result:
- The `guidance` paragraph is never populated or rendered on the couple banner. Users see relational reason text but no navigational guidance line.
- `bannerBoldFragment` is never set by couple builders, so the banner falls back to the fragile split (see below).

The `guidance` strings for the couple path must use relational language ("a window to deepen how the two of you...") rather than reusing the individual `ASPECT_GUIDANCE` table verbatim. A `COUPLE_ASPECT_GUIDANCE` table keyed by `"${planet}|${nature}"` — the same key structure as `ASPECT_GUIDANCE` — should be defined in `CoupleAdvanceTab.tsx` with relationship-first sentences.

### 3. Banner bold fragment: fragile `split(' ')[0]` still in use

Sprint-0019 introduced `bannerBoldFragment` specifically to eliminate the pattern of bolding the first word of the reason string, which produces meaningless bolding when a sentence begins with "A," "The," or "During." The individual banner in `AdvanceTab.tsx` (lines 1503–1522) now uses `snapshot.score.bannerBoldFragment ?? categoryBanner.split(' ')[0]` — the fallback is kept but the builders all set the field, so the split never fires in practice.

The couple banner at `CoupleAdvanceTab.tsx` lines 678–679 uses the legacy pattern directly:

```ts
<span className="font-heading">{categoryBanner.split(' ')[0]}</span>
{' ' + categoryBanner.split(' ').slice(1).join(' ')}
```

Current couple reason strings happen to open with planet names ("Saturn reaches the relationship's Ascendant..."), so the first-word split currently bolds the right token. Once relational guidance language is introduced — where reason strings may open with "A window" or "During this period" — the split will bold "A" or "During." The individual path's `bannerBoldFragment` fix must be mirrored to the couple banner in the same change.

### 4. Cache key: precision and field coverage diverge from individual advance

`CoupleAdvanceTab.tsx` line 420:

```ts
`${period}:${baseDate.toISOString()}:${chart1.angles.ascendant.longitude.toFixed(2)}:${chart2.angles.ascendant.longitude.toFixed(2)}`
```

`AdvanceTab.tsx` line 1247:

```ts
`${chartData.angles.ascendant.longitude.toFixed(4)}:${chartData.angles.midheaven.longitude.toFixed(4)}:${chartData.unknownTime}`
```

Sprint-0019 fixed the individual cache key to use `.toFixed(4)` precision and to include midheaven longitude and `unknownTime` after a cache collision bug (two charts with the same period and base date sharing snapshots). The couple key retains `.toFixed(2)` precision and omits midheaven longitudes and `unknownTime` for both charts. At `.toFixed(2)`, ascendants differing by < 0.005° produce identical fingerprints. More critically, the composite Midheaven drives Priority 1 power markers (`CoupleAdvanceTab.tsx` lines 124–125); a couple whose MC differs while their ASC rounds to the same value gets cached power markers from a different chart. The silent data corruption class fixed for individuals is still present for couple advance.

---

## Desired State

After this enhancement:

**Scoring parity.** `scoreCoupleSnapshot` Priorities 2–4 use `computeCombinedWeight` with the `COMBINATION_PLANETS` / `COMBINATION_WEIGHT_THRESHOLD` gates, matching `scoreSnapshot` exactly. A Mercury + Sun cluster that is quiet on the individual advance is quiet on the couple advance. A Saturn + Pluto transit that fires on the individual advance fires on the couple advance. The same sky produces coherent outputs across both tabs.

**Structured reason builders.** All three couple builders return `{ reason: string; bannerBoldFragment: string; guidance?: string }`. A `COUPLE_ASPECT_GUIDANCE` table provides relational guidance strings in the same key format as `ASPECT_GUIDANCE`. The `guidance` paragraph renders in the couple banner using the same DOM pattern as `AdvanceTab.tsx` lines 1503–1522.

**Robust banner bolding.** The couple banner uses `snapshot.score.bannerBoldFragment` as the bold token, with the split fallback retained but never reached in practice — matching the individual banner implementation.

**Cache key parity.** The couple cache key uses `.toFixed(4)` precision, includes midheaven longitude for both charts, and includes `unknownTime` for both charts, eliminating the collision window that survived sprint-0019's individual-advance fix.

**Synastry axis augmentation on solid ground.** Sprint-0020's planned synastry axis overlay scoring layers intensity onto markers that already fired from `scoreCoupleSnapshot`. If those base markers are firing on Mercury + Sun noise via the old `computeEnergyRating` gate, the synastry augment amplifies noise into confident-sounding relationship language. Scoring parity is a prerequisite for synastry axis work: the augment must build on signal, not on a corrected-in-the-individual-path gate that the couple path still carries.
