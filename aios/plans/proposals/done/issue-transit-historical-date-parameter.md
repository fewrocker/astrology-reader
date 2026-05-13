# issue-transit-historical-date-parameter

**Type:** Issue Fix  
**Originated by:** Carmack, Taleb  
**User guidance:** n/a — this is an engine correctness fix, not a product surface change.

---

## Problem

`getTopActiveTransits()` in `src/engine/transits.ts` (lines 392–400) hardcodes `new Date()` as the moment for computing planetary positions, regardless of any date context provided by the caller:

```ts
// src/engine/transits.ts, lines 392–400
export function getTopActiveTransits(
  chartData: ChartData,
  maxCount: number,
  maxOrbDegrees: number,
): TransitAspect[] {
  const positions = calculateCurrentPositions(new Date())   // ← always now
  const aspects = calculateTransitAspects(positions, chartData.planets, 'daily')
  return aspects.filter(a => a.orb <= maxOrbDegrees).slice(0, maxCount)
}
```

The function delegates to `calculateCurrentPositions(date: Date)` (line 83), which already accepts an arbitrary `Date` — the engine layer is correctly general-purpose. The defect is entirely in `getTopActiveTransits`'s call site, where `new Date()` is passed unconditionally instead of a caller-supplied date.

**Impact on the Cosmic Journal feature (sprint-0006):** The journal entry composer will call `getTopActiveTransits()` to generate the sky snapshot stored on each entry. For any entry dated in the past, this will silently return today's transit aspects — not the aspects at the recorded moment. Every retroactive journal entry will carry the wrong sky data. The failure is silent: no error is thrown, no warning is emitted, the returned `TransitAspect[]` is structurally valid and looks correct.

**Current callers that expose the issue:**

- `src/components/reading/TodayPage.tsx`, line 92: `getTopActiveTransits(chartData, 3, 8)` — calls with no date, wants current transits. This is correct behavior and must remain unchanged.
- No current caller passes a historical date, because the function provides no way to do so.

**The `getDateRange()` helper (lines 236–262) has the same class of bug** — it calls `new Date()` internally at line 237 and only supports the current moment as the anchor point for `'daily'` and `'weekly'` periods. However, `getDateRange()` is not exported and is only used by `calculateTransits()`, which is the full-period transit calculation path (not the journal snapshot path). This proposal targets `getTopActiveTransits` as the primary fix; `getDateRange` is noted for awareness.

**Reproduction:**

1. Call `getTopActiveTransits(chartData, 5, 10)` on any date.
2. Call it again on any other day.
3. Both calls return today's transit aspects regardless of when the entry claims to have occurred.
4. For a journal entry dated 90 days ago, the stored sky snapshot will show the transit sky as of the save date, not the entry date.

---

## Expected Behavior

`getTopActiveTransits()` should accept an optional `date` parameter. When provided, it computes transit positions for that moment. When omitted, it defaults to `new Date()`, preserving existing caller behavior with zero changes required at existing call sites.

The corrected signature:

```ts
export function getTopActiveTransits(
  chartData: ChartData,
  maxCount: number,
  maxOrbDegrees: number,
  date?: Date,
): TransitAspect[] {
  const positions = calculateCurrentPositions(date ?? new Date())
  const aspects = calculateTransitAspects(positions, chartData.planets, 'daily')
  return aspects.filter(a => a.orb <= maxOrbDegrees).slice(0, maxCount)
}
```

This is a two-line change (signature + call site). All existing callers — `TodayPage.tsx` line 92 — continue to work without modification. The journal entry composer passes the entry's resolved UTC `Date` to get the historically accurate sky snapshot.

---

## Scope

**File:** `src/engine/transits.ts`  
**Lines affected:** 392–400 (function signature and internal `calculateCurrentPositions` call)  
**Breaking changes:** None — the parameter is optional with a `new Date()` default.  
**Effort:** Minimal — 2-line change to the function, no caller updates required.

**Out of scope for this fix:**
- `getDateRange()` (line 236) — same `new Date()` pattern, but only affects `calculateTransits()` which operates on the current date by design for the transit reading UI. Fixing this is a separate concern.
- `calculatePersonalDay` date parameter — tracked separately as `issue-numerology-engine-historical-date`.
