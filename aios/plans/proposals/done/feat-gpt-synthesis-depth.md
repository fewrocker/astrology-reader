# feat-gpt-synthesis-depth

**Type:** Feature

**Originated by:** Jobs, Carmack (technical review), sprint-0024 guidelines (explicit requirement)

---

## User Guidance

n/a

---

## Problem / Opportunity

The GPT synthesis layer across all three reading types is structurally sound but interpretively shallow in two specific and well-documented ways.

**Card-combination analysis is absent.** Every card in a reading is currently treated as a self-contained mini-reading. The three-card synthesis sends pre-computed structural signals — element distribution, dominant arcana, reversal count, whether a numerical progression is present — but those signals are aggregate summaries, not relational statements. The engine knows each card's element, but it does not compute whether adjacent cards are elementally harmonious or opposed according to classical elemental dignity rules (Fire supports Air; Water supports Earth; Fire and Water oppose; Air and Earth oppose). The GPT prompt receives the element label of each card and is left to derive relationships on its own, which it does inconsistently. More concretely: the three-card prompt instructs GPT to produce an `OPENING_SENTENCE` naming all three cards "as a single symbolic statement — the constellation they form, not a list," but the prompt gives GPT no pre-computed signal about what cards 1 and 2 are saying *as a pair* before card 3 arrives. The sprint vision is explicit: "a three-card reading synthesis must include one explicit statement about what cards 1 and 2 together are saying as a pair before addressing card 3's direction." No such pairing signal is computed or passed. The Celtic Cross synthesis is worse: the ten-card prompt has no structural signals block at all — no element distribution, no reversal count, no arcana weight, no court-card presence indicator. The `computeThreeCardSynthesis` function exists for three-card spreads but has no Celtic equivalent, and what it does compute (`fireWaterTension: boolean`, aggregate element counts) stops short of elemental dignity between specific adjacent cards, court-card pair dynamics, or Major/Minor dialogue across positions.

**Intention threading is a single header line and then silence.** In every reading type, `userIntention` is placed at the top of the GPT prompt as one sentence — "This reading was drawn with the intention: …" — and then never referenced again. The prompt does not instruct the model to return to the stated intention in subsequent chapters or sections. The `adaptInterpretationToPosition` function in `src/engine/tarot.ts` is position-aware and spread-type-aware, but it has no intention parameter and cannot bias its framing toward the user's question. The Discuss context builder in `gptInterpretation.ts` includes the intention in the context block, but the system prompt for `handleTarotDiscuss` does not explicitly instruct the model to anchor follow-up responses to it. The result is that the user's own words disappear after the first line, and the reading settles into generic symbolic language that could describe anyone's situation. The guidelines state that "the reading must also be anchored to what the user came to explore — their original question, the area of life they selected, the emotional charge behind the draw — and that intent should be threaded explicitly through the interpretation, the GPT prompt payload, the chapter framing, and the Discuss follow-ups." Currently, only the payload criterion is partially satisfied.

These two gaps are connected. A reading that treats each card separately and ignores the user's question after line one cannot produce the feeling the guidelines name as the target: recognition. It produces information delivery instead.

---

## Vision

The user types a question they haven't been able to say out loud to anyone. They draw three cards. When the synthesis loads, the opening sentence names what those first two cards are doing together — the tension between them, the unified image they form — before the third card arrives as resolution or complication. The language of that sentence refers, unmistakably, to the weight of their actual question. Not "relationship dynamics" as an abstract label. Something that names the specific quality of the thing they came with.

By the time they reach the advice section, two things have happened: they have seen card-to-card relationships described as real relationships — this element pressing against that element, this court card meeting that archetype — and they have seen their question returned to at least twice, each time from a different angle, each time sharpening rather than repeating.

In a Celtic Cross, the ten cards do not arrive as ten separate stops on a tour. The synthesis opens with a paragraph that reads the whole field — names the elemental weight of the spread, identifies the court-card or Major-Minor dynamic that runs through it, and anchors all of it to what the person came to explore. When the user reads "your question about X sits at the center of a Water-heavy spread where two court cards face each other across the cross," they understand immediately that the reading saw them. That is the feeling that makes someone return and makes someone tell a friend.

In the Discuss flow, the user's original intention stays present. When they ask a follow-up question, the response treats the intention as a thread running through the conversation, not as a context line that was set at the start and then forgotten.

---

## Specifications

### Card-combination analysis — three-card reading

1. Before the three-card synthesis is sent to GPT, the system must compute and pass an explicit elemental dignity assessment for each adjacent card pair: whether the two cards are elementally harmonious, opposed, or neutral according to classical elemental dignity rules (Fire–Air harmonious; Water–Earth harmonious; Fire–Water opposing; Air–Earth opposing; same element resonant; cases involving elementless cards neutral).

2. The opening section of the three-card GPT synthesis must include one statement that names cards 1 and 2 specifically as a pair — describing the image or tension they form together — before card 3 is introduced as direction, resolution, or complication. This pairing statement must be derived from the pre-computed elemental dignity and position roles, not left to the model's discretion.

3. When both cards 1 and 2 are court cards, the synthesis must name their relational dynamic explicitly — whether they face, oppose, or mirror each other — as part of the opening constellation framing.

4. When cards 1 and 2 are from different arcana tiers (one Major, one Minor), the synthesis must acknowledge the asymmetry: the Major card sets the archetypal register and the Minor card localizes it in everyday reality, and this dialogue must be named as part of the pairing description.

5. The numeral progression signal currently passed as a formatted string must be replaced with a directional signal: whether the sequence of card numbers across the three positions is ascending, descending, or non-sequential, and whether consecutive cards differ by one (adjacent in the same suit or numbered sequence). This enables the synthesis to say "the numbers move from higher to lower — an unwinding or resolution arc" rather than having to guess from raw card names.

### Card-combination analysis — Celtic Cross

6. Before the Celtic Cross synthesis is sent to GPT, the system must compute and pass a structural signals block analogous to the three-card signals block, including: Major Arcana count and weight category, total reversed count and reversal weight category, dominant element if any, presence of court cards and how many, presence of The Fool or The World, and an elemental dignity assessment for the specific card pair in positions 1 and 2 (the Present card and the Crossing card).

7. The Celtic synthesis must include a section that explicitly addresses the positions 1 and 2 pairing before any other positional analysis. This section must name the unified image the two cards form together — what tension, paradox, or dynamic is present at the heart of the spread — and relate it to the user's stated intention.

8. When the Celtic spread contains three or more Major Arcana cards, the synthesis must acknowledge the archetypal weight and state clearly that the spread is operating at the level of fundamental life forces, not day-to-day circumstance.

9. When multiple court cards appear in a Celtic Cross, the synthesis must name their collective dynamic — the relational cast or inner council present in the reading — as part of the psychological analysis section.

10. The elemental composition of the ten-card spread must be described not only as a distribution count but as a quality of field: what element dominates, what element is absent, and what that absence or dominance means for the reading's emotional register.

### Intention threading — all reading types

11. In every reading type, the user's stated intention must appear by name — quoted or closely paraphrased — in at least two distinct sections of the GPT synthesis output, not only in the opening header. The model must be explicitly instructed to return to the intention at a minimum when naming the central tension and when delivering practical guidance or reflection prompts.

12. When no intention is stated, the synthesis must still treat the reading as having an implicit orientation — the absence of a named question does not license generic language. In this case, the synthesis should name the most charged or surprising element of the spread as the implicit center of inquiry.

13. The GPT prompt for each reading type must instruct the model to verify, before concluding, that its final reflection questions could only have arisen from this specific combination of cards, this specific intention, and this specific sky — and to revise any question that would be equally valid for a different person's reading.

14. In the Discuss flow, the system prompt must explicitly reference the user's original intention and instruct the model to treat it as the through-line of the conversation. Follow-up answers must connect back to the intention when the connection is direct and unmistakable. A user who asked about a career decision and then asks "what does the Tower mean here?" should receive an answer that reads the Tower through the lens of their career question, not a general Tower explanation.

15. During an active reading — at the position-level instant interpretation stage, before the GPT synthesis loads — the user's intention must be visible in the UI as a persistent line anchoring each card's reveal. It should remain present through the hold phase, the interpretation panel, and the synthesis phase. It should not disappear when the first card is revealed.

### Prompt discipline and voice

16. The transit data passed to GPT for each reading type must be pre-filtered before the prompt is assembled. Only the two or three transits most directly relevant to the card or spread's dominant element and ruling planet should be passed as the primary transit signals. The full transit block may remain as supporting context, but the model must be explicitly directed toward the pre-selected top transits as the ones it should anchor its astrology synthesis to.

17. The model must be instructed that any transit or natal placement it mentions must be explicitly tied back to a specific card in the spread in the same sentence or immediately adjacent sentence. Standalone transit observations that are not anchored to a card are a prohibited output pattern.

18. The Celtic synthesis system prompt must instruct the model that each named section is substantive — not filler, not a rephrasing of the previous section — and that the Constellation section (reading all ten cards as a single field) is the most important paragraph in the document. The model should be told to write that section last and edit it hardest.

19. Each reflection prompt at the end of any reading type must be demonstrably specific to the actual cards drawn and the stated intention. Generic tarot reflection questions ("What are you ready to release?") are a prohibited output unless they are grounded in a direct reference to the specific card that raised that question.

### Edge cases and boundary conditions

20. When the user's intention is very short (one or two words) or ambiguous, the synthesis must still thread it — interpreting the brevity itself as meaningful rather than discarding it or treating it as no intention.

21. When the elemental dignity assessment produces a neutral result (elementless cards, or neutral pairs like Air–Air), the synthesis must not manufacture a tension that is not there. It should acknowledge the neutrality or resonance accurately rather than inventing dramatic conflict.

22. When the three-card spread contains no Minor Arcana (all Major), the combination analysis must adjust accordingly: there are no suit-level relationships to describe, and the dialogue between cards is archetypal rather than elemental-practical.

23. When a court card appears in positions 1 or 2 of a Celtic Cross, and no other court card is present, the synthesis must acknowledge the court card's role as potentially representing a person rather than a quality, and frame the combination with the crossing card accordingly.

24. When no intention is provided and no Discuss follow-ups are active, the single-card synthesis must still anchor its reflection question to the user's astrological context (personal day, advance category, live transit) rather than generating a generic card-level question.

---

## Out of Scope

- Adding new spread types or new spread modes. The three existing reading types (single-card, three-card, Celtic Cross) must be deepened before any new type is considered.
- Changes to the visual render of synthesis output — font, color, section layout, animation. This proposal addresses the content and structure of what GPT produces, not how it is displayed.
- New data records in the 78-card dataset, astro connections table, or transit adaptations table. The existing data is the raw material; the work is in how it is selected and combined.
- Backend infrastructure changes — saved readings schema, subscription gate, usage tracking, rate limiting. These are stable and are not touched by this feature.
- New astrological content sections disconnected from drawn cards. Every astro word in the synthesis must be anchored to a specific card. General "today's sky" panels are out of scope.
- Rewriting the engine's natal chart computation or transit calculation. This proposal works with the transit data that is already computed and available.

---

## Open Questions

1. **Elemental dignity for elementless cards.** Several Major Arcana cards (notably The Fool, The World, The Judgement) are sometimes attributed Air or mixed elements depending on the tradition. The current data layer assigns elements to these cards explicitly. Should the pairing assessment use the data layer's element or acknowledge that these cards transcend elemental categorization?

2. **Intention threading in saved readings.** When a user reopens a saved reading and enters the Discuss flow, the original intention should still anchor the conversation. Is the intention persisted in the saved reading data structure, and if so, is it passed through the current saved-reading loading path?

3. **Pre-filtering transit relevance ranking.** The proposal calls for passing only the top two or three most relevant transits to GPT based on element affinity and ruling planet correspondence. The ranking logic needs a defined tiebreaker: when two transits are equally close in element affinity, does orb tightness take precedence, or does applying vs. separating, or does the nature of the aspect (harmonious vs. challenging)?

4. **Court-card "as person" vs. "as quality" disambiguation.** In classical tarot, court cards in certain positions traditionally represent external people rather than internal qualities. The specification says the synthesis must acknowledge this ambiguity when a court card occupies positions 1 or 2 in the Celtic Cross, but the disambiguation itself is left to the reader (or the model). Should a pre-computed signal indicate whether a court card is more likely "as person" given the spread context and the user's intention, or is that determination reserved for the synthesis voice?

5. **Minimum intention length threshold.** The specification says very short intentions (one or two words) should still be threaded. Is there a character minimum below which the system should prompt the user to say more before drawing, or should the synthesis always work with whatever was provided, including a single word?
