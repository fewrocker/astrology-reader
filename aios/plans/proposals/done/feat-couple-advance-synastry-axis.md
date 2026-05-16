# Proposal: feat-couple-advance-synastry-axis

**Type:** Feature
**Originated by:** Jobs, Carmack, Taleb
**Sprint:** 0020 (deferred from 0019)
**Status:** Active — ready for task definition

---

## Problem / Opportunity

`scoreCoupleSnapshot` in `/projects/astrology-reader/src/components/reading/CoupleAdvanceTab.tsx` evaluates transiting planets exclusively against the composite chart's planet positions and angles. The synastry aspect array — `synastryData.synastryAspects` — is available in the function signature (line 95: `synastryData: SynastryData`) and is used only to extract the composite chart and angles (lines 123–128). The full cross-chart aspect grid is ignored.

This creates a fundamental blind spot: when a transiting slow planet crosses a degree that also happens to be the natal longitude of one of the planets in a tight synastry pair, the advance scorer treats this transit as an ordinary composite contact. It cannot distinguish between Jupiter crossing a composite Venus that sits near no synastry pole, and Jupiter crossing the exact degree of Person 1's natal Venus — which in tight conjunction with Person 2's natal Mars forms one of the relationship's primary attraction axes.

The practical result: two couples with nearly identical composite charts but entirely different synastry patterns — one with a 0.5° Venus-Mars cross-conjunction forming a live attraction axis, one with no tight personal-planet synastry at all — receive nearly identical advance strips. The couple scoring knows nothing specific about what makes this pair's dynamic different from any other.

This matters most for the product's most shareable moment: a couple navigating a Jupiter crossing in a specific month. Without synastry axis awareness, the banner says "Jupiter flows through the relationship's romantic axis — a window when shared pleasure, warmth, and connection is genuinely supported." With it, the banner can say the same and then add: "and resonates with the attraction axis between your Venus and their Mars" — naming the live wire the transit is touching, specific to this couple's chart pattern. That specificity is what makes the moment feel found rather than generated.

The issue is not that the composite scoring is wrong — it is correct as far as it goes. The issue is that transiting a natal planet that participates in a tight synastry cross-aspect is categorically more significant than transiting that same natal planet when it stands alone. The scorer has no mechanism to register this difference.

---

## Vision

When the synastry axis feature is complete, a couple's advance strip will reflect the specific relational territory their chart defines. Two couples in the same calendar window, with the same slow planets transiting, will see meaningfully different markers when their synastry patterns differ.

When Jupiter reaches a degree near Person 1's natal Venus — which in tight conjunction with Person 2's natal Mars forms the primary attraction axis of their synastry — the banner will name that specifically: "Jupiter flows through the relationship's romantic axis — and resonates with the Venus-Mars attraction axis between the two of you." The intensity of the marker will be visibly elevated.

When no such synastry axis is present near the transit degree, the banner will read as it does today — a clean composite contact, no augmentation. The feature fires only on genuine double activations.

The scorer will not fire on loose synastry aspects. It will not fire on fast-moving transiting planets alone. Both conditions — tight transit orb AND tight synastry aspect orb — are independently required. Loose synastry will not cause false activations. This is the quality bar: no noise inflation.

---

## Specifications

### 1. Algorithm Overview

The feature is implemented as a post-detection intensity augmenter inside `scoreCoupleSnapshot`. It does not create a new priority branch. It runs after a marker category (power, favorable, challenging, shift) has already been determined for a snapshot, and before the `SnapshotScore` is returned. When both required conditions are met, the score's `intensity` is increased by a capped multiplier, and a relational suffix is appended to the `reason` string.

### 2. Prerequisite: Tight Synastry Pair Pre-Filter

Before entering the pre-calculation loop, `preCalculateCoupleSnapshots` must compute a pre-filtered list of tight synastry aspects: all entries from `synastryData.synastryAspects` where `orb <= 2.0`. This pre-filter runs **once** per pre-calculation call, not inside each call to `scoreCoupleSnapshot`. The synastry aspect list can contain 50–100 entries; iterating the full list for each of up to 37 monthly snapshots would mean up to 3,700 iterations total, unnecessary given that the list is static across all snapshots.

```ts
// Inside preCalculateCoupleSnapshots, before the snapshot loop:
const tightSynastryPairs = synastryData.synastryAspects.filter(a => a.orb <= 2.0)
```

This pre-filtered list is passed into `scoreCoupleSnapshot` as an additional parameter, or captured via closure.

### 3. Synastry Axis Detection Function

A new pure helper function `findActivatedSynastryAxis` is introduced. It accepts:
- `transitLon: number` — the ecliptic longitude of the transiting planet at the snapshot date
- `transitOrb: number` — the maximum orb threshold to use for the axis check (equals `orbs.angleContact` from `ORB_THRESHOLDS[period]`)
- `tightSynastryPairs: SynastryAspect[]` — the pre-filtered list of synastry aspects with `orb <= 2.0`
- `chart1: ChartData` — Person 1's natal chart
- `chart2: ChartData` — Person 2's natal chart

It returns either `null` (no activation) or an object describing the activated axis:

```ts
interface SynastryAxisActivation {
  person1Planet: string
  person2Planet: string
  aspectType: string
  synastryNature: 'harmonious' | 'challenging' | 'neutral'
  activatedPole: 'person1' | 'person2'  // which natal planet's longitude the transit is near
  activatedLongitude: number            // the natal longitude that is within transit orb
  contactOrb: number                    // the orb between the transit and the activated natal longitude
}
```

**Detection logic:**

For each `SynastryAspect` in `tightSynastryPairs`:

1. Look up Person 1's natal longitude for `aspect.person1Planet`:
   ```ts
   const p1Planet = chart1.planets.find(p => p.name === aspect.person1Planet)
   ```
2. Look up Person 2's natal longitude for `aspect.person2Planet`:
   ```ts
   const p2Planet = chart2.planets.find(p => p.name === aspect.person2Planet)
   ```
3. If either lookup fails (planet not in chart), skip this aspect.
4. Compute the angular distance from `transitLon` to `p1Planet.longitude` using the short-arc formula (same as `angularDiff` used in `detectAngleContact`).
5. Compute the angular distance from `transitLon` to `p2Planet.longitude` similarly.
6. If either angular distance is `<= transitOrb`, this synastry axis is activated. Record which pole was activated (`person1` or `person2`), the activated longitude, and the contact orb.
7. Among all qualifying pairs found, return the one with the smallest contact orb.
8. If no pair qualifies, return `null`.

**Why not use midpoints:** The vision document's original specification mentioned using the midpoint of the synastry aspect pair as the target longitude. Carmack and Taleb both identify this as incorrect. The midpoint of a Venus-Mars synastry pair is a ghost degree — it is not where either natal planet actually lives. A transit at the exact midpoint (1° from each natal planet) fires under the midpoint formulation, but a transit at exactly Person 1's natal Venus longitude (0° from the live planet) may fall outside the midpoint-orb threshold. The direct formulation — check against each natal planet's longitude independently — correctly detects the most significant activations (exact transits to natal poles), avoids the ghost-degree problem, and produces no false negatives for within-orb contacts.

### 4. Qualifying Transiting Planets

The synastry axis check applies **only when the transiting planet is a member of `SLOW_PLANETS_FOR_BANNER`**: `Saturn`, `Uranus`, `Neptune`, `Pluto`. Fast-moving planets (Sun, Moon, Mercury, Venus, Mars) may contact synastry axis degrees frequently and cheaply. Restricting the augmentation to slow planets ensures that a synastry axis activation represents a significant, multi-week or multi-month event rather than a daily or weekly noise signal.

Jupiter is **excluded** from the synastry axis augment. Jupiter is included in `COMBINATION_PLANETS` for combination-weight scoring but not in `SLOW_PLANETS_FOR_BANNER`. The synastry axis augment is reserved for the four outermost slow planets whose contacts to natal points are genuinely rare and long-lasting.

### 5. Integration Point in `scoreCoupleSnapshot`

The check runs within the existing priority branches wherever a non-neutral category has been determined and an `intensity` value has been computed. The implementation pattern:

```ts
// After computing intensity within Priority 1, 3, or 4:
const axisActivation = findActivatedSynastryAxis(
  transitingPlanet.longitude,
  orbs.angleContact,
  tightSynastryPairs,
  chart1,
  chart2,
)

const augmentedIntensity = axisActivation
  ? Math.min(1.0, intensity * 1.25)
  : intensity

const reason = axisActivation
  ? `${baseReason} ${buildSynastryAxisSuffix(axisActivation)}`
  : baseReason
```

The cap at `1.0` ensures the multiplier never pushes intensity above the maximum value.

For **Priority 1 (power)**: the `transitingPlanet` is `bestContact.planet` — the slow planet with the tightest angle contact. The axis check uses this planet's longitude from `snapshot.transitPlanets`.

For **Priority 2 (shift with aspect co-occurrence)**: the axis check uses the tightest qualifying aspect's transit planet, if that planet is in `SLOW_PLANETS_FOR_BANNER`.

For **Priority 3 (favorable)** and **Priority 4 (challenging)**: the axis check uses the highest-weighted transit planet among the tight applying aspects, if that planet is in `SLOW_PLANETS_FOR_BANNER`.

For **Priority 2 (pure shift — no co-occurring aspect)**: no synastry axis augmentation. A station crossing is already scored at fixed `intensity: 0.8`. Augmenting it with a synastry axis would conflate two separate phenomena.

### 6. Reason Suffix Construction

A new helper `buildSynastryAxisSuffix` takes a `SynastryAxisActivation` and returns a string suffix. This suffix is appended to the existing reason string with a space.

**Format:** `"— and resonates with the [adjective] [planet1]-[planet2] axis between the two of you."`

Where:
- `[adjective]` is derived from `synastryNature`:
  - `'harmonious'` → `"harmonious"`
  - `'challenging'` → `"tense"`
  - `'neutral'` → omit the adjective entirely
- `[planet1]` is `person1Planet` (the Person 1 planet's name)
- `[planet2]` is `person2Planet` (the Person 2 planet's name)

Examples:
- Venus-Mars harmonious conjunction: `"— and resonates with the harmonious Venus-Mars axis between the two of you."`
- Moon-Saturn challenging square: `"— and resonates with the tense Moon-Saturn axis between the two of you."`
- Sun-Sun neutral conjunction: `"— and resonates with the Sun-Sun axis between the two of you."`

The suffix must be short enough to remain readable after the existing reason string. The full combined string (base reason + suffix) should not exceed 200 characters. If the base reason is already long, the suffix may be truncated at a word boundary.

**No lookup table is needed.** The suffix is assembled dynamically from the planet names and nature field already present on `SynastryAspect`. This scales to any planet pair without maintenance.

### 7. Orb Threshold for Axis Check

The axis check uses `orbs.angleContact` from `ORB_THRESHOLDS[period]` as the transit orb threshold:
- `daily`: 1.0°
- `weekly`: 2.0°
- `monthly`: 3.0°

The tight synastry aspect threshold is fixed at `<= 2.0°` regardless of period. This value is not parameterized — it reflects the astrological principle that only tight orb cross-chart aspects represent genuinely sensitive relational degrees. At 2.1° or looser, the cross-chart contact is no longer precise enough to anchor a "sensitive axis" claim.

The two orb criteria are independent: the transit-to-natal-planet orb uses `orbs.angleContact`; the synastry aspect orb uses the fixed `2.0°` threshold. Both must be satisfied independently. There is no combined or averaged orb — meeting one condition while failing the other does not qualify.

### 8. Which Synastry Aspects Qualify

Any `SynastryAspect` with `orb <= 2.0°` qualifies for pre-filtering, regardless of aspect type or nature. The following aspect types are included: conjunction, trine, sextile, square, opposition. Minor aspects (semi-sextile, quincunx) are included if `ASPECT_DEFINITIONS` in `synastry.ts` contains them and they have a synastry aspect recorded within 2.0° orb.

Planet scope: all planets included in `calculateSynastryAspects` qualify — this includes Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, NorthNode, and any asteroids (Chiron etc.) that appear in the chart. No additional filtering by planet type is applied at the pre-filter stage. The transiting planet restriction (slow planets only) is applied at detection time, not at pre-filter time.

### 9. Intensity Augmentation Cap and Behavior

The intensity multiplier is fixed at **1.25** (25% increase). The post-multiplication value is capped at `1.0`. This means:

- A marker already at full intensity (`1.0`) is not visibly changed in intensity, but the reason suffix still fires. The suffix is the primary user-visible signal of axis activation.
- A marker at `0.8` intensity becomes `min(1.0, 0.8 × 1.25) = 1.0` — a meaningful visual step.
- A marker at `0.5` becomes `min(1.0, 0.5 × 1.25) = 0.625`.

The multiplier is not configurable and does not compound across multiple activated synastry pairs in the same snapshot. Even if two synastry pairs are simultaneously within orb of the transit, the multiplier is applied once using the tightest-orb activation.

### 10. UI States

**When axis is activated:** The existing marker dot on the overview strip renders with the same category color as before (gold for power, green for favorable, red for challenging). No new dot shape or color is introduced. The intensity increase may cause the dot to render at slightly higher brightness via the existing `intensity`-driven opacity/scale in `MarkerDot`. The banner reads the augmented reason string, which ends with the synastry suffix. No new UI element is introduced for the axis activation itself — the suffix in the reason string is the sole presentation layer.

**When axis is not activated:** No change from current behavior.

**Banner integration:** The `reason` field on `SnapshotScore` is a plain string. The suffix is appended to this string before the `SnapshotScore` is returned. The banner renders `snapshot.score.reason` unchanged. No new field is added to `SnapshotScore` for the axis suffix — the augmented reason is the complete string.

**Tooltip:** The `MarkerTooltip` component renders `marker.score.reason`. When axis activation fires, the tooltip shows the augmented reason including the suffix.

### 11. Prerequisite: `computeCombinedWeight` Parity

The synastry axis augment must not be built on top of `computeEnergyRating`-gated base markers. As documented in the Carmack and Taleb voice files, `computeEnergyRating` can fire favorable and challenging markers on Mercury+Sun cluster noise that `computeCombinedWeight` would correctly suppress. Augmenting that noise with a synastry axis suffix produces confident-sounding misinformation: "Jupiter flows through the relationship's romantic axis — and resonates with the harmonious Venus-Mars axis between the two of you" would fire when Jupiter is part of a weak cluster that should not have produced a marker at all.

**The `computeCombinedWeight` parity task (Priorities 2–4 in `scoreCoupleSnapshot`) must land in the same sprint and in the same task sequence, before the synastry axis augment is implemented.** These are not independent tasks.

### 12. Edge Cases

**Both poles within orb simultaneously:** If both `p1Planet.longitude` and `p2Planet.longitude` are within `transitOrb` of the transit (which can occur when the synastry aspect orb is smaller than the transit orb — e.g., a 0.5° conjunction and a 3.0° monthly transit window), the activation records the pole with the smaller contact orb. Both poles are not reported separately.

**Planet not found in chart:** If `chart1.planets.find(p => p.name === aspect.person1Planet)` returns `undefined`, this synastry aspect is silently skipped. This can occur if the aspect list references a body (asteroid, NorthNode) not present in a stripped chart build. No error is thrown.

**No tight synastry aspects exist:** If `tightSynastryPairs` is empty (a couple with no cross-chart aspect tighter than 2.0°), the check short-circuits immediately. No false activations. No performance impact beyond the empty list check.

**Multiple tight synastry pairs activated simultaneously:** Only the tightest-contact activation is used for the suffix. The first planet pair in the sorted-by-contact-orb result is reported. Multiple simultaneous activations are not stacked.

**Synastry axis activation on a shift marker:** The pure shift category (station crossing with no co-occurring aspect) is explicitly excluded from axis augmentation per Specification 5. A shift marker reason built from `buildCoupleShiftReason` is not modified.

**Chart with `unknownTime: true`:** The synastry axis check has no birth-time dependency. It checks only natal planet longitudes, which are computed for both known-time and unknown-time charts. The `bothTimesKnown` guard that gates Priority 1 (angle contact) does not apply here.

**Transit planet not in `SLOW_PLANETS_FOR_BANNER`:** The function immediately returns `null` without iterating `tightSynastryPairs`. Fast-planet transits never trigger axis activation.

### 13. Acceptance Checks

1. **Basic activation fires:** Configure a test case where Saturn's simulated longitude in a monthly snapshot is within 3.0° of Person 1's natal Venus, and Person 1's natal Venus is in conjunction with Person 2's natal Mars at ≤ 2.0° orb. Verify the snapshot's reason string ends with the synastry suffix and intensity is multiplied.

2. **Fast-planet exclusion:** Same setup as above but with Jupiter as the transiting planet and `SLOW_PLANETS_FOR_BANNER` not including Jupiter. Verify no suffix fires. (Note: Jupiter is in `COMBINATION_PLANETS` but not `SLOW_PLANETS_FOR_BANNER` — the distinction matters here.)

3. **Loose synastry exclusion:** Same setup but with the Person 1 Venus - Person 2 Mars synastry aspect at 3.0° orb. Verify the pre-filter excludes it and no suffix fires, even though the transit is within orb of Person 1's Venus.

4. **Midpoint ghost-degree non-firing:** Place the transit at the exact midpoint between Person 1's Venus and Person 2's Mars (1° from each), where the `transitOrb` threshold for daily period is 1.0°. The direct-longitude check will find a 1.0° contact to each natal planet — whether it fires depends on whether 1.0° is within the `<= transitOrb` threshold. For daily (threshold = 1.0°), this is exactly on the boundary and should fire. For a 0.5° midpoint offset (0.5° transit orb to each natal planet), it fires correctly on both poles. Verify that a transit placed 2° from the midpoint but 1° from one natal planet fires (direct check catches it) while a midpoint-only implementation would miss it.

5. **Intensity cap:** Configure a power marker that already computes to `intensity = 1.0` before augmentation. Verify the post-augmentation intensity remains `1.0`.

6. **Multiple activations → tightest wins:** Place two tight synastry pairs, both within transit orb. Verify the suffix names only the tighter-contact pair.

7. **No tight synastry pairs → no augmentation:** Pre-filter produces empty list. Verify `scoreCoupleSnapshot` returns identical results to the current implementation.

8. **Reason string length guard:** Construct a base reason that is 180 characters long. Verify the combined string (base + suffix) is truncated to ≤ 200 characters at a word boundary.

9. **`computeCombinedWeight` prerequisite:** Verify that the favorable/challenging markers that receive synastry augmentation are gated by `computeCombinedWeight` (weight threshold ≥ `COMBINATION_WEIGHT_THRESHOLD` with a slow planet present, or ≥ `COMBINATION_WEIGHT_THRESHOLD * 2` without). A Mercury+Venus favorable cluster that would not pass `computeCombinedWeight` should not receive a synastry suffix.

---

## Out of Scope

- **Synastry axis activation for composite angle contacts (Priority 1):** Priority 1 fires when a slow planet is within `angleContact` orb of the composite Ascendant or Midheaven. This is a structural contact with the composite chart's identity axis, not a natal planet transit. The synastry augment does not apply to Priority 1 markers — composite angle contacts already represent the highest-intensity category and do not need further augmentation.

- **House overlay activation:** The `HouseOverlay` data in `synastryData` is not consulted. Detecting that a transiting planet activates a house in which the partner's planets reside is a different and more complex calculation.

- **Composite house computation:** Composite planets have `house: 0` (deferred since sprint 0011). This feature does not require composite house data and does not unblock or accelerate that deferral.

- **Changes to `SynastryPage.tsx` or the static compatibility view:** The axis augment is confined to `scoreCoupleSnapshot` in `CoupleAdvanceTab.tsx`. The synastry reading page's static aspect grid is not modified.

- **New marker category or dot visual for axis activations:** No new category is added to `MarkerCategory`. The activation surfaces only through the augmented reason suffix and the intensity increase. A future sprint could introduce a visual indicator (e.g., a dot overlay glyph) if product testing shows users miss the textual suffix.

- **GPT interpretation of synastry axis activations:** All advance banner text is rule-based. No GPT calls are introduced.

- **Parameterized tight synastry orb threshold:** The 2.0° threshold is hardcoded. A configurable threshold is not part of this feature.

- **Augmentation for the shift co-occurrence path (Priority 2 + favorable/challenging):** When a shift marker co-occurs with a favorable or challenging aspect constellation, the axis check may be applied to the co-occurring aspect's transit planet if that planet is a slow planet. This is additive and follows the same logic as Priority 3/4. The pure shift branch (no co-occurring aspect) is excluded.

---

## Open Questions

1. **Suffix phrasing validation:** The proposed suffix format — "— and resonates with the harmonious Venus-Mars axis between the two of you" — has not been tested with real users. An alternative phrasing: "— touching the Venus-Mars connection that defines your attraction" names the relational character rather than using "axis." Both should be considered before implementation locks in the string.

2. **Should Jupiter be included?** Jupiter is excluded from `SLOW_PLANETS_FOR_BANNER` and therefore from the synastry axis augment. However, Jupiter transits over a tight Venus-Mars synastry conjunction can be a genuinely significant romantic window. The argument for exclusion is that Jupiter moves faster (~1 year per sign) and its contacts are more frequent, increasing false-activation risk. The argument for inclusion is that Jupiter transits over a natal synastry pole are still meaningful and the tight-orb synastry pre-filter already provides quality control. This should be resolved by product before implementation.

3. **Suffix for North Node contacts:** The `SynastryAspect` type includes `NorthNode` as a valid planet name. A tight NorthNode-Sun synastry contact is astrologically significant (karmic direction meeting core identity). Including NorthNode in the axis check is supported by the current implementation, but the suffix phrasing ("resonates with the harmonious NorthNode-Sun axis between the two of you") is awkward. A NorthNode-specific phrasing ("touches the karmic Sun-NorthNode connection in your synastry") may be warranted.

4. **Both birth times unknown:** When `bothTimesKnown` is `false` and Priority 1 (composite angle contact) is gated out, the synastry axis augment still runs on Priorities 3 and 4. For charts with `unknownTime: true`, house placements are unavailable but natal planet longitudes remain valid. The axis check works correctly in this case. No issue. Documenting for clarity.

5. **Performance at daily period (30 steps × up to 100 synastry aspects):** At daily period, 30 snapshots × pre-filtered list (typically 0–5 tight pairs) × 2 planet lookups per pair = negligible. At monthly period, 37 steps × same. The pre-filter overhead is a single `.filter()` over up to 100 elements, run once. Total performance impact is measured in microseconds. No concern.

6. **Suffix placement when `guidance` field is also present:** A separate proposal (`issue-couple-advance-banner-bold-fragment.md`) adds a `guidance?: string` field to the couple reason builders. The synastry axis suffix is part of the `reason` string, not the `guidance` string. The `guidance` paragraph should remain the forward-looking action prompt ("This is a window to talk about what has been unspoken between you..."), separate from the synastry axis activation note in the reason sentence. Verify the two features are compatible when both land in the same sprint.
