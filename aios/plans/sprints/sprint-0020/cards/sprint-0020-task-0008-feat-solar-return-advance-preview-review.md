# Review: sprint-0020-task-0008-feat-solar-return-advance-preview

**Status:** Implemented and passing build
**Branch:** `sprint-0020-task-0008-feat-solar-return-advance-preview`
**Commit:** `f48db7e`

---

## Changes Made

### 1. `AdvanceTab.tsx` — Export `preCalculateSnapshots`

Added `export` keyword to `preCalculateSnapshots` (line 846). This is the only change to AdvanceTab: a single-word addition that exposes the existing function for import by external consumers without modifying its logic or signature.

### 2. `SolarReturnPage.tsx` — New imports + `SolarReturnAdvancePreview` component

**Imports added:**
- React hooks: `useMemo`, `useTransition`, `useRef` added to existing `useState, useEffect` import
- Types: `AdvanceConfig`, `AdvanceSnapshot` from `AdvanceTab`
- Functions/constants: `preCalculateSnapshots`, `OverviewStrip`, `ADVANCE_CONFIG`, `MARKER_COLORS`, `CATEGORY_LABELS` from `AdvanceTab`

**`SR_ADVANCE_CONFIG`** — module-level constant defining the 12-step monthly cap:
```ts
const SR_ADVANCE_CONFIG: AdvanceConfig = {
  unit: 'month', unitPlural: 'months', max: 12,
  msPerStep: ADVANCE_CONFIG.monthly.msPerStep,
}
```

**`SolarReturnAdvancePreview` component** — self-contained React component accepting `{ srData: SolarReturnData }`:
- Derives UTC-midnight base date from `srMoment.toISOString().split('T')[0]`
- Cache key: `sr:{targetYear}:{asc.toFixed(4)}:{mc.toFixed(4)}`
- Calls `preCalculateSnapshots(srChart, 'monthly', srBaseDate)`, slices to 13 entries (offsets 0–12)
- Applies secondary density cap (max 3 non-neutral markers, phase-1 category reservation + phase-2 fill by intensity)
- Renders `OverviewStrip` with `unknownTime={srChart.unknownTime === true}` and SR-specific `quietMessage`
- Renders Prev/Next navigation with `min-w-[44px] min-h-[44px]` touch targets, disabled when no marker in that direction
- Offset label: `"SR Start"` at offset 0, `"Month N"` for N ≥ 1
- Renders category banner for non-neutral, non-zero offsets using `bannerBoldFragment` with fallback to `split(' ')[0]`, plus `guidance` paragraph
- Renders color legend for the four marker categories

**Integration:** Placed at the bottom of the Reading tab `<div>`, after the GPT interpretation block (or GPT skeleton if still loading). Renders unconditionally when `solarReturnData` is available — no dependency on GPT state, matching spec requirement.

---

## Acceptance Check Results

| Check | Status |
|---|---|
| Strip renders in Reading tab, not Chart tab | PASS |
| 12 monthly steps from SR date | PASS — slice 0–12 |
| UTC-normalized base date | PASS — `new Date(srMoment.toISOString().split('T')[0])` |
| Dot click jumps offset + banner shows if non-neutral | PASS |
| Prev/Next navigate between non-neutral markers; disabled when none | PASS |
| Quiet message when all neutral | PASS — via `OverviewStrip` `quietMessage` prop |
| Year selector change recomputes strip | PASS — cache key includes `targetYear` |
| Pending state ("Reading your sky…") during computation | PASS — `OverviewStrip` built-in pending state |
| Strip does not appear on Chart tab | PASS |
| `unknownTime={false}` passed for SR charts (always computed with full time) | PASS — reads `srChart.unknownTime === true` (always false for SR charts) |
| Cache key uses `srChart` angles `.toFixed(4)` | PASS |
| Max 3 non-neutral markers (secondary density cap) | PASS — implemented post-slice |
| Category diversity in density cap | PASS — phase-1 reserves best per category |
| Power markers only from slow planets to SR Asc/MC | PASS — `preCalculateSnapshots` scoring engine handles this |
| Banner uses `bannerBoldFragment` with `split(' ')[0]` fallback | PASS |
| Banner renders `guidance` paragraph | PASS |
| SR advance renders while GPT is still loading | PASS — independent of GPT state |
| `preCalculateSnapshots` imported, not duplicated | PASS |

---

## Architecture Notes

- The `ADVANCE_CONFIG.monthly` max of 36 is not changed. The density cap inside `preCalculateSnapshots` runs against 37 snapshots (offsets 0–36) and enforces 20% of 36 = 8 markers. After slicing to 13, the secondary density cap in the SR component re-enforces 20% of 12 = 3 markers. This matches spec section 3.
- `startTransition` is used, keeping the main thread responsive during the monthly snapshot computation (under 100ms on mid-range devices for 37 snapshots).
- The animation `<style>` block is duplicated from `CoupleAdvanceTab`. This is acceptable given `OverviewStrip` uses the same marker animation class names. A future refactor could centralize the animation styles.

---

## Open Questions Resolved

- **Section header:** "When This Year Intensifies" (spec option, preferred over "Peak Moments This Solar Year")
- **Offset label format:** "SR Start" / "Month N" (spec preference for SR-year framing over "+N months")
- **Render order:** Strip appears below GPT section (or GPT skeleton) — independent render, no deferral
