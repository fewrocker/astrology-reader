# code-advance-category-diversity

**Type:** Code Enhancement
**Originated by:** Jobs, Carmack, Taleb
**Sprint vision:** sprint-0019

## Problem / Opportunity

The density cap in `preCalculateSnapshots` (`src/components/reading/AdvanceTab.tsx`, lines 492–508) is a pure intensity sort. After scoring all snapshots, it does this:

```typescript
const sorted = [...nonNeutral].sort((a, b) => b.score.intensity - a.score.intensity)
const keep = new Set(sorted.slice(0, maxMarkers).map(s => s.offset))
```

It keeps the top N markers by intensity, discarding the rest regardless of category. There is no mechanism to ensure that a challenging marker, a power marker, or a shift marker survives the cut when favorable markers happen to score higher intensity.

The consequence is structural: when a user's chart produces a run of favorable transits — Jupiter making a sequence of harmonious contacts across several months, for instance — the cap fills every available marker slot with green favorable dots. If the chart also contains one red challenging period and one gold power day during that same window, both are outranked by the favorable cluster and suppressed entirely. The user looks at a 36-month monthly strip that shows only green. The strip is technically accurate — those favorable moments did score highest — but it is not useful. It tells a single-note story about a period that has more character than that.

The same problem runs in the opposite direction. A chart with Saturn near the natal Ascendant for an extended stretch will produce power markers at intensity 0.85–0.95 across several consecutive monthly snapshots. Those gold markers outrank everything. The strip goes monochromatic gold while favorable and challenging moments are suppressed. The `OverviewStrip` component (`src/components/reading/AdvanceTab.tsx`, lines 622–706) renders whatever `markers` contains — it has no category awareness of its own. The colors it displays are entirely determined by what the density cap passes through.

The intensity values themselves also work against variety. Intensity for favorable and challenging comes from the energy rating formula at lines 344 and 372: `Math.abs(rating.score - 3) / 2`. The maximum achievable is 1.0 when `rating.score` is 5 or 1. Power day intensity at line 260 is `Math.max(0, 1.0 - (bestContact.orb / orbs.angleContact))` — also maxes at 1.0. These two scales are not comparable. A tight power contact at 0.1° orb produces intensity 0.97. A challenging period driven by a strong energy rating produces intensity 0.8 at best. In a mixed-category set, power markers structurally dominate the sort, and favorable markers dominate over challenging ones when Jupiter transits are running. The intensity ordering encodes a hidden preference that was never the design intent: the cap does not mean to suppress challenging periods, but it does.

The `MarkerDot` component (`src/components/reading/AdvanceTab.tsx`, lines 534–608) and the `OverviewStrip` dots are both sized and colored by `score.category` and `score.intensity`. Neither component has any recourse when the density cap has already suppressed the minority categories — they render what they are given. The fix must happen upstream, in `preCalculateSnapshots`, before the marker set is finalized.

The vision document for sprint-0019 (line 57) calls this out explicitly: "the 20% density cap should not force multiple markers to share the same category. The scoring system should prefer surfacing one each of power, favorable, challenging, and shift across a 36-month range over clustering five green favorable markers."

Jobs puts it plainly: "The markers communicate less when they all share the same color than when the strip shows a mix of moments with different characters."

Carmack identifies the structural cause: "The problem: when all markers share the same category, the cap doesn't enforce variety. After the intensity sort and keep-set construction, there's nothing preventing 7 of the 7 monthly markers being `favorable` if Jupiter is making a long series of harmonious transits."

Taleb flags the concrete failure mode: "A slow planet near an angle for an extended period produces month-long power marker clusters that suppress all favorable and challenging markers. This is not a rare chart configuration."

## Desired State

The density cap becomes category-aware through a two-phase selection process.

**Phase 1 — reserve one slot per non-neutral category present.** Before any intensity sorting, scan the full non-neutral marker set for which categories are represented. For each category that has at least one marker (`power`, `favorable`, `challenging`, `shift`), take its single highest-intensity representative and place it in a reserved set. This guarantees that if the chart produces at least one challenging period and at least one power day, both survive the cap even if they are individually outranked by a favorable cluster.

**Phase 2 — fill remaining capacity by intensity.** The reserved set occupies between one and four of the available slots (one per category present). The remaining capacity — `maxMarkers` minus the size of the reserved set — is filled by sorting all remaining non-reserved markers by intensity descending and taking the top N. These can be any category; there is no further constraint.

The final visible marker set is the union of the reserved set and the intensity-fill set, capped at `maxMarkers`.

The result: a 36-month monthly strip with a maxMarkers of 7 that contains one power day, one challenging period, and twelve favorable windows will show the power day, the challenging period, and up to five of the twelve favorable windows — not seven favorable windows and nothing else. A strip with only favorable markers continues to work correctly: if no power, challenging, or shift markers exist, phase 1 reserves nothing for those categories, and phase 2 fills all seven slots from the favorable pool by intensity.

The `OverviewStrip` and `MarkerDot` components require no changes. The diversity guarantee lives entirely in the density cap post-processing pass, which is the right location: it is the only place in the pipeline where the full non-neutral set is known and can be balanced before the marker set is finalized.

The qualitative outcome: a user scanning the 36-month overview sees a strip that represents the full astrological character of the period — moments of power, windows of opportunity, periods of pressure, and station shifts — rather than a monochromatic run of whichever category happened to dominate by intensity. The strip becomes a genuine map of the period's texture. It tells a more complete story precisely because the algorithm now refuses to silence minority categories that are real and present in the chart.
