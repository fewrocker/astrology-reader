---
**Type:** Feature
**Originated by:** Miyazaki, Jobs
---

## Problem / Opportunity

The marker system proposed for sprint 0018 (`feat-advance-marker-system`) gives the Advance tab's slider a visible intelligence layer: colored dots on the track that pre-announce power days, favorable windows, challenging periods, and planetary shifts before the user lands on them. The overview strip shows the entire period at a glance. Together these features transform the slider from a manual search into a bird's-eye map.

But the map is not yet navigable. Once markers exist, the next friction point is traversal: to move from the current slider position to the nearest marked moment, the user must still drag across every intervening step — potentially 8 or 12 steps of meaningless neutral terrain. On mobile, this is imprecise. On any device, it is friction that interrupts the reflective, planning quality of the feature.

Three connected gaps remain after the marker layer ships:

**Gap 1 — no fast-forward between notable moments.** The slider provides only continuous drag. There is no affordance to say "take me to the next thing worth looking at." A user who opens the weekly view and sees gold and red dots scattered at steps 8, 19, 31, and 47 must drag through 47 steps one by one to visit each, unless they target the overview strip dots precisely on mobile.

**Gap 2 — the slider thumb carries no meaning about where it currently rests.** The gold thumb is the same at a neutral offset as it is at a power configuration. When the user arrives at a marked position, the only visual confirmation is the dot on the track and the banner below. The thumb itself — the most salient visual element in the slider — contributes no information. It is a cursor, not a participant in the reading.

**Gap 3 — the aspect list header strips category context.** When the user is looking at a power-day snapshot, the aspect list reads "Transit Aspects (6)." The category label established by the marker system — "Power configuration," "Favorable window," "Tense configuration," "Planetary Shift" — is present in the banner above the chart wheel, but it does not reach into the aspect list itself. The user's attention moves between the banner and the list with no continuous thread connecting them.

Miyazaki: "A 'Next notable moment' button. Next to the slider, a small control: '→ Next.' Pressing it advances the slider to the nearest upcoming marked position. This is the fastest way to scan the period — not dragging step by step, but jumping between notable moments."

Miyazaki: "The slider thumb itself participates in the reading. It does not just sit there being gold. It tells you: this position has a quality."

Miyazaki: "When a power day is selected, the aspect list header could say: 'Transit Aspects (6) — Power configuration.' This is a trivial change… but it creates a continuous thread of meaning from the marker on the slider through the date display through to the aspect list below."

---

## Vision

The Advance tab gains three navigation and context enhancements that together make the marker system feel fully integrated rather than decorative.

A user opens the monthly view. The overview strip shows one gold dot at step 4, a green dot at step 12, and a red cluster at steps 22–24. They do not drag — they tap "→ Next" once and arrive at step 4. The slider thumb now shows a soft amber halo pulsing gently around the gold disc. The aspect list below reads: "Transit Aspects (5) — Power configuration." They read the banner, absorb the aspects, tap "→ Next" again, and arrive at step 12. The thumb halo shifts to emerald. The header reads "Transit Aspects (8) — Favorable window." They continue — two more taps to traverse the red cluster — each time the header and halo confirm the character of the position before they read a single aspect row.

This is orientation made tactile. The user never needs to look at the dot on the track to understand where the slider is — the thumb itself carries the information, and the aspect list echoes it.

When the user reaches the last marker and the only remaining positions are neutral, the "→ Next" control grays out. "← Prev" is always available for positions already visited. When the slider is at offset 0 (the reference point), both controls appear in their appropriate enabled or disabled states without rendering at all if no markers exist.

---

## Specifications

### 1. Dependency

This feature is an enhancement layer on top of `feat-advance-marker-system`. It requires that `snapshots[]` carry a pre-computed `score: SnapshotScore` field, and that the `markers` array — a `useMemo` over `snapshots.filter(s => s.score.category !== 'neutral')` — is available inside `AdvanceTab`. No new scoring logic is introduced here. All computation in this proposal reads from the `markers` array and the current `offset` state already present in the component.

### 2. "→ Next" button — design and placement

The "→ Next" control is a text-link-style button rendered to the right of the slider's label row — the flex row at the top of the slider card that currently shows "Advance Time" on the left and the offset label ("+3 weeks") on the right. The button sits adjacent to or below the offset label in that same row, or as a second row directly beneath the slider input and its "Now / N days" labels.

Preferred placement: a compact flex row below the end-label row, centered or right-aligned beneath the slider track:

```tsx
<div className="flex justify-center gap-4 mt-2">
  <button ...>← Prev</button>
  <button ...>→ Next</button>
</div>
```

This placement keeps the buttons spatially near the slider track they control without competing with the offset label or the date display below.

Label text: "← Prev" and "→ Next" (plain ASCII arrows, not Unicode arrow characters, so rendering is consistent across platforms and screen readers speak them naturally as "Prev" and "Next").

### 3. "← Prev" button — design and placement

The "← Prev" control mirrors the "→ Next" control in placement and styling, appearing to its left in the same flex row. It advances the slider backward to the nearest marked position with a lower index than the current offset.

### 4. Button visual style — enabled state

Both buttons use a minimal text-link aesthetic to avoid visual competition with the slider thumb and the marker dots:

- Typography: `text-xs font-heading tracking-wide`
- Color: `text-mystic-gold/60` at rest, transitioning to `text-mystic-gold` on hover (`hover:text-mystic-gold`)
- No border, no background, no shadow — the control reads as a text affordance, not a button widget
- Cursor: `cursor-pointer`
- Transition: `transition-colors duration-150`

On hover, the color shifts from 60% to full mystic-gold opacity. No scale, translate, or other motion — the slider is a reflective instrument and its controls should not jump around.

### 5. Button disabled state

A button is disabled when no marker exists in the corresponding direction relative to the current offset.

"→ Next" is disabled when `markers.every(m => m.offset <= offset)` — there are no marked positions ahead.

"← Prev" is disabled when `markers.every(m => m.offset >= offset)` — there are no marked positions behind.

Disabled visual treatment:
- Color: `text-mystic-muted/40` (the muted text color at reduced opacity)
- Cursor: `cursor-default` or `cursor-not-allowed`
- The button remains in the DOM in its disabled state (not hidden) so the layout does not shift as the slider traverses the range. The buttons only disappear entirely when `markers.length === 0` — when no markers exist at all, the entire button row is not rendered.

### 6. Button visibility condition

The entire Prev/Next button row is rendered only when `markers.length > 0`. When snapshots are still computing (`isPending` is true and `snapshots.length === 0`), the button row is not rendered. It appears once markers have been computed. This avoids flicker and layout shift during the computation phase.

### 7. "Nearest marked position" — algorithmic definition

**For "→ Next":** Find the minimum `m.offset` among all markers where `m.offset > offset`. If no such marker exists, the button is disabled. On click, `setOffset(nearestNext)` is called directly — no intermediate animation, no easing, no scroll. The slider jumps instantly to the target offset, identical to clicking a dot in the overview strip.

```typescript
const nearestNext = markers
  .filter(m => m.offset > offset)
  .reduce((min, m) => m.offset < min.offset ? m : min, { offset: Infinity } as { offset: number })
  .offset
```

**For "← Prev":** Find the maximum `m.offset` among all markers where `m.offset < offset`. If no such marker exists, the button is disabled.

```typescript
const nearestPrev = markers
  .filter(m => m.offset < offset)
  .reduce((max, m) => m.offset > max.offset ? m : max, { offset: -Infinity } as { offset: number })
  .offset
```

Both values are computed in the render body (not in a separate `useMemo`) because they depend only on the already-memoized `markers` array and the `offset` state — the computation is O(k) where k is the number of markers, typically 3–10 for a monthly period.

### 8. Slider thumb halo — behavioral contract

When `offset` corresponds to a marked position — i.e., `markers.some(m => m.offset === offset)` is true — the slider thumb displays a faint colored halo in the marker's category color. When `offset` moves to a neutral position, the halo fades.

The halo is a CSS `box-shadow` applied to the thumb pseudo-element via a dynamic inline style or a CSS custom property. It does not animate via Tailwind's `animate-pulse` — the thumb must not move or scale, as Jobs noted that animation on a control element breaks the user's spatial model. The halo is present or absent; it does not breathe.

```
box-shadow: 0 0 10px 3px {haloColor}40, 0 0 20px 6px {haloColor}20
```

Where `{haloColor}` is the hex color of the current marker's category.

### 9. Slider thumb halo — color per category

| Category | Halo color | CSS value |
|---|---|---|
| `power` | Mystic gold / amber | `rgba(201, 168, 76, 0.35)` |
| `favorable` | Emerald green | `rgba(52, 211, 153, 0.35)` |
| `challenging` | Rose red | `rgba(248, 113, 113, 0.35)` |
| `shift` | Blue | `rgba(96, 165, 250, 0.35)` |
| `neutral` (or no marker) | No halo — default gold shadow only | — |

When the offset is neutral, the thumb retains its existing default shadow (`shadow-[0_0_8px_rgba(201,168,76,0.5)]`) without any category override.

### 10. Slider thumb halo — CSS implementation approach

The native `<input type="range">` thumb is styled via the `[&::-webkit-slider-thumb]` pseudo-element selector in Tailwind's arbitrary variant syntax. Dynamic `box-shadow` cannot be applied to a pseudo-element via inline style on the parent element in most browsers.

The correct approach is a CSS custom property (`--thumb-halo`) set via inline style on the `<input>` element itself, and consumed in the thumb's `box-shadow` via a global CSS rule:

In `index.css` (or equivalent global stylesheet):
```css
input[type='range'].has-thumb-halo::-webkit-slider-thumb {
  box-shadow: var(--thumb-halo, 0 0 8px rgba(201, 168, 76, 0.5));
}
input[type='range'].has-thumb-halo::-moz-range-thumb {
  box-shadow: var(--thumb-halo, 0 0 8px rgba(201, 168, 76, 0.5));
}
```

In the component:
```tsx
<input
  type="range"
  className={`... ${currentMarker ? 'has-thumb-halo' : ''}`}
  style={currentMarker ? { '--thumb-halo': thumbHaloValue } as React.CSSProperties : undefined}
  ...
/>
```

Where `thumbHaloValue` is the computed `box-shadow` string from spec 8 and `currentMarker` is `markers.find(m => m.offset === offset) ?? null`.

If the CSS custom property approach proves incompatible with the existing Tailwind arbitrary-variant thumb styling, the fallback is to apply the halo to a positioned `<div>` overlaid on the thumb's computed position using `(offset / config.max) * 100%` for left positioning. This div approach is less precise on mobile but avoids pseudo-element CSS variable limitations.

### 11. Slider thumb halo — loading and transition state

During the `isPending` phase (snapshots computing, `markers.length === 0`), no halo is displayed. The thumb renders with its default gold shadow only.

When snapshots complete and `markers` populates, the halo for the current `offset` (if it happens to be a marked position at load time — unlikely since offset starts at 0 and offset 0 is always neutral) is applied immediately without transition. No fade-in animation is used for the halo's initial appearance.

When the slider moves from a marked position to a neutral one, the halo disappears immediately (no fade). When it moves from neutral to a marked position, the halo appears immediately. This matches the banner behavior (spec 18 of `feat-advance-tab-power-day-banner`): static presence or absence, not animated transitions, on a slider-driven element.

### 12. Aspect list header — category label echo

The aspect list section header currently reads: `"Transit Aspects ({count})"` (line 354 of `AdvanceTab.tsx`).

When the current offset corresponds to a marked position, the header is extended with a dash-separated category label suffix:

| Category | Header suffix |
|---|---|
| `power` | `— Power configuration` |
| `favorable` | `— Favorable window` |
| `challenging` | `— Tense configuration` |
| `shift` | `— Planetary shift` |

Full example: `"Transit Aspects (6) — Power configuration"`

The suffix is rendered in the same `font-heading text-lg text-mystic-gold` style as the rest of the header — it is not dimmed or in a secondary color. The entire header, including suffix, is one continuous typographic unit.

When the current offset is neutral, no suffix appears. The header reads as before: `"Transit Aspects (6)"`.

Implementation: in the transit aspects section (line 354), replace the static header span with:

```tsx
<span className="font-heading text-lg text-mystic-gold">
  Transit Aspects ({snapshot.transitAspects.length})
  {currentMarker && (
    <span className="font-heading text-lg text-mystic-gold"> — {CATEGORY_LABELS[currentMarker.score.category]}</span>
  )}
</span>
```

Where `CATEGORY_LABELS` is a local constant map of category string to display string (spec 12 table above) and `currentMarker` is the marker at the current offset (or null).

### 13. Aspect list header — loading state

When `isPending` is true and `snapshot` is not yet available, the aspect list renders its skeleton ("Computing aspects…"). No category suffix logic applies during this state — `currentMarker` will be null because `markers` is empty.

### 14. Mobile considerations

On touch devices, the "← Prev" and "→ Next" buttons are the primary navigation affordance for the marker system, since hovering a dot on the overview strip is not available and precise drag-targeting of specific dots on the slider track is difficult with a finger.

Button sizing on mobile: the minimum touch target size must be 44×44px per WCAG guidelines. The text-link style buttons as described will not naturally reach this height with `text-xs` typography alone. Wrap each button in a `<button>` with `min-h-[44px] px-4` to ensure adequate touch target size without changing the visual appearance. The padding is on the button element; the visible text remains `text-xs`.

The halo on mobile: the CSS custom property approach (spec 10) works on iOS Safari and Android Chrome for `webkit-slider-thumb`. The `moz-range-thumb` variant covers Firefox on Android. No mobile-specific fallback is needed beyond what spec 10 already provides.

### 15. Desktop considerations

On desktop, the "← Prev" / "→ Next" buttons coexist with the overview strip click-to-jump and slider drag. The buttons are supplementary — a faster path than dragging, an alternative to accurately clicking small strip dots. Keyboard users may tab to the buttons and activate them with Enter/Space; no additional keyboard handling is needed beyond the standard `<button>` behavior.

The thumb halo on desktop is visible in both the Webkit and Firefox slider thumb implementations via the dual CSS rules in spec 10. Test in both Chrome and Firefox to confirm rendering.

### 16. No animation on button press

When either button is pressed, `setOffset()` is called immediately. No intermediate animation or easing is applied to the slider. The slider position changes are driven by React state; the native range input will visually jump to the new value, which is the correct behavior consistent with clicking a marker dot in the overview strip.

### 17. Button keyboard accessibility

Each button must carry an accessible label that describes the action in full for screen readers. Use `aria-label` to provide the unambiguous description:

- "→ Next": `aria-label="Jump to next notable moment"`
- "← Prev": `aria-label="Jump to previous notable moment"`

When disabled: add `disabled` attribute and `aria-disabled="true"`. The `disabled` attribute prevents activation; `aria-disabled` ensures screen readers announce the unavailable state.

### 18. No behavior change for the overview strip or marker dots

This proposal does not modify how the overview strip or the marker dots on the slider track behave. Click-to-jump from the strip and from individual track dots (defined in `feat-advance-marker-system`) continue to operate independently. The Prev/Next buttons are additive navigation — they share the `setOffset` mechanism already used by the marker dot click handlers.

---

## Out of Scope

- **Keyboard shortcut bindings** for Prev/Next (e.g., arrow keys while slider is focused). The native range input already responds to arrow keys for step-by-step navigation. Intercepting arrow keys to override the step-by-step behavior would break the native control. Dedicated keyboard shortcuts (e.g., `[` and `]`) are a future enhancement.
- **Cycling behavior.** When "→ Next" reaches the last marker and the user presses it again, nothing happens (the button is disabled). There is no wrap-around to the first marker. Wrap-around would be confusing in a linear planning tool where earlier positions represent the past.
- **Animated halo fade transitions.** Spec 11 specifies immediate appearance/disappearance of the halo. Fade transitions on slider-driven UI cause lag during rapid scrubbing.
- **Halo on the slider track.** Only the thumb carries the halo. The track glow described in the Miyazaki voice file ("a very soft glow below each marked position along the track") belongs to the marker system, not this proposal.
- **Category label on the retrograde section header.** Miyazaki proposed renaming "Retrograde Activity" to "Planetary Shift" when the current snapshot is a shift marker. This is a small but independent change with its own UI surface; it is noted as a future enhancement but not specified here.
- **Any change to `computePowerDayBanner` or `scoreSnapshot`.** The scoring and banner logic are owned by `feat-advance-marker-system`. This proposal reads from the scored output only.
- **Any change to the overview strip.** The strip's click-to-jump behavior is defined in the marker system proposal.
- **Synastry, Reading tab, Timeline tab, or any page outside `AdvanceTab.tsx`.** This proposal's scope is strictly within the slider card and aspect list section of `AdvanceTab.tsx`, plus one global CSS rule addition for the thumb halo.
- **Styling the "→ Next" text with Unicode arrow glyphs** (→, ←). ASCII "→" and "←" are specified intentionally for cross-platform rendering consistency. The implementation must not substitute `→` or `←` Unicode arrow characters.

---

## Open Questions

1. **Should the Prev/Next buttons show the date of the target position as a tooltip or sub-label?** For example, "→ Next (Jun 13)" when the next marker is at step 4 / June 13. This would give the user a preview of where the jump will land before committing. The tradeoff: computing `nearestNext` and its date string on every render is trivial (the value is already computed for the disabled-state check), but displaying it introduces visual density in an area that is already compact. A `title` attribute tooltip on the button is a zero-cost option on desktop (no added DOM); on mobile, `title` tooltips do not fire on tap.

2. **Should the "→ Next" button label include the marker category of the target?** For example: "→ Next (Power)" when the nearest upcoming marker is a gold power day. This would make the button carry a preview of what the user is navigating toward — a one-word summary before they arrive. The tradeoff is label length variability (the category word changes, so the button width fluctuates) and the risk of the category label competing with the one in the aspect list header (spec 12).

3. **CSS custom property approach for the thumb halo — fallback strategy.** The `--thumb-halo` CSS variable in a global stylesheet affects all range inputs on the page that have the `has-thumb-halo` class. If the global style conflicts with other slider elements elsewhere (there are currently none), scope the rule to `AdvanceTab`'s container using a wrapper class. The question is whether to establish this pattern now or wait until a conflict emerges.

4. **What orb threshold governs "the slider is at a marked position" for the halo?** Spec 8 defines this as an exact match: `markers.some(m => m.offset === offset)`. This is correct because offsets are discrete integers. However, if a future version of the slider introduces half-step offsets or floating-point positions, the exact-equality check would fail silently. This is not a current concern but should be noted for future maintainers.

5. **Should the aspect list header suffix appear when `transitAspects.length === 0` but a marker still exists at the offset?** A scored snapshot with zero transit aspects is unlikely (a snapshot with no aspects is typically scored neutral by the `scoreSnapshot` guard), but if it occurs, the aspect list section is not rendered at all (line 351: `{snapshot && snapshot.transitAspects.length > 0 && (...)`). The header suffix is therefore moot in that case — but this edge case should be confirmed during implementation.
