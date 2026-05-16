# issue-advance-tooltip-overflow

**Type:** Issue Fix
**Originated by:** Taleb

## Problem

Two UI components in `src/components/reading/AdvanceTab.tsx` are sized for the current 60–80 character reason strings. The interpretation upgrade planned for sprint 0019 will produce house-anchored reason strings of 150+ characters. Both components will break visually before any improved string reaches production.

### 1. `MarkerTooltip` — fixed-width container designed for one-line reasons

`MarkerTooltip` (lines 715–760) renders `score.reason` inside a panel with `maxWidth: '200px'` (line 748) and `text-[10px]` font size (line 754):

```tsx
<div
  className="bg-mystic-bg/95 border border-mystic-gold/20 rounded-lg px-3 py-2 shadow-lg text-left"
  style={{ maxWidth: '200px' }}
>
  <p className="text-[10px] text-mystic-muted mb-0.5">{dateStr}</p>
  <p className="text-[11px] font-medium mb-0.5" style={{ color }}>
    {label}{orbSuffix}
  </p>
  <p className="text-[10px] text-mystic-text/80" style={{ textWrap: 'balance' } as React.CSSProperties}>
    {score.reason}
  </p>
</div>
```

At `text-[10px]` and `maxWidth: 200px`, approximately 35–40 characters fit per line. The current reason strings — e.g., `"Saturn presses your Midheaven — a significant moment for career decisions and public commitments."` (90 characters) — already wrap to 2–3 lines at the outer edge of the design's tolerance. The vision's quality bar gives examples such as "The next three weeks are a pressure test for one specific emotional pattern you've carried since childhood — Saturn is asking you to restructure how you handle it, and the timing is deliberate." (192 characters). At the same container width and font size that string wraps into 5–6 lines, making the tooltip panel substantially taller than its current design assumes.

The connector line above the tooltip panel is hardcoded at `height: '8px'` (line 743). It is a fixed visual bridge between the marker dot and the tooltip box. As the box grows vertically, the connector stays 8px, becoming proportionally insignificant and visually disconnected from the dot it is anchoring. The overall vertical layout — tooltip above slider, marker dot on the slider track — was designed assuming a compact tooltip height of roughly 60–70px. A 5–6 line reason string pushes the tooltip box to 110–130px, which may collide with or partially obscure the overview strip sitting above the slider section.

The `textWrap: 'balance'` style on the reason paragraph distributes text evenly across lines but does not change the container width. It does not mitigate overflow.

The tooltip is rendered inside the marker dot overlay (lines 959–964):

```tsx
{hoveredMarker && offset !== hoveredMarker.offset && (
  <MarkerTooltip
    marker={hoveredMarker}
    positionX={(hoveredMarker.offset / config.max) * 100}
  />
)}
```

The overlay container uses `position: absolute` with `pointer-events-none`, positioned relative to the slider track. A tooltip taller than designed will grow upward into the overview strip and potentially into the "Advance Time" label row above it, with no clipping or scroll boundary to contain it.

### 2. Category banner — `split(' ')[0]` bold-first-word logic designed for planet-name-led sentences

The category banner (lines 1019–1054) renders `categoryBanner` — which is `score.reason` passed through `formatScoreAsBannerText` unchanged (line 396) — by splitting on the first space and wrapping only the first word in a `font-heading` span:

```tsx
<span className="font-heading">{categoryBanner.split(' ')[0]}</span>
{' ' + categoryBanner.split(' ').slice(1).join(' ')}
```

`categoryBanner` is derived from `computePowerDayBanner` (lines 403–407), which calls `formatScoreAsBannerText(snapshot.score)`, which returns `score.reason` verbatim (line 396).

The intent of the `split(' ')[0]` pattern is to bold the astrologically meaningful first word of the reason string. The current reason strings are written to lead with a planet name — e.g., `"Saturn presses your Midheaven…"` (`buildPowerReason`, line 169), `"Saturn opposition your natal Moon…"` (`buildAspectReason`, line 192). Bolding "Saturn" in a `font-heading` weight and style is visually correct: the planet name is the anchor, and the heading weight signals its importance.

The improved house-anchored reason strings the vision describes begin with articles or temporal phrases — e.g., "The next three weeks are a pressure test…", "A window opens in your…", "Over the coming month, Saturn…". For these strings `split(' ')[0]` returns `"The"`, `"A"`, or `"Over"`. Bolding a grammatical article in `font-heading` is visually meaningless and typographically odd: the styled word carries no astrological weight, and the visual hierarchy implies semantic significance where there is none.

The banner and tooltip also display the identical string (`score.reason`), with `formatScoreAsBannerText` returning it unchanged. A 150+ character reason string that fills 5–6 lines in the narrow tooltip will appear full-length in the banner as well, but the banner has more horizontal space and a `text-sm` treatment (line 1041) that can accommodate longer text. The mismatch is most visible in the tooltip, but the architectural problem is that one string is used for two contexts with very different display constraints.

## Expected Behavior

### Tooltip

The `MarkerTooltip` component should accommodate reason strings of up to approximately 200 characters without breaking the slider area layout or colliding with surrounding elements.

`maxWidth: '200px'` should be widened — to at minimum `280px` — so that a 150–200 character reason string wraps into 3 lines rather than 5–6. The tooltip should remain a compact hover panel, not a paragraph block, so a hard maximum of approximately 300px is appropriate. The connector line height should scale proportionally with the widened box, or be removed in favor of a CSS border/triangle pointer that does not depend on a fixed pixel bridge.

If the tooltip grows beyond a design-acceptable height at any width, the implementation should display a truncated version of `score.reason` (the first sentence, or the first N characters ending at a word boundary) rather than the full string. The full string is available in the banner once the user clicks or lands on the marker.

### Category banner

The `split(' ')[0]` bold-first-word approach should be replaced with a rendering strategy that works regardless of how the reason string begins.

One approach: introduce a dedicated `bannerBoldFragment` field in `SnapshotScore` alongside `reason`, populated by `buildPowerReason` and `buildAspectReason` at score time with the intended bold token (e.g., the planet name or the category label). The banner renders `bannerBoldFragment` in `font-heading` and the remainder of `reason` in normal weight. This decouples the bold selection from string-splitting heuristics and survives any sentence structure the upgraded reason strings adopt.

Alternatively, if the bold-first-word pattern is retained, the reason string format must be constrained so that `buildPowerReason` and `buildAspectReason` always lead with the intended bold word — a formatting contract that the sprint 0019 interpretation upgrade must be held to explicitly, not assumed.

### Single-string architecture

The single-string `score.reason` used identically in tooltip, banner, and `aria-label` should be reconsidered before the interpretation upgrade ships. A tooltip surface needs a compact form (one sentence, ≤ 100 characters); a banner surface can carry the full house-anchored, action-oriented paragraph. Building improved strings as banner-length text and displaying them unchanged in the tooltip will reproduce this overflow defect for every upgraded reason string. The fix should establish either a two-field pattern (`reason` for tooltip, `bannerText` for banner) or a truncation convention applied consistently at the tooltip render site.

Both the `maxWidth` change and the `split(' ')[0]` replacement must be in place before any interpretation upgrade that produces reason strings longer than 90 characters is merged.

## Outcome

**Completed 2026-05-16** · commit `6a0a742`

### Changes made in `src/components/reading/AdvanceTab.tsx`

**Issue 1 — MarkerTooltip width:**
- `maxWidth` widened from `200px` → `280px` (line ~748).
- Tooltip reason truncated to first sentence: `score.reason.split('. ')[0]` + trailing `.` — full text still shown in the banner.

**Issue 2 — Banner bold-fragment:**
- Added `bannerBoldFragment?: string` to `SnapshotScore` interface.
- `buildPowerReason` and `buildAspectReason` changed to return `{ reason, bannerBoldFragment }` (planet name as bold token).
- Pure-shift score object also populates `bannerBoldFragment: stationPlanet`.
- All four `scoreSnapshot` return paths updated to carry the field through.
- Banner render uses `snapshot.score.bannerBoldFragment ?? categoryBanner.split(' ')[0]` as the bold span, with the remainder derived via `slice(...).trimStart()` — fully backward-compatible.
