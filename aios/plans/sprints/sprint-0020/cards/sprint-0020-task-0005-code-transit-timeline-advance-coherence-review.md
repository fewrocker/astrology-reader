# Review: Transit Timeline / Advance Score Coherence

**Task:** sprint-0020-task-0005-code-transit-timeline-advance-coherence
**Branch:** sprint-0020-task-0005-code-transit-timeline-advance-coherence
**Commit:** 61823f2
**Build:** PASS (tsc + vite, no type errors, no new warnings)

---

## What was implemented

### 1. `preCalculateSnapshots` exported from `AdvanceTab.tsx`

The function was previously module-private (`function preCalculateSnapshots`). It is now `export function preCalculateSnapshots` so `TransitReadingPage` can call it directly without duplicating logic.

### 2. `AdvanceTab.tsx` — two optional props added

```ts
snapshots?: AdvanceSnapshot[]
isPending?: boolean
```

When `snapshots` is provided by the parent, the internal `useEffect` / `useTransition` computation is skipped entirely. The internal `useState` / `useRef` cache remain but are only exercised when the parent passes no snapshots (backwards-compatible). The resolved values are aliased:

```ts
const snapshots = snapshotsProp ?? internalSnapshots
const isPending = snapshotsProp !== undefined ? (isPendingProp ?? false) : internalIsPending
```

No behavior change when `AdvanceTab` is used standalone (e.g. `CoupleAdvanceTab`).

### 3. `TransitReadingPage.tsx` — snapshot state lifted to page level

Added `useRef` snapshot cache, `useState<AdvanceSnapshot[]>`, and `useTransition` at the page level. The cache key follows the sprint-0019 format:

```
${period}:${baseDate.toISOString()}:${asc.toFixed(4)}:${mc.toFixed(4)}:${unknownTime}
```

Snapshots begin computing as soon as `chartData`, `transitPeriod`, and `transitData` are available — not gated on the Advance tab being visited.

A `scoreByDate: Map<string, MarkerCategory>` is derived from non-neutral snapshots via `useMemo` and passed to `TransitTimeline` (omitted when empty, so the timeline falls back to the heuristic cleanly on first render).

`AdvanceTab` receives `snapshots` and `isPending` from the page, skipping its own recomputation.

### 4. `TransitTimeline.tsx` — advance-aware `DaySection`

**New prop:** `scoreByDate?: Map<string, MarkerCategory>` on both `TransitTimeline` and `DaySection`.

**Badge logic** (in `DaySection`):
- If `scoreByDate` provides `power`, `favorable`, or `challenging` for the date → use that category's badge.
- `shift` and `neutral` are excluded from the badge (shift has no useful single-line timeline label; neutral means no badge).
- If no advance data for the date and `day.isPowerDay` is true → show the `power` badge (event-count heuristic fallback).
- If neither → no badge (unchanged behavior for plain days).

Badge text comes from `CATEGORY_LABELS` imported from `AdvanceTab.tsx`:
- `power` → "✦ Power Day"
- `favorable` → "◆ Favorable Window"
- `challenging` → "⚠ Challenging Period"

Dot colors are category-appropriate: gold for power, emerald for favorable, red for challenging.

**Stats bar:** The "power days" count is replaced by "notable days" when `scoreByDate` is available, counting only `power`, `favorable`, and `challenging` dates.

---

## Key design decisions

- **Snapshots start computing immediately** when the page mounts, not when the user opens the Advance tab. This means Timeline visitors who never open the Advance tab still get advance-aware badges after the initial `useTransition` pass completes.
- **`scoreByDate` is only passed when non-empty.** An empty map (snapshots still pending) leaves the prop `undefined`, so the Timeline renders the heuristic badges without a loading flash.
- **`shift` category is excluded from Timeline badges.** A station crossing is a meaningful Advance-tab event but has no natural single-word Timeline equivalent. The heuristic `isPowerDay` flag is checked as fallback for those dates, so days that happen to be both a station and a power day by event count still show a gold badge.
- **No context or global state.** Snapshots are passed via props. This keeps the data flow explicit and avoids re-render surface area.

---

## Files changed

- `src/components/reading/AdvanceTab.tsx` — export `preCalculateSnapshots`; add `snapshots?` / `isPending?` props with internal fallback
- `src/components/results/TransitReadingPage.tsx` — lift snapshot state; derive `scoreByDate`; pass both to consumers
- `src/components/reading/TransitTimeline.tsx` — import `MarkerCategory` / `CATEGORY_LABELS`; update `DaySection` with category-aware badges; update stats bar
