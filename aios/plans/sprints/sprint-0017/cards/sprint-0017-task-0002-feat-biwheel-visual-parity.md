# feat-biwheel-visual-parity

**Type:** Feature
**Originated by:** Jobs, Carmack, Miyazaki, Taleb (all four voices)
**Status:** Active

---

## User Guidance

From `aios/guidelines.md`:

> The bywheel positions looks great, but person one is showing as solid lines and clearer, and person 2 as faint. Both persons need to be equally visible. Then, maybe, selecting one person or another should make that persons lines and planets highlight, and the other to become faint, but on overall show, they need to have the same hierarchy. Make the combinations visual! Instead of highlighting each persons map, you could also look to highlight combinations, aspects BETWEEN the people, not each one separately. Research and make that much better.

---

## Problem / Opportunity

The bi-wheel chart visually demotes Person 2 through three compounding differences in rendering weight — glow radius, glow opacity, and glyph fill luminance — even though neither person is more important than the other. This implicit hierarchy undercuts the promise of synastry as a reading about two equals meeting.

### Concrete code evidence — `src/components/chart/ChartWheel.tsx`

**Person 1 natal planets (inner ring), lines 835–882:**

| Property | Rest value |
|---|---|
| Glow circle radius | `14` (non-Sun/Moon planets, line 838) |
| Glow circle opacity | `0.20` (the `0.2` literal on line 841) |
| Body circle radius | `13` (line 851) |
| Glyph fill | `#e8e6e3` (line 862) — near-white, relative luminance ≈ 0.85 |

**Person 2 synastry planets (outer ring), lines 1171–1228:**

| Property | Rest value |
|---|---|
| Glow circle radius | `12` (line 1176) — **2 px smaller** |
| Glow circle opacity | `0.15` (line 1177) — **0.05 lower** |
| Body circle radius | `11` (line 1183) — **2 px smaller** |
| Glyph fill | `#d8b8f8` (line 1194) — lavender, relative luminance ≈ 0.60 |

Transit planets (used as the established peer reference, lines 1096–1152) share the same `r=12`/`opacity=0.15`/body `r=11` values as Person 2, confirming that the synastry outer ring was cloned from the transit template without adjustment.

**Cross-aspect lines, line 1043:** rest opacity is `0.3` — always on, no toggle exists. With 20+ visible dashed lines at rest, the wheel is visually noisy before a user interacts with anything, yet the connections are too faint to read purposefully.

**SynastryPage.tsx, lines 382–408:** `ChartWheel` is called with `synastryPlanets={partnerChartData.planets}` and `synastryAspects={synastryData.synastryAspects}` with no mode-switching prop. There is currently no toggle control surface above or below the wheel.

---

## Vision

Open the synastry page and both rings feel like equals — same weight, same presence, distinguished only by color (gold vs. lilac). The wheel is clean by default: natal aspect lines are softly visible, cross-aspect lines are dimmed to near-invisible. A pill toggle labeled **Show connections / Show charts** sits directly above the wheel. Tap "Show connections" and the natal lines retreat while the cross-aspect lines come forward, bright and legible — the relationship's geometry becomes the entire foreground. Tap "Show charts" (the default label) and the individual charts are prominent again. On either mode, hovering a planet highlights only the lines that touch it. The experience communicates that this is a reading about two people together, not two individuals who happen to share a canvas.

---

## Specifications

### 1. Equalize Person 2 planet rendering at rest

In `ChartWheel.tsx`, inside the `isSynastryMode && synastryPlanets!.map(...)` block (lines 1156–1229):

1a. **Glow circle radius** — change `r={isHovered ? 16 : 12}` (line 1176) to `r={isHovered ? 16 : 14}`. This matches Person 1's non-Sun/Moon glow radius exactly.

1b. **Glow circle opacity** — change `opacity={isHovered ? 0.6 : 0.15}` (line 1177) to `opacity={isHovered ? 0.6 : 0.20}`. This matches the `0.2` used for natal planets on line 841.

1c. **Body circle radius** — change `r={isHovered ? 14 : 11}` (line 1183) to `r={isHovered ? 14 : 13}`. This matches natal planet body radius on line 851.

1d. **Glyph fill at rest** — change `fill={isHovered ? SYNASTRY_COLOR : '#d8b8f8'}` (line 1194) to `fill={isHovered ? SYNASTRY_COLOR : '#e8d8ff'}`. The new value `#e8d8ff` is a high-luminance lavender (luminance ≈ 0.85) that mirrors the near-white brightness of Person 1's `#e8e6e3` while staying clearly purple/Person-2-coded.

1e. **Glyph font size at rest** — change `fontSize={isHovered ? 14 : 12}` (line 1195) to `fontSize={isHovered ? 14 : 14}`. Both people's glyphs should read at the same size when not hovered. (Person 1 uses `14` at rest on line 863.)

1f. **Hover body radius** — keep `r={isHovered ? 14 : ...}` on the body circle (line 1183); no change, already matches Person 1's `r={isHovered ? 16 : 13}` hovered state. Verify the hover glow radius `isHovered ? 16 : ...` is also identical to Person 1's `20` for Sun, `18` for Moon, `20` for others when hovered. For the synastry outer ring, `16` is acceptable given the tighter radial zone; document this intentional divergence.

### 2. Reduce cross-aspect line base opacity at rest ("Show charts" mode)

In `ChartWheel.tsx` inside the `filteredSynastryAspects.map` block (lines 1013–1069), the resting opacity branch (line 1043, `else { opacity = 0.3 }`) should become `opacity = 0.12`. This reduces the background noise of 10–25 dashed lines when no hover is active. Hover and focus opacities (`0.8`, `0.7`, `1.0`) are unchanged.

### 3. Add a `viewMode` prop to `ChartWheel`

Add an optional prop `synastryViewMode?: 'charts' | 'connections'` to the `ChartWheelProps` interface (lines 13–20). Default is `'charts'`.

- When `synastryViewMode === 'connections'`:
  - Natal aspect lines (`filteredAspects.map`, lines 756–812) render at `opacity * 0.20` — they visually retreat but do not fully disappear.
  - Cross-aspect lines rest opacity rises from `0.12` (spec 2) to `0.55`.
  - Person 1 and Person 2 planet glow opacity both drop to `0.10` at rest (both rings dim equally).
  - Hovering any planet still brings that planet's connected cross-aspect lines to `0.85`, unconnected to `0.06`.
- When `synastryViewMode === 'charts'` (default):
  - All existing behavior from specs 1–2.
  - Cross-aspect lines at rest: `0.12`.

### 4. Add the "Show connections / Show charts" toggle to `SynastryPage.tsx`

In `SynastryPage.tsx`, inside the bi-wheel section (lines 382–408):

4a. Add a `useState<'charts' | 'connections'>('charts')` named `viewMode` at the top of the component.

4b. Render a pill toggle above the wheel (between the color legend at line 383 and the `<div className="w-full max-w-2xl">` at line 395). Suggested markup:

```
<div className="flex justify-center mb-3">
  <div className="inline-flex rounded-full border border-mystic-gold/20 bg-mystic-gold/5 p-0.5 gap-0.5">
    <button
      onClick={() => setViewMode('charts')}
      className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
        viewMode === 'charts'
          ? 'bg-mystic-gold/20 text-mystic-gold'
          : 'text-mystic-muted hover:text-mystic-text'
      }`}
    >
      Show charts
    </button>
    <button
      onClick={() => setViewMode('connections')}
      className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
        viewMode === 'connections'
          ? 'bg-[#c084fc]/20 text-[#c084fc]'
          : 'text-mystic-muted hover:text-mystic-text'
      }`}
    >
      Show connections
    </button>
  </div>
</div>
```

4c. Pass the prop to `ChartWheel`: add `synastryViewMode={viewMode}` to the call at line 396–401.

4d. Below the toggle, update the color legend row (lines 403–407) to dynamically clarify context. In `'connections'` mode, prepend a note: `"Cross-chart aspects between {label1} and {label2}"`. In `'charts'` mode, keep existing labels unchanged.

### 5. Hover interaction states — "Show connections" mode

When `synastryViewMode === 'connections'`:

5a. Hovering a **Person 2 planet** highlights all cross-aspect lines from that planet to Person 1 at `0.85`, dims all other cross-aspect lines to `0.06`. This behavior already exists in `hoveredSynastry` branch (lines 1036–1037) and only needs to work with the new base opacities.

5b. Hovering a **Person 1 planet** highlights cross-aspect lines where `sa.person1Planet === hoveredPlanet` at `0.70`, dims others to `0.06`. This already exists in `hoveredPlanet` branch (lines 1038–1040); no logic change required.

5c. Hovering a **cross-aspect line** itself: keep `isSAHovered ? 1.0` (line 1034). Already correct.

5d. In `'connections'` mode, natal aspect lines should not highlight on planet hover — skip the `isConnected` opacity boost path (lines 769–778) when `synastryViewMode === 'connections'` by early-returning `opacity = baseOpacity * 0.20` for all natal lines.

### 6. Hover interaction states — "Show charts" mode (default)

No changes to existing hover logic. Person 1 planet hover dims synastry cross-aspects to `0.06` (already handled at line 1038). Person 2 planet hover dims to `0.06` (line 1036).

### 7. Mobile / touch behavior

7a. The pill toggle must have a minimum tap target height of 44 px (pad `py-2.5` or similar). The two buttons together must be ≥ 200 px wide on mobile.

7b. In `'connections'` mode on touch devices (`isTouch === true`): tapping a cross-aspect line opens the `SynastryAspectTooltip` bottom sheet exactly as it does today (line 1060–1063). No change required.

7c. In `'connections'` mode on touch devices: tapping a Person 2 planet shows the `SynastryPlanetTooltip` bottom sheet with its cross-aspect list. No change required.

7d. The toggle state persists within the session (component `useState`). It does not need to survive navigation or page refresh.

### 8. Transition animations

8a. Cross-aspect line opacity changes driven by `viewMode` switching should use `transition: 'opacity 400ms ease'` — slightly slower than the existing hover transition (`300ms`) to feel like a deliberate mode change rather than a hover flicker.

8b. Natal aspect line fade in `'connections'` mode: `transition: 'opacity 400ms ease'` on the existing `chart-aspect-line` elements.

8c. Planet glow opacity shift between modes: `transition: 'opacity 400ms ease'`.

### 9. Accessibility

9a. The pill toggle buttons must have explicit `aria-pressed` attributes reflecting active state.

9b. The `<svg>` `aria-label` (line 528) should incorporate the current view mode: `"Synastry bi-wheel chart — ${viewMode === 'connections' ? 'connections view' : 'charts view'}"`.

9c. Keyboard focus on the toggle buttons must be visible (existing Tailwind `focus:outline-none` should be replaced with a ring).

---

## Out of Scope

- Relationship profile (couple profile axes) visual overhaul — separate proposal.
- GPT interpretation improvements — separate proposal.
- Individual-ring highlight mode ("tap Person 1 to dim Person 2") — deferred; the toggle approach covers this adequately for now.
- Any changes to the transit bi-wheel (transit planets share `TRANSIT_PLANET_R = 288` but are a separate code path at lines 1072–1153).
- Asteroid ring behavior in synastry mode.
- Composite chart section.
- Color system changes to `SYNASTRY_COLOR` (`#c084fc`).

---

## Open Questions

1. **Glyph fill choice for Person 2 at rest.** `#e8d8ff` is proposed as a luminance-matched lavender. The team should verify that `#e8d8ff` on the dark `#0a0a0f` background reads as clearly purple rather than washed-out white. A quick visual test against `#d8b8f8` (current) and `#c084fc` (the SYNASTRY_COLOR itself) is warranted before implementing.

2. **Cross-aspect base opacity in "Show charts" mode.** `0.12` (spec 2) may be too invisible for charts with few aspects (e.g., only 3–4 connections). Consider whether the floor should be `0.15` or whether the value should be computed as `Math.max(0.10, 0.30 / Math.sqrt(filteredSynastryAspects.length))` so charts with fewer lines get slightly more visible resting lines.

3. **Toggle placement on mobile.** The current bi-wheel section stacks color labels above the wheel. On narrow screens the toggle + labels row may feel cramped. Consider whether the toggle belongs below the wheel (above the legend) on mobile.

4. **viewMode label copy.** "Show connections" vs "Show charts" is clear but may not communicate that connections means cross-chart aspects. Alternatives: "Cross-aspects" / "Individual charts", or "Together" / "Apart". Confirm with a copy review before shipping.

5. **Person 2 hover radius divergence.** Spec 1f notes that synastry outer planets hover to `r=16` while Person 1 hovers to `r=20` (Sun `22`, Moon `18`, others `20`). This is intentional to avoid the outer ring planets overflowing the zodiac ring at `SIGN_R - 70 + 35 = PLANET_R` geometry, but should be documented as a named constant (`SYNASTRY_HOVER_R = 16`) rather than a bare literal.
