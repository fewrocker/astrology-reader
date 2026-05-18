# Sprint 0021 — Fragility Analysis (Taleb Voice)

## Opening Observation

This codebase exhibits a pattern I find everywhere: the happy path is well-tested and extensively documented, while the failure modes accumulate silently in the margins. The advance engine has been through five sprints of iteration, and each sprint has fixed a bug that was invisible until someone looked. That is not a sign of careful engineering. That is a sign that the system is too complex to reason about correctly, and that bugs are found by accident rather than by design. Let me be specific.

---

## 1. The Couple Advance Intensity Bug Is Not Just Wrong — It Is Visibly Inconsistent Right Now

**Files:** `src/components/reading/CoupleAdvanceTab.tsx` lines 555, 619, 669; `src/components/reading/AdvanceTab.tsx` lines 696, 771, 804

The sprint-0020 changelog entry for `code-couple-advance-scoring-parity` states it fixed the gate logic for Priorities 2–4. What it did not fix — and what the sprint-0020 deferred note and the sprint-0021 vision both acknowledge — is `baseIntensity`. At lines 555, 619, and 669 of `CoupleAdvanceTab.tsx`, `baseIntensity` is computed as `Math.abs(rating.score - 3) / 2`. The `rating` variable on line 460 still comes from `computeEnergyRating`, which is still imported at line 3.

In `AdvanceTab.tsx`, the corresponding path uses `Math.min(1, combinedWeight / COMBINATION_WEIGHT_NORMALIZE)` (lines 696, 771, 804), where `COMBINATION_WEIGHT_NORMALIZE = 12`.

The consequence is not abstract. `computeEnergyRating` returns a score from 1 to 5 based on raw aspect counts. `Math.abs(rating.score - 3) / 2` produces values in `{0, 0.5, 1}` — a three-state intensity system. The individual path produces a continuous value bounded by actual slow-planet weight. A Saturn+Pluto cluster at 0.5° orb that passes the gate produces `combinedWeight ≈ 14` on the individual path, yielding `intensity = Math.min(1, 14/12) = 1.0`. On the couple path the same sky can produce `baseIntensity = 0.5` if energy score happens to be 4, or `0` if it is 3. This is not a small drift. The dot size, the glow strength, and the density-cap priority sort all derive from `intensity`. A Saturn+Pluto couple marker can be rendered as a faint, small dot while a moderate Jupiter trine on an individual chart shows as a large, glowing marker. Users who compare the two surfaces see contradictory emphasis for the same sky. This is already happening in production.

The synastry axis augmentation introduced in sprint-0020 task-0007 multiplies `baseIntensity * 1.25` (lines 569, 633, 683). When `baseIntensity` is already wrong, the augmentation amplifies the error. A 25% boost on a structurally incorrect baseline produces a value that is confidently wrong rather than quietly wrong.

**What to fix:** Import `COMBINATION_WEIGHT_NORMALIZE` from `AdvanceTab` (already exported at line 112) and replace the three `baseIntensity` derivations with `Math.min(1, combinedWeight / COMBINATION_WEIGHT_NORMALIZE)`. Remove the `computeEnergyRating` import (line 3) and the `rating` variable (line 460) — they are dead code in `scoreCoupleSnapshot` once this is done.

---

## 2. The Snapshot Cache Is a Component-Level Ref With No Cross-Component Sharing

**Files:** `src/components/reading/AdvanceTab.tsx` line 1284; `src/components/reading/CoupleAdvanceTab.tsx` line 847; `src/components/results/SolarReturnPage.tsx` line 43

Each component that runs advance pre-calculation holds its cache in a `useRef<Map<string, AdvanceSnapshot[]>>`. This means:

1. The cache is destroyed when the component unmounts. If a user visits the Advance tab, builds a 36-month snapshot array, then navigates to TodayPage, then returns to the Advance tab, the cache is gone and computation runs again.

2. More importantly: the sprint-0021 vision proposes integrating advance snapshot data into TodayPage and DailySnapshotCard. The vision notes: "if the advance snapshots are already in the component-level cache (from an Advance tab visit), the Today page should read from that cache." But the Today page does not have access to AdvanceTab's `useRef` cache. The two components are siblings, not parent-child, and there is no shared cache. The stated design intent cannot be achieved without either lifting the cache to a shared parent or storing snapshots in application state.

3. `TodayPage.tsx` renders independently of whether the user has visited the Advance tab. The vision says "if no cache exists, the signal is simply absent." That is a safe default, but it means the TodayPage advance integration is unreliable by design — users who open TodayPage directly (the most common mobile pattern for daily users) will never see the advance signal unless an independent snapshot computation path is added for TodayPage. Adding that computation would be a blocking call on TodayPage mount, which is why the vision avoids it. The result is a feature that works only for users with specific navigation patterns, with no visible indication of the difference.

---

## 3. The Solar Return Advance Preview Cache Key Omits `unknownTime`

**File:** `src/components/results/SolarReturnPage.tsx` lines 47–52

The SR advance preview cache key is built from `'sr'`, `targetYear`, and the SR chart's ascendant and midheaven longitudes at `.toFixed(4)` precision. The `unknownTime` flag is absent.

The SR chart is always computed with `unknownTime = false` (see `src/engine/solarReturn.ts` line 49: `calculateChart(srDate, srTime, birthLat, birthLng, 'UTC', false)`). So the missing field is not an active cache collision risk today. But the oversight reveals a structural assumption: the cache key was designed by copying the advance cache pattern and dropping `unknownTime` because the SR chart always has time. If the SR engine ever changes to support unknown-time charts, or if this pattern is copied for a new advance surface, the missing field becomes a silent cache collision.

Compare with the individual advance cache key in `AdvanceTab.tsx` line 1294: `${asc.toFixed(4)}:${mc.toFixed(4)}:${unknownTime}:${period}:${baseDate}`. The SR key also omits `period` (hardcoded to `monthly`) and `baseDate` (derived deterministically from `srMoment` and `targetYear`). Those omissions are defensible. The `unknownTime` omission is not, because it is a factual property of the chart and belongs in any identity fingerprint.

---

## 4. The SR Advance Preview Runs a 36-Step Computation to Produce a 12-Step Output

**File:** `src/components/results/SolarReturnPage.tsx` lines 61–63

The preview calls `preCalculateSnapshots(srChart, 'monthly', srBaseDate)` with no custom config, which runs the full 36-month computation (the default `ADVANCE_CONFIG.monthly.max = 36`). It then slices to 13 snapshots (offsets 0–12) and applies a secondary density cap to those 13. The 24 discarded snapshots were computed, scored, and density-capped by the generic engine — computation time was spent and their results thrown away.

The deeper problem is the density cap interaction. `runAdvancePreCalculation` in `AdvanceTab.tsx` applies its density cap to all 36 snapshots before the slice. The cap allows `Math.ceil(36 * 0.2) = 8` markers across the full 36 months. A power marker at month 5 may be displaced by a higher-intensity marker at month 20 — which is then discarded by the slice. The secondary density cap in the SR preview (lines 66–92) operates on the already-capped 13-snapshot slice, not on the raw scored set. This means the SR preview applies two sequential density caps: one calibrated for 36 months, one for 12. A year where markers cluster in months 1–6 can be under-represented because the first cap suppressed some of those months in favor of high-intensity markers at months 7–36 that are then discarded.

**What should happen:** Pass `SR_ADVANCE_CONFIG` (with `max: 12`) directly to `runAdvancePreCalculation` via the `config` override parameter that the function already accepts. This eliminates the 36-step waste, removes the slice, and removes the secondary density cap entirely — the primary cap will be calibrated for 12 months from the start.

---

## 5. The Solar Return Calculation Has a Silent Dead Parameter

**File:** `src/engine/solarReturn.ts` line 20

The `calculateSolarReturn` function signature accepts `_birthDate: string` as its second parameter. It is prefixed with underscore, which in TypeScript convention signals intentional non-use. It is never read inside the function — the SR is computed from `natalSun.longitude`, `birthLat`, `birthLng`, and `targetYear` only.

The birth date is not an input to the solar return calculation. But the function name and the public API imply it should be: `calculateSolarReturn(natalChart, birthDate, lat, lng)` reads like birth date matters. Any future developer calling this function may pass incorrect birth data and receive no error. Any future developer modifying the function to actually use the birth date (for age validation, birth year reference, etc.) will discover that callers are passing stale or misformatted dates with no indication of the breakage.

A dead parameter in a public API is not a style issue. It is an invitation for future corruption.

---

## 6. `TodayPage` Uses a Stale `now` Constant That Does Not Update

**File:** `src/components/reading/TodayPage.tsx` line 38

```typescript
const now = new Date()
```

This is computed once at render time. The `useEffect` on line 53 also runs once (dependency array is `[]`). If a user opens TodayPage at 11:58 PM and leaves it open, the page shows yesterday's data at 12:01 AM. The moon phase, transit aspects, energy rating, and date header are all stale. There is no visible indication, no "last updated" timestamp, no automatic refresh.

The GPT morning synthesis (line 64) is also computed once at mount and goes stale. A user reading their "morning synthesis" in the afternoon after leaving the tab open overnight is reading yesterday's sky read through yesterday's aspects. The GPT text says "today" but means yesterday.

This is a product trust issue. A daily-use app that lies about what day it is erodes the user's confidence that it is computing anything correctly.

---

## 7. The Advance Engine Has No Guard for Charts With Empty or Malformed House Arrays

**Files:** `src/engine/transits.ts` `assignTransitHouses` line 308; `src/engine/astronomy.ts` line 270

`assignTransitHouses` iterates over `natalHouses` and calls `getHouseForLongitude`. If `natalHouses` is empty or contains malformed entries, the function returns all transit planets with `house: 0`. This propagates silently through `calculateTransitAspects` where the guard `unknownTime ? null : (np.house > 0 ? np.house : null)` (line 186) then sets `natalHouse: null` for all aspects — identical to the expected `unknownTime = true` behavior.

The symptom of a malformed chart (empty houses from a bad city coordinate) looks identical to a legitimate unknown-time chart. The house-anchored reason strings in `buildAspectReason` fall back to archetype-only phrases in both cases. The advance engine degrades gracefully, but it degrades without diagnostic visibility. A user with a corrupted chart who sees generic phrases instead of house-specific guidance has no way to know why, and the developer has no error to catch.

The city database is a bundled JSON of ~40,000 entries. Coordinates are not validated on input. A lat/lng of 0.0/0.0 (Gulf of Guinea) is valid JSON but would produce Placidus houses for a location that has no population. This does not crash; it produces wrong angles silently.

---

## 8. The Hysteresis Pass Has a Directional Assumption That Can Bridge Separating Aspects

**File:** `src/components/reading/AdvanceTab.tsx` lines 902–927 (in `runAdvancePreCalculation`)

The hysteresis pass bridges a neutral snapshot gap between two identically-scored non-neutral snapshots. The check at line 923: `Math.abs(currAspect.orb - prevOrb) < MARKER_HYSTERESIS_ORB`. If the orb difference between the current snapshot and the previous snapshot is less than 0.5°, the neutral snapshot inherits the previous score.

This check is directionally blind. It compares current orb to previous orb but does not verify that the aspect at `curr` is still applying. A separating aspect — expressly excluded from firing markers by the `a.applying` filter — can be bridged into a marker via hysteresis if the orb change is gradual enough.

The failing scenario: An aspect applies and fires a marker at offset N. At offset N+1 the planet crosses exactness — the aspect is now separating and `applying = false`, so no marker fires. At offset N+2 the aspect is still separating and another marker fires for a different reason. The hysteresis pass runs: prev (N) and next (N+2) both have the same category, curr (N+1) is neutral, and the orb at N+1 is within 0.5° of N's orb. Hysteresis bridges N+1. The banner then describes a transit as ongoing when it peaked and is receding. At the monthly orb threshold of 4.0°, a slowly separating outer planet can produce orb deltas well under 0.5° per step, making this scenario common rather than rare.

---

## 9. `scoreCoupleSnapshot` Calls `computeEnergyRating` Unconditionally on Every Snapshot

**File:** `src/components/reading/CoupleAdvanceTab.tsx` line 460

```typescript
const rating = computeEnergyRating(snapshot.transitAspects)
```

This is called at the top of `scoreCoupleSnapshot` for every snapshot — including offset 0, which is immediately returned as `neutral` on line 457 without ever reading `rating`. It is also called for every Priority 1 power marker, which short-circuits before reaching the `baseIntensity` lines that consume `rating`.

`computeEnergyRating` iterates all transit aspects, categorizes them by nature, and produces a score. At the monthly period this can be 40–60 aspects. Multiplied by 37 snapshots, this is overhead on approximately 37 × 50 = 1,850 aspect categorizations per computation run, of which the majority produce a `rating` value that is thrown away before it is read.

Once the intensity bug is fixed and `rating` is removed, this call disappears entirely. Until then it runs on every snapshot unconditionally.

---

## 10. The SR Advance Preview `srBaseDate` Is UTC-Normalized in the UI but the Monthly Step Logic Reads Local Time

**File:** `src/components/results/SolarReturnPage.tsx` lines 37–40

The component correctly normalizes `srBaseDate` to UTC midnight:
```typescript
const utcDateStr = srMoment.toISOString().split('T')[0]
return new Date(utcDateStr) // parsed as UTC midnight
```

This is the fix applied in sprint-0020 for the UTC offset problem noted in the sprint-0019 analysis. The fix is correct: `new Date('2025-05-18')` (no time component) is parsed as UTC midnight, so `getFullYear()`, `getMonth()`, and `getDate()` return the UTC date components regardless of the user's local timezone.

However, this is only safe because the monthly step construction in `runAdvancePreCalculation` at line 886 uses:
```typescript
new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate(), 12, 0, 0)
```

`getFullYear()`, `getMonth()`, and `getDate()` without `UTC` variants read local time. If `baseDate` is UTC midnight for May 18, then in UTC+5:30 it is actually May 18 at 05:30 AM local — so `getDate()` returns 18, which is correct. In UTC-5 it is May 17 at 7:00 PM local — so `getDate()` returns 17, which is wrong. The UTC normalization of `srBaseDate` is undone by the local-time reads inside the step construction.

The fix from the sprint-0020 analysis was applied at the component level but the underlying `runAdvancePreCalculation` still reads local time. Users in UTC-5 to UTC-12 whose SR occurs in the first 12 hours UTC will see a one-day-early SR Start anchor on the strip. The per-step dates in the monthly strip will also be offset by one day for those users.

---

## 11. The Density Cap Produces Counterintuitive Results at Small `max` Values

**Files:** `src/components/results/SolarReturnPage.tsx` line 66; `src/components/reading/AdvanceTab.tsx` line 931

`Math.ceil(12 * 0.2) = Math.ceil(2.4) = 3`. The SR preview allows 3 markers across 12 months. The reservation phase of the density cap attempts to reserve one slot per non-neutral category present. If power, favorable, challenging, and shift markers all exist, the reservation alone fills all 3 slots. The fill phase in Phase 2 adds zero additional markers regardless of how many remain.

The result: in a year with all four category types, exactly one marker per category is shown — never more. A year with three consecutive favorable windows and one challenging period shows one favorable and one challenging. The highest-intensity favorable markers beyond the first are discarded to make room for one marker from each other category. The density cap is supposed to guarantee variety while preserving significance; at `max = 12` and `maxMarkers = 3`, it guarantees variety at the direct expense of significance.

The 20% density cap was calibrated for `max = 36` (monthly) and `max = 52` (weekly), where 20% is 7 or 11 markers — enough room for category reservation and additional high-intensity fills. At `max = 12`, 20% is 3. The algorithm was not designed for this parameter regime.

---

## Summary: What Breaks and When

The table below organizes by severity and trigger condition:

| # | File | What | Triggering condition | Severity |
|---|------|------|---------------------|---------|
| 1 | `CoupleAdvanceTab.tsx:555,619,669` | Intensity divergence from `computeEnergyRating` | Any couple advance view — always wrong | High |
| 8 | `runAdvancePreCalculation:902-927` | Hysteresis bridges separating aspects | Slowly separating outer planet at monthly orbs | High |
| 2 | Cache design | TodayPage advance signal absent for direct navigation | User opens TodayPage without prior Advance tab visit | Medium |
| 4 | `SolarReturnPage.tsx:61-63` | 36-step computation for 12-step output; double density cap | SR with clustered markers in months 1–6 | Medium |
| 10 | `runAdvancePreCalculation:886` | Local-time reads undo UTC `srBaseDate` normalization | UTC-5 to UTC-12 users with SR in first 12 hours UTC | Medium |
| 6 | `TodayPage.tsx:38` | Stale `now` constant across midnight | Session left open overnight or across midnight | Medium |
| 11 | Density cap math | Significance suppressed at `max=12` | SR year with all four category types present | Medium |
| 3 | `SolarReturnPage.tsx:47-52` | SR cache key missing `unknownTime` | If SR engine ever supports unknown-time charts | Low (latent) |
| 5 | `solarReturn.ts:20` | `_birthDate` is dead parameter | Silent API confusion; no runtime failure | Low (latent) |
| 7 | `assignTransitHouses` | Malformed chart indistinguishable from unknown-time | Bad city coordinate data | Low (degraded gracefully) |
| 9 | `CoupleAdvanceTab.tsx:460` | Unnecessary `computeEnergyRating` call | Every couple advance computation; pure overhead | Low |

Items 1 and 8 are active correctness failures. Item 2 is a feature that cannot work as described for the most common navigation pattern. Items 4, 10, and 6 produce wrong outputs under normal conditions for a meaningful fraction of users.
