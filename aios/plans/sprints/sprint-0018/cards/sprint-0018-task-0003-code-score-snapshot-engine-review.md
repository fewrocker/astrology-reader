## Code Review — sprint-0018-task-0003-code-score-snapshot-engine

**Reviewer:** Code Review Agent  
**Date:** 2026-05-15  
**Worktree:** /tmp/worktrees/sprint-0018-task-0003  
**File reviewed:** src/components/reading/AdvanceTab.tsx  

---

### Verdict: PASS — no blocking issues

---

### Checklist

#### Types are correct
- `MarkerCategory` exported as `'power' | 'favorable' | 'challenging' | 'shift' | 'neutral'` — matches card spec exactly.
- `SnapshotScore` exported with all fields: `category`, `coShift`, `intensity`, `reason`, `triggerAspect?`, `shiftPlanet?`, `shiftDirection?`. Field types match card spec. Note: card spec shows `triggerAspect` as having a nested object shape in one place and a bare `string` in another — implementation uses `string` (the `AspectType` string), which is consistent with the formatter's needs and the simpler spec version.
- `AdvanceSnapshot.score: SnapshotScore` added correctly.

#### scoreSnapshot handles all 5 categories
- **neutral (offset === 0 guard):** Returns immediately with `{ category: 'neutral', intensity: 0, reason: '', coShift: false }`. ✓
- **power:** Detects slow planets (Saturn/Uranus/Neptune/Pluto) within `orbThresholds.angleContact` of ASC/MC. Guarded by `!chartData.unknownTime`. Intensity computed as `1.0 - (orb / orbThresholds.angleContact)`. `coShift`, `shiftPlanet`, `shiftDirection` propagated. ✓
- **favorable:** Uses `computeEnergyRating` score, counts tight applying harmonious aspects. Monthly threshold tightened to score >= 5. ✓
- **challenging:** Symmetric to favorable, monthly threshold tightened to score <= 1. ✓
- **shift:** Station detected via `prev.retrogrades` comparison when no higher-priority category applies. Intensity hardcoded to 0.8 as specified. ✓
- **neutral (fall-through):** Returns `{ category: 'neutral', intensity: 0, reason: '', coShift: false }` when no category triggered. ✓

#### Priority order
Power > favorable > challenging > shift > neutral — correctly implemented via sequential early-returns.

#### Station detection
Uses `prev.retrogrades.find(pr => pr.planet === r.planet)` and `prevR.isRetro !== r.isRetro` crossing check. This correctly detects a state change between snapshots rather than inferring from a single-point status string. `coShift` set on favorable/challenging when station co-occurs; `shift` category only used when station is the sole signal. ✓

#### computePowerDayBanner properly delegates
Reduced to 4 lines: offset-0 guard, neutral guard, delegates to `formatScoreAsBannerText(snapshot.score)`. No longer takes `chartData`. ✓

#### formatScoreAsBannerText
Implemented as a thin pass-through returning `score.reason`. The reason is already fully formatted in `scoreSnapshot`, so this is correct. The function exists as a named seam for future formatting changes without touching detection logic. ✓

#### Integration in preCalculateSnapshots
`scoreSnapshot` called at end of each loop iteration after all ephemeris data is computed. `prev = snapshots[i - 1] ?? null` correctly passes the immediately preceding snapshot. Score stored on the pushed object. Zero additional WASM calls. ✓

#### useMemo call site
Simplified to `[snapshot]` dependency array — `chartData` removed. ✓

#### ORB_THRESHOLDS
```
daily:   { angleContact: 1.0, applyingTight: 2.0, energyMinAspects: 2 }
weekly:  { angleContact: 2.0, applyingTight: 3.0, energyMinAspects: 3 }
monthly: { angleContact: 3.0, applyingTight: 4.0, energyMinAspects: 2 }
```
Matches card spec exactly. ✓

#### Build
`npm run build` completes cleanly. TypeScript strict mode passes with zero errors.

#### No regressions
- `SLOW_PLANETS_FOR_BANNER`, `ASPECT_VERB_BANNER`, `ANGLE_DOMAIN`, `detectAngleContact`, `angularDiff` all preserved in place.
- The power-day banner still renders in the UI via `powerDayBanner` useMemo — the render path is unchanged.
- `spellCount` removed cleanly since the new reason field contains spelled-out counts inline.

---

### Minor observations (non-blocking)

1. The original `computePowerDayBanner` had an explicit guard `if (snapshot.transitAspects.length === 0) return null`. This is no longer needed since `scoreSnapshot` returns neutral for empty aspect lists naturally (no aspects → no tight applying → energy score 3 → no category triggered → neutral). The behavior is preserved, just implicitly.

2. `tightApplyingHarmonious` and `tightApplyingChallenging` filter the raw `transitAspects` array, not the asteroid-filtered one that `computeEnergyRating` uses internally. This is a minor asymmetry: `energyRating.score` excludes asteroid aspects but the tight-applying counts do not. The card spec does not flag this as a concern and says "do not replicate the filter." Acceptable as-is.

3. `triggerAspect` stores the `AspectType` string (e.g. `'trine'`), not the nested object shape that appears in an early draft of the card spec. The final spec and the card's `SnapshotScore` interface both show `triggerAspect?: string`, so this is correct.

---

### Result: APPROVED
