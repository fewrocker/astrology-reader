# Sprint 0026 — Vision

## Sprint Focus

Tarot synthesis depth and quality: push the GPT output beyond competent and toward genuinely personal. The three reading flows now have correct wiring, real transit context, natal house awareness, and working save — but the synthesis text itself is still capable of saying the right things in a generic way. Sprint 0026 is about making the synthesis say the *specific* thing: the one insight that could only belong to this card, this person's chart, this exact sky, this stated intention. The delivery layer (ritual, reveal, save, Discuss) is complete. Now the reading itself must be worth saving.

## Why Now

Three consecutive sprints (0023, 0024, 0025) built the tarot module from nothing: data layer, visual assets, reading flows, GPT handlers, type unification, transit wiring, save plumbing, Discuss context, house awareness. All structural defects are resolved. The module is now in a state where the ceiling on quality is the synthesis prompt and the depth of the interpretive data feeding it — not the plumbing connecting the pieces. The guidelines document (now serving as the active tarot steering spec) calls explicitly for: card-to-card combinations that form a *unified* interpretation rather than sequential mini-readings; position-aware interpretation where the same card means something different in Foundation vs. Outcome; transit connections that are *explicit* rather than appended; and the user's original intention threaded through every layer, not just mentioned in paragraph one. These are not yet fully true of the output. The mechanics are in place to make them true. Sprint 0026 finishes what the guidelines actually asked for.

## Where to Look

### GPT Prompt Layer — Primary Target

**`server/services/gptTarot.ts`** — all four handlers:

- `handleTarotSingleSynthesis` (lines ~513–637): The prompt structure is solid (4 paragraphs, daily/weekly transit sections, intention anchor), but the system prompt gives the model too much latitude to be "poetic" without requiring the card's *position-specific meaning* to anchor every paragraph. There is no instruction forcing the model to name why this card in this exact position changes the meaning. The natal chart section passes Sun, Moon, Ascendant, Venus house, North Node house, Mars house — but the prompt instruction for paragraph 2 says only "mention at least one natal placement," which is weak. The chart ruler is not sent. Dominant modality is absent. The instruction can be tightened to require at least one *element-specific* or *house-specific* connection, not just sign-level name-dropping.

- `handleTarotThreeSynthesis` (lines ~639–): The `getThreeCardSpreadPromptConfig` function writes excellent spread-specific structural instructions, but the per-spread `spreadSummary` and positional instructions are passed once as a header and then the model constructs the synthesis without being required to revisit the spread definition when writing the DIRECTION and ADVICE sections. The pair-dignity signal (pairDignity12, pairDignity23) is computed and available in `ThreeCardSignals` — but the three-synthesis prompt does not instruct the model to build the opening paragraph *from* the card-pair relationship rather than from each card individually. The opening sentence currently describes cards 1 and 2 as a pairing in broad terms; the prompt should force the model to name what the elemental or archetypal *tension* between the two cards is doing to the central question, before card 3 is mentioned.

- `handleTarotCelticSynthesis` (lines ~830–): The most complex handler has the strongest prompt architecture, but "The Constellation" section — described as the most important paragraph — lacks a forcing instruction that prevents it from becoming a summary of the other sections. The model needs explicit direction: "Do not restate what you have already written in other sections. Write the one thing the entire spread is saying that no individual section has yet named." The Astrology Resonance section instruction ("any transit or natal placement you mention must be tied to a specific card") is correct but the check is soft. The natal chart ruler is not passed in any handler.

### Engine Layer — Secondary Target

**`src/engine/tarot.ts`** — `computeInstantInterpretation` and `buildTarotAstroContext`:

The instant interpretation (what appears before GPT synthesis arrives) uses a three-level fallback: transit adaptation → element affinity → baseline astro note. Level 2 (element affinity) is a generic element match; it does not use *position* within the spread. A Tower in the "Foundation" position should produce a different element-affinity note than a Tower in the "Outcome" position — the position label and meaning are available in the spread data (`SPREAD_POSITIONS`) but not passed to `computeInstantInterpretation`. The function signature already accepts `position: SpreadPosition | null` but the element-affinity logic ignores it.

**`src/components/tarot/tarotUtils.ts`** — `buildEngineCtx`:

The engine context currently extracts Moon, Venus, North Node, and Mars house placements. The chart ruler (the ruling planet of the Ascendant sign) is not derived. Chart ruler is one of the most important personal astrology signals for card-to-self bridging — a Scorpio Rising person's chart ruler is Pluto, which fundamentally changes how Death, The Tower, or any Pluto-aspected card lands. This single addition would ripple through all three synthesis handlers.

### Data Layer — Precision Target

**`src/data/tarot/cards.ts`** (78 cards):

Each card's `coreMeaning` and `symbolicTheme` fields are the base from which all three GPT prompts begin. If the text in these fields is only accurate for the upright card, the reversed reading loses specificity at the very first layer. The reversed `coreMeaning` for every card should be reviewed: it should describe the off-axis expression of the card's central principle — not a negation of the upright meaning and not a separate card reading, but the same symbolic field experienced as blocked, internalized, or operating beneath the surface. There are 78 cards; the focus should be Major Arcana (22 cards) where reversals appear most frequently in Celtic Cross readings and carry the most archetypal weight.

**`src/data/tarot/transitAdaptations.ts`** (397+ entries):

The transit adaptations cover key card × planet × condition combinations, but coverage is uneven. Major Arcana have more entries than Minor Arcana. Minor Arcana court cards (Page, Knight, Queen, King) have almost no transit adaptations, yet court cards are the most relational and context-sensitive cards in the deck — they represent people and inner figures, and a transit radically changes whether a court card represents yourself, another person, or an archetype you're meeting. Adding transit adaptations for the 16 court cards (particularly for Saturn, Pluto, and Uranus conditions) would expand the Level 1 hit rate significantly.

### UI — Tertiary Target

**`src/components/tarot/TarotInterpretationPanel.tsx`**:

The instant interpretation panel shows `coreMeaning`, `symbolicTheme`, `emotionalMeaning`, `practicalGuidance`, `reflectionQuestion`, and `numerologyResonance` in a list. It does not show the position's meaning when a spread position is active. A user in a Three-Card reading sees the card's general meaning but not why *this position* shapes it differently. The position label and meaning string are available in `SPREAD_POSITIONS`; showing them alongside the card meaning in the interpretation panel would give the user context before GPT synthesis arrives.

## Quality Bar

The bar for this sprint is: read a synthesis output aloud and ask whether any sentence could have been written for a *different* person drawing *the same card* with *the same intention* but a *different natal chart*. If yes, that sentence is not done. A reading for a Scorpio Rising person asking about career under a Pluto transit should sound categorically different from a reading for an Aries Rising person asking the same question with the same card. The synthesis already approaches this for the transit layer — it must reach it for the natal layer. Similarly: read a Three-Card synthesis and ask whether the opening paragraph names *what cards 1 and 2 are doing to each other* before it describes card 3. If it doesn't, the structural instruction has failed.

The depth criterion from the guidelines applies: "prefer one true thing the user didn't already know over five plausible things they did." Every synthesis revision that removes a generic sentence and replaces it with nothing is an improvement if what remains is more specific. Concision at higher specificity.

## What This Sprint Is NOT

- **Not new reading modes or UI surfaces.** Celtic Cross, Three-Card, and Single are sufficient. Adding a new spread type, a new modality, or a new navigation surface is out of scope.
- **Not save/Discuss/share improvements.** These were the focus of sprint-0025. The mechanics work. Do not re-enter them unless a defect is discovered.
- **Not natal chart page work.** The natal chart reading, transit reading, synastry, and solar return pages have not received attention since sprints 0019–0022. They are stable and not the priority here — the guidelines steer toward tarot depth and the module is mature enough for synthesis quality work.
- **Not transit timeline, advance scoring, or numerology.** These are operational and well-tested. Touching them without a specific defect is scope drift.
- **Not visual polish or animation work.** Card animations, reveal timing, glow choreography, and deck physics were addressed in sprints 0023–0024. The visuals are at the right level for the current synthesis quality — making them more elaborate before the synthesis catches up would be misallocated effort.
- **Not backend infrastructure.** Auth, subscription tiers, rate limiting, and the server proxy are stable.
