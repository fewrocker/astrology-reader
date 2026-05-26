**Type:** Feature
**Originated by:** Jobs, Carmack, Miyazaki, Taleb

**User guidance:** Prefer one true thing the user didn't already know over five plausible things they did. Every synthesis output must pass the test: could this sentence have been written for a different person drawing the same card with the same intention but a different natal chart? If yes, it is not done.

---

## Problem / Opportunity

Every tarot synthesis handler — `handleTarotSingleSynthesis`, `handleTarotThreeSynthesis`, `handleTarotCelticSynthesis` in `server/services/gptTarot.ts` — receives `natalAscSign` as part of its payload but never derives the chart ruler from it. The natal context block sent to GPT in all three handlers currently contains Sun sign, Moon sign, Ascendant sign, and four house placements. The chart ruler — the planetary lord of the Ascendant sign — is absent from every prompt.

This omission has a measurable cost: GPT receives three signs and four house numbers, which is enough to produce synthesis that sounds natal-aware but isn't truly personal. A Scorpio Rising person and an Aries Rising person can draw the same card under the same transit and receive synthesis that is structurally identical, with only the sign names swapped. The chart ruler is the single data point that would change this: it names the planet that most directly governs the person's life direction and self-expression, and that planet has a direct symbolic relationship to the card being read.

The derivation is fully deterministic. `natalAscendantSign` is already present on `TarotAstroContext` (line 22 of `src/engine/tarot.ts`), populated in `buildTarotAstroContext` at line 481. `buildEngineCtx` in `src/components/tarot/tarotUtils.ts` calls `buildTarotAstroContext` and returns the context — but `chartRulerPlanet` does not exist on `TarotAstroContext`, so it never reaches the synthesis payloads or the prompts.

Consequently, the prompt instruction "Mention at least one natal placement and explain why this specific card resonates with this person's birth pattern" (paragraph 2 of the single-card handler, line ~614) has no mechanism to produce a planet-level bridge between the card's symbolism and the person's core life orientation. The instruction accepts name-dropping as compliance. A Moon-in-Cancer person gets told their Moon finds deep soil in Water cards — which is true for every Moon-in-Cancer person regardless of which card they drew. The chart ruler would change this: it is not a sign-level observation but a planet-level identity statement, and its relationship to the drawn card's ruling planet or element can be made specific in a way that sign name-dropping cannot.

The sprint-0026 vision identifies this gap directly (lines 29–31): "The chart ruler is not derived. Chart ruler is one of the most important personal astrology signals for card-to-self bridging." All four reviewing voices — Jobs, Carmack, Miyazaki, Taleb — name the chart ruler omission as the single highest-leverage missing data point in the current system.

---

## Vision

A Scorpio Rising person draws Death reversed in the Outcome position of a Celtic Cross, asking whether to leave a long relationship. The synthesis opens by naming Pluto as their chart ruler — and explains not that Pluto is transiting something, but that Pluto governs this person's entire life arc. Death reversed, for them, is not a card about something happening to them from outside; it is a card speaking directly to the domain their chart has always lived inside. The synthesis names this explicitly. It says something the person has not been told in any previous reading, because no previous reading knew what their chart ruler was.

When the same reading is done for a Gemini Rising person asking the same question, the synthesis is categorically different. Mercury, their chart ruler, meets Death reversed in an entirely different register — the card's theme of incomplete transformation intersects with Mercury's domain of how we name and understand things. The reading is still about the relationship question, still about Death reversed, still about the same transits. But the paragraph that connects the card to the natal chart says something that could not have been written for the Scorpio Rising person.

This is what the feature delivers: a synthesis that earns the word "personal" at the planet level, not just the sign level. The chart ruler becomes a lens — present and active throughout the natal connection paragraph in each synthesis, not mentioned as an afterthought but used as the organizing principle through which the card's meaning lands differently for this person than for anyone else.

The experience for the user: they read a paragraph in the synthesis and encounter their own astrological signature — not as a data point cited for completeness, but as the specific reason this card, right now, means what it means for them. They feel recognized in a way that generic natal references do not produce. One sentence stops them.

---

## Specifications

**1. Chart ruler derivation — the lookup table**

The system must support a canonical mapping from each of the twelve zodiac signs to its ruling planet. The mapping uses modern rulerships as primary: Aries → Mars, Taurus → Venus, Gemini → Mercury, Cancer → Moon, Leo → Sun, Virgo → Mercury, Libra → Venus, Scorpio → Pluto, Sagittarius → Jupiter, Capricorn → Saturn, Aquarius → Uranus, Pisces → Neptune. The mapping must be a single authoritative source — not duplicated across client and server. Every sign must have exactly one ruling planet in the primary lookup.

**2. `TarotAstroContext` must carry `chartRulerPlanet`**

The `TarotAstroContext` interface (defined in `src/engine/tarot.ts`) must include a new field: `chartRulerPlanet` of type `string | null`. The value is derived from `natalAscendantSign` using the canonical rulership mapping. When `natalAscendantSign` is null — which occurs for users without birth time — `chartRulerPlanet` must be null. No partial derivation, no fallback guessing.

**3. `buildTarotAstroContext` must populate `chartRulerPlanet`**

The function `buildTarotAstroContext` in `src/engine/tarot.ts` is the sole origin point for `TarotAstroContext` values. It must derive `chartRulerPlanet` from the already-extracted `natalAscendantSign` using the canonical rulership lookup and assign it to the returned context object. The derivation must occur inside the same try/catch block that protects the other natal sign extractions, defaulting to null on any error.

**4. `buildEngineCtx` requires no changes — context flows through unchanged**

`buildEngineCtx` in `src/components/tarot/tarotUtils.ts` delegates entirely to `buildTarotAstroContext`. Once `buildTarotAstroContext` populates `chartRulerPlanet`, the value is available to all reading flow components that call `buildEngineCtx` without any changes to `buildEngineCtx` itself.

**5. `TarotSingleSynthesisPayload` must include `chartRulerPlanet`**

The payload type `TarotSingleSynthesisPayload` in `server/services/gptTarot.ts` must include a `chartRulerPlanet: string | null` field. The single-card reading flow that constructs and submits this payload must populate the field from the engine context. The server-side handler `handleTarotSingleSynthesis` must use the field when constructing the "This Person's Sky Right Now" natal context block in the prompt.

**6. `TarotThreeSynthesisPayload` must include `chartRulerPlanet`**

The payload type `TarotThreeSynthesisPayload` must include `chartRulerPlanet: string | null`. The three-card reading flow must populate it. `handleTarotThreeSynthesis` must include it in the "This Person's Sky Right Now" block. The placement in the prompt must be at the same level of prominence as the existing Sun/Moon/Ascendant line — not buried in the optional fields below.

**7. `TarotCelticSynthesisPayload` must include `chartRulerPlanet`**

The payload type `TarotCelticSynthesisPayload` must include `chartRulerPlanet: string | null`. The Celtic Cross reading flow must populate it. `handleTarotCelticSynthesis` must include it in the "This Person's Living Sky" block, rendered alongside Sun, Moon, and Ascendant — not as an afterthought after the house placements.

**8. The server-side auth path must re-derive `chartRulerPlanet` from the server-computed chart**

Each synthesis handler contains a `if (userId)` block that recomputes natal data from the server-side chart engine, overriding client-supplied values for security. In each of the three handlers, when `natalAscSign` is re-derived from the server-computed `natalChart.angles?.ascendant?.sign`, the `chartRulerPlanet` must also be re-derived using the same canonical lookup applied to the server-authoritative sign. The client-supplied `chartRulerPlanet` must not be trusted after the server re-derives the ascendant.

**9. The natal connection prompt instruction must change from quantity to relationship**

The current instruction in `handleTarotSingleSynthesis` paragraph 2 — "Mention at least one natal placement and explain why this specific card resonates with this person's birth pattern specifically" — must be replaced with an instruction that requires a relationship between the card's symbolism and the chart ruler. The replacement instruction must: (a) require GPT to name the chart ruler when it is present, (b) require GPT to describe the relationship between the card's ruling planet or element and the chart ruler, and (c) prohibit sentences that would be equally true if a different card had been drawn. A sentence produced by this instruction must be verifiably card-specific, not sign-level-generic.

**10. The same instruction quality change must apply to all three synthesis handlers**

The natal connection language in `handleTarotThreeSynthesis` (`ASTROLOGY_SYNTHESIS` section) and `handleTarotCelticSynthesis` (`Astrology Resonance` section) currently uses equivalent "mention natal placements" language. Both must be updated to require the chart ruler connection where available. In the three-card handler, at least one sentence in `ASTROLOGY_SYNTHESIS` must draw on the chart ruler's relationship to one of the three drawn cards. In the Celtic Cross handler, the `Astrology Resonance` section must treat the chart ruler as a primary natal signal — at least as prominent as any sign-level reference.

**11. Null-safety at every layer**

When `chartRulerPlanet` is null — because `natalAscendantSign` was unavailable, most commonly for users without birth time — every downstream consumer must handle the null gracefully. In the prompt construction, a null `chartRulerPlanet` must produce no chart ruler line in the natal context block (not an empty line, not a placeholder). The GPT instruction referencing the chart ruler must be conditioned on the value being present — the instruction block must read "If the chart ruler is provided: [instruction]" or equivalent. Under no condition should a null chart ruler produce an instruction to the model to guess or infer a ruling planet.

**12. The chart ruler's relationship to the card's ruling planet must be explicitly available to the prompt**

Each drawn card already carries a `rulingPlanet` field (available via `TarotCardPayload`). When the prompt is constructed, the relationship between the card's `rulingPlanet` and the person's `chartRulerPlanet` must be made explicit in the natal context block — not left implicit for GPT to infer. Specifically: when the card's ruling planet and the chart ruler are the same planet, the prompt must state this conjunction explicitly (e.g., "Chart ruler: Pluto — same as this card's ruling planet"). When they are different planets, the prompt need only state the chart ruler by name; the model's symbolic vocabulary is sufficient to work with the relationship. The same-planet case is the highest-yield signal and must not be left for the model to notice on its own.

**13. The instant interpretation (`computeInstantInterpretation`) must not be changed by this feature**

The instant interpretation engine (`buildTransitInfluence`, `buildElementResonanceNote`, `buildAstroHeadline` in `src/engine/tarot.ts`) operates client-side before GPT synthesis arrives. These functions do not produce prose synthesis — they produce structured fields (`transitInfluence`, `elementResonanceNote`, `astroHeadline`) that are then forwarded to the GPT prompt as pre-computed signals. The chart ruler belongs in the GPT synthesis layer. The instant interpretation layer must not be modified as part of this feature; adding chart ruler logic to the pre-synthesis layer would duplicate concern and create two points of chart ruler interpretation to maintain.

**14. `natalDominantModality` must also be threaded into all three payloads as a companion addition**

`natalDominantModality` ('Cardinal', 'Fixed', or 'Mutable') is already computed by `computeDominantModality` in `src/engine/tarot.ts` and stored on `TarotAstroContext` (line 24). It is not currently included in any of the three synthesis payload types. Since the prompt changes for chart ruler require touching all three payload types and all three prompt construction blocks, `natalDominantModality` must be added to all three payloads and included in the "This Person's Sky Right Now" block in the same pass. The two fields — chart ruler and dominant modality — address related gaps (what planet governs this person; what mode their nature operates in) and belong in the same prompt block. Threading one without the other leaves a gap that a second pass would need to close.

**15. The canonical rulership lookup must produce the same value client-side and server-side**

The `buildTarotAstroContext` function is called client-side (through `buildEngineCtx`). The server-side handlers re-derive natal data independently. The chart ruler lookup must be defined as a single data constant — not duplicated logic — in a location that both compilation contexts can import. If the compilation boundary prevents sharing a single file, the lookup must exist in two places but the constant structure (the same twelve entries, the same planet assignments) must be identical, and this must be enforced the same way the `formatTransitSummary` duplication is currently handled: with explicit documentation of the duplication and the requirement for lockstep maintenance. Divergence between client and server chart ruler values for the same sign would be a silent correctness failure.

---

## Out of Scope

- **Traditional versus modern rulerships.** The system uses modern rulerships exclusively (Pluto for Scorpio, Uranus for Aquarius, Neptune for Pisces). Traditional rulerships (Mars for Scorpio, Saturn for Aquarius, Jupiter for Pisces) are not within scope of this feature. The single-rulership model is simpler and sufficient for the synthesis use case.

- **Chart ruler house placement.** The chart ruler's house position (which house in the natal chart the ruling planet occupies) would deepen the signal further, but requires a different lookup — the planet's house, not its sign. This is a separate addition and is not part of this feature.

- **Chart ruler aspects.** Natal aspects to the chart ruler (conjunctions, oppositions, etc.) are significantly more complex to compute and represent. Out of scope.

- **Chart ruler in the instant interpretation panel.** The `TarotInterpretationPanel.tsx` pre-synthesis display is not the target of this feature. The chart ruler connection is a GPT synthesis quality improvement, not a UI display addition.

- **Dominant modality prompt instruction changes.** Adding `natalDominantModality` to the payloads (spec 14) includes rendering it in the prompt block, but does not include writing new modality-specific synthesis instructions. The field's presence in the prompt provides the model with the information; crafting elaborate modality-specific instructions is a separate prompt authoring task.

- **Transit adaptation data additions.** Court card transit adaptations and the `buildTransitInfluence` position-awareness changes identified in the sprint-0026 vision are distinct tasks. They share the sprint but not this proposal.

- **Celtic Cross "Constellation" section negative constraint.** The prompt instruction improvement for the Constellation section is a separate prompt authoring task, not part of the chart ruler feature.

---

## Open Questions

**Q1: Should the chart ruler be presented to the user in any UI element, or only within the GPT prompt?**
The current proposal scope is limited to the GPT synthesis layer. If there is appetite for displaying the chart ruler as a labeled piece of natal context in the reading UI (e.g., in a "Your Birth Imprint" section alongside Sun/Moon/Ascendant), that would be a UI feature addition requiring its own proposal.

**Q2: What is the correct behavior when a user has an unknown birth time?**
Unknown birth time produces an Ascendant of 0° Aries by convention in many chart systems, but the application sets `natalAscendantSign` to null (see `buildTarotAstroContext` line ~481 conditional). The proposal specifies that null ascendant → null chart ruler → no chart ruler in prompt. Is this the right silent behavior, or should the synthesis instruction acknowledge that the chart ruler is unavailable for this user and invite them to set their birth time?

**Q3: Should the same-planet case (card ruling planet = chart ruler) be treated as a special section in the prompt, or as a conditional modifier within the existing natal paragraph instruction?**
Spec 12 requires the conjunction to be stated explicitly in the prompt data block. Whether it warrants a separate instruction block or is handled as a conditional modifier in paragraph 2 is a prompt authoring decision. The impact of the card's ruling planet equaling the chart ruler is high enough that it may warrant its own instruction — "when you see this marker, the reading has a specific kind of personal resonance that must be named." This is unresolved.
