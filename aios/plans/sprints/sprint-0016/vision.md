# Sprint 0016 — Vision

## Sprint Focus

Make couples synastry the best feature in the app. Replace the judgmental Overall Resonance score with a non-judgmental personality-dimension profile inspired by MBTI axes — each dimension has two named poles, neither pole is good or bad, they simply describe the character of the relationship. Unify the two side-by-side chart wheels into a single bi-wheel (inner/outer ring) that renders both charts as one beautiful object. Apply polish and structural improvements across the page so the synastry experience feels cohesive, emotionally resonant, and worthy of the product's core promise.

---

## Why Now

Synastry is the feature most people arrive for. The product already has the correct calculation substrate — cross-chart aspects, house overlays, composite chart, relational briefs — but the presentation layer has two meaningful flaws that undercut the experience:

1. **The Overall Resonance score is paternalistic.** A 0-100 number that implicitly rates whether a couple is "good" is the wrong concept for astrology, which describes dynamics rather than outcomes. Users who see a 72 may feel relieved or worried for the wrong reasons. The score communicates judgment where the product should communicate insight.

2. **Two separate chart wheels miss the point.** Synastry is fundamentally about how two charts interact as one system. Side-by-side wheels require the user to mentally merge them. A bi-wheel — inner natal wheel for Person 1, outer ring for Person 2's planets — shows the relationship as a single visual object and is the standard format professionals use.

Sprint 0016 comes after two sprints of deep asteroid infrastructure (0014–0015) and the server sovereignty work (0012). The calculation engine is accurate, the interpretation layer is rich, and the visual vocabulary is established. The time cost for the synastry overhaul is now purely in design and front-end work, not in engine correctness.

---

## Where to Look

### Primary target: SynastryPage.tsx
`/projects/astrology-reader/src/components/results/SynastryPage.tsx`

The full page component. Two changes are required here:
- Replace `CompatibilitySection` (which renders the Overall Resonance circle and five score bars) with a new `CoupleProfileSection` that displays personality dimension axes.
- Replace the `grid grid-cols-1 md:grid-cols-2` side-by-side chart block with a single bi-wheel component.

### Synastry engine
`/projects/astrology-reader/src/engine/synastry.ts`

The `CompatibilityScore` interface currently holds `overall`, `romantic`, `emotional`, `communication`, `growth`, `challenge`. This needs a parallel (or replacement) data structure: `CoupleProfile` with a set of named bipolar dimensions derived from the same aspect and element data. The `calculateCompatibility` function must be extended or forked to produce dimension values in a normalized range (e.g., -100 to +100, or 0-100 with a midpoint) rather than pure left-to-right percentage scores.

### ChartWheel.tsx (for bi-wheel)
`/projects/astrology-reader/src/components/chart/ChartWheel.tsx`

The existing wheel already supports transit planets as an outer ring (`transitPlanets` prop, rendered at `TRANSIT_PLANET_R = 288`). A synastry bi-wheel is the same concept: Person 2's planets rendered in an outer ring overlaid on Person 1's natal wheel. The `transitPlanets?: TransitPosition[]` prop path should be examined to understand how to reuse or extend this for synastry context — the difference is that in transit mode the outer ring shows transiting planets, and in bi-wheel mode it shows a second natal chart's planets with their own aspect lines drawn across to the inner planets.

### Data types
`/projects/astrology-reader/src/engine/types.ts`

May need minor additions if the `CoupleProfile` dimension type is introduced here. Prefer keeping it in `synastry.ts` as a local type unless it spreads to multiple files.

---

## The Dimension System: Research and Design

The core design task of this sprint is defining the bipolar dimension axes for the couple profile. The following are proposed axes grounded in synastry fundamentals — the sprint should evaluate these and may refine or replace them:

**Proposed axes (working list):**

| Axis | Left pole | Right pole | Derived from |
|------|-----------|------------|--------------|
| Intensity | Calm | Fiery | Mars-Mars, Sun-Mars, Pluto contacts; fire/water element balance |
| Emotional Flow | Reserved | Expressive | Moon-Moon, Moon-Venus, water element dominance |
| Communication Style | Intuitive | Analytical | Mercury aspects, air vs. water dominant elements |
| Intimacy Rhythm | Spacious | Merging | Venus-Neptune, 8th/12th house overlays, Neptune contacts |
| Growth Dynamic | Stabilizing | Expanding | Saturn vs. Jupiter contacts; fixed vs. mutable modality balance |
| Sexual Chemistry | Understated | Electric | Venus-Mars, Mars-Mars, Uranus contacts |
| Life Pace | Steady | Catalytic | Cardinal vs. fixed modality balance; Uranus/Mars cross-aspects |

Each axis is rendered as a horizontal slider / bar with the pole names at each end and a marker positioned by the computed value. No value is colored red or green — both poles are simply labeled descriptively. A brief one-sentence tooltip explains what the axis describes for this couple.

The sprint should also determine whether to keep any of the existing sub-scores (romantic, emotional, communication) in a secondary or collapsed form, or retire them entirely in favor of the dimension system.

---

## The Bi-Wheel Chart

The bi-wheel should:

- Use Person 1's natal chart as the inner wheel (identical rendering to the existing `ChartWheel` inner content: zodiac ring, houses, planets, aspect lines for Person 1's own natal aspects).
- Place Person 2's planets in an outer ring between the zodiac segments and the outer boundary of the SVG, at a radius larger than `PLANET_R` and smaller than `SIGN_R`. The existing `TRANSIT_PLANET_R` constant (288) is in approximately the right zone — evaluate whether to reuse this ring or introduce a dedicated `SYNASTRY_PLANET_R`.
- Draw cross-chart aspect lines between Person 1's inner planets and Person 2's outer planets, using the same color coding (harmonious = blue, challenging = red, neutral = gold) but with a slightly different stroke style (e.g., dashed or lower opacity) to visually distinguish synastry lines from natal lines.
- Support hover on both rings: hovering a Person 2 planet shows their position and sign; hovering a cross-aspect line shows the synastry brief.
- The chart container on `SynastryPage` should be promoted to full width (`max-w-2xl` or `max-w-3xl`) rather than the current half-grid slot, since it now represents both charts.

Implementation approach: add a `synastryPlanets?: TransitPosition[]` prop to `ChartWheel` (or a more specific `partnerPlanets?: PlanetPosition[]`), and `synastryAspects?: SynastryAspect[]` from the synastry engine. The component should render these in synastry mode when this prop is present. The existing transit bi-wheel logic in `ChartWheel` (used on the transit reading page) is the best reference point for the rendering pattern.

---

## Additional Polish in Scope

These are improvements to the synastry page that require less architectural work but meaningfully raise the quality bar:

- **Names instead of "Person 1 / Person 2":** The partner form already captures a city label; consider allowing optional name fields in `PartnerForm`, or at minimum using date-of-birth as a personalized label (`"Born Nov 3" and "Born Apr 14"`) instead of the generic Person 1 / Person 2.
- **Composite chart visualization:** The composite chart currently shows only a data table. A standalone chart wheel for the composite chart (using the composite planet array already calculated in `synastry.ts`) would complete the visual story. Lower priority than the bi-wheel; can be deferred to a later task if time is short.
- **Page header:** The current pink "Couple Synastry" pill header is fine. Ensure the section ordering makes narrative sense: bi-wheel first, couple profile dimensions second, GPT reading third, then the detail sections (aspects, house overlays, composite).
- **GPT prompt alignment:** The `buildSynastryPrompt` in `synastry.ts` should be updated to include the new dimension scores in its context (replacing or supplementing the current `compatibility` block), so the GPT narrative references the same language as the visual profile.

---

## Quality Bar

"Deep, not shallow" for this sprint means:

- **The bi-wheel must be correct.** Person 2's planets must appear at their actual ecliptic longitudes mapped to the same coordinate system as Person 1's chart. Cross-aspect lines must connect the correct planet pairs. This is not decorative — it is the primary visual claim of the feature.
- **The dimension axes must be grounded in astrology, not invented.** Each axis value must be derivable from actual synastry data (aspects, elements, modalities, house overlays). The computation logic in `calculateCompatibility` must be traceable and explainable — not a black-box score shuffle. Document the derivation logic in comments.
- **Neither pole is "bad."** Every label, tooltip, and brief must treat both poles as equally valid expressions. "Fiery" is not worse than "Calm." "Merging" is not worse than "Spacious." If any copy implies one pole is preferable, it must be rewritten.
- **The chart must render correctly on mobile.** The bi-wheel is more complex than a single wheel; verify it scales gracefully at 375px viewport width and the tooltips do not clip.

---

## What This Sprint Is NOT

- **Not a transit sprint.** Couple transits work correctly and are not targeted here.
- **Not a numerology sprint.** Numerology features are out of scope entirely.
- **Not a solar return sprint.** The solar return page is not touched.
- **Not a backend sprint.** The server-side synastry engine (`server/engine/synastryEngine.ts`) may need minor updates to reflect new prompt content if the GPT prompt changes, but no new server infrastructure is built.
- **Not a complete redesign of the results page.** Birth chart, transit, and solar return result pages are not in scope.
- **Not a conversion or auth sprint.** No changes to UpgradeModal, AuthModal, analytics, or subscription tiers.
- **Not a data/interpretation authoring sprint.** No new static interpretation entries are written for the classical planet/house/aspect tables (those are complete through sprint 0015). The dimension system uses computed values, not lookup tables.
- **Not an attempt to add a judgmental score back under a different name.** The "Overall Resonance" concept is retired, not relabeled.
