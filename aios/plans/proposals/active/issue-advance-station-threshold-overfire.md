## Type
Issue Fix

## Originated by
Taleb (Section 3.2), Carmack

## Problem

`getRetrogradeStatus` in `/projects/astrology-reader/src/engine/transits.ts` (line 227) applies a single `0.02°/day` stationing threshold to every planet:

```typescript
// transits.ts, line 238
const isStationing = Math.abs(motion) < 0.02
```

The function iterates over `PLANET_NAMES`, skipping Sun and Moon, and classifies any planet whose absolute daily motion falls below this fixed value as `'Stationing retrograde'` or `'Stationing direct'`:

```typescript
// transits.ts, lines 227–246
export function getRetrogradeStatus(date: Date): { planet: PlanetName; isRetro: boolean; status: string }[] {
  const time = Astronomy.MakeTime(date)
  const statuses: { planet: PlanetName; isRetro: boolean; status: string }[] = []

  for (const name of PLANET_NAMES) {
    if (name === 'Sun' || name === 'Moon') continue
    const body = BODY_MAP[name]
    const motion = getDailyMotion(body, time)
    const isRetro = motion < 0

    // Check if recently stationed (very slow motion)
    const isStationing = Math.abs(motion) < 0.02
    let status = isRetro ? 'Retrograde' : 'Direct'
    if (isStationing) status = isRetro ? 'Stationing retrograde' : 'Stationing direct'

    statuses.push({ planet: name, isRetro, status })
  }

  return statuses
}
```

The threshold of `0.02°/day` is appropriate for Mercury (which moves ~1.2–1.7°/day when direct and slows to near-zero before an actual station) but is not appropriate for the outer planets, whose *normal* direct or retrograde motion routinely falls below this value:

| Planet | Typical direct motion | Typical retrograde motion | Actual station velocity |
|--------|----------------------|--------------------------|------------------------|
| Mercury | 1.2–1.7°/day | −1.0 to −1.5°/day | ~0.02°/day |
| Venus | 1.0–1.3°/day | −0.6 to −0.7°/day | ~0.05°/day |
| Mars | 0.4–0.7°/day | −0.3 to −0.4°/day | ~0.03°/day |
| Jupiter | 0.08–0.14°/day | −0.04 to −0.05°/day | ~0.015°/day |
| Saturn | 0.03–0.04°/day | −0.02 to −0.03°/day | ~0.01°/day |
| Uranus | 0.01–0.06°/day | −0.02 to −0.03°/day | ~0.008°/day |
| Neptune | 0.01–0.04°/day | −0.01 to −0.02°/day | ~0.006°/day |
| Pluto | 0.005–0.03°/day | −0.005 to −0.02°/day | ~0.005°/day |

Saturn, Uranus, Neptune, and Pluto move below `0.02°/day` for extended stretches of normal orbital motion — not only at their true stations. As a result, `getRetrogradeStatus` returns `status: 'Stationing retrograde'` (or `'Stationing direct'`) for these bodies across weeks or months at a time even when no actual station is occurring.

**Impact on the Advance tab marker system (Sprint 0018):** The sprint-0018 vision (`/projects/astrology-reader/aios/plans/sprints/sprint-0018/vision.md`, lines 74–82) defines a `shift` marker category driven by the detection of stationing events. The scoring function `scoreSnapshot` will read from `snapshot.retrogrades[*].status` (which is already populated by `getRetrogradeStatus` in each `preCalculateSnapshots` iteration at `AdvanceTab.tsx:167`). Because `getRetrogradeStatus` overcalls `'Stationing'` for outer planets, `shift` markers will be emitted for nearly every snapshot that falls in Saturn's or Neptune's retrograde arc — potentially 6–8 consecutive monthly snapshots per planet per retrograde cycle. In a 36-month monthly slider, this means blue shift markers could appear for 15–20% of all positions from Saturn alone, and further density from Uranus, Neptune, and Pluto. The overview strip, intended to help the user see genuine peaks and valleys across the period, becomes a blue-dominant band of false positives. As Taleb's analysis concludes (Section 3.2): "The user will drag to those months expecting dramatic astrological events. They will find Saturn is merely moving slowly through Taurus."

**Reproduction:** Call `getRetrogradeStatus` on any date when Saturn is in the middle of its retrograde arc (which lasts roughly 4.5 months per year). Saturn's motion during this period is approximately −0.02 to −0.03°/day. A date falling in the middle of the arc — far from the actual station — returns `status: 'Stationing retrograde'` because `|−0.02| < 0.02` is true for the lower bound and is only narrowly missed at −0.025. On any date near the flat part of Saturn's retrograde arc, the threshold fires spuriously.

## Expected behavior

`getRetrogradeStatus` should use a per-planet stationing threshold map that reflects each body's actual station velocity, not a single value calibrated only for Mercury. A planet should only be classified as `'Stationing'` when its daily motion is approaching or within the range it actually reaches at a genuine station — not simply because it is a slow-moving body.

**Per-planet threshold map to replace the single `0.02` constant:**

```typescript
// transits.ts — replace the single isStationing threshold at line 238

const STATION_THRESHOLD: Partial<Record<PlanetName, number>> = {
  Mercury: 0.020,
  Venus:   0.050,
  Mars:    0.030,
  Jupiter: 0.015,
  Saturn:  0.010,
  Uranus:  0.008,
  Neptune: 0.006,
  Pluto:   0.005,
}
```

The updated function body becomes:

```typescript
export function getRetrogradeStatus(date: Date): { planet: PlanetName; isRetro: boolean; status: string }[] {
  const time = Astronomy.MakeTime(date)
  const statuses: { planet: PlanetName; isRetro: boolean; status: string }[] = []

  for (const name of PLANET_NAMES) {
    if (name === 'Sun' || name === 'Moon') continue
    const body = BODY_MAP[name]
    const motion = getDailyMotion(body, time)
    const isRetro = motion < 0

    const threshold = STATION_THRESHOLD[name] ?? 0.020
    const isStationing = Math.abs(motion) < threshold
    let status = isRetro ? 'Retrograde' : 'Direct'
    if (isStationing) status = isRetro ? 'Stationing retrograde' : 'Stationing direct'

    statuses.push({ planet: name, isRetro, status })
  }

  return statuses
}
```

The `STATION_THRESHOLD` map should be declared at module scope near `BODY_MAP` (after line 71 of `transits.ts`). `NorthNode` is already excluded from the `PLANET_NAMES` loop in `getRetrogradeStatus` (it is skipped because it does not appear in `BODY_MAP`) — no change needed there.

**Downstream effect on Sprint 0018 station-detection:** Carmack's analysis (station detection section) also recommends that `scoreSnapshot` use consecutive-snapshot retrograde-state comparison (`snapshots[i-1].retrogrades[planet].isRetro !== snapshots[i].retrogrades[planet].isRetro`) to detect a crossing rather than reading `status === 'Stationing'` directly. Both approaches benefit from this fix: the per-planet threshold makes the `isStationing` field accurate for single-point queries (such as the existing Reading tab retrograde section), while the consecutive-snapshot comparison is the correct method for the Advance tab's shift-marker detection. The two approaches are complementary, not competing. This fix must land first because `snapshot.retrogrades[*].isRetro` must be correct for the crossing-detection to produce a meaningful diff.

**Files changed:** `/projects/astrology-reader/src/engine/transits.ts` — lines 227–246 (add `STATION_THRESHOLD` map at module scope, replace literal `0.02` with `STATION_THRESHOLD[name] ?? 0.020` in `getRetrogradeStatus`). No other files require changes; all consumers of `getRetrogradeStatus` receive the corrected `status` string automatically.
