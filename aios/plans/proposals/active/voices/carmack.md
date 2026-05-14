# John Carmack — Voice Analysis: Sprint 0011

Sprint 0010 shipped what sprint 0009 needed to exist: the plumbing. `natalHouse` is now embedded in `TransitAspect`. `getNatalPlanetContext` enforces the `unknownTime` guard at the type level. `AspectRow` is a shared component. `computeTransitAspectBrief` has a three-level fallback chain. The transit reading page and AdvanceTab now actually tell you something. Good. That's done.

Sprint 0011 is the same problem one layer out. The surfaces that were ignored in 0010 have the exact same pattern: data computed, path absent. I've read the code. Here is what I see.

---

## Technical Diagnosis

### Problem 1: `SynastryAspectsSection` Has All the Plumbing Available But Wires Nothing

Look at `SynastryPage.tsx` lines 122–157. The `SynastryAspectsSection` component renders every aspect as a static `<div>` with glyph, symbol, orb, and a nature badge. No expand/collapse. No brief. The `AspectRow` component — the correct abstraction, the one that was extracted precisely for this purpose — is sitting in `src/components/reading/AspectRow.tsx` and is never imported into `SynastryPage.tsx`.

The props `AspectRow` needs are: `transitPlanet`, `natalPlanet`, `aspectType`, `nature`, `symbol`, `orb`, `applying`, `brief`. A `SynastryAspect` has `person1Planet`, `person2Planet`, `type`, `nature`, `symbol`, `orb`, `applying`. That is a 1:1 field mapping with a rename. The mechanical plumbing cost here is maybe 15 lines.

The harder part is the brief. `AspectRow` takes a `brief: string | null`. For transit aspects, `computeTransitAspectBrief` generates the brief using the natal planet's house from the natal chart. Synastry is different — you have two people, two charts, and the brief needs relational framing, not personal-chart framing. The existing `computeTransitAspectBrief` function has the wrong semantic register. Calling it here would produce "Saturn pressing on your House of Career" — but whose Saturn? Whose career house?

This is the genuine work for this surface. You need a brief function with a different shape. The vision document is correct: a thin new table of synastry-specific relational briefs for the high-frequency pairs. Let me characterize the actual engineering requirements:

The table should be keyed by `planet1_aspectType_planet2` (same as `ASPECT_INTERPRETATIONS` in `aspectInterpretations.ts`) but with values that are relational sentences, not personal-chart sentences. "Sun trine Moon: your core drives and their emotional needs flow without friction — you understand each other's rhythms without explanation." That is the register. The `ASPECT_INTERPRETATIONS` database has entries like "Your Sun and Moon operating in harmony..." — first-person singular, personal, not relational. That is why the vision says do not reuse it; do not just change "your" to "their."

For pairs not in the synastry table, the fallback is `ASPECT_BRIEFS` from `transitEvents.ts` with contextual adaptation. That fallback already returns clean short sentences. Passing it through as-is for uncovered pairs is acceptable.

The `applying` field on `SynastryAspect` deserves inspection. Look at the computation in `synastry.ts` lines 86–88:

```ts
const applying = orb < maxOrb * 0.5
```

This is not correct "applying" behavior. Applying means the aspect is getting tighter — i.e., one planet is approaching the other. The actual applying/separating determination requires comparing the current orb to the orb an infinitesimal time later, which requires planetary velocity. This approximation using `orb < maxOrb * 0.5` will produce nonsense results: a tight aspect at 0.3° orb gets `applying = true` even if both planets are moving apart. For synastry charts (which are between two natal charts, not transiting planets), there is no meaningful "applying" concept at all — natal planets are stationary. The field should be dropped from `SynastryAspect` or set to a constant, and `AspectRow` should render synastry rows without the applying/separating badge. Passing a meaningless applying/separating badge to `AspectRow` would display incorrect information with full visual confidence.

**Files:** `SynastryPage.tsx` (replace static rows with `AspectRow`), new `src/data/interpretations/synastryAspectBriefs.ts` (30–40 entries + compute function), `src/engine/synastry.ts` (either fix or remove the `applying` calculation from `SynastryAspect`).

---

### Problem 2: `HouseOverlaySection` Is the Most Underused Surface in the App

`SynastryPage.tsx` lines 159–188. A table. Columns: Planet, In Sign, Falls in House. Nothing else.

"Your Venus falls in their 7th house" is synastry's most emotionally resonant sentence. The 7th house is partnership. Venus is love and attraction. The sentence writes itself: "Person 1's Venus in their 7th house — love and beauty land directly in the partnership space; Person 1 is seen as someone who makes relationships feel beautiful to Person 2."

The data to generate this is already in the codebase:
- `HouseOverlayEntry` has `planet`, `sign`, `house`.
- `HOUSE_THEMES` in `houseThemes.ts` has the house name and theme for every house (12 entries, fully populated).
- The planet archetypes can be inferred from the planet name — Venus = love/values, Mars = drive/desire, Saturn = structure/responsibility, etc.

You do not need a new database. You need a function that takes `(planet: PlanetName, partnerHouse: number)` and returns a two-sentence brief by template. The template is: "[Planet archetype] in [partner]'s [house name] ([house theme]). [One-sentence relational consequence]."

The planet archetype → short noun phrase mapping is about 10 entries. The house theme is already in `HOUSE_THEMES[house - 1].theme`. The relational consequence is where the judgment lives. There are 10 × 12 = 120 combinations but you only need to write for the ones that matter: the inner planets (Sun, Moon, Venus, Mars, Mercury) in all 12 houses = 60 entries, which is tractable. Outer planets can use a generic template that still names the house.

The current `HouseOverlaySection` renders a collapsed `<Section>` by default (no `defaultOpen` prop passed, so it defaults to `false`). That means the most emotionally resonant data in the synastry reading is hidden by default, behind a click, with no preview text to signal its value. If you add the interpretation text, you also need to open it or at least show a preview line beneath the section header.

**Files:** `SynastryPage.tsx` (new inline interpretation rendering in `HouseOverlaySection`), new `src/data/interpretations/synastryHouseOverlayBriefs.ts` (60 focused entries for inner planets, generic template for outer).

---

### Problem 3: `TransitAspectsToComposite` Is the Sprint-0010 State of Transit Aspects, Exactly

`SynastryTransitPage.tsx` lines 33–66. Static rows, no expand/collapse, no briefs. This is what `TransitReadingPage`'s aspect section looked like before `AspectRow` was extracted.

The mechanical fix is straightforward: replace the static `<div>` render loop with `AspectRow` calls. The brief generation should use `computeTransitAspectBrief` from `transitAspectBriefs.ts`, but with the composite chart's planet house as the `natalHouse` argument.

Here is the problem: look at `calculateCompositeChart` in `synastry.ts` lines 188–225. Composite planet house assignments are set to `house: 0` at line 206:

```ts
compositePlanets.push({
  ...zodiac,
  name,
  retrograde: false,
  house: 0, // Will be calculated from composite angles if available
})
```

The comment says "if available" — but the follow-through never happened. Composite house assignments require Placidus house cusps calculated from the composite Ascendant and Midheaven, which means another full `calculateChart` call or a Placidus house cusp calculation from composite angles. This was deferred. The result is that every composite planet has `house: 0`, which means `computeTransitAspectBrief` will always fall through to its generic fallback (the guard at line 112 of `transitAspectBriefs.ts`: `if (!natalHouse || natalHouse < 1 || natalHouse > 12 ...)`).

So the brief for composite transit aspects will always be the generic `ASPECT_BRIEFS` fallback. That is not the worst outcome — a generic but accurate brief is better than nothing — but it is not the house-aware specificity the sprint vision demands. The vision says: "the composite chart's 'natal planet' house tells you which area of the relationship is being activated." That cannot happen while `house: 0` is baked into every composite planet.

There are two paths here: (a) actually compute composite house assignments, which requires deriving 12 house cusps from the composite Ascendant longitude, or (b) accept generic briefs for composite aspects and document the limitation. Option (a) is more correct but touches the engine. Option (b) ships faster and still beats the current nothing.

My recommendation: option (b) for this sprint, with a note that composite house assignments are deferred technical debt. The sprint vision says "no engine changes." Calculating composite houses would require adding a Placidus house-cusp derivation step in `calculateCompositeChart`, which is an engine change. Do not do it in this sprint. Ship the generic brief — it is still better than bare symbols — and flag `house: 0` in the composite planet calculation as a known gap.

**Files:** `SynastryTransitPage.tsx` (replace static rows with `AspectRow` + `computeTransitAspectBrief` calls, import `synastryTransitData` composite chart if needed for planet names).

---

### Problem 4: `TodayPage` Sky Highlights Has Data and No Voice

`TodayPage.tsx` lines 162–192. The "Sky Highlights" card renders three transit aspects as bare rows: glyph + symbol + glyph, with a keyword label from `getAspectKeyword`. No house. No sentence. No expand/collapse.

The fix is direct: use `AspectRow` here. The `chartData` prop is already available on `TodayPage` (it is a component prop, line 36). The `transits` state is already `TransitAspect[]` from `getTopActiveTransits`. The `natalHouse` field is now embedded in `TransitAspect` (sprint 0010, `code-transit-aspect-natal-house-embedding`). `computeTransitAspectBrief` takes those fields and returns a brief.

What changes: instead of the current `<div className="flex items-center justify-between">` render loop, you render `<AspectRow>` components. The `applying` field is available on `TransitAspect`. The brief is computed inline. The `nature` field is there. This is genuinely mechanical — maybe 20 lines changed, nothing new.

One issue: `AspectRow` renders a `cursor-pointer` button and expects to expand. On `TodayPage`, the Sky Highlights section is compact — the whole card is `max-w-2xl` with moderate padding. The expand behavior will push the card height. That is fine — the section header makes room. The only visual concern is that three expandable rows inside a medium-density card can feel crowded if all are expanded simultaneously. That is a design consideration outside the sprint scope. The interaction pattern is correct.

**Files:** `TodayPage.tsx` (replace static aspect rows with `AspectRow` calls, import `AspectRow` and `computeTransitAspectBrief`).

---

### Problem 5: `SolarReturnPage` Reading Tab Has No Static Layer

`SolarReturnPage.tsx` lines 218–240. The Reading tab shows either a `GptSkeleton` or the GPT interpretation. Nothing else.

The `KeyPlacements` component (lines 64–90) renders four mini-cards: ASC, Sun, Moon, MC — glyph + "H{n}" + one-word descriptor. This is the right idea at thumbnail resolution. But a user sitting on the Reading tab, waiting for GPT to load, sees four unlabeled tiles and a skeleton. None of the tiles say anything about what the house means.

The SR Sun house and SR Moon house are the two most information-dense facts in a Solar Return. Sun house = where your identity and vitality will be focused for the year. Moon house = the emotional climate and what you will need to feel secure. The `PLANET_IN_HOUSE` database has exactly these entries for every planet in every house. `getPlanetInHouseInterpretation('Sun', srSun.house)?.detail` returns the full paragraph. That is too much text for the inline brief context. But `getPlanetInHouseInterpretation('Sun', srSun.house)?.brief` returns one line — "Identity expressed through creativity and joy" — which is exactly the right resolution for a pre-GPT static layer.

The implementation is: below `<KeyPlacements>` and above the `GptSkeleton`, render a two-item static card (SR Sun house, SR Moon house) using `brief` from `PLANET_IN_HOUSE`. Two lookups. Two sentences. Done. The card should be visually distinct from the GPT block — lighter styling, "Your Year at a Glance" or no header — so the user understands this is static data, not the GPT reading.

A second issue: `buildSolarReturnPrompt` in `solarReturn.ts` does not include element profile data. Compare to `buildTransitPrompt` after sprint 0010, which now prepends `analyzeElements` output. The SR prompt at line 67 of `solarReturn.ts` starts: `"You are an expert astrologer providing a solar return year-ahead reading..."` and goes directly to natal chart positions. `analyzeElements(natalChart.planets).dominant` is two lines and already exported from `src/data/interpretations/index.ts`. The call is already imported in `transits.ts`; it needs to be imported in `solarReturn.ts` and called once before the prompt body. This is the smallest change in the sprint.

**Files:** `SolarReturnPage.tsx` (add static SR Sun/Moon house brief cards above GPT skeleton), `solarReturn.ts` (add `analyzeElements` call and inject into prompt).

---

### Problem 6: `buildSynastryPrompt` Still Missing Element Profiles for Both Charts

`synastry.ts` lines 444–539. The prompt builds the full chart data for both people, lists all cross-chart aspects sorted by orb, includes house overlays, composite, and compatibility summary. Sprint 0010 added priority instructions and the anti-cliché constraint. That was good.

What is still missing: element profiles for both charts. Look at lines 454–462 for Person 1 and lines 465–472 for Person 2. Each person's planets are listed with house and sign. But the prompt never says "Person 1 is dominant Fire, Person 2 is dominant Earth." A Fire dominant meeting an Earth dominant is a specific dynamic that every competent astrologer leads with. The prompt emits the raw data (all planet signs are there) but leaves the element inference to GPT. GPT will do it, but inconsistently and without the framing that `analyzeElements` provides.

The fix is identical to what was done for the transit prompt: call `analyzeElements(chart1.planets)` and `analyzeElements(chart2.planets)`, insert a summary line per person. Four lines of code. The `analyzeElements` function is already in `src/data/interpretations/index.ts`.

Also: the `buildCoupleTransitPrompt` function (lines 543–615) has no element profiles and no priority instruction. It is structurally similar to `buildSynastryPrompt`. The same two upgrades apply.

**Files:** `synastry.ts` (import `analyzeElements`, add profile lines for both persons in both `buildSynastryPrompt` and `buildCoupleTransitPrompt`).

---

## The Applying/Separating Bug in Synastry

I flagged this above but want to quantify it. In `calculateSynastryAspects` (synastry.ts lines 71–108), the applying calculation:

```ts
const applying = orb < maxOrb * 0.5
```

For a conjuction with `maxOrb = 6 * 0.75 = 4.5°`, this evaluates `applying = true` whenever the orb is less than 2.25°. So any tight conjunction will show "applying" regardless of planetary motion. For a natal-natal synastry comparison, "applying" is semantically meaningless — these are frozen birth charts; nothing is moving toward anything. The badge is cosmetically plausible but technically wrong.

The right fix: remove `applying` from `SynastryAspect`, or set it to a constant `false` (or drop the badge in the render layer). The sprint vision says no engine logic changes. The least-invasive fix is: in `SynastryAspectsSection`, when rendering `AspectRow`, always pass `applying={false}` for synastry rows, and add a prop to `AspectRow` to optionally suppress the applying/separating badge entirely. No badge is more honest than a wrong badge.

---

## What Is Over-Engineered for the Work at Hand

`SynastryPage.tsx` has a `Section` component (lines 16–30) that is a local copy of the same accordion pattern in `SynastryTransitPage.tsx` (lines 17–31). These are byte-for-byte duplicates. Every prop, every className, every inline style. Two files, two components, identical code. This is maintenance debt: the next person to change the accordion behavior will change one and miss the other.

The correct fix is to extract a shared `Section` (or `CollapsibleSection`) component to `src/components/ui/` and import it in both pages. This is a mechanical refactor with zero behavioral change. It does not need to be a sprint task — it can be done incidentally during the aspect row wiring, since both files will be open anyway. The test is: if the animation behavior changes in `SynastryPage.tsx`'s `Section`, does `SynastryTransitPage.tsx` get the update? Right now, no. That is the bug waiting to happen.

---

## What Is Under-Engineered for the Work at Hand

The `HouseOverlaySection` in `SynastryPage.tsx` uses an HTML `<table>`. Three columns: Planet, In Sign, Falls in House. When you add interpretation text to each row, it won't fit in a table row — interpretation text is 1–2 sentences that needs to wrap and breathe. The current table layout will fight the interpretation text.

The right structure for planet-in-house overlay entries is an expand/collapse card pattern, like `AspectRow` but for house entries: the header row shows planet + sign + house number, the expanded area shows the brief. The current table needs to become a card list before interpretation text can be added. This is not a big structural change — it is replacing `<table><tbody><tr>` with `<div>` stacks — but it should be done intentionally rather than bolted onto the existing table structure.

---

## Concrete Proposals for Sprint 0011

**Proposal 1: Synastry Aspect Row Briefs**

New file: `src/data/interpretations/synastryAspectBriefs.ts`. Key format: `${planet1}_${aspectType}_${planet2}` (same as `ASPECT_INTERPRETATIONS` but relational register). Approximately 35 entries covering: Sun/Moon/Venus/Mars cross-pairs in conjunction, trine, square, sextile, opposition. Fallback to `ASPECT_BRIEFS[aspectType][person1Planet]` for uncovered pairs. In `SynastryPage.tsx`, replace the static aspect row render loop with `AspectRow` calls. Pass the computed brief as the `brief` prop. Pass `applying={false}` and suppress the applying/separating badge (synastry aspects are natal-natal; the badge is meaningless). New compute function `computeSynastryAspectBrief(person1Planet, aspectType, person2Planet, nature): string`.

**Proposal 2: House Overlay Interpretation Layer**

New file: `src/data/interpretations/synastryHouseOverlayBriefs.ts`. Keys: `${planet}_H${house}` — 60 entries for inner planets (Sun, Moon, Venus, Mars, Mercury) × 12 houses. Outer planets use a generic template. In `SynastryPage.tsx`, rework `HouseOverlaySection` from a table to an expand/collapse card list. Each card: header row (planet + sign + house number), expanded area (two-sentence relational brief). Default open for the top two or three entries; collapsed for the rest.

**Proposal 3: `TodayPage` Top Transits with AspectRow**

In `TodayPage.tsx`, replace the Sky Highlights loop with `AspectRow` imports. `transits` is already `TransitAspect[]` with `natalHouse` embedded. Call `computeTransitAspectBrief` for each. No new data. No new files. Pure wiring.

**Proposal 4: Solar Return Static Brief + Prompt Element Profile**

In `SolarReturnPage.tsx`, add a "Year at a Glance" static card between `KeyPlacements` and the GPT skeleton. Pull SR Sun house and SR Moon house from `srData.srChart.planets`. Look up `getPlanetInHouseInterpretation('Sun', srSun.house)?.brief` and same for Moon. Render two labeled sentences. In `solarReturn.ts`, add `analyzeElements` import and inject the dominant element line into the prompt body before the instructions section. Four lines of new code in the engine file; no type changes.

**Proposal 5: `SynastryTransitPage` Aspect Rows + `buildSynastryPrompt` Element Profiles**

In `SynastryTransitPage.tsx`, replace the `TransitAspectsToComposite` static loop with `AspectRow` calls. Brief will be generic (composite house = 0, so `computeTransitAspectBrief` falls to the `ASPECT_BRIEFS` fallback — document this). In `synastry.ts`, add `analyzeElements` calls for both charts in `buildSynastryPrompt` and `buildCoupleTransitPrompt`. Four lines each. Extract the duplicate `Section` component from `SynastryTransitPage.tsx` and `SynastryPage.tsx` into `src/components/ui/CollapsibleSection.tsx` while both files are open.

---

## What Not to Touch

`computeTransitAspectBrief` is correct. Do not extend it for synastry use — its assumptions about "natal planet in house" are wrong for the synastry context. Write a separate function with the relational register.

`ASPECT_INTERPRETATIONS` in `aspectInterpretations.ts` should not be modified. The entries there are first-person-singular natal readings. That is the right register for the natal chart page. The synastry brief table is a new, separate file.

`planetInHouse.ts` entries are correct for SR static interpretation lookups. Do not rewrite them; the `brief` field at 5–10 words is exactly the right length for the static SR card.

The `applying` calculation bug in `calculateSynastryAspects` should not be fixed by changing the engine calculation. The correct fix is to suppress the badge at the render layer. Keep the engine change minimal.

---

## The Single Most Important Observation

The `AspectRow` component was extracted in sprint 0010 to be the shared abstraction for every aspect row in the app. As of sprint 0010, it is used in exactly two places: `TransitReadingPage.tsx` and `AdvanceTab.tsx`. It is not used in `SynastryPage.tsx`, `SynastryTransitPage.tsx`, or `TodayPage.tsx`. The whole value of extracting a shared component is that it creates a single place to add behavior — if you add expand/collapse animation, or keyboard navigation, or accessibility attributes to `AspectRow`, every surface gets it. Right now the synastry and today surfaces have their own ad-hoc row implementations that will diverge over time. Sprint 0011's most structural contribution is completing the `AspectRow` rollout to the three remaining surfaces. Everything else is content.
