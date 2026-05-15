# Proposal: Couple Profile — Per-Dimension Visual Identity

**Type:** Feature
**Originated by:** Jobs, Carmack, Miyazaki, Taleb
**Status:** Active

---

## User Guidance

From `aios/guidelines.md`, guideline #2:

> "For the Relationship profile, the divisions are great, but currently they look too bleak: all same colors, etc. Each of the 7 characteristics should have their own color, icon and identity. There should be a divider line in the middle and then there should be a bar that loads left or right (with different colors to each side). Make them way more vivid and clear!"

---

## Problem / Opportunity

The `DimensionAxis` component (`SynastryPage.tsx` lines 20–62) applies a single visual grammar to all seven dimensions of `CoupleProfile`:

- **Track:** uniform `bg-mystic-gold/20` amber track, same for all dimensions (line 39)
- **Dot:** a single `bg-amber-400` dot that floats across a continuous 0–100% range (lines 43–48); the position encodes direction and magnitude in one gesture, but the gesture is invisible — a dot at 50% looks identical to a dot at 62%
- **No icons:** axis identity is a derived text label only (`axisKey.replace(/([A-Z])/g, ' $1')`, line 26)
- **No center reference:** without a visual midpoint marker, users cannot immediately see whether a couple leans left or right — they must read the percentage mentally
- **Confidence is wasted:** `dim.confidence` is read to compute `lowConf` (line 22) and only causes the whole card to fade to `opacity-60` (line 29); there is no per-dimension signal indicating which axes are robust vs. speculative
- **Both poles look equal-weight:** the amber dot is the only direction signal; pole labels (`dim.leftPole`, `dim.rightPole`) are rendered at identical `text-mystic-muted text-xs` weight (lines 38, 50), making left/right indistinguishable at a glance
- **The sentence is hidden on mobile:** `dim.sentence` is rendered `hidden sm:block` (line 57) — the most meaningful text on the whole axis is invisible on the device most users are on

The visual result is seven identical amber sliders in a monochrome card. Users cannot scan the couple profile; they must read each axis individually.

---

## Vision

Opening the Couple Profile section should feel like opening a dossier — seven tiles, each instantly recognizable by its own color and glyph, each telling a directional story at a glance. A couple who is "Distinctly Fiery" on intensity sees a warm red-orange bar surge to the right of a thin center line. A couple who is "Deeply Merging" on intimacy sees a teal bar push left from center. A couple who is "Balanced" on life pace sees two equal half-bars meeting at the divider. No bar is red, no bar is green — both directions are equally valid expressions of the same dimension. The seven dimensions feel like distinct forces rather than seven identical dials. Reading the whole section takes ten seconds, not two minutes.

---

## Specifications

### 1. `DIMENSION_CONFIG` Data Structure

Define a lookup object keyed by `keyof CoupleProfile` in `SynastryPage.tsx` (or extracted to a co-located constants file `src/components/results/dimensionConfig.ts`). Each entry must carry:

```ts
interface DimensionConfig {
  label: string           // human-readable axis name
  icon: string            // single emoji or Unicode glyph
  leftColor: string       // Tailwind bg-* class for left-fill bar
  rightColor: string      // Tailwind bg-* class for right-fill bar
  accentColor: string     // Tailwind text-* class for icon, label, pole labels
  trackColor: string      // Tailwind bg-* class for the unfilled track halves
}
```

All seven entries must be present at the time of implementation (no fallback to the old amber grammar for missing keys).

### 2. Color Assignments per Dimension

Colors must be non-judgmental: neither pole should read as "good" or "bad." Both `leftColor` and `rightColor` for any given dimension use the **same hue family**, differing only in that both fill bars share the dimension's accent hue. The contrast between dimensions comes from different hues, not between poles within a dimension.

| Dimension key | Icon | Left pole | Right pole | Fill bar color (both sides) | Tailwind class | Track (unfilled) |
|---|---|---|---|---|---|---|
| `intensity` | 🔥 | Calm | Fiery | Coral-orange | `bg-orange-400` | `bg-orange-400/15` |
| `emotionalFlow` | 💧 | Reserved | Expressive | Sky blue | `bg-sky-400` | `bg-sky-400/15` |
| `communicationStyle` | 💬 | Intuitive | Analytical | Violet | `bg-violet-400` | `bg-violet-400/15` |
| `intimacyRhythm` | 🌿 | Spacious | Merging | Teal | `bg-teal-400` | `bg-teal-400/15` |
| `growthDynamic` | 🌱 | Stabilizing | Expanding | Emerald | `bg-emerald-400` | `bg-emerald-400/15` |
| `sexualChemistry` | ✨ | Understated | Electric | Rose | `bg-rose-400` | `bg-rose-400/15` |
| `lifePace` | ⚡ | Steady | Catalytic | Amber | `bg-amber-400` | `bg-amber-400/15` |

`accentColor` for each dimension's icon, axis label, and pole labels: use the `text-*-300` variant of the same hue (e.g., `text-orange-300` for intensity, `text-sky-300` for emotionalFlow, etc.) for legibility on the dark `mystic-bg` background.

### 3. Icon / Glyph per Dimension

The icon is rendered to the left of the axis label in a `text-base` span. It must not be wrapped in a separate colored pill or badge — it sits inline with the label text, colored with `accentColor` (`text-{hue}-300`). The icon is decorative (aria-hidden) and must not carry meaning required for accessibility.

Icons per key (from the table above):
- `intensity` → `🔥`
- `emotionalFlow` → `💧`
- `communicationStyle` → `💬`
- `intimacyRhythm` → `🌿`
- `growthDynamic` → `🌱`
- `sexualChemistry` → `✨`
- `lifePace` → `⚡`

### 4. Directional Bar Fill Behavior

Replace the floating dot with a **directional fill bar**. The bar is bisected by a center divider. The fill extends from the center toward either the left or right edge, depending on the sign of `dim.value`.

Rules:
- `dim.value` ranges from `-1.0` (full left pole) to `+1.0` (full right pole); `0.0` is balanced
- Fill width percentage = `Math.abs(dim.value) * 50` percent of the half-track (i.e., 50% of the full track width at `|value| = 1.0`)
- If `dim.value > 0`: fill bar starts at the center (left: 50%) and extends to the right; `style={{ left: '50%', width: \`${Math.abs(dim.value) * 50}%\` }}`
- If `dim.value < 0`: fill bar ends at the center (right: 50%) and extends to the left; `style={{ right: '50%', width: \`${Math.abs(dim.value) * 50}%\` }}`
- If `dim.value === 0` (or `Math.abs(dim.value) < 0.02`): render no fill bar at all; only the center divider is visible
- Fill bar color: the dimension's fill color (`leftColor` and `rightColor` are the same class; use `bg-{hue}-400`)
- Fill bar height: `h-2` (8px) — same as the track; `rounded-full` on the outer end, flat on the center end via `rounded-r-full` (for right-fill) or `rounded-l-full` (for left-fill)
- The entire track container is `relative h-2 rounded-full bg-{hue}-400/15` (the `trackColor`)

### 5. Center Divider Line Visual Spec

The center divider is a vertical stroke positioned absolutely at `left: 50%` within the track container.

- Element: `<div>` positioned `absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px`
- Color: `bg-mystic-text/40` (a soft near-white line readable on the colored track background)
- Height: matches the track `h-2` (inherits from `top-0 bottom-0`)
- z-index: must sit above the track background and above the fill bar — use `z-10`
- No rounded corners (it is a stroke, not a pill)

### 6. Confidence Indicator Visual Spec

`dim.confidence` (0.0–1.0) is already computed in the engine (`synastry.ts` line 47). `lowConf` is defined as `dim.confidence < 0.4` (current line 22 — preserve this threshold).

Replace the current `opacity-60` whole-card fade with a more targeted treatment:

- **Low confidence (`dim.confidence < 0.4`):**
  - Fill bar opacity: `opacity-40` applied to the fill bar element only, not the whole card
  - Track background: unchanged (always shown at full opacity)
  - Center divider: unchanged (always shown)
  - Below the track, render a small pill badge: `<span className="text-[10px] text-mystic-muted/70 bg-mystic-surface border border-mystic-border rounded px-1.5 py-0.5">weak signal</span>`
  - The sentence text renders as normal (do not hide it for low-confidence dimensions — the sentence is still informative)
  - Do NOT fade the entire card or the pole labels

- **High confidence (`dim.confidence >= 0.4`):** no additional indicator; fill bar rendered at full opacity

### 7. Pole Label Treatment

Both pole labels (`dim.leftPole` on the left, `dim.rightPole` on the right) receive equal visual weight:

- Font size: `text-xs` (unchanged)
- Color: `accentColor` of the dimension (`text-{hue}-300`) — not `text-mystic-muted` — so pole labels carry the dimension's identity
- Width: `w-20` on both sides (unchanged — preserves layout alignment)
- Alignment: left pole `text-right`, right pole `text-left` (unchanged)
- The currently-expressed pole (matching the sign of `dim.value`) does NOT receive bold/underline/contrast emphasis — both poles are equal. Direction is communicated by the fill bar, not by the labels.

### 8. Sentence Text Treatment

`dim.sentence` is the most valuable human-readable content on each axis. It must be visible on all viewports:

- Remove the current `hidden sm:block` class — the sentence is always rendered
- Render below the track bar
- Font size: `text-xs` (unchanged)
- Color: `text-mystic-text/80` (slightly more visible than the current `text-mystic-text/70`)
- Max height / truncation: none — let the sentence wrap naturally (sentences are typically one line)
- No tooltip, no click-to-reveal on mobile — always visible
- When `lowConf`: sentence still renders at full opacity; the "weak signal" badge (spec #6) appears inline below the track, before the sentence, so reading order is: track → badge → sentence

### 9. Card / Container Treatment per Dimension

Each dimension gets its own visually distinct card within the profile section:

- Replace the single shared `bg-mystic-gold/5 rounded-lg p-6 border border-mystic-gold/20` wrapper with individual dimension cards
- Each dimension card: `rounded-lg p-4 border` where the border color is the dimension's accent at `/20` opacity — e.g., `border-orange-400/20` for intensity
- Background: `bg-{hue}-400/5` — a very faint tint of the dimension's color (not opaque, just a whisper)
- The `space-y-5` between cards in `CoupleProfileSection` becomes `space-y-3` (tighter, since each card now has internal padding)
- The outer `bg-mystic-gold/5 rounded-lg p-6 border border-mystic-gold/20` wrapper is retained only as a section container with `p-4` padding and no background tint (`bg-transparent`), or it can be removed entirely in favor of a `space-y-3` flex column with no wrapper card
- Recommended structure per dimension card:
  ```
  [icon] [axis label]         [dim.label qualitative text]
  [leftPole]  [===track=|=fill===]  [rightPole]
              [weak signal badge? only if low conf]
  [sentence text]
  ```

### 10. Edge Cases

**Zero value (balanced):**
- `Math.abs(dim.value) < 0.02` — render no fill bar; only the center divider is shown on the track
- The qualitative label (`dim.label`) should display as the only direction signal (e.g., "Balanced")
- The sentence still renders below the track

**Very low confidence (`dim.confidence < 0.2`):**
- The fill bar is hidden entirely (render nothing in the track except the background and center divider)
- The "weak signal" badge renders as before
- The sentence is replaced by the existing fallback text: "Not enough cross-chart contacts to characterize this dimension precisely." — styled as `text-xs text-mystic-muted/60`
- This threshold (`< 0.2`) is stricter than the general low-confidence threshold (`< 0.4`) — only when confidence is extremely low is the fill completely suppressed

**Undefined dimension key (missing `DIMENSION_CONFIG` entry):**
- Render a no-op fallback: plain text of the key, no bar, no icon — this should never occur in production but guards against future `CoupleProfile` field additions before `DIMENSION_CONFIG` is updated
- Log a `console.warn` with the unknown key

**Very small non-zero value (`0.02 <= Math.abs(dim.value) < 0.1`):**
- Fill bar renders but will be very narrow (≤ 5% of track width)
- Enforce a minimum rendered width of `min-w-[3px]` on the fill bar element so it remains visible as a stub rather than disappearing

---

## Out of Scope

- Changes to how `DimensionValue` data is computed in `synastry.ts` — the engine is not touched by this proposal
- Changes to `keyThemes`, `elementCompatibility`, or `modalityCompatibility` display below the seven axes
- Changes to the chart biwheel or aspect rows (addressed in a separate guideline item)
- The GPT interpretation failure fix (guideline item #3)
- Animation or transition effects on the fill bar — the bar renders statically on mount; no entrance animation is specified here
- Accessibility / ARIA label changes beyond keeping the existing `aria-label` on the interactive element (the click-to-reveal tooltip button is removed since the sentence is always visible — the button element can be replaced with a static element)
- Dark/light theme switching — this proposal assumes the existing dark `mystic-bg` theme throughout

---

## Open Questions

1. **Tooltip button removal:** The current implementation wraps the dot in a `<button>` that reveals the sentence on mobile tap (`onClick={() => setTooltipOpen(v => !v)}`). This proposal makes the sentence always visible, making the button unnecessary. Should the button be removed entirely, or repurposed to open the `DiscussModal` for that dimension? The proposal assumes removal; confirm before implementing.

2. **`dim.label` placement:** The qualitative label (`"Distinctly Fiery"`, `"Balanced"`, etc.) is currently `text-amber-300/80 text-xs` and sits in the top-right of the axis header. In the new layout it should appear in the header row to the right of the axis name. Confirm the desired font weight — `font-medium` or `font-normal`?

3. **Outer wrapper removal:** Spec #9 is ambiguous about whether the outer `bg-mystic-gold/5` container card wrapping all seven dimensions should be retained as a section frame or removed in favor of bare card-per-dimension layout. Product call needed: does the section need a unifying visual boundary, or do the individual dimension cards carry enough identity?

4. **Icon choice for `sexualChemistry`:** `✨` is used above but reads as "magic/sparkle" rather than explicitly chemistry. Alternative candidates: `🌡️` (heat), `⚡` (electric — but already used for lifePace), `🔮`. Confirm final icon before coding.

5. **Tailwind purge safety:** The `bg-{hue}-400` and `border-{hue}-400/20` classes are dynamically assembled from `DIMENSION_CONFIG` strings. Tailwind's JIT scanner will not detect these unless the full class strings appear literally in source. The config object must use complete Tailwind class strings (e.g., `'bg-orange-400'`, not `'bg-' + color + '-400'`) to guarantee they are not purged from the production bundle.
