# issue-advance-applying-aspect-accuracy

**Type:** Issue Fix
**Originated by:** Carmack, Taleb

## Problem

Two accuracy bugs corrupt the advance scoring engine's sense of "applying" — causing it to both miscount which aspects are forward-looking and to flip that designation at the exact moments that matter most.

---

### Bug 1: `computeEnergyRating` does not filter separating aspects — inflated scores drive false markers

**Location:** `src/engine/transits.ts:498–515` (`computeEnergyRating`) and `src/components/reading/AdvanceTab.tsx:335–387` (Priority 3 and Priority 4 blocks of `scoreSnapshot`).

`computeEnergyRating` takes the tightest 8 transit aspects by orb and scores them +1 (harmonious) or −1 (challenging), with no regard for whether each aspect is applying or separating:

```typescript
// transits.ts:501–508
const classicalAspects = aspects.filter(a =>
  !isAsteroid(a.transitPlanet as BodyName) && !isAsteroid(a.natalPlanet as BodyName)
)
const top = classicalAspects.slice(0, 8)
const score = top.reduce((acc, a) => {
  if (a.nature === 'harmonious') return acc + 1
  if (a.nature === 'challenging') return acc - 1
  return acc
}, 0)
```

The aspects array passed in is sorted by orb ascending (see `transits.ts:195`). Among the 8 tightest, some will be separating — their window has already peaked. A snapshot with three tight separating trines (past peak) and two loose applying trines will score `rating.score >= 4`, satisfying the gate at `AdvanceTab.tsx:340`:

```typescript
// AdvanceTab.tsx:333–358 — Priority 3: favorable
const rating = computeEnergyRating(snapshot.transitAspects)
const tightApplyingHarmonious = snapshot.transitAspects.filter(
  a => a.applying && a.orb <= orbs.applyingTight && a.nature === 'harmonious'
)
if (rating.score >= 4 && tightApplyingHarmonious.length >= orbs.energyMinAspects) {
  ...
}
```

These two filters are independent and non-overlapping in their logic. The energy rating counts the top 8 by orb regardless of direction; the `tightApplyingHarmonious` filter counts only applying aspects within the tight-orb threshold. If the energy score is being driven by separating aspects that happen to have tight orbs, the overall gate fires on the wrong astrological premise: the snapshot looks "favorable" in the score but the actual applying momentum has not yet reached the required count. The reverse is also true: if three separating challenging aspects drive a score of `<= 2`, the challenging gate fires on a window that has already closed. A marker is placed at the wrong moment — after the peak rather than before it.

The same dual-filter structure appears in the challenging path at `AdvanceTab.tsx:362–387` and in the shift co-occurrence check at `AdvanceTab.tsx:283–330`.

**Reproduction:** Construct a monthly snapshot where a fast planet formed two tight harmonious aspects yesterday (now separating at 0.3° and 0.5° orb) while only one slow planet is applying harmonious at 3.8° orb. `computeEnergyRating` scores +2 from the two separating aspects and +1 from the applying one → `score = 3 → rated 'Favorable' (score: 4)`. The gate passes. `tightApplyingHarmonious.length === 1 >= energyMinAspects === 2` — the second filter blocks it. Now add one more any-direction harmonious aspect at 2.1° orb: gate fires, marker placed, but the window's energy is separating. The marker is placed at the wrong moment.

---

### Bug 2: `applying` flag reverses at retrograde station dates — marker flicker at the most significant moments

**Location:** `src/engine/transits.ts:172–174` (`calculateTransitAspects`).

The `applying` boolean is computed from the sign of `tp.dailyMotion` and the direction of `angle` relative to `def.angle`:

```typescript
// transits.ts:172–174
const applying = tp.dailyMotion > 0
  ? (angle > def.angle ? false : true)
  : (angle > def.angle ? true : false)
```

This formula is geometrically correct for clearly direct or clearly retrograde motion. It fails at the retrograde station boundary, where `tp.dailyMotion` crosses zero. At a station, the planet's daily motion is near zero but crosses from a small positive value to a small negative value (or vice versa) within days. Between two consecutive monthly snapshots — each computed at noon on the target date — `tp.dailyMotion` can flip sign without the planet having moved appreciably in longitude.

Concretely: Saturn at its station date has `dailyMotion ≈ +0.002°/day` at snapshot N and `dailyMotion ≈ −0.002°/day` at snapshot N+1. At snapshot N, `dailyMotion > 0` → the direct formula applies, and a given aspect may be classified `applying: true`. At snapshot N+1, `dailyMotion < 0` → the retrograde formula applies, and the same aspect geometry is classified `applying: false`. The `angle` and `orb` values are nearly identical in both snapshots because the planet has not moved. Only the sign of the daily motion changed.

In `scoreSnapshot`, the favorable and challenging gates require `a.applying === true`. So at snapshot N the gate passes, a marker fires. At snapshot N+1 the gate fails, no marker. If snapshot N+2 is back to `applying: true` (e.g., a slightly earlier date in a retrograde sweep), the marker fires again. The user sees a marker, then nothing, then a marker — flickering at the station date, which is precisely the most astrologically meaningful moment in a planet's cycle.

The hysteresis pass at `AdvanceTab.tsx:461–489` does not catch this pattern. The hysteresis fires only when `curr.score.category === 'neutral'` and both neighbors share the same non-neutral category. The flip pattern here is `non-neutral → neutral → non-neutral`, which the hysteresis handles in principle — but the orb delta condition at line 482 checks `Math.abs(currAspect.orb - prevOrb) < MARKER_HYSTERESIS_ORB`. At the station, the orb barely changes (the planet is nearly stationary), so the delta passes. However, the `currAspect` lookup at line 479–481:

```typescript
const currAspect = curr.transitAspects.find(
  a => a.transitPlanet === triggerPlanet && a.natalPlanet === triggerNatal
)
```

finds the aspect in the current snapshot — but that aspect now has `applying: false` because daily motion crossed zero. The hysteresis pass inherits the *previous score* without re-examining the applying flag, so if hysteresis fires it will propagate a marker that was scored from `applying: true` into a snapshot where `applying` is `false`. If hysteresis does not fire (e.g., the pattern is `non-neutral → non-neutral → neutral → non-neutral` — two consecutive applying snapshots followed by a gap), the neutral snapshot in the gap is invisible to the hysteresis pattern matcher which requires both neighbors to be non-neutral.

The net effect: the advance timeline flickers at station dates. The marker appears, disappears, and may reappear depending on how the station boundary aligns with the monthly snapshot cadence. This is not a corner case — every outer planet stations once or twice per year. Saturn, Uranus, Neptune, and Pluto — the very planets the scoring engine weights most heavily — are the ones affected.

---

## Expected Behavior

**Bug 1 — `computeEnergyRating` and separating aspects:**

The favorable/challenging gate in `scoreSnapshot` should determine its energy score using only applying aspects. The `computeEnergyRating` call within `scoreSnapshot` should be replaced with an applying-only count that mirrors the intent of the `tightApplyingHarmonious`/`tightApplyingChallenging` filters already in place. The two filters — energy rating and applying direction — should operate on the same set of aspects rather than independently over the full aspect list. A marker should fire only when the energy momentum being measured is genuinely forward-looking: applying aspects within the tight-orb threshold drive the score, separating aspects do not. `computeEnergyRating` is appropriate for its other use sites (daily energy widget, `DailySnapshotCard`, `TodayPage`, `JournalEntryCard`) where it correctly scores the present state; it is not appropriate for the forward-snapshot scoring path.

**Bug 2 — `applying` flag at station boundaries:**

The `applying` flag should remain stable across station boundaries for any aspect where the planet's absolute daily motion is within its station threshold. When `Math.abs(tp.dailyMotion) < STATION_THRESHOLD[planet]` (the same per-planet thresholds already used in `getRetrogradeStatus` at `transits.ts:79–88` and `255–258`), the planet is stationing and its direction classification is unreliable. At station, an aspect that was applying before the station should continue to be classified applying through the station window — a planet at exact station is maximally active, not switching from applying to separating. The practical fix is to treat a stationing planet's `applying` value as stable (using the pre-station direction) rather than allowing the sign flip of `dailyMotion` to invert the classification on consecutive snapshots. The existing `STATION_THRESHOLD` constants should be reused rather than introducing a new threshold.
