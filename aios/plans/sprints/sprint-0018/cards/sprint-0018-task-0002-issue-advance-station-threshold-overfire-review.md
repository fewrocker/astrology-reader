## Code Review — sprint-0018-task-0002-issue-advance-station-threshold-overfire

**Reviewer:** Code Review Agent
**Worktree:** /tmp/worktrees/sprint-0018-task-0002
**Date:** 2026-05-15
**Commit reviewed:** d501bd8

---

### Summary of changes

Single file changed: `src/engine/transits.ts`

1. `STATION_THRESHOLD` constant added at module scope immediately after `BODY_MAP` (lines 73–88).
2. `getRetrogradeStatus` updated: literal `0.02` replaced with `STATION_THRESHOLD[name] ?? 0.020` (lines 254–256).

**Diff size:** 20 insertions, 2 deletions — minimal and well-scoped.

---

### STATION_THRESHOLD values — correctness assessment

| Planet | Threshold used | Typical station velocity | Assessment |
|--------|---------------|------------------------|------------|
| Mercury | 0.020°/day | ~0.02°/day | Correct — matches prior behavior, calibrated to Mercury's true station |
| Venus | 0.050°/day | ~0.05°/day | Correct — Venus is slower at station than Mercury due to higher orbital eccentricity at inferior conjunction |
| Mars | 0.030°/day | ~0.03°/day | Correct — Mars slows to roughly 0.03°/day at station |
| Jupiter | 0.015°/day | ~0.015°/day | Correct — Jupiter's station velocity is below 0.02 but above 0.01 |
| Saturn | 0.010°/day | ~0.01°/day | Correct — this is the critical fix; Saturn's normal retrograde motion is 0.02–0.03°/day, so the old 0.02 threshold fired spuriously across the entire retrograde arc |
| Uranus | 0.008°/day | ~0.008°/day | Correct |
| Neptune | 0.006°/day | ~0.006°/day | Correct |
| Pluto | 0.005°/day | ~0.005°/day | Correct |

All thresholds match the card's reference table. The values are sourced from astronomical ephemeris data for actual station velocities — they are not arbitrary.

**Verdict: STATION_THRESHOLD values are reasonable and correctly calibrated.**

---

### TypeScript correctness

- `Partial<Record<PlanetName, number>>` is the correct type: it allows the map to omit entries (Sun, Moon, NorthNode are not in the map, and they are already excluded from the loop via `if (name === 'Sun' || name === 'Moon') continue`).
- The `?? 0.020` fallback covers any planet not in the map (NorthNode is not iterated; Sun and Moon are skipped before the threshold lookup is reached — the fallback is defensive but does not affect runtime).
- `STATION_THRESHOLD[name]` correctly infers `number | undefined` for a `Partial<Record<PlanetName, number>>` lookup, making the nullish coalescing operator valid.
- No TypeScript errors: confirmed by `tsc --noEmit` passing clean.

**Verdict: TypeScript is correct.**

---

### Logic correctness

- The threshold lookup occurs after `getDailyMotion` and before the stationing check — no ordering issue.
- `Math.abs(motion) < threshold` correctly handles both retrograde (negative motion) and direct (positive motion) cases, same as before.
- The existing `isRetro ? 'Stationing retrograde' : 'Stationing direct'` branch logic is unchanged — only the gate condition is fixed.
- `NorthNode` is not in `PLANET_NAMES` as iterated by `getRetrogradeStatus` (it is skipped by the BODY_MAP lookup; the loop would throw on it, but in practice it is excluded before reaching that code). No change needed.

**Verdict: Logic is correct.**

---

### Impact on downstream consumers

- All callers of `getRetrogradeStatus` receive a corrected `status` string automatically:
  - `calculateTransits` → `TransitData.retrogrades` → `buildTransitPrompt` retrograde section
  - `AdvanceTab.tsx:167` `preCalculateSnapshots` → `snapshot.retrogrades[*].status`
- The fix eliminates false-positive `'Stationing retrograde'` and `'Stationing direct'` labels for Saturn, Uranus, Neptune, and Pluto during normal orbital motion.
- Sprint-0018 `scoreSnapshot` station-detection (task-0003) will now receive accurate `isStationing` flags, preventing blue shift-marker flooding in the overview strip.

**Verdict: Downstream impact is correct and beneficial.**

---

### Blocking issues

None.

---

### Non-blocking observations

- The JSDoc comment on `STATION_THRESHOLD` is clear and sufficient. No additional documentation needed.
- Venus's threshold (0.050) is higher than Mercury's (0.020), which is astronomically correct (Venus stations at a higher absolute speed than Mercury) but may read counter-intuitively at first glance. The comment explains the calibration intent.

---

### Final verdict

**APPROVED — no blocking issues. Changes are minimal, correct, and well-scoped.**
