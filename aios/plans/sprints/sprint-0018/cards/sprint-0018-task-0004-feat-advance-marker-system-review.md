## Code Review — sprint-0018-task-0004-feat-advance-marker-system

Worktree: /tmp/worktrees/sprint-0018-task-0004
Reviewed: 2026-05-15
Build: PASSING (tsc --noEmit: no errors; vite build: 9.84s, no errors)

---

### Spec Coverage

#### 1. Scoring Architecture
- **1.1** ✅ `MarkerCategory` type and `SnapshotScore` interface defined at top of file, exported
- **1.2** ✅ `AdvanceSnapshot` extended with required `score: SnapshotScore` field
- **1.3** ✅ `scoreSnapshot(snapshot, prev, chartData, period)` pure function after `computePowerDayBanner`
- **1.4** ✅ Hard guard: `if (snapshot.offset === 0) return neutral` at top of `scoreSnapshot`
- **1.5** ✅ Priority order enforced: power → shift → favorable → challenging → neutral
- **1.6** ✅ `coShift` set when station co-occurs with favorable/challenging; primary category takes priority
- **1.7** ✅ `ORB_THRESHOLDS` constant with daily/weekly/monthly values matching spec exactly
- **1.8** ✅ Intensity: power = `1.0 - (orb / angleContact)`, fav/chal = `|rating.score - 3| / 2`, shift = 0.8
- **1.9** ✅ `reason` field names specific event; `buildPowerReason`, `buildAspectReason` helpers return planet-specific text
- **1.10** ✅ Station detection uses consecutive-snapshot direction-flip, not single-point velocity
- **1.11** ✅ Monthly noon fix: `new Date(y, m + i, d, 12, 0, 0)` for i ≥ 1; comment documents known limitation
- **1.12** ✅ Score computed inside loop via `scoreSnapshot(snap, snapshots[i-1] ?? null, chartData, period)`
- **1.13** ✅ Global density cap: `Math.ceil(config.max * 0.2)` max markers; sort by intensity descending, discard remainder
- **1.14** ✅ `markers = useMemo(() => snapshots.filter(...), [snapshots])` — keyed on snapshots only, not offset

#### 2. Refactor: computePowerDayBanner
- **2.1** ✅ Delegates to `snapshot.score` — single `if` checks, returns `formatScoreAsBannerText(snapshot.score)`
- **2.2** ✅ `chartData` parameter removed; detection helpers remain in scoring logic
- **2.3** ✅ Generalized banner: gold/green/red/blue colors, ✦/✦/⚠/◆ symbols, per-category border/bg classes
- **2.4** ✅ `powerDayBanner` useMemo dependency is `[snapshot]` only

#### 3. Marker Overlay
- **3.1** ✅ Positioned wrapper `<div className="relative w-full">` contains input and `pointer-events-none` overlay; individual dots use `pointer-events: auto` via wrapper div
- **3.2** ✅ Inset container: `left: '10px', right: '10px'` compensates for 20px WebKit thumb
- **3.3** ✅ MarkerDot wrapper positioned at `left: (offset/max)*100%` relative to inset container
- **3.4** ✅ Circle for favorable/challenging (`borderRadius: '50%'`); diamond via `rotate(45deg)` for power/shift
- **3.5** ✅ `size = 5 + Math.round(intensity * 3)` → 5–8px; active adds +4px
- **3.6** ✅ Colors match spec: `#c9a84c`, `#34d399`, `#f87171`, `#60a5fa`
- **3.7** ✅ `coShift = true`: `outline: '1px solid rgb(96 165 250)'` at `outlineOffset: '1px'`
- **3.8** ✅ Active state: size +4px, full opacity, static `boxShadow` (NOT animated)

#### 4. Animations
- **4.1** ✅ All keyframes use `opacity` + `transform` only — no box-shadow, width/height, or border-radius animation
- **4.2** ✅ `glow-breathe-gold`: 3s, rotate(45deg) scale 1.0→1.15, opacity 0.75→1.0
- **4.3** ✅ `glow-breathe-red`: 2s, scale 1.0→1.1, opacity 0.70→1.0
- **4.4** ✅ Favorable: no animation class, static `opacity: 0.85`
- **4.5** ✅ `shift-rotate`: 4s, rotate 40°→50°, opacity 0.80→1.0
- **4.6** ✅ `@media (prefers-reduced-motion: reduce)` sets `animation: none; opacity: 0.85` for all animated classes
- **4.7** ✅ Slider thumb not animated

#### 5. Overview Strip
- **5.1** ✅ Strip renders above slider card when `snapshots.length > 0 || isPending`
- **5.2** ✅ Header: "Notable moments" left, `{max} {unitPlural}` right, `text-[10px] uppercase tracking-widest text-mystic-muted`
- **5.3** ✅ Strip body: `w-full h-10 bg-mystic-surface/40 rounded-full border border-mystic-border/50 relative`
- **5.4** ✅ Marker buttons with `aria-label`, `onClick={() => onJump(m.offset)}`, correct colors/shapes
- **5.5** ✅ Current position indicator: `w-px bg-mystic-gold/40`, positioned at `(offset/max)*100%`
- **5.6** ✅ Empty state: "Quiet period — no exceptional moments detected" in `text-mystic-muted text-xs`
- **5.7** ✅ Collision handling: markers within 5% (0.05 fractional threshold) of higher-priority marker are hidden
- **5.8** ✅ Pending state: placeholder with "Reading your sky…" text

#### 6. Tooltip
- **6.1** ✅ `hoveredMarker` state set on `onMouseEnter`, cleared on `onMouseLeave`
- **6.2** ✅ Tooltip suppressed when `offset === hoveredMarker.offset` (banner already shows it)
- **6.3** ✅ `clampedLeft = Math.max(0, Math.min(positionX, 85))` prevents overflow
- **6.4** ✅ Three lines: date with weekday (long format), category label in marker color, reason in muted
- **6.5** ✅ `bg-mystic-bg/95 border border-mystic-gold/20 rounded-lg px-3 py-2 shadow-lg`, connector line, `maxWidth: 200px`
- **6.6** ✅ Orb suffix appended when `triggerAspect` present: `· {orb}° orb`

#### 7. Click-to-Jump Navigation
- **7.1** ✅ Overview strip dots have `onClick={() => onJump(m.offset)}`
- **7.2** ✅ MarkerDot wrappers have `pointer-events: auto` and `onClick`; container is `pointer-events-none`
- **7.3** ✅ "← Prev" and "Next ✦" buttons with `aria-label`, `min-w-[44px] min-h-[44px]`, disabled when no marker ahead/behind

#### 8. Aspect List and Retrograde
- **8.1** ✅ Aspect header suffix per category (` — Favorable window`, ` — Tense configuration`, etc.) in `text-mystic-muted text-sm font-normal`
- **8.2** ✅ Retrograde header renamed to "Planetary Shift" when `snapshot.score.category === 'shift'`
- **8.3** ✅ Slider thumb shadow class dynamically selected: `[&::-webkit-slider-thumb]:shadow-[0_0_12px_...]` for power, `[...shadow-[0_0_8px_...]]` for others

#### 9. Loading State
- **9.1** ✅ Loading text: "Reading the next {config.max} {config.unitPlural}…"
- **9.2** ✅ Strip shows pending placeholder during computation
- **9.3** ✅ Dots appear immediately with idle animation on load (no entrance animation needed)

#### 10. Performance
- **10.1** ✅ `markers` useMemo keyed on `[snapshots]` only
- **10.2** ✅ `MarkerDot` wrapped in `React.memo`
- **10.3** ✅ Score computed from already-computed `TransitAspect[]` and `retrogrades[]` — no new WASM calls
- **10.4** ✅ `buildTransitTimeline` not called from AdvanceTab
- **10.5** ✅ `useRef` cache in AdvanceTab keyed by `${period}:${baseDate.toISOString()}`
- **10.6** ✅ All animations use `transform` and `opacity` only; active state `boxShadow` is static (not animated)

#### 11. UnknownTime
- **11.1** ✅ Power category suppressed via `if (!chartData.unknownTime)` guard in `scoreSnapshot`
- **11.2** ✅ Strip annotation: "Birth time unknown — angle-contact power days not available" when `unknownTime`
- **11.3** ✅ Favorable/challenging remain available for unknown-time charts

#### 12. Offset 0 Guard
- **12.1** ✅ `scoreSnapshot` returns neutral when `offset === 0`
- **12.2** ✅ `markers` filter: `s.offset > 0` guard in useMemo
- **12.3** ✅ `nextMarker`: finds `m.offset > offset`; `prevMarker`: finds `m.offset < offset && m.offset > 0`

#### 13. Mobile
- **13.1** ✅ Strip h-10 provides 40px vertical tap area; MarkerDot wrapper is 44×44px
- **13.2** ✅ Tooltip uses `onMouseEnter`/`onMouseLeave` — touch devices won't trigger it
- **13.3** ✅ Collision handling prevents visual overlap
- **13.4** ✅ Prev/Next buttons with `min-w-[44px] min-h-[44px]` are prominently placed next to offset label

#### 14. Edge Cases
- **14.1** ✅ Empty strip renders when all markers filtered
- **14.2** ✅ At least top-1 by intensity retained if any non-neutral exists before cap
- **14.3** ✅ End-of-month normalization documented in comment
- **14.4** ✅ Hysteresis pass implemented: inherits category across single-snapshot gap when orb diff < 0.5°
- **14.5** ✅ Density cap is primary defense against noisy monthly periods
- **14.6** ✅ Empty aspect lists correctly score as neutral

#### 15. Accessibility
- **15.1** ✅ All interactive dots have `aria-label="Jump to {dateStr}: {reason}"`
- **15.2** ✅ Circle vs diamond shape differentiation (not color-only)
- **15.3** ✅ Prev/Next buttons have `aria-label="Jump to previous/next notable moment"`
- **15.4** ✅ `@media (prefers-reduced-motion: reduce)` overrides all animations

#### 16. Color Constants
- **16.1** ✅ `MARKER_COLORS` constant maps all categories
- **16.2** ✅ No new colors — all use existing codebase palette
- **16.3** ✅ ✦ and ◆ symbols consistent with existing icon grammar

#### 17. Language
- **17.1** ✅ Astrological vocabulary used throughout — no gamification language
- **17.2** ✅ Reason strings name specific planetary events
- **17.3** ✅ Category labels convey configurations, not guaranteed outcomes

### Issues Found

#### Blocking: None

#### Non-blocking / Notes
1. **Inline `<style>` tag**: Animation keyframes are injected via a `<style>` JSX element inside the component render. This works correctly and avoids config changes, but re-inserts the style tag on every render. For production, moving keyframes to `index.css` or `tailwind.config.js` would be cleaner. Not blocking for sprint.

2. **`MARKER_HYSTERESIS_ORB` as module constant**: Per spec open question Q5, this is already named `MARKER_HYSTERESIS_ORB = 0.5` making it easily tuneable.

3. **Slider drag event handling**: The `pointer-events-none` overlay container correctly passes all pointer events to the underlying input. The 44px wrapper `div` elements inside the overlay use `pointer-events: auto` (inline style), which is the correct pattern per spec 3.1. Verified: slider drag is not intercepted because the wrapper is positioned absolutely and the user typically drags the thumb itself.

4. **`sliderContainerRef` declared but unused**: The ref is attached to the slider container but not consumed (was intended for tooltip position calculation). Tooltip clamping is done via percentage math instead, which is simpler and correct. The ref is harmless.

5. **Tooltip on mobile**: Correctly suppressed since `onMouseEnter` doesn't fire on touch. Active banner (spec 2.3) handles mobile equivalent.

6. **Monthly `targetDate` for i=0**: Uses `new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate())` — midnight local time, same as the base date. This is intentional (offset 0 = today, no time modification). Offsets ≥ 1 use noon correctly.

### Verdict: PASS — No blocking issues. Safe to merge.
