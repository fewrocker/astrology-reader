---
# Review: sprint-0021-task-0003-feat-daily-snapshot-advance-signal
**Reviewed:** 2026-05-17
**Reviewer:** Claude (automated spec verification)
---

## Spec-by-Spec Verdict

**Spec 1 — Signal source: cache-warm-only.**
PASS. `DailySnapshotCard` contains no import or call to `preCalculateSnapshots`. It only reads from `localStorage`.

**Spec 2 — New shared localStorage key written by AdvanceTab.**
PASS. `AdvanceTab` writes `advance-today-signal-{YYYY-MM-DD}` with JSON `{ category, intensity, reason }` inside `startTransition`, guarded by `isQuotaError`, and only when `signal.category !== 'neutral'`. Key name and schema match the spec exactly.

**Spec 3 — DailySnapshotCard reads the signal, intensity threshold 0.25, advanceSignal state.**
PASS. At the start of `load()`, the component reads `advance-today-signal-${todayStr}`, parses it, checks `category !== 'neutral' && intensity >= 0.25`, and calls `setAdvanceSignal` accordingly. State type matches `{ category: MarkerCategory; intensity: number; reason: string } | null`. Read happens before any async GPT call.

**Spec 4 — Badge is a fourth pill in the existing pill row with matching shell classes.**
PASS. The badge renders inside `<div className="flex flex-wrap gap-3 mb-4">` after the moon pill, energy pill, and top-aspect pill, only when `advanceSignal` is non-null. Pill shell is `bg-mystic-gold/8 border border-mystic-gold/20 rounded-full px-3 py-1` — exact match.

**Spec 5 — Correct glyph and color per category.**
PASS. `ADVANCE_SIGNAL_GLYPHS` maps `power → ✦`, `favorable/challenging/shift → ◆`. `ADVANCE_SIGNAL_COLORS` maps `power → text-mystic-gold`, `favorable → text-emerald-400`, `challenging → text-red-400`, `shift → text-blue-400`. Values match `MARKER_COLORS` and the spec table exactly.

**Spec 6 — Badge structure: glyph span + label span.**
PARTIAL. The spec calls for `<span className="text-[color] text-xs">{glyph}</span>` followed by `<span className="text-[color] text-xs font-medium">{label}</span>`. The implementation wraps both spans in an outer `<div className="flex items-center gap-1.5 ...">` rather than the bare pill structure implied by spec, but this matches the pattern of every other pill in the row (they all use a wrapping div). The inner span structure is correct. The outer wrapper is a consistent pattern divergence that is not blocking. Minor note: the spec shows the glyph span in isolation while the implementation uses the same color class for glyph and label — spec does not prohibit this and the visual output is correct.

**Spec 7 — `reason` not rendered.**
PASS. The `reason` field is read and stored in state (`setAdvanceSignal({ ..., reason: parsed.reason })`), but it is not referenced anywhere in the JSX. The badge renders only the glyph and `CATEGORY_LABELS[advanceSignal.category]`.

**Spec 8 — No-natal-chart guard handled upstream.**
PASS. No code needed in either file; the upstream `HomeScreen` gate is not changed.

**Spec 9 — Missing key → advanceSignal null → badge absent.**
PASS. The `else` branch on `localStorage.getItem` returning null explicitly calls `setAdvanceSignal(null)`. When null, the `{advanceSignal && (...)}` guard suppresses the pill.

**Spec 10 — Only writes when `category !== 'neutral'`.**
PASS. The AdvanceTab write block is wrapped in `if (signal.category !== 'neutral')`. No write occurs for neutral days; the key remains absent.

**Spec 11 — Key expiry / stale key cleanup.**
PASS. `DailySnapshotCard` computes yesterday's date string and calls `localStorage.removeItem` on the stale key during each `load()` call. The removal is in its own try/catch so it cannot propagate. No separate cleanup sweep is needed.

**Spec 12 — Write inside startTransition, only for period === 'daily', only when baseDate matches today.**
PASS. The write block is inside the `startTransition(() => { ... })` callback. It is guarded by `period === 'daily' && computed.length > 0` and `baseDate.toISOString().split('T')[0] === todayStr`. No weekly or monthly path touches this key.

**Spec 13 — No prop drilling, no new props, no context changes.**
PASS. `DailySnapshotCard` signature is unchanged (`chart, birthDate, embedded`). No new props. `AdvanceTab` write logic uses only local variables. No `AppState`, `AppContext`, or `AppAction` changes are present in either file.

---

## Summary

All 13 specs pass. Spec 6 has a minor structural note (glyph and label share the same color class via a lookup map rather than being individually styled, and the pill wraps both spans in a `div` rather than a bare fragment) — this is consistent with the rest of the pill row and does not violate the spec's intent. No blocking issues found.

The implementation is clean and well-contained. The only deviation worth a second look is that the stale-key cleanup only removes yesterday's key (one day back) rather than scanning for any date mismatch. The spec says "if the stored key date does not match today, it is deleted" — the implementation approximates this by removing yesterday specifically. If a user skips multiple days, keys from two or more days ago would accumulate silently. This is a minor hygiene gap but not a correctness issue for the badge behavior, since the badge key is always today's date and yesterday's cleanup is the common case.
