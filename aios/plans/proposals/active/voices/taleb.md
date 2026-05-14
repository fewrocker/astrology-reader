# Nassim Taleb — Voice Analysis

## Sprint 0011 Focus: Finishing the Sentences — Interpretation Layer Expansion

---

## Preamble

Sprint 0010 fixed a structural fragility I documented: it embedded `natalHouse` into `TransitAspect`, created `getNatalPlanetContext`, wrote `computeTransitAspectBrief`. The plumbing is now real. That is good. But plumbing is not the same as water. Sprint 0011 proposes to open six new valves simultaneously. The question is whether the pressure in the pipes is what anyone thinks it is, and whether the connectors will hold when you apply load to all of them at once.

I will tell you what is fragile, what the assumptions are that nobody has tested, and where the silent failures will live when this sprint ships.

---

## Fragility Audit

### 1. The synastry relational briefs database — the sprint's largest new deliverable — has no oracle for correctness

Sprint 0011 proposes writing "roughly 30–40 entries for high-frequency [synastry] pairs" in a new table. The vision is explicit that the existing `ASPECT_INTERPRETATIONS` uses natal-voice framing and cannot be repurposed here. It is correct about that.

Here is the fragility that follows from it: natal aspect interpretations are verifiable against a shared canon. "Sun conjunct Moon: your will and emotional nature operate as one" is a claim about which there is 80 years of astrological consensus literature, and any astrologer can evaluate it. A synastry brief — "P1 Venus trine P2 Moon: your warmth lands softly on them and they stop waiting to be convinced" — is a creative claim with no single authority. The implementer writes 30–40 of these. They will sound plausible. They will be produced by a developer working from intuition and prior art, not a trained astrologer.

The fragility is not that the entries will be obviously wrong. They will not be obviously wrong. The fragility is that they will be plausible in a way that is uncheckable by any reviewer, any user, and any quality bar the sprint defines. Plausibility is not accuracy. The sprint's own quality bar — "would only make sense for someone whose planet is in that house" — is a bar for transit briefs. It does not apply to synastry cross-chart briefs, which carry no house context at all. The synastry brief for Venus trine Moon will read the same whether P1's Venus is in the 2nd house and P2's Moon is in the 9th, or the reverse. The brief will not be chart-specific in the way the sprint's quality bar demands. It will be planet-pair-specific, which is closer to a magazine horoscope than to personalized astrology.

The sprint vision says "compact, relational, roughly 30–40 entries." What happens to aspect pairs outside those 30–40? The fallback is "aspect-type + planet-archetype phrasing adapted to relational context." But that fallback does not exist yet either. The `ASPECT_BRIEFS` in `transitEvents.ts` are transit-context briefs — they describe a transiting body activating a natal point. Using them in synastry context is the same category error the vision correctly condemns when it says not to use natal self-aspect text. The fallback needs its own relational adaptation. That is a second data-writing task hidden inside the primary one.

---

### 2. The `HouseOverlaySection` brief — "one-to-two sentences using house theme and planet archetype" — produces combinatorial text that no one will read

The vision says: "A one-to-two sentence brief per entry, using the house theme and the planet's archetype, makes this section actually readable."

Read how many entries `houseOverlay.person1InPerson2Houses` produces. Every planet in Person 1's chart falls into one of Person 2's houses. That is 10–11 planets minimum. Person 2's planets in Person 1's houses: another 10–11. Total: 20–22 brief-per-row entries, all visible simultaneously in an expanded section.

The transit aspect rows expanded briefs work because the user taps one row at a time. The expansion is on-demand. The `HouseOverlaySection` as currently implemented in `SynastryPage.tsx` is a table — no expand/collapse per row. If you add a one-to-two sentence brief below each table row, you add 20–22 paragraphs to a section that currently renders 20–22 table rows. The section becomes a scroll wall.

The vision does not mention this. It describes the feature as making the section "readable." But adding 22 undifferentiated interpretation sentences to a flat table does not produce readability — it produces a reading that takes 5 minutes to absorb and makes the important entries (Person 1 Venus in Person 2's 7th) invisible among the unimportant ones (Person 1 Saturn in Person 2's 11th).

The correct interaction model for house overlay briefs is either: (a) per-row expand/collapse, as used in `AspectRow`, or (b) highlight only the traditionally significant placements (Sun, Moon, Venus, Mars, rising ruler in the 1st, 4th, 5th, 7th, 8th) and skip or minimize the rest. Neither is what the vision describes.

If the implementer renders all 22 briefs as flat text, the section becomes an information dump. If they add per-row expand/collapse, they are building more UI than the vision stated. There is no clean path to the stated outcome within the stated scope.

---

### 3. The `elementCompat` function in `synastry.ts` has a sorting bug that silently returns the wrong dominant element for Person 1

Look at this code in `src/engine/synastry.ts` at line 261:

```typescript
const dom1 = (Object.keys(count1) as Element[]).sort((a, b) => count2[b] - count1[a])[0]
```

The sort comparator is `count2[b] - count1[a]`. This is comparing element `b` from `count2` against element `a` from `count1`. This is not a sort by `count1` descending. The correct sort for Person 1's dominant element is `count1[b] - count1[a]`. The comparator as written sorts Person 1's elements by a cross-table comparison that has no sensible meaning. The dominant element returned for Person 1 is effectively random — it is whatever element happens to produce the highest value when you subtract Person 1's count of element `a` from Person 2's count of element `b`.

This bug exists today. It is not a sprint-0011 introduction. But sprint 0011 proposes to add `analyzeElements` output to `buildSynastryPrompt` — which is the correct `analyzeElements` from `src/data/interpretations/index.ts`, not the buggy `elementCompat` in `synastry.ts`. The `buildSynastryPrompt` addition is safe. But the `CompatibilitySection` on `SynastryPage.tsx` displays `elementCompatibility` from `calculateCompatibility`, which calls `elementCompat`, which uses the broken sort. The "Overall Resonance" score bar and the "Elements" text in the compatibility overview are currently wrong for many chart pairs.

The sprint vision does not mention this bug. It will not be fixed in sprint 0011. The sprint will add element analysis to the GPT prompt using correct data (`analyzeElements`), while the UI displays element compatibility using incorrect data (`elementCompat`). The GPT paragraph will describe Fire-Water tension; the compatibility bar will say "Harmonious — Earth and Air elements naturally support each other." Nobody will catch this because both texts are plausible and users do not cross-check compatibility prose against element tables.

The proposal is to fix the sort while touching `synastry.ts` for the prompt additions. Two lines.

---

### 4. The `AspectRow` component's `maxHeight: '6rem'` brief expansion will clip solar return and synastry briefs that are longer than transit briefs

`AspectRow` was designed for transit aspect briefs, which are constrained to 200 characters by the `truncateToLimit` call in `computeTransitAspectBrief`. The expanded brief panel uses `maxHeight: '6rem'`. At the default `text-xs` line height of approximately 16px, 6rem is about 6 lines — enough for 200 characters at normal line width.

Sprint 0011 proposes using `AspectRow` for composite transit aspects in `SynastryTransitPage.tsx`. The brief for a composite transit should name the relationship area being activated — "Saturn pressing into the composite 7th house (partnership and commitment) suggests the relationship itself is being asked to grow up." That sentence is 118 characters — fine. But once you add a second sentence naming the aspect nature, you approach 220–250 characters, which overflows the 200-character truncation.

More importantly: if someone writes the synastry relational briefs without the truncation constraint (the sprint vision does not mention applying the transit truncation function to synastry briefs), a 350-character brief will be clipped by `maxHeight: 6rem` with an invisible overflow. The text is not truncated — it is hidden. The user taps the row, the brief expands, but the last sentence is cut off mid-word because the div stops expanding. There is no scroll, no ellipsis, no indicator that more text exists.

The `maxHeight` of `6rem` is a design assumption that works for 200-character briefs. If sprint 0011 introduces briefs from a new data source written to a different length convention, some briefs will be silently clipped in every expand.

---

### 5. The Solar Return page renders `srChart.planets` without guarding against `unknownTime` — the SR chart always has a computed time, but the natal comparison column assumes the natal chart does too

In `SolarReturnPage.tsx`, the `SRPlanetTable` component looks up natal planets by name to display the "Natal Sign" column:

```typescript
const np = srData.natalChart.planets.find(p => p.name === sp.name)
```

The SR chart is always calculated with a precise UTC time (`calculateSolarReturn` uses `findSolarReturn`), so `srChart.planets` always have valid house data. But `srData.natalChart` is the user's natal chart — and if `unknownTime` is true, the natal chart's house fields are all `0`.

The `SRPlanetTable` currently shows only "Natal Sign" — so the unknownTime case is handled by accident. But sprint 0011 proposes adding SR Sun/Moon house interpretation using `PLANET_IN_HOUSE`. The proposed call would be `PLANET_IN_HOUSE[`Sun_H${srSun.house}`]` where `srSun.house` comes from the SR chart (which has valid houses). This is safe.

The fragility is in the proposed static interpretation layer: "SR Sun house and SR Moon house are the most important static facts on the page." This is correct. But it assumes the implementer will use `srChart.planets` (which always has houses) and not accidentally reach for `natalChart.planets` (which may have house `0`). The two chart references live side-by-side in `srData`. An implementer who writes `natalChart.planets.find(p => p.name === 'Sun')?.house` to show "natal Sun in its house for context" will get house `0` or `undefined` for users without birth time, and `PLANET_IN_HOUSE['Sun_H0']` or `PLANET_IN_HOUSE['Sun_Hundefined']` will silently return `undefined`. The brief disappears without explanation.

This is the same `unknownTime` ghost that haunted sprint 0010. It does not die; it migrates to the next set of lookups.

---

### 6. The `TodayPage` top-transits block uses `getTopActiveTransits(chartData, 3, 8)` — the orb limit is 8, but `AspectRow` receives the full `applying` flag from an aspect that may be barely within orb

`getTopActiveTransits` in `transits.ts` returns the 3 tightest aspects within 8 degrees. Sprint 0011 wants to render these using `AspectRow`, which shows an "applying/separating" badge. This badge is computed from the `applying` field on the `TransitAspect`.

The `applying` detection logic was designed for reading-level aspects (1–3 degrees orb). At 8 degrees, "applying" means the transit planet is moving toward the natal planet but has a week or more before it perfects. An "applying" badge on a Saturn-Moon square at 7.8 degrees is technically correct — Saturn is moving toward the user's Moon — but experientially misleading. The user will interpret "applying" as "happening now." At 7.8 degrees from exact, a slow planet like Saturn may be "applying" for 3–4 months. The badge creates false urgency.

The vision's quality bar says briefs should tell the user "what the current activation means for it." An aspect at 8 degrees orb is not a current activation in any meaningful astrological sense. `getTopActiveTransits` uses orb 8 to ensure the TodayPage has something to show even on quiet days. But the sprint's proposed expand-and-brief treatment was designed for transit reading aspects at 1–4 degree orbs. Applying it without orb context to 8-degree aspects will produce "applying" badges and two-sentence briefs on slow-moving transits that are weeks or months from mattering.

The fix is simple: either reduce `getTopActiveTransits`'s orb to 4–5 degrees when used with `AspectRow`, or display the orb prominently enough that the user can calibrate urgency themselves. The current rendering in `TodayPage` shows the orb on the same line — but the brief expansion, once added, will draw attention away from the orb number. The hierarchy inverts.

---

## What Everyone Is Ignoring

### The compatibility score is a meaningless number that gains credibility as the sprint adds more interpretation around it

The "Overall Resonance" score in `CompatibilitySection` is computed as:

```typescript
const overall = normalize(
  harmoniousCount * 3 + neutralCount * 2 + challengingCount * 1,
  totalAspects * 3,
)
```

This scores purely by aspect count ratios. Two charts with 20 harmonious trines between outer planets (Uranus trine Neptune, Jupiter trine Pluto) will score higher than two charts with 5 tight inner-planet contacts including a challenging Venus-Mars square and a Sun-Moon conjunction. The score ignores orb weighting for the overall number, ignores whether the aspects involve personal or outer planets, and ignores house context entirely.

The score is not astrologically meaningful. Every working astrologer knows that 3 tight inner-planet aspects tell you more about a relationship than 15 loose outer-planet trines. The sprint 0011 work does not touch the scoring function. But it adds relational briefs, house overlay interpretations, and element profiles in GPT — all of which make the surrounding reading richer, more authoritative, and more detailed. A user who reads a rich, specific two-paragraph AI interpretation, plus 22 house overlay entries with briefs, plus 40 synastry aspect briefs — and then sees "Overall Resonance: 82" — will anchor on that number as if it were certified by the same analysis engine that produced the text. The number is not. The number is a simplistic count ratio produced by broken element analysis code.

Sprint 0011 makes the number more dangerous by making the page more credible overall. The number should be removed or clearly labeled as "a rough indicator, not a score." This costs nothing to implement.

### The `SynastryTransitPage` composite transit briefs assume the transit is hitting the *composite* chart — but the engine calculates transit aspects to the composite planets using the same natal aspect machinery as individual chart transits

When `buildCoupleTransitPrompt` sends "Transit Saturn square Composite Moon," it means Saturn is transiting to the composite midpoint Moon position. The brief generated by `computeTransitAspectBrief` will name a house based on the composite Moon's house. But the composite chart's houses are calculated from midpoint angles (lines 211–215 in `synastry.ts`). The midpoint Ascendant is the mean of two people's Ascendants. This is numerically coherent but astrologically contested — many practitioners consider composite houses meaningful only when interpreted as representing the relationship dynamic, not as literal life areas.

The `computeTransitAspectBrief` function will produce: "Saturn pressing on your House of Communication" — as if there is a "you" whose communication house is being pressed. But the composite chart has no "you." The composite Moon is not in anyone's 3rd house. It is in the relationship's 3rd house, which is a fundamentally different interpretive register.

This is not a bug. It is an ontological assumption baked into the brief generation function. The function was written for individual chart transits. Reusing it for composite transits produces grammatically correct but ontologically confused output. "Your House of Communication" applied to a composite planet implies an individual who has that house. Nobody does. The composite relationship has that house.

The brief for composite transit aspects needs a different subject: "the relationship's area of communication" or "your shared 3rd house." This distinction matters when the interpretation surfaces alongside a rich GPT paragraph that uses the correct relational framing. The GPT text will say "this Saturn transit is testing the communication patterns of the relationship." The static brief will say "Saturn pressing on your House of Communication." The tonal register conflict is small enough to be ignored and large enough to erode trust in the static layer.

### The synastry relational brief table will create a hidden dependency between `SynastryPage` and `SynastryTransitPage` through shared data — the "composite transit" briefs need different framing than the "synastry aspect" briefs, but they may accidentally share a lookup

The sprint adds briefs to two separate surfaces: synastry cross-chart aspects in `SynastryPage.tsx`, and composite transit aspects in `SynastryTransitPage.tsx`. The vision describes these as using different logic — synastry briefs use the new relational table, composite transit briefs use `computeTransitAspectBrief` adapted for the composite chart.

But the composite transit brief lookup key is `transitPlanet + aspectType + natalPlanet` (where natalPlanet is the composite planet). If the implementer writes the synastry relational brief table with similar keys — "Venus_trine_Moon" for synastry — and then decides to check for synastry-flavored text in the composite transit path as well, the two contexts will share a data source written for neither.

More likely: the implementer writes two separate lookups that both happen to key off "planet pair + aspect type," and at some future date someone merges them "for cleanliness." At that point, a relational brief written for synastry cross-chart context will appear in the composite transit context and vice versa. The merge will look reasonable. It will produce wrong output.

The correct architecture is a clear semantic label on the data: `SYNASTRY_ASPECT_BRIEFS` (cross-chart, relational, second person directed at Person 1 about Person 2) vs. `COMPOSITE_TRANSIT_BRIEFS` (relationship-as-entity, transit activating the relationship dynamic). Separate tables, separate keys, not interchangeable.

---

## Proposals

### Proposal 1: Fix the `elementCompat` sort bug before shipping the synastry element profile to GPT

The comparator at `synastry.ts:261` is `count2[b] - count1[a]`. This should be `count1[b] - count1[a]`. One character fix. Without it, `buildSynastryPrompt`'s new element profile section will show correct data (from `analyzeElements`) while `CompatibilitySection`'s element compatibility string shows potentially wrong data (from `elementCompat`). The inconsistency will surface when a user reads a GPT paragraph saying "Person 1 is primarily a Fire chart" while the compatibility UI says "Harmonious — Earth and Air." Fix the comparator while the file is open for prompt additions.

**Fragility addressed:** Silent data inconsistency between the compatibility UI label and the GPT element analysis, caused by a sorting bug that has existed since `synastry.ts` was written.

### Proposal 2: Constrain the house overlay brief to high-signal planet-house pairs only — do not render all 22 entries

Write the `HouseOverlaySection` brief logic to only show interpretation text for traditionally significant synastry placements: Sun, Moon, Venus, Mars in the 1st, 4th, 5th, 7th, 8th, and 12th houses of the partner's chart. These are the roughly 6–8 entries that astrologers actually discuss in synastry readings. Skip or minimize the rest (Saturn in partner's 11th gets no brief — it does not need one to be readable).

This reduces the content from 22 undifferentiated entries to 6–8 highlighted ones, making the section navigable without adding expand/collapse UI that the vision explicitly rules out as redesign.

**Fragility addressed:** 22 simultaneous interpretation paragraphs in a flat table produces an information wall that inverts the sprint's stated goal of making the section "readable." High-signal filtering makes the important facts findable.

### Proposal 3: Add a visible orb threshold label to `TodayPage` top transits before applying `AspectRow` with briefs

When `getTopActiveTransits` returns an aspect at 6–8 degrees orb, the `AspectRow` "applying" badge creates false urgency. Add orb-band language to the brief: if `orb > 4`, the brief should open with "building toward" rather than describing an active influence. Alternatively, cap `getTopActiveTransits`'s orb to 4 when used in the TodayPage context. The "Sky Highlights" framing implies now-active influences; 7-degree orbs are not now-active influences.

**Fragility addressed:** "Applying" badge on a 7.8-degree Saturn transit tells the user something is happening today when it is happening over the next three months. The brief expansion will make this misleading framing more visible, not less.

### Proposal 4: Add explicit composite-subject framing to the `computeTransitAspectBrief` call for composite transits

When adapting `AspectRow` for `SynastryTransitPage.tsx`, pass a `subject` parameter or use a distinct brief generator for composite context. The brief should read "this relationship's House of Communication" rather than "your House of Communication." The change is two words in the template string inside `computeTransitAspectBrief` — or an optional `subject` argument that defaults to "your" for individual transits and accepts "the relationship's" for composite transits.

**Fragility addressed:** Ontological subject mismatch between GPT framing (relational) and static brief framing (individual) erodes user trust in the static layer without anyone understanding why.

### Proposal 5: Remove the "Overall Resonance" number or add an honest caveat — do not let it gain credibility from the richer surrounding content

Sprint 0011 will make the synastry page significantly more interpretively rich. The `CompatibilitySection`'s percentage scores will look more authoritative in context. These scores are computed from aspect count ratios without planet weighting, from a broken element sort, and without any consideration of house context. Adding a single line under the score — "This index counts aspect types only. Tighter aspects and inner planet contacts carry more weight in the reading above." — tells the truth without removing the visual anchor users expect.

**Fragility addressed:** A numerically-expressed score displayed alongside rich, specific interpretation text is treated by users as an authoritative summary. When the score is based on a count ratio and partially incorrect element analysis, displaying it without caveat is a credibility liability that grows as the surrounding content improves.

---

## What This Sprint Will Actually Look Like When It Ships

The sprint ships. The synastry rows have expand/collapse briefs. The house overlay section has interpretation text for some or all entries. The Solar Return page has a static SR Sun/Moon paragraph before the GPT block. The TodayPage top transits expand on tap.

What nobody will notice: the compatibility score is still partially wrong due to the broken sort comparator, and nobody will cross-check the "Harmonious — Earth and Air" label against the GPT analysis that correctly identifies one person as a Fire-dominant chart. The two surfaces describe the same charts differently. Users will assume the UI and the GPT agree. They do not.

What users will notice that nobody expected: the house overlay section with 22 brief entries is overwhelming. The user who would have found "Your Venus falls in their 7th house" by reading a short table now has to read through 21 other entries with their own two-sentence interpretations to find the one that matters. The section became longer and denser at the same time it became richer. Length and richness are not the same thing.

What will be caught in QA and fixed: the `maxHeight: 6rem` clipping on longer briefs, once someone writes a 300-character synastry brief and tests the expand behavior.

What will not be caught in QA: the "applying" badge on 7-degree TodayPage transits creating false urgency. QA does not test semantic correctness of astrological framing.

The fragility of this sprint is not in the implementation. The fragility is in the interpretation design — specifically, the assumption that more text is the same as more signal, and that reusing existing patterns in new contexts preserves their meaning. The `AspectRow` pattern is well-built. Using it for synastry cross-chart aspects, composite transits, and TodayPage highlights in the same sprint applies three different semantic contexts to an interface designed for one. Two of those three will work well. One will produce output that sounds right and means something slightly different than intended. I am not certain which one.
