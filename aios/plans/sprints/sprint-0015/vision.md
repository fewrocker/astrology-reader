# Sprint 0015 — Vision

## Sprint Focus

Make asteroids first-class citizens in the birth chart reading. Sprint 0014 laid the mechanical foundation — positions calculated, glyphs rendered, aspect lines drawn. Sprint 0015 completes the meaning layer: asteroid sign interpretations that do not exist anywhere, wire-up of the house and retrograde interpretations that exist in data but are silently suppressed in the UI, and a dedicated Asteroids accordion on the birth chart results page that lets the user read each asteroid as a coherent archetype story rather than finding it buried in a planet list with no text.

## Why Now

Sprint 0014 shipped a complete data layer for asteroid-in-house (60 entries), asteroid-retrograde (5 entries), and archetype-archetype descriptions — and then blocked all of it from surfacing to the user. `assembleReading()` explicitly returns `null` for asteroid `signInterpretation`, `houseInterpretation`, and `retrogradeInterpretation`. No asteroid sign interpretations exist anywhere in the data files. The chart tooltip for an asteroid shows a single archetype label sentence and nothing more. A user who taps Chiron on the wheel gets less information than they get tapping any classical planet. The product has the infrastructure for something meaningful and is currently showing almost nothing. The gap between what exists and what is surfaced is the exact work of this sprint.

## Where to Look

### Data gaps (write new interpretation text)
- **`src/data/interpretations/planetInSign.ts`** — no entries for any of the 5 asteroids (60 entries needed: 5 × 12 signs). This is the primary content work of the sprint. Each entry needs a `brief` (~8 words, archetypal framing in the sign's idiom) and a `detail` (~3-4 sentences, substantive and specific to the asteroid's themes as filtered through that sign). The quality bar is the Chiron-in-house entries already in `planetInHouse.ts` — those are the model.

### Data wire-up (unlock what already exists)
- **`src/data/interpretations/index.ts`, lines 138–141** — `assembleReading()` hard-returns `null` for all three asteroid interpretation types. Changing these three guards is the smallest possible change to unlock asteroid house + retrograde interpretations that already exist in the data files.
- **`getPlanetInSignInterpretation()` in `src/data/interpretations/index.ts`, line 19** — signature accepts `PlanetName | 'NorthNode'`, not `BodyName`. Needs to accept `AsteroidName` too once sign entries exist.
- **`getPlanetInHouseInterpretation()`, same file, line 23** — same signature constraint.

### UI: dedicated asteroid section (new surface)
- **`src/components/reading/ReadingDisplay.tsx`** — add an `AsteroidSection` component (collapsible accordion, consistent with existing `Section` pattern). Each asteroid gets its own card showing: archetype badge, sign + brief, house + brief (when time known), expanded detail for sign, expanded detail for house, and retrograde note if applicable. This section should render after `PlanetSection` and before `AspectSection` in `ResultsPage.tsx`.
- **`src/components/results/ResultsPage.tsx`** — add `<AsteroidSection>` to the reading layout.

### Chart tooltip (deepen asteroid hover/tap)
- **`src/components/chart/ChartWheel.tsx`, `PlanetTooltip` component** — for asteroid bodies, currently shows only the archetype sentence. Once sign + house interpretations are wired up, the same tooltip should render them (same structure as classical planets but with amber theming). The tooltip already has all the conditional logic; it just needs the data to be non-null.

### FullReading type
- **`src/data/interpretations/index.ts`, `PlanetReading` interface** — `signInterpretation` and `houseInterpretation` are currently typed as `InterpretationEntry | null` with no distinction between "asteroid, data doesn't exist yet" and "classical planet, lookup failed". No type change is strictly required, but the implementation of asteroid lookups should use a consistent key convention (`Chiron_Aries`, `Ceres_H7`, etc.) to match what `getPlanetInSignInterpretation` already uses for classical planets.

## Quality Bar

"Deep, not shallow" for this sprint means the asteroid sign interpretation text must be substantively different for each of the five archetypes — not just "Chiron in Aries means you are wounded around identity." The text should feel like it was written by someone who has read both the astrological tradition and the asteroid's specific mythology. Ceres in Capricorn is not the same as Saturn in Capricorn; Juno in Scorpio is not the same as Pluto in Scorpio. Each of the 60 sign entries must be legibly about that specific archetype filtered through that sign. The existing Chiron-in-house entries in `planetInHouse.ts` are the quality model — they are long enough to be worth reading, specific enough to be distinguishable from sign to sign, and honest about the archetype's cost as well as its gift.

The `AsteroidSection` UI should feel like a genuine reading section, not a data dump. Archetype identity should be visible at a glance (badge, archetype name), the sign placement should be the primary story, house placement is secondary context, and retrograde notes should be visually quieter. The section should not be open by default — asteroids are secondary to the personal planets — but it should feel worth opening.

## What This Sprint Is NOT

- **Not a transit feature.** Asteroid transits and their interpretations are not in scope. Do not add asteroid transit aspect entries to `transitAspectBriefs.ts` or modify the transit reading pipeline.
- **Not a synastry feature.** Asteroid overlays in synastry (Juno conjunct partner's Venus, etc.) are not in scope. The synastry reading pipeline is untouched.
- **Not a composite or solar return feature.** No new asteroid entries for those contexts.
- **Not about adding new asteroids.** The five already in the engine (Chiron, Ceres, Pallas, Juno, Vesta) are sufficient. Do not add Lilith, Eris, Sedna, or any other body.
- **Not a chart wheel visual change.** The asteroid ring rendering in `ChartWheel.tsx` is correct and was shipped in 0014. Do not modify the chart geometry, ring radii, or visual language.
- **Not about aspect interpretations between asteroids and planets.** `ASPECT_INTERPRETATIONS` in `aspectInterpretations.ts` does not need asteroid-specific entries this sprint. The asteroid-to-planet aspect entries in the Aspects accordion will continue to show the minor-aspect fallback if no entry exists.
- **Not GPT work.** The GPT interpretation pipeline already receives asteroid context. No prompt engineering or GPT-related changes this sprint.
