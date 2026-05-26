## Type

Feature

## Originated by

All four voices (Jobs, Carmack, Miyazaki, Taleb) flagged this as a high-priority interpretive gap in their Sprint 0025 reviews. The sprint vision names it explicitly as "the single largest remaining gap in interpretive depth." The cross-voice consensus is unusually strong: every analytical lens — product quality, technical correctness, craft, and risk — converges on the same finding.

---

## Problem / Opportunity

### What exists today

`TarotAstroContext` (defined in `src/engine/tarot.ts`, lines 19–37) carries five natal fields extracted from `ChartData`:

- `natalSunSign: ZodiacSign | null`
- `natalMoonSign: ZodiacSign | null`
- `natalAscendantSign: ZodiacSign | null`
- `natalDominantElement: Element | null`
- `natalDominantModality: 'Cardinal' | 'Fixed' | 'Mutable' | null`

These five fields flow from `buildTarotAstroContext` (line 454) into `computeInstantInterpretation`, into the synthesis payload builders in `TarotPage.tsx`, and onward to the GPT handlers in `server/services/gptTarot.ts`.

The three synthesis payload types — `TarotSingleSynthesisPayload`, `TarotThreeSynthesisPayload`, and `TarotCelticSynthesisPayload` — each carry `natalSunSign`, `natalMoonSign`, and `natalAscSign` as plain strings. In the GPT prompt templates, the "This Person's Sky Right Now" section (line 546 for single, line 698 for three-card, line 877 for Celtic) renders this as:

```
Sun in ${natalSunSign}, Moon in ${natalMoonSign}, Ascendant in ${natalAscSign}
```

This is where the natal data ends. There is no house information of any kind.

### What is already available but not extracted

The `ChartData` type (via `PlanetPosition` in `src/engine/types.ts`, line 74) includes a `house: number` field on every planet object. The field is populated by the chart engine — it holds the house number (1–12) for each planet at birth. In `buildTarotAstroContext`, the code already does:

```typescript
natalSunSign = natalChart.planets.find(p => p.name === 'Sun')?.sign ?? null
natalMoonSign = natalChart.planets.find(p => p.name === 'Moon')?.sign ?? null
```

The `house` property is sitting on the same planet object as `sign`. It is read for sign and then discarded. The data needed for house context is already in memory at the extraction site; it is simply never captured.

The server-side transit formatter (`formatTransitSummary` in `gptTarot.ts`, line 397) already includes natal house in transit aspect lines: `natal house ${aspect.natalHouse}`. So the concept of a natal house already appears in the transit context block the GPT prompt receives — but only for transiting planets aspecting natal planets, not for the natal planets' own house placements. The natal Moon's house, for example, is never stated.

### The interpretive gap

The GPT synthesis currently reads: "Sun in Scorpio, Moon in Cancer, Ascendant in Aquarius."

With house data, this same line becomes: "Sun in Scorpio in your 12th house, Moon in Cancer in your 8th house, Ascendant in Aquarius."

These are not equivalent statements. Moon in Cancer describes an emotional signature: sensitivity, protectiveness, intuitive responsiveness. Moon in Cancer in the 8th house names where that sensitivity lives — in the domain of transformation, shared resources, depth psychology, and encounters with endings. A tarot synthesis that says "your Cancer Moon brings deep emotional attunement to this question" when the relevant context is "your 8th house Cancer Moon means your emotional life is organized around precisely the kinds of loss, depth, and transformation that The Tower or Death or the High Priestess invoke" is giving a half-answer.

The same applies across all reading types. When the synthesis connects The Tower to "Moon in Cancer," it is making a sign-level observation that could apply to any of the twelve people born with Moon in Cancer. When it connects The Tower to "Moon in Cancer in the 8th house," it is making a chart-specific observation that applies to far fewer people — and it is the observation that earns the word "personal."

Carmack names this directly: "The sprint vision asks for Moon house, Venus house, and North Node house at minimum. Adding these three fields to `TarotAstroContext` is a straightforward read from `natalChart.planets.find(p => p.name === 'Moon')?.house`."

Jobs frames it as a product gap: "The product currently sends the first version. The natal chart has house data. The planets have `house` properties. Moon in the 8th house is a radically different natal signature than Moon in the 2nd house."

Taleb identifies the structural pattern: "The data is in the natal chart; it just isn't extracted into the context."

Miyazaki does not itemize this gap separately but names the general principle: "The architecture is already generous. The craft is in connecting it all the way through."

---

## Vision

When this feature is complete, a user with Moon in Cancer in the 8th house draws the High Priestess under a Pluto transit. The instant interpretation panel shows: a transit-aware note connecting Pluto's pressure to the 8th house Moon's terrain — depth, the unseen, what is submerged. The GPT synthesis opens with the natal signature named in full: not "Moon in Cancer" but "your 8th house Moon in Cancer." The paragraph that connects the card to the natal chart says something like: "The High Priestess speaks most directly to your 8th house Cancer Moon — the part of you that has always known things through intuition rather than evidence, through the body's quiet knowing rather than stated fact. With Pluto transiting your 7th house and pressing toward that 8th house threshold, the Priestess is not asking you to investigate; she is asking you to trust what you already know, even when you cannot explain it."

Compare this to the current output: "Your Moon in Cancer lends emotional depth to this reading. The High Priestess resonates with Cancerian intuition and interior knowing."

Both sentences are true. Only one is a reading.

The functional difference is specificity that cannot be accidentally generic. A synthesis that says "8th house Moon" cannot then offer guidance about financial partnerships without acknowledging what it means for this person's emotional landscape to be organized around depth and transformation. The house forces the synthesis to be precise about the domain — not just the quality of a placement but where in the life it operates.

The "In Your Sky Now" section of the instant interpretation panel — which already has a distinct left border marking its special status — becomes the first place house context appears. When transit data is live (after the transit-null issue is fixed), the transit aspect lines already include natal house in the transit summary format (`natal house ${aspect.natalHouse}`). The house fields added by this feature complement that: the transit says "Saturn squares your natal Moon in house 8," and the natal context in the prompt says "your natal Moon is in Cancer in house 8." The two pieces of information corroborate each other, and GPT can use them together to say something that neither piece alone enables.

For the user, this feels like the difference between a reading that knows your chart and a reading that knows your chart. The first "knows" is performative — it lists the signs. The second "knows" is specific — it knows where in your life those signs live.

---

## Specifications

**1. Four house fields are added to `TarotAstroContext`.**
When a reading is generated for a user with a complete natal chart, the context object passed into `computeInstantInterpretation` and into synthesis payload builders contains: the natal house number of the Moon, the natal house number of Venus, the natal house number of the North Node, and the natal house number of Mars. Each is a number from 1–12 when the data is available, and null when the chart data does not include house assignments.

**2. The Moon house is the minimum viable field.**
If only one house field is available or correctly computed, it must be the Moon house. Moon house is the most frequently activated natal placement in tarot synthesis (the Moon governs emotional terrain, timing, and intuitive registers, all of which are central to tarot interpretation). Venus house is second priority. North Node house is third. Mars house is fourth. A reading that includes Moon house but not the others is a valid partial delivery; a reading that includes Venus house but not Moon house is not.

**3. House extraction occurs at the same site as sign extraction.**
In `buildTarotAstroContext` (`src/engine/tarot.ts`, line 454), the planet lookup block that currently reads `natalChart.planets.find(p => p.name === 'Moon')?.sign` is extended to also capture `?.house`. The extraction is wrapped in the same existing defensive try/catch that guards sign extraction. A planet missing the `house` field produces null for that house value, not an error.

**4. North Node house extraction uses the correct field name.**
The `ChartData.planets` array may represent North Node as a body named `'NorthNode'`. The extraction must use the name that matches the data (`BodyName` type in `src/engine/types.ts` defines `'NorthNode'` as a valid body name). If the North Node is absent from the chart data, its house is null.

**5. All four house fields flow into `TarotSingleSynthesisPayload`.**
The single-card payload type in `server/services/gptTarot.ts` gains four optional fields: `natalMoonHouse`, `natalVenusHouse`, `natalNorthNodeHouse`, and `natalMarsHouse`, each typed as `number | null`. The payload builder in `SingleReadingFlow` in `TarotPage.tsx` reads these values from `engineCtx` and includes them.

**6. All four house fields flow into `TarotThreeSynthesisPayload`.**
The three-card payload type in `server/services/gptTarot.ts` gains the same four fields with the same types. The payload builder in `ThreeReadingFlow` in `TarotPage.tsx` reads these values from `engineCtx` and includes them.

**7. All four house fields flow into `TarotCelticSynthesisPayload`.**
The Celtic Cross payload type gains the same four fields. The payload builder in `CelticReadingFlow` in `TarotPage.tsx` reads these values from `engineCtx` and includes them.

**8. The "This Person's Sky Right Now" section in the single-card GPT prompt includes house lines.**
The prompt template in `handleTarotSingleSynthesis` currently reads:
```
Sun in ${natalSunSign}, Moon in ${natalMoonSign}, Ascendant in ${natalAscSign}
```
After this feature, the section includes house-aware lines for each non-null house placement. The Moon line becomes: `Moon in ${natalMoonSign}${natalMoonHouse ? ` in your ${natalMoonHouse}th house` : ''}`. The Venus and North Node lines follow the same pattern and appear on separate lines. A null house value produces no house phrase — the line degrades gracefully to the sign-only form.

**9. The "This Person's Sky Right Now" section in the three-card GPT prompt includes the same house lines.**
The prompt template in `handleTarotThreeSynthesis` at line 698 is updated identically to the single-card template. The natal section gains the same Moon, Venus, and North Node house lines using the same null-safe pattern.

**10. The "This Person's Living Sky" section in the Celtic Cross GPT prompt includes the same house lines.**
The prompt template in `handleTarotCelticSynthesis` at line 877 is updated to include house lines in the same format. The Celtic Cross synthesis already receives the most elaborate natal context; house data completes it.

**11. Every house field added to a payload type appears in the corresponding prompt template.**
No house field is added to a payload type and then ignored in the prompt. If a field is present in the payload, it must have a corresponding line in the "Sky" section of the prompt. If a field is removed from a payload, its prompt line is removed with it. This is a consistency rule: the fields and the prompt are co-authored.

**12. The server-side authorized path re-extracts house data from the server-computed natal chart.**
In `handleTarotSingleSynthesis`, `handleTarotThreeSynthesis`, and `handleTarotCelticSynthesis`, when a `userId` is provided, the server re-computes natal chart data via `calculateChart`. The existing server-side re-computation block already re-derives `natalSunSign`, `natalMoonSign`, and `natalAscSign` from the server-computed chart. The re-computation block is extended to also re-derive the four house values from the server-computed chart. The server-side values override the client-supplied values exactly as the sign values do.

**13. When transit context is also live (transit-null issue fixed), the transit aspect lines and the natal house lines reinforce each other.**
The transit summary format already includes `natal house ${aspect.natalHouse}` for transiting aspects. When a transit says "Saturn squares natal Moon (natal house 8)" and the natal context says "Moon in Cancer in your 8th house," GPT can connect them explicitly in synthesis. This is an emergent benefit of having both pieces of information simultaneously, not a new requirement for this feature — but it is the payoff that makes this feature most valuable when the transit-null issue is resolved alongside it.

**14. When house data is unavailable (null for all four fields), the prompts degrade gracefully.**
A user whose chart was computed without house data (e.g., unknown birth time) receives a synthesis with sign-only natal context, identical to current behavior. The prompts contain no placeholder text like "house unknown" or "house N/A" — they simply omit the house phrase. The reading is not degraded in any other way.

**15. The instant interpretation panel does not display house numbers directly.**
House data enriches the GPT synthesis prompts. The `TarotInterpretationPanel.tsx` "In Your Sky Now" section renders `astroConnection.transitInfluence`, `astroConnection.lunarPhaseNote`, and `astroConnection.astroHeadline` from the instant interpretation engine. These are computed strings, not structured fields. This feature does not change what the instant interpretation panel renders; it enriches what GPT receives and therefore what the synthesis says. Surfacing house numbers in the instant interpretation panel UI is out of scope for this feature.

**16. The ordinal form of house numbers is used in all prompt text.**
In prompt templates, house numbers appear as ordinals: "8th house," "1st house," "2nd house," "3rd house," not as bare integers. The ordinal conversion is handled at the prompt string construction site. A helper that converts 1 → "1st", 2 → "2nd", 3 → "3rd", 4–20 → "4th"–"20th" (with correct -th/-st/-nd/-rd suffixes) is defined at the point of use in `gptTarot.ts`.

**17. The feature does not require the transit-null issue to be fixed first.**
These two issues are independent. House data enriches GPT synthesis regardless of whether live transit data is flowing into `buildTarotAstroContext`. A reading with house data and without live transit context is better than a reading without house data and without live transit context. The house fields are extracted from the natal chart, not from transit data, so there is no sequencing dependency.

**18. A reading for a user with Moon in the 8th house in Cancer produces synthesis that references the 8th house.**
This is an observable acceptance check. Draw any Major Arcana card (The Tower, Death, the Moon, the High Priestess) in a single-card reading for a natal chart with Moon in the 8th house. The GPT synthesis paragraph that connects the card to the natal chart must contain a reference to either "8th house" or "house 8" or "eighth house." A synthesis that says only "Moon in Cancer" without any house reference fails this check.

**19. A reading for a user with Venus in the 7th house produces synthesis that references partnership or relationship themes grounded in the 7th house.**
When the card drawn relates to relationships (Two of Cups, The Lovers, Three of Swords, Four of Wands), the natal context paragraph of the synthesis references the Venus house placement. This is an observable acceptance check for the Venus house field. An interpretation of the Two of Cups for a person with Venus in the 7th house that says only "Venus in Libra" without noting the 7th house placement fails this check.

**20. The North Node house is referenced when the card drawn relates to destiny, growth, or karmic themes.**
Cards such as The Wheel of Fortune, The World, The Star, and Judgement invoke collective or karmic registers that the North Node placement illuminates. For a user with North Node in the 9th house drawing The Wheel of Fortune, the synthesis paragraph that connects the natal chart to the card should reference the 9th house North Node. This is an observable acceptance check for the North Node house field.

---

## Out of Scope

This feature does not add house placements for every planet in the natal chart. Sun house, Saturn house, Jupiter house, Mercury house, and Uranus/Neptune/Pluto natal houses are not included. The four fields specified (Moon, Venus, North Node, Mars) are chosen because they are the most frequently activated natal placements in tarot synthesis across emotional, relational, directional, and drive-related card themes. A future feature may extend house coverage to additional planets, but that is a separate proposal.

This feature does not add house cusps to the context. The house placements added here describe which house a natal planet occupies — not the sign on each house cusp. A feature that adds "4th house cusp in Scorpio" or "7th house cusp in Taurus" is a separate scope and requires a different data structure.

This feature does not add progressed house data. The house fields extracted here are natal (birth chart) placements only. Progressed chart houses are out of scope.

This feature does not modify the `TarotInterpretationPanel.tsx` UI. House data flows through the engine context and synthesis payloads to GPT prompts only. No changes to rendered components, section labels, or visual layout are part of this feature.

This feature does not add house-aware transit descriptions to the instant interpretation level (the `buildTransitInfluence` function in `tarot.ts`). The 397+ transit adaptation entries in `TRANSIT_ADAPTATIONS_BY_CARD` are keyed by card ID and planet/condition — not by natal house. Adding house-aware transit adaptations to the engine's instant interpretation layer is a separate feature with significantly larger data scope.

This feature does not gate on the transit-null issue being fixed first. The two issues are independent and can be implemented in any order.

This feature does not modify how the Discuss panel context is constructed. The `discussContext` string in `SingleCardReading.tsx` and `ThreeCardReading.tsx` is a separate concern addressed by the `issue-discuss-context-thin` proposal.

---

## Open Questions

**Q1: Does `ChartData.planets` always include the North Node, and what name is it stored under?**
The `BodyName` type in `src/engine/types.ts` includes `'NorthNode'` as a valid name. The `PLANET_GLYPHS` record includes a `NorthNode` entry. But it is not confirmed whether every chart computed by `calculateChart` includes a North Node entry in the planets array, or whether it is conditionally absent for certain birth configurations. Before implementing North Node extraction, verify that `natalChart.planets.find(p => p.name === 'NorthNode')` returns a result for a representative set of natal charts.

**Q2: For charts with unknown birth time, are house values on planet objects zero, null, or absent?**
`buildTarotAstroContext` already handles the `unknownTime` case for the Ascendant (line 469: `natalChart.angles?.ascendant?.sign ?? null`). Whether `PlanetPosition.house` is set to 0, null, or simply absent for unknown-time charts affects what the extraction code should treat as "no data." Confirm the chart engine's behavior for unknown-time charts before finalizing the null check.

**Q3: Should the server-side authorized path also compute North Node house?**
In the authorized re-computation path (`userId` present), the server re-derives natal signs from the server-computed chart. The extension for house values follows the same pattern. But computing North Node house server-side requires that `calculateChart` returns a planet named `'NorthNode'` with a `house` property — the same question as Q1, but at the server engine level. The client and server chart engines may differ in what bodies they include.

**Q4: Is ordinal suffix generation already available as a shared utility?**
The prompt templates need "8th house," not "8 house." A minimal ordinal converter is straightforward to implement inline in `gptTarot.ts`. Check whether a shared `ordinal(n: number): string` helper already exists elsewhere in the server utilities before writing a new one.

**Q5: Should the Celtic Cross server-side authorized re-computation block also be extended?**
There are two separate `userId` blocks in `handleTarotCelticSynthesis` — one at line 775 and a second at line 803. Carmack identifies this as a bug (duplicate `dailyTransitSummary` / `weeklyTransitSummary` fields in `TarotCelticSynthesisPayload`, flagged at lines 284 vs. 289). Clarify which block is the authoritative re-computation block before adding house extraction to the Celtic Cross handler, to avoid adding house fields to the wrong block or to both blocks redundantly.
