---
# Code Review — Today Page Advance Signal Banner
**Task:** sprint-0021-task-0005-feat-today-advance-signal
**Reviewer:** Claude (Sonnet 4.6)
**Date:** 2026-05-17
**Verdict:** NEEDS FIXES

---

## What was checked

Three files: `AdvanceTab.tsx`, `TransitReadingPage.tsx`, `TodayPage.tsx` in `/tmp/sprint-0021-task-0005-feat-today-advance-signal/`.

---

## What is correct

### Singleton export (spec 1, 9)
`advanceSnapshotSessionCache` is declared at line 126 of `AdvanceTab.tsx`, after the existing constants block — exactly where spec 1 specifies. The export is a plain `new Map<string, AdvanceSnapshot[]>()`. Correct.

### Write-through in AdvanceTab (spec 10)
Line 1307 of `AdvanceTab.tsx` writes `advanceSnapshotSessionCache.set(cacheKey, computed)` immediately after `snapshotCache.current.set(cacheKey, computed)` on line 1306. Correct.

### Write-through in TransitReadingPage (spec 10)
Line 259 of `TransitReadingPage.tsx` writes `advanceSnapshotSessionCache.set(cacheKey, computed)` after the local ref write on line 258. Correct.

### State variable (spec 3)
`const [advanceScore, setAdvanceScore] = useState<SnapshotScore | null>(null)` is present at line 54 of `TodayPage.tsx`. Single state variable, initialized null. Correct.

### Placement (spec 4)
The banner is rendered at lines 117–163 of `TodayPage.tsx`, directly after the date header section (lines 111–115) and before the Personal Day card (line 165). Correct.

### Empty / null state (spec 7)
The banner is wrapped in `{chartData && advanceScore && advanceScore.category !== 'neutral' && (...)}`. When `advanceScore` is null the block is absent — no skeleton, no placeholder. Correct.

### No blocking computation (spec 11)
`TodayPage` never imports or calls `preCalculateSnapshots`. The cache-lookup loop is a synchronous `Map.entries()` iteration. Correct.

### dateStr format parity (spec 8, open question 1)
`AdvanceTab.tsx:994` sets `dateStr: date.toISOString().split('T')[0]`, which produces `YYYY-MM-DD`. `TodayPage.tsx:69` builds `todayStr = new Date().toISOString().slice(0, 10)`, which also produces `YYYY-MM-DD`. The formats match. Correct.

### Iteration order (spec 2)
The outer loop iterates `['daily', 'weekly', 'monthly']` — daily first. The `break outer` label exits both loops on the first non-neutral match. Correct.

### Banner structural elements (spec 5)
The following elements are present in TodayPage's banner:
- Category label line: `<p className="text-mystic-muted text-xs uppercase tracking-widest mb-1">{CATEGORY_LABELS[advanceScore.category]}</p>` — present at line 141–143.
- Reason text with bold/normal split: lines 153–154 implement `bannerBoldFragment ?? reason.split(' ')[0]` as the bolded fragment, remainder trimmed and appended. Correct.
- Guidance text: lines 156–159, className `text-xs text-mystic-muted/80 mt-1.5 font-light leading-relaxed`. Correct.

### Icon logic (spec 5)
`'challenging' → '⚠'`, `'shift' → '◆'`, all others → `'✦'`. Matches AdvanceTab:1555–1556. Correct.

---

## Spec violations and bugs

### Bug 1 (critical) — TodayPage key prefix does not match TransitReadingPage key format

This is the central cache-hit failure. The spec (section 8) resolves the baseDate reconstruction problem by having TodayPage iterate keys and match on prefix `${chartKey}:daily:` then confirm via `dateStr`. This works correctly for cache entries written by **AdvanceTab** (standalone), because AdvanceTab uses key format:

```
`${chartKey}:${period}:${baseDate.toISOString()}`
```

TodayPage searches for prefix `${chartKey}:daily:` — this matches AdvanceTab's keys.

However, **TransitReadingPage** uses a completely different key format (line 250):

```
`${transitPeriod}:${baseDate.toISOString()}:${chartKey}`
```

The order is `period:baseDate:chartKey`, not `chartKey:period:baseDate`. A key written by TransitReadingPage might look like:

```
daily:2026-05-17T12:00:00.000Z:123.4567:234.5678:false
```

When TodayPage scans for `key.startsWith(`${chartKey}:daily:`)`, this key does NOT match — `chartKey` is at the end, not the start. Entries written solely by TransitReadingPage (i.e., users who visit the Transit Reading tab first and then navigate to Today) will never produce a banner hit.

**Impact:** The spec explicitly calls out TransitReadingPage as a write-through source (spec 1, 10). If the user's session path is Transit Reading → Today (which is likely since Transit Reading is adjacent to the Advance tab in the same `TransitReadingPage` component), the banner never appears despite the cache being warm.

**Fix required:** Either normalize TransitReadingPage to use the same key format as AdvanceTab (`${chartKey}:${period}:${baseDate.toISOString()}`), or update TodayPage's prefix check to also try the TransitReadingPage key format. The cleanest fix is to align TransitReadingPage to the AdvanceTab format — both are internal to the module — and is a one-line change at `TransitReadingPage.tsx:250`.

### Bug 2 (minor) — Banner styling parity: missing category label in AdvanceTab's own banner

The spec (section 5) says TodayPage must replicate the AdvanceTab banner at lines 1532–1574. The AdvanceTab banner (lines 1558–1576) does **not** include a category label line — it goes directly from the icon to the reason text. TodayPage adds a category label `<p>` above the reason (lines 141–143).

This is actually a **spec-correct addition** — spec 5 explicitly requires: "Category label line above the reason: a small `text-mystic-muted text-xs uppercase tracking-widest` label reading the `CATEGORY_LABELS[category]` value." The AdvanceTab reference is for className parity, not element parity. The label addition is intentional and correct per spec.

No action needed; calling this out to confirm it is not an unintended divergence.

### Observation — `MARKER_COLORS` import omitted from TodayPage

Spec 9 states TodayPage should import `MARKER_COLORS` from AdvanceTab. The import at `TodayPage.tsx:17` reads:

```ts
import { advanceSnapshotSessionCache, CATEGORY_LABELS } from './AdvanceTab'
```

`MARKER_COLORS` is not imported. The banner implementation in TodayPage uses Tailwind class strings directly (identical to AdvanceTab's approach) rather than the `MARKER_COLORS` hex values, so `MARKER_COLORS` is not actually consumed. The spec mentions it as an import to add but the implementation does not need it. This is a spec annotation mismatch — the spec listed it as a to-be-imported symbol but the implementation correctly avoids it since the banner uses classNames, not inline `style` colors.

No functional issue. The import list in spec 9 was slightly over-specified; the implementation is cleaner for omitting an unused import.

---

## Summary

| Check | Result |
|---|---|
| Singleton export location and form | Pass |
| Write-through in AdvanceTab | Pass |
| Write-through in TransitReadingPage | Pass |
| State variable | Pass |
| Placement above Personal Day | Pass |
| Empty state (null → no render) | Pass |
| No `preCalculateSnapshots` call | Pass |
| dateStr format parity | Pass |
| Iteration order daily → weekly → monthly | Pass |
| Category label line present | Pass |
| Icon logic | Pass |
| Bold/normal reason split | Pass |
| Guidance text | Pass |
| TransitReadingPage key format matches TodayPage prefix check | **FAIL** |

---

## Required fix before merge

**`TransitReadingPage.tsx:250`** — change the cacheKey to match AdvanceTab's format:

```ts
// Current (broken for TodayPage lookup):
const cacheKey = `${transitPeriod}:${baseDate.toISOString()}:${chartData.angles.ascendant.longitude.toFixed(4)}:${chartData.angles.midheaven.longitude.toFixed(4)}:${chartData.unknownTime}`

// Fixed (matches AdvanceTab format; TodayPage prefix scan works):
const chartKey = `${chartData.angles.ascendant.longitude.toFixed(4)}:${chartData.angles.midheaven.longitude.toFixed(4)}:${chartData.unknownTime}`
const cacheKey = `${chartKey}:${transitPeriod}:${baseDate.toISOString()}`
```

This is the only blocking issue. All other aspects of the implementation are correct and faithful to spec.
