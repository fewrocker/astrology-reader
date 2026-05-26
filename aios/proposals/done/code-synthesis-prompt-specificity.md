# Proposal: code-synthesis-prompt-specificity

**Type:** Code Enhancement
**Originated by:** Jobs, Carmack, Miyazaki

**User guidance:** Prefer one true thing the user didn't already know over five plausible things they did. Every synthesis revision that removes a generic sentence and replaces it with nothing is an improvement if what remains is more specific. Hold a high taste bar — prefer fewer, sharper sentences over verbose ones; prefer concrete imagery over abstractions. Generic, hedging, or pattern-matched language is a defect. If a reading could plausibly apply to any other person on the platform, it is not done. Distill ruthlessly — show only the few connections that actually illuminate this person's question at this moment, said in a way that lands.

---

## Problem / Opportunity

### The "Mention at Least One Natal Placement" instruction is a quantity constraint, not a quality constraint

The single-card handler (`handleTarotSingleSynthesis`) instructs the model in paragraph 2:

> "Mention at least one natal placement and explain why this specific card — its symbolism, element, arcana, and reversal if present — resonates with this person's birth pattern specifically."

The phrase "at least one natal placement" tells the model that the natal data has been acknowledged. What it receives back is sentences like: "With your Moon in Cancer, this card's emotional themes resonate deeply with your innate sensitivity." That sentence is true of any Water card drawn by any Cancer Moon person. It passes the instruction, but it conveys nothing that required knowing this card was drawn. The specification "explain why this specific card resonates" appears in the instruction, but it is grammatically subordinate to the counting requirement — the model satisfies the condition by mentioning the placement and appending a plausible resonance clause, not by finding an actual connection between what this card is and what this placement means.

The same weakness lives in `handleTarotThreeSynthesis` and `handleTarotCelticSynthesis`. The three-synthesis `ASTROLOGY_SYNTHESIS` section asks the model to connect natal placements to cards, but imposes no requirement that the connection be specific to the card drawn. The Celtic handler's `Astrology Resonance` section says "name the sign, transit planet, or aspect that directly amplifies a specific card's meaning" — which is tighter, but "amplifies" still accepts a generic sign-level note-drop as compliance. None of the three handlers require the model to name a *tension, resonance, or complication* that could only exist between this specific card's symbolic field and this specific natal configuration.

### The Constellation section is prohibited from summarizing, but not forced to reveal

The Celtic Cross handler's instruction for The Constellation section says:

> "This paragraph must not be filler, not a rephrasing of other sections — it must say the one thing the whole spread is saying."

What is missing is the negative constraint: without an explicit prohibition against restating what has already been named in The Central Cross, The Roots and the Horizon, The Inner World, and Psychological Dynamics, the model's default behavior is to synthesize those sections — to compress what it has already said into a closing statement. The result reads like an executive summary. The instruction says "the one thing no individual section has yet named," but this operates as aspiration rather than enforcement when no sentence tells the model "if you find yourself referencing anything you have already written, that sentence does not belong here."

A model writing The Constellation after six other named sections has built strong momentum toward summary. Aspiration alone does not break it. A structural prohibition does.

### The Three-Card opening sentence incorporates the pairing but doesn't require it to generate anything

The three-synthesis opening sentence instruction says:

> "This sentence must incorporate the pairing of cards 1 and 2 (their elemental dignity, relational dynamic, or archetypal dialogue) before naming card 3's role."

"Incorporate" is satisfied by a sentence that lists card 1 and card 2 with their elemental labels and notes that they are "opposing" or "harmonious." The model can write: "The elementally opposing Tower (Fire) and Wheel of Fortune (Fire) set the stage for the Hermit (Earth)" — and this meets the requirement. But the pairing has been labeled, not felt. What the pairing between two cards *generates* — the specific tension, the unified symbolic image, the quality of encounter they create when placed together — is not what "incorporate" demands. The opening sentence currently announces the pairing; it should *show what the pairing is doing to the person's question*.

### `natalDominantModality` is computed in `buildTarotAstroContext` and sits on `TarotAstroContext` but is absent from all three synthesis payload types

`computeDominantModality` in `src/engine/tarot.ts` (line 419) computes the person's dominant modality — Cardinal, Fixed, or Mutable — from the natal chart. It is assigned to `natalDominantModality` on the context object (line 483) and returned as part of `TarotAstroContext` (line 543). None of the three synthesis payload types — `TarotSingleSynthesisPayload`, `TarotThreeSynthesisPayload`, or `TarotCelticSynthesisPayload` — include a field for it. None of the three prompt's "This Person's Sky Right Now" (or "This Person's Living Sky") blocks reference it. The field is fully computed and available on the context object but has no path into the synthesis.

Modality is meaningfully different from element. The element tells the model what domain the person operates in (Fire: will, Earth: material, Air: mind, Water: feeling). The modality tells the model *how* the person operates within that domain, and more importantly, how they meet change. A Fixed-dominant person (Scorpio, Taurus, Leo, Aquarius emphasis) has been holding on; The Tower, when it falls for them, is not arriving as a surprise — it is arriving because what they have been holding has reached structural failure. A Cardinal-dominant person (Aries, Cancer, Libra, Capricorn) initiates; the same Tower signals a collapse of something they started. A Mutable-dominant person (Gemini, Virgo, Sagittarius, Pisces) adapts; the Tower is already in the process of being reframed before it finishes falling. These distinctions produce categorically different readings of the same card for the same natal chart. Modality is already computed. It is not reaching the model.

### The intention threading instruction in the Three-Card and Celtic handlers is a counting instruction

The three-synthesis `intentionAnchor` says the intention "must appear by name in at least two distinct sections." The Celtic handler says it "must appear by name in at least two distinct sections." Both of these are presence requirements. A reading where the intention appears in the opening sentence and the advice section as "in relation to your question about your career" has technically satisfied the count. But if both appearances are surface references that do not show how the cards are changing or complicating the person's understanding of their own question, the intention has been footnoted twice, not threaded once.

---

## Desired State

### What specificity looks like as a user-observable output quality

A synthesis that passes the bar contains at least one sentence the reader cannot mentally reassign to a different person drawing the same card with the same intention and a different chart. This is not a demand for obscurity or personal data display — it is a demand that the natal-card connection be *structural*, not additive. The current output adds natal context to a card reading. The desired output uses natal context to locate *where in this person's symbolic architecture the card is landing*. Those are different things.

The test: read a natal-bridge paragraph aloud and ask whether the sentence that names the natal placement would be equally true if a different card had been drawn. If a Cancer Moon sentence would be equally valid under The Star, The Hermit, and The Moon alike, the sentence is not doing the work it was assigned. A sentence that passes the specificity test names *what this card's ruling element, archetype, or orientation does when it meets this person's particular natal configuration* — not what the natal placement means in general, but what the collision between this specific card and this specific natal fact produces that would not have been produced by a different card.

Reversals must be held to the same test. A reversed-card paragraph that would be equally valid if the card were upright has not engaged the reversal — it has acknowledged it and continued. Reversed energy is the same symbolic field operating as resistance, internalization, or pressure from below — the card's central principle, turned inward or blocked. A reversed-card natal bridge should name what it means when that specific quality of off-axis energy meets the natal placement.

### What the Constellation section must feel like

Currently: The Constellation tends to feel like the reading inhaling and summarizing itself. The reader recognizes the threads from the earlier sections. They feel confirmed, not surprised. The paragraph closes what came before rather than opening something new.

Desired: The Constellation should feel like the moment a reader puts down the cards and says the thing they have been circling. Not a summary of what the cards showed individually or in their positions. Not a rephrasing of the Psychological Dynamics or Central Cross. The one sentence that the entire spread has been building toward — the insight that was latent in the pattern as a whole and could not have been named from any single section. This paragraph must be capable of surprising the reader, because it names something that was true before the reading but that the reading is the first to say directly.

The structural mechanism for this: a synthesis where The Constellation could be removed and placed at the end of Psychological Dynamics without any loss belongs to the summary mode and fails the test. A synthesis where The Constellation names something that makes the reader re-read The Roots and the Horizon because they now see what those cards were actually pointing at — that has succeeded.

The prohibition is not stylistic. It is structural: nothing that has already been named in any other section, in any form, belongs in The Constellation. If the model finds itself completing a thought that was begun in The Central Cross, it is writing summary. The Constellation begins where the other sections end.

### What changes about intention threading

Currently: The intention is threaded by reference. "In relation to your question about..." is the recurring structure. The intention appears in the opening and in the guidance section, as required, but as an address rather than as a lens. The cards are read, and then the reading is applied to the intention at the point of connection.

Desired: The intention is the reading surface every paragraph is writing *toward*. Not addressed, but operative. The daily transit paragraph, when connecting Saturn's current position to The Tower's meaning, should end by showing what that specific transit-card relationship means *for what this person came to ask* — not as an addendum, but as the point the paragraph was building toward. The weekly paragraph should close on the question: not "this week the energy develops toward resolution" but "this week the energy develops toward the specific choice you described, and here is what that development looks like."

The difference is audible: in the current mode, the synthesis says things *about* the question. In the desired mode, the synthesis says things *to* the question. The intention is not a label attached to the reading; it is the ground the reading is growing in.

The counting requirement ("must appear in at least two sections") should be understood as a floor, not a ceiling. What matters is not how many times the intention appears, but whether at least one appearance shows the cards *changing the person's understanding of their own question* — complicating it, deepening it, or revealing that it contains a different question underneath. Generic intention references satisfy neither test; a single paragraph that makes the person read their own intention differently satisfies both.

### What `natalDominantModality` enables

With modality reaching the synthesis prompt, the model gains access to a qualitative description of *how this person meets change* — not just what domain they operate in, but the rhythm of their engagement with force. This distinction is most legible in cards that deal with disruption, resistance, and movement: The Tower, The Hanged Man, The Wheel of Fortune, Death, The Chariot, The Devil. For cards that deal with stability, patience, and completion: The World, The Star, The Emperor, Strength, the Ten-of-suit cards.

When the model knows the person is Fixed-dominant, it can write The Tower as arriving into someone who has not been moving — the collapse is not unexpected to the body, only to the mind. When the model knows the person is Cardinal-dominant, The Hanged Man's enforced suspension is not a natural state but a reckoning with the cost of initiating too far forward. When the model knows the person is Mutable-dominant, The Emperor's call for structure lands as foreign instruction rather than natural deepening.

None of these distinctions require inventing new data. They require the model to see the modality field alongside the card and be instructed to connect them when the connection is direct. The modality field is already computed and available on the context object. What the desired state adds is: the field reaches the prompt, and the instruction for the natal bridge paragraph explicitly names modality as a relevant axis when the card's relationship to change and movement is central to its meaning.

The full yield of `natalDominantModality` is not in any single sentence — it is in the aggregate quality of readings over time, where a Fixed-dominant person consistently receives readings that understand they hold on, a Cardinal person consistently receives readings that understand they initiate, and a Mutable person consistently receives readings that understand they adapt. That consistency, over multiple readings, is what makes the product feel like it knows the person rather than knows astrology in general.
