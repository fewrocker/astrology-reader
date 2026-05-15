## Type
Issue Fix

## Originated by
Taleb (Section 5.4, primary) — Carmack (corroborates, station-detection analysis)

## Problem

### Observable defect

All monthly advance snapshots at offset ≥ 1 are computed at local midnight (00:00:00) instead of noon (12:00:00). The snapshot at offset 0 uses `baseDate` directly, which is constructed with an explicit `T12:00:00` suffix in the caller. Every subsequent monthly snapshot discards that time component and silently resets to midnight.

### Root cause: two files, one inconsistency

**`TransitReadingPage.tsx`, line 372** — `baseDate` is correctly forced to noon:

```typescript
baseDate={new Date(transitData.dateRange.start + 'T12:00:00')}
```

The `T12:00:00` suffix is a deliberate guard against the UTC-midnight-to-previous-day trap. It is the right approach.

**`AdvanceTab.tsx`, line 180** — the monthly branch in `preCalculateSnapshots` reconstructs `targetDate` from calendar components, discarding the time field:

```typescript
targetDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate())
```

`new Date(year, month, day)` with three arguments creates a local-time midnight date: hour, minute, and second are all implicitly 0. The time component of `baseDate` — `12:00:00` — is never consulted. Snapshot 0 (passed in as `baseDate` unchanged) runs at noon. Snapshots 1 through 36 each run at midnight of their respective month.

The daily and weekly branches do not have this problem. They compute `targetDate` with:

```typescript
targetDate = new Date(baseDate.getTime() + i * config.msPerStep)
```

This arithmetic preserves the original timestamp's time-of-day, so daily and weekly snapshots inherit noon from `baseDate`. Only the monthly branch reconstructs the date from components and drops the time.

### Downstream corruption

The Moon moves approximately 13° per day — roughly half a degree per hour. At midnight local time versus noon local time, the Moon's ecliptic longitude can differ by 6–7°. On days straddling a sign boundary, the Moon may be in an entirely different sign at midnight than at noon. This is not a rounding error; it is a categorical disagreement on the Moon's position.

Every system that reads from monthly advance snapshots inherits this error:

- **`calculateTransitAspects`** — Moon aspects to natal planets are computed with the wrong lunar position. An applying trine that exists at noon may not exist at midnight if the orb has widened past the threshold. A square that would have been tight at noon may have already separated by midnight.
- **`computeEnergyRating`** (`transits.ts`, line 480) — Moon aspects are included in the top-8 classical aspect set used to compute the energy rating score. A wrong Moon position corrupts the score that drives the favorable/challenging marker categories.
- **`computePowerDayBanner`** — The secondary trigger counts tight applying aspects (orb ≤ 2°). An aspect that qualifies at noon may not qualify at midnight, suppressing or generating banners falsely.
- **The marker system (sprint 0018)** — Every marker category except `power` (angle contact only) depends on aspect data or the energy rating. All of these inherit Moon position noise for monthly readings. A marker system built on top of these snapshots will produce incorrect green, red, and neutral classifications for every monthly offset ≥ 1.

The error is systematic — it affects every user, every chart, every monthly advance reading. It is not intermittent.

### Reproduction

1. Open any transit reading with period = `monthly`.
2. Navigate to the Advance tab.
3. Drag the slider to any offset ≥ 1.
4. Inspect `snapshot.date` in the browser console: the time component reads `T00:00:00.000` (local midnight), not `T12:00:00`.
5. Compare the Moon's sign and degree against an authoritative ephemeris for the same date at noon. Divergence of 5–8° is typical; sign changes at boundaries are possible.

The fix requires no ephemeris change, no architectural change, and no new computation. It is one argument added to one `Date` constructor call.

## Expected behavior

All monthly advance snapshots — at every offset from 0 through 36 — should be computed at **noon local time (12:00:00)** on their respective calendar date, consistent with the time-of-day used in `baseDate`.

### Concrete fix

**`src/components/reading/AdvanceTab.tsx`, line 180** — add hour, minute, and second arguments to the monthly `Date` constructor:

```typescript
// Before (midnight reset — incorrect):
targetDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate())

// After (noon preserved — correct):
targetDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate(), 12, 0, 0)
```

This is the minimal correct fix. The six-argument form of `new Date(year, month, day, hour, minute, second)` creates a local-time date at the specified time. By passing `12, 0, 0`, all monthly snapshots are anchored at noon local time, matching the intent already expressed in `TransitReadingPage.tsx` line 372.

No other files require changes. The fix has zero effect on daily and weekly snapshots — those branches are unaffected. It has zero effect on the ephemeris engine, aspect calculations, or any other subsystem.

### Verification

After the fix, `snapshot.date.getHours()` should return `12` for every monthly snapshot, including offset 0 (which continues to use `baseDate` directly and is already correct). Moon position discrepancy against reference ephemeris should fall below 0.5° for all monthly advance snapshots.
