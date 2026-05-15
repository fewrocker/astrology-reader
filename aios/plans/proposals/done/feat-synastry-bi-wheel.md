# feat-synastry-bi-wheel

**Type:** Feature
**Originated by:** Jobs, Carmack, Miyazaki, Taleb

---

## User Guidance

> In the end, a lot of people love astrology to look at couples synastry. The goal of this sprint is to make couples synastry amazing. I would love to see charts being combined into just one chart with the combinations (inner and outer wheel). We have things like that on the app, but it has to be beautifully and correctly done so it becomes one beautiful harmony chart.

---

## Problem / Opportunity

### The core visual claim is wrong

`SynastryPage.tsx` renders two side-by-side `ChartWheel` instances inside a `grid grid-cols-1 md:grid-cols-2 gap-6 mb-8` block. Each chart shows a complete, self-contained natal wheel — Person 1's aspects, Person 1's houses, Person 1's planets — displayed next to Person 2's equivalent. The user has to mentally merge the two objects. There are no cross-aspect lines, no outer ring, no visual grammar of relationship. The product is asking users to answer the question "how do these two charts interact?" by showing them two things that do not interact.

This is the primary failure on the page. It makes the product treat synastry as a comparison when synastry is fundamentally a superposition. Astrology professionals use bi-wheels precisely because placing both charts in a single coordinate frame reveals the relationship as a visual object. The current side-by-side layout is a placeholder, not a design decision.

### The rendering infrastructure exists but is not connected

`ChartWheel.tsx` already implements a transit outer ring at `TRANSIT_PLANET_R = 288` (between `PLANET_R ≈ 263` and `SIGN_R ≈ 298`). Lines 884–966 of `ChartWheel.tsx` render transit planets in that ring. Lines 832–882 render transit-to-natal aspect lines as dashed strokes. A `SynastryAspect[]` array containing all cross-chart aspects already exists in `SynastryData` and is passed to `SynastryAspectsSection`. The engine is complete. The rendering props and semantic framing for synastry mode are absent.

### Three specific rendering behaviors in the transit path are wrong for synastry

**1. The radial nudge.** Lines 886–893 of `ChartWheel.tsx` push any outer-ring planet outward by 12 SVG units when it is within 8° of a natal planet. In transit mode this is sensible: a transiting planet accidentally near a natal planet is visual noise. In synastry mode this is destructive: a conjunction between Person 2's planet and Person 1's planet is the most meaningful aspect type. The nudge would push the outer-ring planet away from the natal planet it is aspecting, making conjunctions render at the wrong radius and drawing cross-aspect lines to incorrect positions.

**2. The aspect line visibility gate.** Lines 832–833 of `ChartWheel.tsx` wrap the entire transit aspect line render inside a condition: `hoveredTransit || hoveredPlanet || hover?.kind === 'transitAspect'`. Transit aspect lines are invisible until a planet is hovered. For synastry, cross-aspect lines are the point — they show the web of relationship between two charts. Hiding them until hover removes the signature visual of the bi-wheel.

**3. The type mismatch.** `transitPlanets?: TransitPosition[]` accepts `TransitPosition`, which extends `PlanetPosition` with a mandatory `dailyMotion: number`. Person 2's planets are `PlanetPosition[]` without `dailyMotion`. Reusing the transit prop type for synastry planets is a type lie. The transit tooltip (`TransitPlanetTooltip` at line 217) renders daily motion data and labels the planet as "Transit" — if this tooltip is reused for Person 2's planets, it will display wrong information.

### The `SolarReturnBiWheel.tsx` precedent is the wrong pattern

The solar return bi-wheel at `src/components/chart/SolarReturnBiWheel.tsx` was built as a standalone component, duplicating the full coordinate system (`polarToXY`, `sectorPath`, `OUTER_R`, zodiac ring sector paths, house line rendering, offset function) from `ChartWheel.tsx`. The file is approximately 350 lines of diverged copy. Any bug fix in `ChartWheel.tsx` cannot propagate to `SolarReturnBiWheel.tsx` because there is no shared primitive layer. The synastry bi-wheel must not repeat this mistake. It must live inside `ChartWheel.tsx` as a conditional rendering path gated on new props, reusing the existing coordinate transform, zodiac ring, house line renderer, and tooltip infrastructure.

### The `HoverState` discriminated union is under-specified for synastry

The current `HoverState` type in `ChartWheel.tsx` (lines 28–34) has five variants: `planet`, `transit`, `aspect`, `transitAspect`, `house`. The `handleTap` equality check at lines 340–352 contains a manually exhaustive branch for each variant. Synastry adds two new hover targets — an outer-ring partner planet and a cross-aspect line — that each need their own variant. If these are added without refactoring, the switch will grow to seven branches. If they are incorrectly added (e.g., reusing `transit` kind with wrong tooltip), the user tapping Person 2's Sun will see a tooltip labeled "Transit" with daily motion data.

---

## Vision

When the bi-wheel is complete, loading the synastry page produces a single chart object that occupies the full container width. Person 1's natal wheel lives in the inner field — their gold planets, their house lines, their zodiac ring, exactly as their birth chart looks on the natal reading page. Person 2's planets appear in the outer ring between the zodiac segments and the chart edge, rendered in a warm color that reads as "a distinct person" rather than "the current sky." Cross-aspect lines stretch between the two rings, visible at rest, quiet at low opacity, colored blue for harmony and red for tension.

Before the user reads a single word, they see the relationship as a single object. They can trace their eye along a blue line from the inner ring outward and understand intuitively: these two planets are in conversation. They can see a dense cluster of lines on one side of the wheel and know: this is where our charts touch most. They do not need to understand aspect theory to feel what the chart is showing them.

Hovering or tapping a planet in the outer ring brings up a tooltip that names it — its sign, its degree, and the cross-aspects it makes to Person 1's chart. Hovering or tapping a cross-aspect line shows the synastry brief for that contact: a specific sentence about what this inter-chart aspect means for the relationship, sourced from `computeSynastryAspectBrief`. The interpretation is not generic. It is the sentence written for that planet pair, that aspect type, that nature.

A tight conjunction — Person 2's Mars at the same degree as Person 1's Venus — renders with Person 2's planet circle almost touching Person 1's, a cross-aspect line of zero length, and a tooltip that opens directly on the overlapping point. The lack of spatial separation is information. The design honors it.

On mobile at 375px viewport, the chart scales proportionally via `viewBox="0 0 700 700"`. The outer ring planets remain legible. Touch targets are large enough to tap. The bottom-sheet modal shows the full tooltip when a planet or aspect line is tapped.

The bi-wheel occupies the hero position on the page — full width, centered, before any text interpretation. It is not one section among many. It is the first and primary representation of the relationship, and everything that follows — the couple profile dimensions, the GPT reading, the aspects list — is commentary on what the chart already shows.

---

## Specifications

### 1. Component structure

1.1. The bi-wheel must be implemented by adding `synastryPlanets?: PlanetPosition[]` and `synastryAspects?: SynastryAspect[]` props to the existing `ChartWheel` component in `src/components/chart/ChartWheel.tsx`. No new top-level component is created for the bi-wheel.

1.2. The `synastryPlanets` prop must accept `PlanetPosition[]`, not `TransitPosition[]`. The type for this prop must match the `PlanetPosition` interface from `src/engine/types.ts` exactly. Daily motion data must not be required, accessed, or rendered for synastry planets at any point in the component.

1.3. The `synastryAspects` prop must accept `SynastryAspect[]` as exported from `src/engine/synastry.ts`. The component must not modify the array — it must render from the provided array directly and track hover state by index into the provided array.

1.4. Synastry mode is active when `synastryPlanets` is provided and non-empty. Transit mode is active when `transitPlanets` is provided. These two modes must be mutually exclusive in any given render: `ChartWheel` must not attempt to render both outer rings simultaneously. If both props are somehow provided, synastry mode takes precedence.

1.5. `SolarReturnBiWheel.tsx` must not be modified, extended, or referenced as part of this feature. It is a pre-existing divergence acknowledged as technical debt.

### 2. Outer ring placement and geometry

2.1. Person 2's planets must be rendered at a constant radius of `TRANSIT_PLANET_R = 288` SVG units, in the same band currently used for transit planets. A new constant `SYNASTRY_PLANET_R` may be introduced as an alias to make the semantic intent explicit, but the numeric value must be equivalent to `TRANSIT_PLANET_R`.

2.2. The coordinate transform for each synastry planet must use the same `offset(lon)` function used for natal and transit planets: `offset = (lon) => lon - ascLon`, where `ascLon` is Person 1's Ascendant longitude. This is the correct reference frame. No additional rotation or offset is applied to Person 2's longitudes.

2.3. The radial nudge logic at lines 886–893 of `ChartWheel.tsx` must not apply to synastry planets. Synastry planets must always render at `SYNASTRY_PLANET_R` regardless of angular proximity to natal planets. A conjunction must render the outer-ring planet at the same angular position as the natal planet, at its fixed radius, not pushed outward.

2.4. The divider circle drawn at `r=276` when transit planets are present must also be drawn when synastry planets are present.

### 3. Person 2 planet visual style

3.1. Person 2's planets must use a distinct color that reads as "a different person" rather than "the current sky." The transit color (`#5ec4c4`, teal) must not be used for synastry planets. A warm rose-gold, copper, or silver-lilac palette must be chosen. The exact hex value must be determined at design time; the constraint is that it must be visually distinct from both natal gold (`#c9a84c`) and transit teal (`#5ec4c4`), and must read as "warm" and "personal" rather than "temporal."

3.2. A dedicated SVG `<filter>` element must be added to the `<defs>` block for the synastry planet glow effect, matching the pattern of `transitGlow` (line 466 of `ChartWheel.tsx`) but using the synastry color as the flood color.

3.3. Person 2's planet circles must use the same sizing pattern as transit planets: `r={11}` at rest, `r={14}` on hover, with a transparent `r={16}` overlay as a touch target.

3.4. Each Person 2 planet must display a superscript marker distinguishing it from natal and transit planets. A "P2" label or equivalent must appear at the same position as the "T" marker used for transit planets (offset +10, -8 from the planet center). The exact label may be a person name initial if names are available, but must fall back to a static distinguishing marker.

3.5. Person 2's planets that are retrograde must display a retrograde indicator using the same pattern as natal and transit retrograde markers.

3.6. All Person 2 planets from the `synastryPlanets` prop must be rendered, including the NorthNode and any asteroid bodies present in the array.

### 4. Cross-aspect line rendering

4.1. Cross-aspect lines must be visible at rest without any hover interaction. They must not be hidden behind a hover gate. The default render state must show all synastry cross-aspects at base opacity.

4.2. The base opacity for cross-aspect lines must be 0.25–0.35. This range is intentionally softer than natal aspect lines, which render at full opacity, communicating visual hierarchy: natal aspects describe who you are; cross-aspects describe how you meet.

4.3. Cross-aspect lines must be drawn as dashed strokes using `strokeDasharray="6 4"`, matching the transit aspect line dash pattern. This visually distinguishes them from natal aspect lines, which are drawn as solid strokes.

4.4. Cross-aspect line weight must be slightly thinner than natal aspect lines. Natal lines render at 1.0–1.5px depending on hover; cross-aspect lines must render at 0.6–1.0px at rest, increasing to 2.0–2.5px when hovered.

4.5. Cross-aspect line endpoints: one endpoint at `polarToXY(CX, CY, natalR, offset(p1.longitude))` where `natalR` is `PLANET_R` for planets and `ASTEROID_R` for asteroid bodies; the other endpoint at `polarToXY(CX, CY, SYNASTRY_PLANET_R, offset(p2.longitude))`. The `isAsteroid` guard from `types.ts` must be used to select the correct natal radius.

4.6. Cross-aspect lines must use the same color coding as natal and transit aspect lines: `#4a7fb5` (blue) for harmonious, `#b54a4a` (red) for challenging, `#c9a84c` (gold) for neutral.

4.7. All aspects in the `synastryAspects` prop must be rendered as cross-aspect lines. The major-type filter applied to natal aspects (`['conjunction', 'sextile', 'square', 'trine', 'opposition']`) must also be applied to synastry aspects in the line render pass. Minor aspects (semi-sextile, quincunx, etc.) must not be rendered as lines.

4.8. A transparent hit-target `<line>` at `strokeWidth="12"` must be rendered on top of each cross-aspect line, matching the pattern used for transit aspect lines, to provide an adequate hover and tap target.

4.9. When a cross-aspect line is hovered or tapped, its opacity must increase to 1.0 and its stroke must change to indicate active state, matching the transit aspect line hover behavior.

4.10. Hovering a Person 2 planet must dim all cross-aspect lines except those connected to that planet, and must brighten the lines connected to it. The dimming logic must parallel the `hoveredTransit` dimming behavior applied to transit aspect lines.

### 5. HoverState extensions

5.1. The `HoverState` discriminated union in `ChartWheel.tsx` must be extended with two new variants:
- `{ kind: 'synastry'; name: string }` — for hovering a Person 2 planet by name
- `{ kind: 'synastryAspect'; index: number }` — for hovering a cross-aspect line by index into the `synastryAspects` prop array

5.2. The `handleTap` equality check must be updated to include branches for both new variants. The check must use `hover.name === state.name` for `synastry` kind and `hover.index === state.index` for `synastryAspect` kind.

5.3. The `tooltipBorderColor` computation must include cases for `synastry` (use the synastry planet color constant) and `synastryAspect` (use `getAspectColor` on the referenced aspect's nature).

5.4. The synastry hover state must not conflict with or reuse the `transit` hover kind in any code path. A planet hovered as `{ kind: 'synastry', name: 'Venus' }` must never cause the component to look up that name in `transitPlanets`.

### 6. Tooltip components for synastry

6.1. A new `SynastryPlanetTooltip` component must be added to `ChartWheel.tsx`, modeled after `TransitPlanetTooltip` (line 217) but without the daily motion line and without the "Transit" badge. It must display:
- The planet glyph and name in the synastry color
- A "Partner" or equivalent badge (not "Transit")
- The planet's degree, arcminute, sign, and zodiac glyph
- A list of cross-aspects this planet makes to Person 1's chart, sourced from the `synastryAspects` prop filtered by `a.person2Planet === planet.name`, showing aspect symbol, nature color, the Person 1 planet name, and the orb

6.2. A new `SynastryAspectTooltip` component must be added to `ChartWheel.tsx`, modeled after `TransitAspectTooltip` (line 269) but semantically framed for inter-chart aspects. It must display:
- Person 2 planet glyph in synastry color
- Aspect symbol in nature color
- Person 1 planet glyph in natal gold
- Aspect name, orb, and nature label
- The synastry brief text returned by `computeSynastryAspectBrief(a.person1Planet, a.type, a.person2Planet, a.nature)`, imported from `src/data/interpretations/synastryAspectBriefs`

6.3. The existing `TransitPlanetTooltip` and `TransitAspectTooltip` components must not be used or reused for synastry hover states. The copy, colors, and data fields are semantically different.

6.4. Both new tooltip components must render in the same desktop hover tooltip and mobile bottom-sheet modal infrastructure as all existing tooltip variants. No new tooltip positioning logic is needed; the existing `tooltipStyle` and `tapped` modal handling apply.

6.5. The tooltip height estimate used in `tooltipStyle` is hardcoded to 200 (line 381 of `ChartWheel.tsx`). For synastry planet tooltips that include a cross-aspect list, this estimate may be too small. The height estimate must be raised to at least 280 for synastry tooltip variants, or the estimate must be made dynamic.

### 7. SynastryPage layout changes

7.1. The `grid grid-cols-1 md:grid-cols-2 gap-6 mb-8` block containing two side-by-side `ChartWheel` instances (lines 362–372 of `SynastryPage.tsx`) must be replaced with a single centered container holding one `ChartWheel` instance rendered in synastry bi-wheel mode.

7.2. The single bi-wheel container must use `max-w-2xl` or `max-w-3xl` width — not the half-grid slot that each current chart occupies — since the bi-wheel now represents both charts.

7.3. The bi-wheel `ChartWheel` instance must receive:
- `chartData={chartData}` — Person 1's natal chart (inner wheel, unchanged)
- `aspects={aspects}` — Person 1's natal aspects (inner wheel natal lines, unchanged)
- `synastryPlanets={partnerChartData.planets}` — Person 2's planets for the outer ring
- `synastryAspects={synastryData.synastryAspects}` — cross-chart aspects for the connecting lines

7.4. A label above the bi-wheel must identify Person 1 (inner wheel) and Person 2 (outer ring) using the most personal available identifier: if an optional name field is collected from the form, use the name; if not, use a formatted date-of-birth string (e.g., "Born March 15, 1990") rather than the literal string "Person 1" or "Person 2."

7.5. The `IndividualChartSection` components at the bottom of `SynastryPage.tsx` (lines 419–420) must be collapsed by default. The individual charts remain available as reference material but must not be expanded on initial page load.

7.6. The `CurrentMoonWidget` (line 378 of `SynastryPage.tsx`) must be removed from the synastry page. Its presence between the compatibility section and the GPT reading interrupts the reading's intimacy and is not synastry content.

7.7. The `SynastryAspectsSection` (line 399) must change from `defaultOpen` to collapsed by default. The cross-aspect lines in the bi-wheel provide the visual overview; the text list is reference detail.

### 8. SVG accessibility

8.1. The SVG `aria-label` attribute (currently `"Natal birth chart wheel"`) must be updated to `"Synastry bi-wheel chart"` when `synastryPlanets` is provided. The label must accurately describe the chart mode.

8.2. Each Person 2 planet element group must include an `aria-label` attribute following the pattern `"{name} in {sign} — Partner planet"`.

### 9. Coordinate system correctness

9.1. The `offset` function (`lon => lon - ascLon`) uses Person 1's Ascendant longitude as the reference frame. This is correct for both inner and outer ring planets in a synastry bi-wheel. Person 2's planets are placed at their ecliptic longitudes in Person 1's rotated frame. No alternative coordinate transform is applied to Person 2's planets.

9.2. When `chartData.unknownTime === true`, Person 1's Ascendant defaults to the Sun's ecliptic position (solar noon convention). The bi-wheel still renders. Cross-aspect line geometry remains correct for angular position. The house lines rendered inside the wheel are meaningless for unknown-time charts, which is pre-existing behavior. No new guard logic is required specifically for the bi-wheel.

9.3. Cross-aspect lines must correctly connect the inner-ring endpoint (using `PLANET_R` for planets, `ASTEROID_R` for asteroids) to the outer-ring endpoint (using `SYNASTRY_PLANET_R`). The `isAsteroid` guard from `types.ts` must be used at line level to select the natal body radius.

### 10. Mobile and responsive behavior

10.1. The bi-wheel SVG uses `viewBox="0 0 700 700"` and renders with `w-full`. At 375px viewport width, the SVG scales to 53.6% of its viewBox size. `SYNASTRY_PLANET_R = 288` SVG units becomes approximately 154 screen pixels. Planet circles at `r={11}` SVG units become approximately 5.9 screen pixels. This is the minimum legible size. The outer ring must not be repositioned or resized to compensate — the scaling behavior is intentional and correct.

10.2. Touch targets for outer-ring planets must use the transparent `r={16}` overlay, identical to the pattern used for transit planets.

10.3. On mobile, tapping a Person 2 planet or a cross-aspect line must open the full tooltip in the bottom-sheet modal, identical to the behavior for natal and transit planets.

10.4. The bi-wheel must be tested at 375px, 428px (iPhone 14 Pro Max), and 768px (iPad) viewport widths before shipping. Outer ring glyphs must not clip into the zodiac sign band at any of these sizes.

### 11. Edge cases

11.1. **Identical birth data.** If Person 2's planets have the same longitudes as Person 1's planets (e.g., a twin), every cross-aspect will be a conjunction with orb 0°. The outer ring must render Person 2's planets at `SYNASTRY_PLANET_R` regardless, placing them directly radially outward from the natal planets. Cross-aspect lines will have near-zero SVG length but must still be rendered (they become dots at the natal planet positions). No special handling or degenerate-chart guard is required; the geometry handles it correctly.

11.2. **No cross-aspects within orb.** If `synastryAspects` is empty, the outer ring planets must still render. No cross-aspect lines are drawn. The bi-wheel displays Person 2's planets in the outer ring with no connecting lines, which is the correct representation of a chart with no close angular aspects.

11.3. **Unknown birth time for either person.** If `partnerChartData.unknownTime === true`, Person 2's planets include asteroids at their noon positions but house data is absent. All outer ring planets still render at their ecliptic longitudes. No house overlay data is shown in the synastry planet tooltip (the house field is 0). No new guard is required; `planet.house > 0` conditionals already suppress house display for unknown-time bodies.

11.4. **All aspects of one nature.** A couple with all harmonious cross-aspects renders only blue lines; all challenging renders only red lines. The visual result is correct and must not be altered by the component.

11.5. **Person 2 has only a subset of bodies.** The `synastryAspects` array contains only aspects that were computed; if a body is absent from `partnerChartData.planets`, it simply does not appear in the outer ring. No missing-planet error handling is needed.

11.6. **Cross-aspect line endpoint overlap.** When a cross-aspect involves an asteroid body on the natal side (`ASTEROID_R = 240`) and a planet on the outer ring (`SYNASTRY_PLANET_R = 288`), the line spans the full distance between the two rings. When both bodies are planets, the line spans from `PLANET_R ≈ 263` to `SYNASTRY_PLANET_R = 288` — a shorter, 25-unit line. This is correct; the visual gap between the rings is narrow for planet-to-planet aspects. No adjustment is made; the proximity itself communicates closeness.

### 12. Performance constraints

12.1. The 360 individual `<line>` SVG elements for degree tick marks (lines 492–508 of `ChartWheel.tsx`) are pre-existing. They must not be increased in count or rendered conditionally per-mode. The bi-wheel does not add additional tick marks.

12.2. Cross-aspect line rendering adds at most 45 SVG line elements (10 × 10 planet pairs minus self-pairs, minus those not within orb). This is a negligible addition to the existing SVG element count.

12.3. The `synastryAspects` array must not be re-derived or filtered inside the component render. It must be consumed as provided via props. Any filtering (e.g., major-type only) that needs to happen for line rendering must occur via a `useMemo` keyed on the prop, not inline per-render.

12.4. The `SynastryPlanetTooltip` and `SynastryAspectTooltip` components must be rendered conditionally only when their hover state is active. They must not be instantiated during renders when no synastry hover is active.

### 13. Type system integrity

13.1. The `synastryPlanets` prop must be typed as `PlanetPosition[]`, imported from `../../engine/types`. The `TransitPosition` type must not be referenced or used in any code path serving synastry planets.

13.2. The `synastryAspects` prop must be typed as `SynastryAspect[]`, imported from `../../engine/synastry`. The `TransitAspect` type must not be referenced in any code path serving cross-aspect lines.

13.3. The two new `HoverState` variants must be exhaustively handled in all switch statements and conditional chains in the component. TypeScript's discriminated union narrowing must be in place so that the compiler catches any unhandled variant at build time.

13.4. `computeSynastryAspectBrief` must be imported from `../../data/interpretations/synastryAspectBriefs` and called with the correct signature `(person1Planet, aspectType, person2Planet, nature)` in `SynastryAspectTooltip`. The import must already exist in `SynastryPage.tsx` and can be cross-referenced there.

### 14. Acceptance checks

14.1. Given a known synastry pair where Person 1 has Sun at 14° Gemini and Person 2 has Moon at 11° Aquarius, the bi-wheel must render a cross-aspect line connecting the inner-ring Sun to the outer-ring Moon. Hovering the line must display a tooltip that references both bodies by name, states "trine" as the aspect type, and shows a synastry brief from `computeSynastryAspectBrief`. The rendered angular positions of both bodies must correspond to their ecliptic longitudes in Person 1's Ascendant-rotated frame.

14.2. Given a synastry pair where Person 2's Mars is at the same ecliptic longitude as Person 1's Venus (orb < 1°), Person 2's Mars must render at `SYNASTRY_PLANET_R` at the same angular position as Person 1's Venus on the inner ring, not radially nudged outward. The cross-aspect line connecting them must be near-zero in SVG length, appearing as a line emanating from the inner planet and terminating at the outer ring directly above it.

14.3. On initial page load, cross-aspect lines must be visible without any user interaction. Hovering away from all planets must not hide the lines. Lines are always visible at base opacity.

14.4. The transit reading page, which also uses `ChartWheel`, must render identically before and after this change. The `transitPlanets` and `transitAspects` props must produce the same visual output as before when `synastryPlanets` and `synastryAspects` are absent.

14.5. The natal reading page, which uses `ChartWheel` without any outer ring props, must render identically before and after this change.

14.6. On a 375px mobile viewport, the outer ring planet glyphs must be legible (no clipping into the zodiac band). Tapping a Person 2 planet must open a bottom-sheet modal with the `SynastryPlanetTooltip` content.

14.7. No cross-aspect line must use the `TransitAspectTooltip` component or display "Transit" labeling anywhere.

---

## Out of Scope

- The `CoupleProfileSection` replacing `CompatibilitySection` (a separate proposal). The existing `CompatibilitySection` remains in place as a sibling section below the bi-wheel until the dimension axis work is implemented.
- Name fields on `PartnerForm`. The bi-wheel label will use formatted birth dates as the fallback until the names feature is built. The label spec (item 7.4) references names conditionally.
- The composite chart wheel replacing the data table in `CompositeSection`.
- Any changes to the transit reading page, the natal reading page, the solar return page, or the `SolarReturnBiWheel` component.
- GPT prompt updates to include cross-aspect or partner planet data directly from the bi-wheel interaction.
- The `CompatibilityScore.overall` removal or the dimension axis system. These are sibling work to the bi-wheel, not dependencies.
- De-collision logic for clustered outer-ring planets. Planets at identical or near-identical longitudes will render overlapping glyphs. This is acknowledged and deferred. The outer ring in transit mode has the same gap; synastry mode does not worsen it.
- Angular de-collision (the nudge behavior used for asteroid glyphs at lines 759–769 of `ChartWheel.tsx`) in the outer ring. Outer ring de-collision for clustered synastry planets is a future enhancement.
- The `SolarReturnBiWheel.tsx` refactor to share geometry primitives with `ChartWheel.tsx`. The duplication is acknowledged debt; this feature does not address it.
- Tests or test infrastructure. The project has no automated test setup; adding one is out of scope.

---

## Open Questions

1. **Synastry planet color.** The spec requires a warm, distinct color that reads as "a person" rather than "the current sky." No specific hex is defined. This must be decided before implementation begins. Candidates include rose-gold (`#d4896a`), warm ivory (`#e8dfc8`), or soft lilac-silver (`#c4b8d4`). The chosen color must be evaluated against the natal gold (`#c9a84c`) and transit teal (`#5ec4c4`) at the SVG rendering scale on a dark background.

2. **Cross-aspect line filter — major types only or all?** Spec item 4.7 filters to the five major aspect types. The `synastryAspects` array from the engine includes minor aspects (semi-sextile, quincunx, etc.) at tighter orbs. Should minor synastry aspects render as lighter or shorter lines in the bi-wheel, or be fully excluded? The transit path excludes them; the synastry path should likely do the same, but this should be confirmed with the user.

3. **Superscript marker wording.** Spec item 3.4 uses "P2" as the default superscript. Is this the right token, or should it be "2" alone to be less clinical? Once optional names exist, the superscript could show an initial. The default fallback before names are collected should be decided explicitly.

4. **`localStorage` cache invalidation.** `SynastryData` is cached in `AppContext` and written to `localStorage` (lines 37–44 of `AppContext.tsx`). This feature does not change `SynastryData` shape, so existing caches remain valid. However, if a future sibling task adds `coupleProfile` to `SynastryData`, caches from before that change will not have the field. A cache version or migration strategy should be decided before any `SynastryData` shape change, not after.

5. **Bi-wheel label wording.** The spec (item 7.4) requires a label identifying the inner wheel (Person 1) and the outer ring (Person 2) using the most personal available identifier. The specific label text and visual positioning relative to the SVG (above the chart? embedded in the chart edge?) must be designed. The current side-by-side layout uses a small `text-xs uppercase` `<p>` above each chart; a single bi-wheel may benefit from a different treatment.

6. **Aspect line count at high asteroid inclusion.** If both charts include all five asteroid bodies, `synastryAspects` can contain aspects between asteroid pairs (e.g., Person 1's Chiron to Person 2's Ceres). Should cross-aspect lines for asteroid-to-asteroid pairs render at the same opacity as planet cross-aspects, or at reduced opacity to deprioritize them visually? The natal aspect filter already excludes some minor aspects; a parallel filter for outer-ring asteroid pairs may be warranted.
