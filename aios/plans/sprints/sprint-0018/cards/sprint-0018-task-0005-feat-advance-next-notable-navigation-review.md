---
**Review type:** Implementation review
**Branch:** sprint-0018-task-0005-feat-advance-next-notable-navigation
**Worktree:** /tmp/worktrees/sprint-0018-task-0005
**Files reviewed:** src/components/reading/AdvanceTab.tsx, src/index.css
**Result:** PASS — no blocking issues
---

## Checklist

### Buttons — disabled state
- [x] `disabled` attribute is set when `nearestNext === null` / `nearestPrev === null`
- [x] `aria-disabled="true"` is also set on disabled buttons
- [x] Disabled visual: `text-mystic-muted/40 cursor-not-allowed opacity-30`
- [x] Enabled visual: `text-mystic-gold/60 hover:text-mystic-gold cursor-pointer`
- [x] Buttons remain in DOM when disabled (hidden only when `markers.length === 0`)

### Touch targets >= 44px
- [x] Both buttons have `min-h-[44px] px-4` — satisfies WCAG 2.5.5 (44x44px)
- [x] Typography is `text-xs font-heading tracking-wide` as specified

### Thumb halo approach
- [x] CSS global rule added to `src/index.css` under `.has-thumb-halo` class
- [x] Uses `-webkit-slider-thumb` and `-moz-range-thumb` variants (cross-browser)
- [x] `--thumb-halo` CSS custom property set inline on the `<input>` element
- [x] Class `has-thumb-halo` added to input `className` string when `currentMarker` is set
- [x] Halo absent (no class, no style) when `currentMarker` is null
- [x] No animation on halo — immediately present or absent per spec 11
- [x] Colors match spec 9: power=amber, favorable=emerald, challenging=rose, shift=blue
- [x] Box-shadow values match spec 8 (`0 0 10px 3px {color}35, 0 0 20px 6px {color}20`)

### Aspect list header suffix
- [x] Suffix appended ONLY when `currentMarker` is non-null
- [x] `CATEGORY_LABELS` map covers all four non-neutral categories
- [x] Neutral category maps to empty string (edge case safe)
- [x] Label values: power→"Power configuration", favorable→"Favorable window", challenging→"Tense configuration", shift→"Planetary shift"
- [x] Suffix styled identically to base header (`font-heading text-lg text-mystic-gold`)

### Navigation algorithm
- [x] "-> Next" uses minimum offset > current (correct)
- [x] "<- Prev" uses maximum offset < current (correct)
- [x] Both use `reduce` over filtered `markers` array — O(k) on click only
- [x] `setOffset()` called directly, no animation/easing (spec 16)

### Foundation — scoring
- [x] `MarkerCategory` type defined
- [x] `SnapshotScore` interface defined with all specified fields
- [x] `score: SnapshotScore` added to `AdvanceSnapshot` interface
- [x] `scoreSnapshot()` runs as pure function in `preCalculateSnapshots()`
- [x] `markers = useMemo(() => snapshots.filter(...), [snapshots])`
- [x] `scoreSnapshot` unused `period` parameter prefixed with `_` to avoid lint warnings

### TypeScript
- [x] `tsc --noEmit` exits with zero errors and zero output

### Accessibility
- [x] `aria-label="Jump to next notable moment"` on -> Next button
- [x] `aria-label="Jump to previous notable moment"` on <- Prev button

## Minor observations (non-blocking)

1. **Button text rendering**: Spec says "← Prev" / "→ Next" but notes plain ASCII arrows. Implementation uses HTML entities `&lt;-` and `-&gt;` which render as `<- Prev` and `-> Next`. This satisfies the ASCII-only requirement and avoids Unicode arrow glyph rendering inconsistency across platforms.

2. **`scoreSnapshot` is self-contained scoring**: The scoring logic is reasonable for the foundation layer. It mirrors the same thresholds used in `computePowerDayBanner` (same 2° orb, same slow-planet set, same 3-aspect threshold). This ensures visual consistency between banners and marker classification.

3. **`CATEGORY_LABELS.neutral` = `''`**: Since `currentMarker` is only non-null when at a non-neutral position, the empty string for neutral is never rendered in the header. The Record type completeness is correct.

## Conclusion

All three spec gaps (navigation, thumb halo, header echo) are correctly implemented. Disabled state, touch targets, halo CSS approach, and header suffix all match spec. No blocking issues.
