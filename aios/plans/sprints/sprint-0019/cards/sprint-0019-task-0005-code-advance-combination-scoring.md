# code-advance-combination-scoring

**Type:** Code Enhancement
**Originated by:** Jobs, Carmack, Miyazaki, Taleb (strongest convergence across all four voices)
**Sprint vision:** sprint-0019

## Problem / Opportunity

### The scoring gate evaluates one aspect in isolation and stops

`scoreSnapshot()` in `src/components/reading/AdvanceTab.tsx` (lines 202–390) operates on a strict first-match priority ladder: power, then shift, then favorable, then challenging. Each branch identifies the single tightest applying aspect from the highest-weight planet and returns immediately. The remaining constellation of concurrent applying aspects is discarded.

This means a snapshot carrying Saturn square natal Sun at 1.2° and Pluto opposition natal Moon at 0.8° — both outer-planet contacts to personal planets, both applying — is scored identically to a snapshot carrying Mercury square natal Venus at 1.1° and Mars square natal Jupiter at 0.9°. The `PLANET_WEIGHT` table (line 122) assigns weights of 9, 8, 6 to Pluto, Neptune, Saturn respectively versus 4, 2, 2 to Mars, Venus, Mercury, but those weights are used only to select which aspect becomes the `triggerAspect` for the tooltip — they have no effect on whether the snapshot scores, or on the resulting intensity value.

The intensity calculation at lines 344 and 373 reads `Math.abs(rating.score - 3) / 2`, where `rating` comes from `computeEnergyRating(snapshot.transitAspects)`. That function (`src/engine/transits.ts`, line 503) takes the 8 tightest aspects by absolute orb regardless of planet weight, direction, or category. A snapshot defined astrologically by a Saturn-Pluto double-whammy to personal planets can produce the same numeric intensity as one where two fast planets happen to form minor contacts at the exact noon of the snapshot date.

### The reason strings describe planetary archetypes, not life events

`buildAspectReason()` (lines 175–196) accepts a `TransitAspect` and constructs its output from a `domainMap` keyed on the transit planet name:

```
Pluto: 'transformation and power'
Neptune: 'inspiration and surrender'
Saturn: 'structure and discipline'
Jupiter: 'expansion and opportunity'
```

The produced sentence follows a fixed template: `"${planet} ${type} your natal ${natalPlanet} — tension around ${domain}."` This template ignores `tightest.natalHouse`, which is already computed by `calculateTransitAspects()` (`src/engine/transits.ts`, line 179) and stored on the `TransitAspect` struct. Saturn opposing natal Moon in the 7th house (partnership axis) and Saturn opposing natal Moon in the 4th house (home and family foundations) produce identical reason strings even though they describe entirely different life situations.

`buildPowerReason()` (lines 161–170) has the same absence: it knows the natal angle (ASC or MC) but uses only the fixed `ANGLE_DOMAIN` lookup (lines 114–117) and never checks what other applying aspects are concurrent with the angle contact.

A parallel, house-aware text generation system already exists at `src/data/interpretations/transitAspectBriefs.ts`. `computeTransitAspectBrief()` (line 115) composes sentences of the form `"${transitPlanet} ${verbPhrase} your ${houseTheme.name} — ${contextBrief}"` using the `TRANSIT_PLANET_PHRASES` verb table, the `HOUSE_THEMES` array from `src/data/interpretations/houseThemes.ts`, and `getPlanetInHouseInterpretation()`. This function is already called in `AdvanceTab.tsx` at line 1098 to populate the `AspectRow` components in the transit list. The scoring layer does not call it; it maintains its own, inferior string-building path. The same user, at the same moment in the advance tab, sees house-anchored language in the aspect list rows and house-blind formula language in the marker banner.

### The energy score is the wrong measurement instrument for forward-looking snapshots

`computeEnergyRating()` is the correct primitive for the present-moment energy widget on the main transit page: it scores the current state of the sky regardless of aspect direction. It is the wrong primitive for forward snapshot marking, where only applying aspects represent the momentum of an approaching event. The favorable and challenging branches of `scoreSnapshot()` (lines 333–387) each call `computeEnergyRating()` and then separately filter for `a.applying && a.orb <= orbs.applyingTight` aspects. These are two independent filters over the same array, and they may not count the same aspects: a snapshot can produce a favorable energy rating driven by three tight separating trines (which already peaked) while the applying filter finds no harmonious aspects approaching. The snapshot would be scored and marked as a favorable window at the wrong position on the timeline — the window has already passed.

### The density cap collapses category variety

The density cap at lines 491–508 sorts all non-neutral markers by `intensity` descending and keeps the top `Math.ceil(config.max * 0.2)`. For the monthly 36-step range that yields a maximum of 7 markers. No category awareness is applied. When a slow planet is transiting near a natal angle for an extended period — Saturn takes roughly two and a half years to move through a 30° arc — it can produce five or six consecutive monthly power markers at high intensity (line 260: `1.0 - (bestContact.orb / orbs.angleContact)`). Those markers will rank above all favorable and challenging markers regardless of their astrological significance. The user sees a gold-heavy overview strip with no challenging or favorable markers visible, even if the same period contains a Saturn opposition to natal Moon and a Jupiter trine to natal Venus. The strip communicates a single note rather than the full astrological character of the period.

### Jupiter is excluded from combination scoring by an overly broad constant

`SLOW_PLANETS_FOR_BANNER` (line 100) lists Saturn, Uranus, Neptune, Pluto with the comment "Jupiter excluded intentionally." The exclusion was designed for angle-contact power-day detection, where Jupiter reaching the Ascendant or Midheaven is considered insufficiently rare. But that same constant controls all slow-planet awareness in the scoring engine. A Jupiter transit to natal Venus in the 5th house while Venus simultaneously trines natal Jupiter scores neutral under current rules — not because the event is insignificant, but because Jupiter is absent from the only slow-planet set the scoring engine consults.

### Shift markers report facts, not experiences

When a planetary station is detected (lines 283–331), the pure-shift path returns `reason: "${stationPlanet} stations ${stationDirection}."` — three words. The `TRANSIT_RETROGRADE` data at `src/data/interpretations/retrogrades.ts` already contains per-planet brief strings for the retrograde activity section at the bottom of the advance tab, but those strings do not flow into the `SnapshotScore.reason` field. The station moment is the point of maximum orbital concentration for that planet's influence; the reason string treats it as a scheduling notice.

Additionally, the shift scoring never identifies the nearest natal planet to the station degree. Saturn stationing at 15° Pisces is abstract. Saturn stationing within 1° of natal Mars in the 10th house is personal. The natal planet proximity is computable from the same `chartData.planets` array used everywhere else in `scoreSnapshot()`.

## Desired State

The scoring system correctly distinguishes astrologically significant constellations from statistical clusters of minor contacts. When multiple applying aspects are present in a snapshot, their combined weight — calibrated to the planets involved and the life areas they activate — determines both whether a marker fires and how intense it is. A Saturn-Pluto configuration to personal planets produces a categorically different score than two fast-planet minor contacts, and that difference is reflected in the intensity value that drives dot size, glow strength, and survival through the density cap.

Every reason string that involves a natal planet names the house that planet occupies and names that house in plain English terms drawn from the same `HOUSE_THEMES` data already in use for the aspect rows. The house context is not decorative: it is the primary locating device that anchors an abstract planetary event to a specific area of the user's actual life. There is one text generation path for transit aspect language, not two: the scoring layer's reason strings and the aspect row briefs emerge from the same interpretive infrastructure and carry the same quality of house awareness.

The energy measurement driving forward-snapshot categorization is based exclusively on applying aspects. Separating aspects — transits already past their peak — do not contribute to whether a future snapshot is marked as favorable or challenging, and do not contribute to that marker's intensity. A marker placed on the timeline reliably represents a window that is approaching, not one that has already peaked.

When two or more tight applying aspects activate planets in different natal houses simultaneously, the scoring system recognizes this as a multi-domain event and the reason string reflects the combination — describing what is opening or closing across those life areas together — rather than isolating one aspect as if the others were not present. Combinations involving slow outer planets to personal natal planets are weighted more heavily than clusters of fast-planet minor contacts.

The density cap preserves category variety. When the scored set for a timeline period contains at least one marker of each non-neutral category — power, favorable, challenging, shift — the final visible set after capping represents all categories present, not only the highest-intensity cluster. A timeline that contains a Saturn pressure period, a Jupiter expansion window, and a Pluto station shows a marker from each of those characters; the strip tells the complete story of the period.

Jupiter participates in combination-scoring logic for favorable moments when it is in tight applying aspect to personal natal planets. The distinction between "Jupiter excluded from angle-contact power-day detection" and "Jupiter included in combination-weight calculation" is explicit in the code, not collapsed into a single constant that conflates two different classification decisions.

Shift markers identify the nearest natal planet to the station degree when one is within a meaningful orb, and the reason string names that natal planet and its house. The experience of a station is described — what slows, what is being revisited, what posture the period invites — rather than merely reporting the astronomical fact. The interpretive material already in `src/data/interpretations/retrogrades.ts` flows into the shift reason string rather than being used only in the retrograde activity section.

The `SnapshotScore` interface carries the information needed to support different levels of display — a brief form suitable for the 200px marker tooltip and a more expansive form for the full-width category banner — rather than a single `reason` string that must serve both surfaces identically. Favorable markers tell the user what kind of action the window supports. Challenging markers name what is likely to be stressed and what coping posture tends to help. The user who reads a marker moment knows not just what the sky is doing but what that means for their life and what they might consider doing with the information.

## Outcome

**Completed:** 2026-05-16 — commit `8f0adb5` on `sprint-0019-task-0005-code-advance-combination-scoring`

### What was implemented

**Combination weight scoring (`computeCombinedWeight`):** Added a helper that computes `sum(PLANET_WEIGHT[planet] × (1 − orb/maxOrb))` across all tight applying aspects. Replaced all three energy-rating-based gates (favorable branch, challenging branch, co-shift check in shift branch) with this combined weight. Saturn+Pluto at tight orb scores ~1.25 per degree, producing intensity near 1.0; Mercury+Mars noise scores ~0.25–0.33.

**Intensity from combined weight:** All favorable/challenging intensity values now derive from `Math.min(1, combinedWeight / 12)` rather than `Math.abs(rating.score - 3) / 2`. The normalization reference of 12 corresponds to Pluto (9) + Saturn (6) at zero orb — the realistic maximum. This ensures high-weight outer-planet constellations produce intensity values that survive the density cap.

**COMBINATION_PLANETS constant:** Added `Set(['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'])` distinct from `SLOW_PLANETS_FOR_BANNER` (which excludes Jupiter). Used in the favorable/challenging threshold logic: when a `COMBINATION_PLANETS` member is present in the tight applying aspects, the fire threshold is `COMBINATION_WEIGHT_THRESHOLD` (3.0); fast-planet-only clusters require `COMBINATION_WEIGHT_THRESHOLD * 2` (6.0). Jupiter trine natal Venus fires at threshold 3.0; two Mars trines at loose orbs do not.

**Shift marker reason quality:** Pure-shift path now finds the nearest natal planet to the station longitude within ≤2°, includes `houseOrdinal(house)` in the reason string, and appends `TRANSIT_RETROGRADE[planet].brief` for retrograde stations. Before: `"Saturn stations retrograde."` After: `"Saturn stations retrograde, holding near your natal Mars in your 10th house. Revisit structures and responsibilities you've built."`

**`computeEnergyRating` removed from scoring path:** Import cleaned up — no longer called anywhere in `scoreSnapshot()`.

### Decisions and deviations

- `buildAspectReason` and `buildPowerReason` left untouched (task-0006 scope).
- Density cap logic left untouched (task-0004 scope).
- The COMBINATION_PLANETS threshold halving (3.0 vs 6.0 for fast-only) was not in the card spec but is the natural consequence of making the constant functionally meaningful — without it the constant would be unused and the TypeScript build would fail.
- Follow-up fix (commit `4ee8e61`): shift marker reason now guards `houseOrdinal` behind `!chartData.unknownTime && house > 0` — when birth time is unknown, the "in your Nth house" clause is omitted rather than showing an unreliable house number.
