# Sprint 0011 — Vision

## Sprint Focus

Sprint 0011 is about completing the surfaces that already speak — and making the ones that are silent finally say something. The product computes far more than it communicates. Every reading surface has places where data stops short: a row that ends at orb numbers, a card that shows glyphs without meaning, a prompt that knows the house but never says so. This sprint finishes those sentences.

---

## Why Now

Sprint 0010 delivered personalization *infrastructure*: `natalHouse` embedded in `TransitAspect`, a shared `AspectRow` component, house-aware timeline briefs, a keyphrase pill on the daily snapshot, GPT prompts sorted by orb with priority instructions. The plumbing is now in place.

What remains is the surfaces that weren't touched: the Synastry aspect rows are still silent; the Solar Return page gives no static interpretation alongside its GPT block; the Couple Transit page (`SynastryTransitPage.tsx`) has bare aspect rows with no expand/collapse and no briefs; the `SynastryPage` house overlay section lists planets-in-partner-houses with no interpretation text. The `TodayPage` has a top-transits section that shows glyphs and orbs but no sentence-level meaning. The `DailySnapshotCard` pill sentence is now in place for transit aspects, but the moon pill still carries only label text on void days.

These are all the same problem: data that was calculated, carried to the render layer, and then displayed in a form that communicates nothing personal. Each one is a short-hop fix using interpretation data that already exists.

The guidelines say no new features. That rule fits perfectly here — none of this requires new screens, new engines, or new GPT calls. It requires closing the gap between what is computed and what is shown.

---

## Where to Look

### 1. Synastry aspect rows — `src/components/results/SynastryPage.tsx`

The `SynastryAspectsSection` renders synastry aspects with no interpretation. The expand/collapse `AspectRow` pattern from `src/components/reading/AspectRow.tsx` should be applied here. However, the existing `ASPECT_INTERPRETATIONS` in `src/data/interpretations/aspectInterpretations.ts` uses natal-voice framing ("your will and emotional nature"). Synastry needs relational framing. The right path is a thin new data table — synastry-specific, relational briefs for the most common cross-chart pairs — or a fallback to aspect-type + planet-archetype phrasing adapted to relational context. The `ASPECT_BRIEFS` in `src/data/interpretations/transitEvents.ts` provides a model for the fallback pattern. The natal database is the wrong shelf; this sprint should write the right one: compact, relational, roughly 30–40 entries for high-frequency pairs, with an `ASPECT_BRIEFS`-style fallback for the rest.

### 2. Synastry house overlay — `src/components/results/SynastryPage.tsx`

The house overlay section lists each person's planets in their partner's houses but shows no interpretation text. `src/data/interpretations/houseThemes.ts` has the house name and theme for every house. "Your Venus falls in their 7th house" is one of the most emotionally resonant synastry facts — yet the section is currently silent beyond the table row. A one-to-two sentence brief per entry, using the house theme and the planet's archetype, makes this section actually readable.

### 3. Couple transit aspect rows — `src/components/results/SynastryTransitPage.tsx`

`TransitAspectsToComposite` renders bare rows with no expand/collapse and no briefs — identical to how transit aspect rows looked before sprint 0010. The shared `AspectRow` component exists at `src/components/reading/AspectRow.tsx`. Adapting it here is a direct application of the pattern. The brief for composite transits should address the relationship as a unit; the composite chart's "natal planet" house tells you which area of the relationship is being activated.

### 4. TodayPage top transits — `src/components/reading/TodayPage.tsx`

The top-transits block shows 3 transit aspects as bare rows: glyph + symbol + glyph + orb. These should expand on tap using the `AspectRow` component with house-aware briefs. `chartData` is already available on `TodayPage` — the natal planet house lookup is the same one-liner used in `TransitReadingPage`.

### 5. Solar Return static interpretation layer — `src/components/results/SolarReturnPage.tsx` and `src/engine/solarReturn.ts`

The Solar Return page shows a GPT block and a planet positions table but no static interpretation of SR house placements. SR Sun house and SR Moon house are the most important static facts on the page (primary focus area and emotional climate for the year). Static one-paragraph briefs for SR Sun/Moon by house — drawn from the existing `PLANET_IN_HOUSE` table in `src/data/interpretations/planetInHouse.ts` — would give users something accurate and immediately readable before GPT loads. Additionally, `buildSolarReturnPrompt` in `src/engine/solarReturn.ts` does not include the dominant element profile, unlike `buildTransitPrompt` post-sprint-0010. Adding `analyzeElements` output to the SR prompt is a two-line addition.

### 6. Synastry GPT prompt — `src/engine/synastry.ts`

`buildSynastryPrompt` does not include dominant element profiles for either person, and does not instruct GPT to name life areas alongside house numbers. Sprint 0010 applied these upgrades to `buildTransitPrompt`; applying the same pattern here is the symmetrical completion. Aspects are already orb-sorted. What remains: prepend element profiles for both charts, add explicit instruction to name the life area (not just the house number) for each cross-chart aspect.

---

## Quality Bar

"Deep, not shallow" for this sprint means every expanded row or card tells the user something *specific to their chart* — not a generic planet-archetype sentence, but one that names the house or life area and what the current activation means for it.

A brief that reads "Mercury trine Venus brings smooth communication" fails the bar.

A brief that reads "Mercury trine your 7th-house Venus: a clear, direct conversation with someone close is likely to land well this week" passes it.

The test: if you could publish the same brief in a mass-market horoscope column without knowing this user's chart, it fails. If the sentence would only make sense for someone whose planet is in that house, it passes.

Static briefs do not need to be long. Two sentences is sufficient. The GPT paragraph handles depth; the inline briefs handle specificity.

---

## What This Sprint Is NOT

- **Not new features.** No new screens, no new reading types, no new engine calculations. Everything built here is a display or interpretation layer on data that already exists.
- **Not new GPT call types.** No new `callProxy` invocations. Every brief in this sprint is computed client-side from existing data tables.
- **Not a rewrite of interpretation databases.** Do not modify `planetInSign.ts`, `planetInHouse.ts`, `houseThemes.ts`, or `patternInterpretations.ts`. The only net-new interpretation data permitted is synastry-specific relational briefs — which genuinely do not exist anywhere in the codebase and cannot be replaced by reusing the natal-voice database.
- **Not UI redesign.** No changes to layout, color scheme, animation, or page structure. The `AspectRow` expand/collapse pattern is already established — use it, do not reinvent it.
- **Not engine changes.** Calculation engines (`astronomy.ts`, `transits.ts`, `synastry.ts`, `transitTimeline.ts`) should not be touched. The only permitted engine-adjacent changes are prompt text additions to `buildSolarReturnPrompt` and `buildSynastryPrompt` — no type changes, no logic changes.
- **Not retroactive.** Do not re-examine sprints 0001–0009 for open gaps. The scope is what sprint 0010 wired and what it left adjacent but unfinished.
