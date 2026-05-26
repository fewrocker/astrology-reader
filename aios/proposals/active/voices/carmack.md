# Technical Analysis — Sprint 0026
## Voice: John Carmack

---

Sprint 0025 fixed the wiring. The saves work, the transit adaptations are reachable, the house data flows into the GPT prompts. The plumbing is done. Sprint 0026 is a different class of problem: it's not broken wiring, it's weak data and soft prompt constraints producing output that's syntactically correct but semantically generic. Let me be precise about where.

---

## The Chart Ruler Gap Is the Biggest Single Missing Data Point

Every handler in `gptTarot.ts` — `handleTarotSingleSynthesis`, `handleTarotThreeSynthesis`, `handleTarotCelticSynthesis` — receives `natalAscSign` but does not compute the chart ruler from it. The chart ruler is the planetary lord of the Ascendant sign: Aries Rising → Mars, Taurus Rising → Venus, Gemini Rising → Mercury, Cancer Rising → Moon, Leo Rising → Sun, Virgo Rising → Mercury, Libra Rising → Venus, Scorpio Rising → Pluto (modern) / Mars (traditional), Sagittarius Rising → Jupiter, Capricorn Rising → Saturn, Aquarius Rising → Uranus (modern) / Saturn (traditional), Pisces Rising → Neptune (modern) / Jupiter (traditional).

This is a twelve-branch lookup. The data is deterministic from `natalAscSign`. The computation belongs in `buildEngineCtx` in `tarotUtils.ts` — derive it from the already-extracted `natalAscendantSign` field, store it as `chartRulerPlanet: string | null` on `TarotAstroContext`. Then thread it through the synthesis payloads for all three handlers the same way `natalMarsHouse` was threaded in sprint 0025: add the field to `TarotSingleSynthesisPayload`, `TarotThreeSynthesisPayload`, and `TarotCelticSynthesisPayload`, then add a line to each prompt's "This Person's Sky Right Now" block: `Chart ruler: ${chartRulerPlanet}`.

Why does this matter? Because the chart ruler is the planet with the most personal relevance to the user's identity and life direction. When The Tower falls and Pluto is the chart ruler (Scorpio Rising), that's a different reading than The Tower falling for a Gemini Rising whose chart ruler is Mercury. The current system can say "Sun in Scorpio" but cannot say "and because your Ascendant is Scorpio, Pluto governs your life direction — this card speaks directly into the domain Pluto rules for you." That sentence is qualitatively different from anything the current prompt set can produce for that person. The instruction needs to change from "mention at least one natal placement" (paragraph 2 of the single handler, line ~614) to "connect the card to the chart ruler and explain why the card's ruling planet relationship to the chart ruler sharpens or complicates its message for this specific person."

This is one field addition and two lines of prompt change per handler. The yield on interpretation specificity is disproportionate.

---

## The Element Affinity in `buildTransitInfluence` Is Position-Blind

`computeInstantInterpretation` in `src/engine/tarot.ts` accepts `position: SpreadPosition | null` as its third argument. The position is passed all the way through to `adaptInterpretationToPosition`, which correctly uses it to reframe `coreMeaning`, `emotionalMeaning`, `practicalGuidance`, and `reflectionQuestion`. That part works.

But `buildTransitInfluence` — called on line 712 before the position-aware reframing — receives only `card` and `astroContext`. Position is not in scope. When the Level 2 element-affinity path fires (which happens for all Minor Arcana court cards, which have almost no `TRANSIT_ADAPTATIONS` entries), the output is position-agnostic: `"The current Saturn transit amplifies this card's Earth nature — stability and material concerns are heightened now."` That sentence is the same whether this card is in the Foundation position or the Outcome position of a Celtic Cross.

The fix isn't complex. `buildTransitInfluence` needs a third optional argument `position: SpreadPosition | null`. When position is provided and the Level 2 path fires, the template should incorporate the position label: instead of `"The current Saturn transit amplifies this card's Earth nature"`, it should produce `"In the ${position.label} position, the current Saturn transit amplifies this card's Earth nature — ${position.meaning} takes on ${transitElement.toLowerCase()} weight under this sky."` That one clause change makes the instant interpretation card-position-aware at the element level without requiring new data.

The function signature change is backward-compatible: default `position` to `null`, all existing callers continue to work, and the reading flow components that already have the position can pass it through. The call site in `computeInstantInterpretation` at line 712 already has `position` available in scope — it's the third argument to `computeInstantInterpretation` itself.

---

## `TRANSIT_ADAPTATIONS` Court Card Coverage Is the Widest Practical Gap

The file `src/data/tarot/transitAdaptations.ts` has 397+ entries. I scanned the full content. The court card coverage is essentially zero. The 16 court cards — four Pages (Wands, Cups, Swords, Pentacles), four Knights, four Queens, four Kings — have no entries in the adaptations map. `TRANSIT_ADAPTATIONS_BY_CARD` will return `undefined` for `page-of-wands`, `knight-of-cups`, `queen-of-swords`, `king-of-pentacles`, and all twelve others. Every court card draw falls through to the Level 2 element affinity path, which as noted above is position-blind and produces the same sentence for any card sharing that element.

Court cards are the most contextually sensitive cards in the deck. They represent people, inner figures, or aspects of the self. A Saturn transit fundamentally changes whether the King of Pentacles represents someone who has built something solid and worth trusting, or a controller whose material security has calcified into a prison for everyone around him. A Pluto transit near the Queen of Swords means something specific about the figure this card represents: her clarity is being excavated, her detachment challenged at the root. None of this can be expressed through a generic element-affinity fallback.

The minimum viable addition is Saturn, Pluto, and Uranus entries for the four Kings and four Queens — sixteen entries total covering the eight most frequently meaningful court-card/outer-planet combinations. Those twelve pip cards (Pages and Knights) can wait; the King and Queen court cards are the ones that most often trigger recognizable "this is about a real person in my life" reactions from users, and those reactions are exactly where specificity matters most.

The entry format is established and simple. A Queen of Swords / Saturn entry would read:
```
{
  cardId: 'queen-of-swords',
  planet: 'Saturn',
  condition: 'any',
  emphasis: '...'
}
```
There is no structural work required. This is entirely a data authoring task with a clear priority order.

---

## Reversed Meanings in `coreMeaning` Are Not Off-Axis — They're Negations

The `TarotCard` type has `uprightMeaning` and `reversedMeaning`, both proper. But in the GPT prompt for the single handler, line ~583, the relevant field sent to the model is:

```
Core meaning (reversed): ${card.coreMeaning}
```

Wait — `card.coreMeaning` doesn't exist on `TarotCard`. Looking at the payload construction in `tarotUtils.ts` and the way `InstantInterpretation` is built in `computeInstantInterpretation` (line 733–735 of `engine/tarot.ts`):

```typescript
coreMeaning: reversed ? card.reversedMeaning : card.uprightMeaning,
```

So by the time the card payload reaches the GPT handler, `coreMeaning` has been set to the appropriate meaning for the orientation. That part is correct.

The problem is the content of `reversedMeaning` in `majorArcana.ts`. Looking at The Fool's reversed meaning: `"The Fool reversed suggests that fear of looking foolish is preventing the very freedom you desire."` That's a reasonable interpretation. The High Priestess reversed: `"there may be an unwillingness to sit with what is not yet known."` The Emperor reversed: `"authority that has calcified into rigidity."`

These are all semantic negations or shadow expressions of the upright meaning. They're competent but they're not the same as describing the same symbolic field blocked or internalized. There's a subtle but significant difference between "the Emperor reversed = rigidity" and "the Emperor reversed = the same drive for order and authority, but turned inward against the self, or expressed through anxious control rather than genuine structure." The first is a tarot book definition. The second is what makes a synthesis paragraph feel like it was written for this person.

For the twenty-two Major Arcana cards, each `reversedMeaning` should be audited against this criterion: does it describe the card's central principle operating off-axis, internalized, or beneath the surface — or does it describe the negation of the upright? The Tower, Death, The Moon, The Hanged Man, and Judgment are the highest-priority cases because they appear most frequently in Celtic Cross readings and carry the most archetypal weight under reversals. For those five specifically, the reversed meaning should be reviewed and rewritten if it reads as negation rather than internalization.

This is not a code change — it's a data quality change to `majorArcana.ts`. But it feeds directly into the quality of every reversed synthesis, because `coreMeaning` is the first data point the GPT model sees about the card.

---

## The Prompt Instruction "Mention at Least One Natal Placement" Is the Weakest Constraint in the System

In `handleTarotSingleSynthesis`, line ~614:

```
Paragraph 2: Connect the card to the natal chart. Mention at least one natal placement...
```

"Mention at least one natal placement" is a quantity constraint, not a quality constraint. It tells the model that `natalMoonSign` appearing somewhere in paragraph 2 constitutes success. What you get is: "With your Moon in Cancer, this card's emotional themes resonate deeply with your innate sensitivity." That sentence is true of every card drawn by every Cancer Moon person regardless of what the card is. It's generic.

The instruction needs to specify a relationship, not a presence. The replacement should be:

> Paragraph 2: Connect the card to the natal chart. You must name a specific tension, resonance, or complication between this card's symbolism (its ruling planet, element, arcana tier, and orientation) and the person's natal placements. Do not write a sentence that would be equally true if a different card had been drawn. If the card is ruled by Venus and the person's Venus is in the 8th house, name what Venus in the 8th house does to this card's meaning for this person specifically. If the card is Water and the person has no Water emphasis in their natal chart, name the quality of encounter that creates. If the chart ruler is the same planet as the card's ruling planet, say that explicitly. One natal connection that is actually specific to this card is worth more than three name-drops.

The chart ruler addition I described earlier enables this instruction to have real teeth: when the model is told "this person's chart ruler is Mars" and is looking at The Tower (Mars-connected through its quality of sudden force), it can make a connection that is not just about sign. Without the chart ruler, the model is working with three signs (Sun, Moon, Ascendant) and four house numbers — a limited palette. With the chart ruler, it has a planet-level connection to the person's core life orientation.

The same instruction weakness exists in `handleTarotThreeSynthesis` and `handleTarotCelticSynthesis` — both have language along the lines of "mention natal placements" without requiring that the mention creates a specific connection to the cards drawn.

---

## The Celtic Cross "Constellation" Section Lacks a Negative Constraint

In `handleTarotCelticSynthesis`, the prompt at line ~966 instructs:

> Write this section LAST — it is the most important paragraph in the entire document. Edit it hardest. Read all ten cards together as a single symbolic field — not position by position, but as a complete pattern: what this spread, taken as a whole, reveals about where this person stands in the arc of their life.

This is aspirationally correct. The problem is what it doesn't prohibit. Without a negative constraint, the model's default behavior is to write "The Constellation" as a summary of the sections that preceded it — a compression of what was already said in The Central Cross, The Roots and the Horizon, The Inner World, etc. The section ends up reading like an executive summary, not a revelation.

The missing sentence is: `Do not restate what you have written in any other section. Write the one thing the entire spread is saying that no individual section has yet named. If you find yourself referencing a card or position you already analyzed in another section, that sentence belongs elsewhere. This paragraph must contain exactly one insight that the rest of the synthesis has been approaching but has not yet directly named.`

That negative constraint — "do not restate what you've written" — is the mechanism that forces synthesis rather than summary. Without it, the model takes the path of least resistance. This is not a data problem; it's a prompt instruction problem, fixable in a single editing pass of the Celtic handler.

A parallel constraint is needed for `handleTarotThreeSynthesis`'s `MAIN_THEME` and `PSYCHOLOGICAL_PATTERN` sections, which have a similar tendency to converge on the same observation with different vocabulary.

---

## The Three-Card Handler Sends `pairDignity12` to the Model But Doesn't Force It Into the Opening Sentence

The three-synthesis handler computes `pairDignity12` in `ThreeCardSignals` — the elemental dignity between cards 1 and 2. It sends this as a pre-computed signal. The `pairingInstruction` at line ~736 says:

```
CRITICAL: Before addressing card 3, you MUST include one explicit statement about what cards 1 and 2 are saying TOGETHER as a pair.
```

The word CRITICAL is doing no mechanical work here. The model reads it as emphasis but has no structural enforcement. The `OPENING_SENTENCE` section instruction at line ~780 says:

```
OPENING_SENTENCE: One sentence only. Name all three cards together as a single symbolic statement — the constellation they form, not a list. This sentence must incorporate the pairing of cards 1 and 2 (their elemental dignity, relational dynamic, or archetypal dialogue) before naming card 3's role.
```

This is better — it's a structural requirement on a specific labeled section. The problem is that "incorporate the pairing" is still vague enough that the model can satisfy it with "The elementally opposing Tower (Fire) and Wheel of Fortune (Fire) set the stage for the Hermit (Earth)" — which mentions the pairing but doesn't say what the pairing is doing, what tension it creates, what unified image it forms. The instruction should say: "The opening sentence must name what the pairing between card 1 and card 2 generates — a tension, an amplification, a contradiction, or a unified symbolic image. It must not simply list the cards with their elemental labels."

The pre-computed `pd12.description` string from `describeElementalDignity` is already available in the signals block. The model should be told to incorporate that specific pre-computed description into the opening sentence, not re-derive it from card names.

---

## `formatTransitSummary` Is Still Duplicated Client and Server Side

The sprint 0025 changelog confirms that `tarotUtils.ts` is now the canonical client-side home for `formatTransitSummary`. The comment at line 57 of `tarotUtils.ts` explicitly says "the server-side copy in `server/services/gptTarot.ts` must mirror this implementation exactly." But "must mirror" enforced only by a comment is format drift waiting to happen. This is a two-file implementation of a single contract.

The most robust path is a shared schema file. The format string is simple enough that a schema test would catch drift: add a test in `__tests__` that runs both functions on the same synthetic `TransitData` fixture and asserts they produce identical output. The duplication doesn't need to be eliminated — the compilation boundary between client and server is real — but the contract should be tested, not just commented.

---

## The Dominant Modality Is Computed But Never Sent to Any GPT Handler

`buildTarotAstroContext` in `engine/tarot.ts` computes `natalDominantModality` (Cardinal, Fixed, or Mutable) via `computeDominantModality`. The field exists on `TarotAstroContext`. But none of the three synthesis payload types include it, and none of the three GPT prompts reference it.

Modality is meaningfully different from element. A Fixed-dominant person (Taurus, Leo, Scorpio, Aquarius emphasis) relates to The Tower differently from a Cardinal-dominant person: the Fixed person has been holding on; the Tower is arriving because holding on has reached structural failure. A Mutable person experiences the Hanged Man as familiar suspension rather than enforced pause. These are sentence-level distinctions that require one additional data field in the payload structs and one line in each "This Person's Sky Right Now" block.

The data is already computed. The field is already on the context object. The gap is purely in payload construction and prompt text. That's a low-cost addition with genuine interpretive yield.

---

## What to Build, In Priority Order

The cleanest path through sprint 0026 is:

**1. Add chart ruler derivation to `buildEngineCtx` / `buildTarotAstroContext`.** One twelve-branch lookup from `natalAscendantSign`. Add `chartRulerPlanet: string | null` to `TarotAstroContext`, thread it into all three synthesis payloads, add it to the "Living Sky" block in all three prompts. Then tighten the natal-connection instruction in all three handlers from "mention at least one natal placement" to "name a specific relationship between this card's symbolism and the chart ruler or a natal placement that is directly relevant to this card."

**2. Add court card transit adaptations for Kings and Queens × Saturn, Pluto, Uranus.** Sixteen entries in `transitAdaptations.ts`. No structural work. Pure data authoring. This fills the largest Level 1 miss-rate gap and makes the instant interpretation for the most contextually-sensitive cards in the deck actually specific.

**3. Add the negative constraint to The Constellation section.** One sentence added to the Celtic handler's Constellation instruction: "Do not restate what you have written in any other section. Write the one thing the spread is saying that no individual section has yet named." This is the single highest-yield prompt change relative to effort.

**4. Pass `natalDominantModality` into the synthesis payloads.** It's already computed. Add it to the three payload types and the three prompt blocks. One line each.

**5. Make `buildTransitInfluence` position-aware at Level 2.** Add `position: SpreadPosition | null` as an optional third argument. When Level 2 fires, incorporate the position label into the template string. Call site in `computeInstantInterpretation` already has the position in scope.

**6. Audit the five highest-impact Major Arcana reversed meanings.** Tower, Death, Moon, Hanged Man, Judgment. Test each against the criterion: does it describe the card's principle operating off-axis, or does it describe the negation? Rewrite if negation.

**7. Add the "do not re-derive from card names" constraint to the three-card opening sentence instruction.** Tell the model to incorporate `pd12.description` from the pre-computed signal rather than generating its own elemental description.

Items 1–4 are the ones with the largest delta on output quality. They close the gap between "technically correct natal reference" and "actually personal natal reference." Items 5–7 are polish passes that tighten what's already structurally sound.

The fundamental insight here is that the current system is bottlenecked not by what data is available — the natal chart is rich, the transit engine is sophisticated, the spread signal computation is good — but by two things: (a) a few data fields that exist in the engine but aren't reaching the prompts (chart ruler, modality), and (b) prompt instructions that accept presence as a proxy for specificity. Fix both and the synthesis quality ceiling rises significantly without touching the UI, the reading flows, or any structural architecture.
