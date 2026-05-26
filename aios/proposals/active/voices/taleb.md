# Taleb's Review — Sprint 0026 Pre-Mortem

*Nassim Nicholas Taleb. Written as if the sprint has already shipped and I am explaining to the team why the thing they were most excited about failed.*

---

## The Central Illusion

Everyone on this project is optimizing the prompt. The sprint vision is essentially a long argument about better wording instructions to GPT. I understand the appeal — it feels like craftsmanship. You adjust a sentence, the output improves, you feel like you made progress. But you are mistaking legibility for robustness. The prompts are becoming more elaborate precisely because the underlying data feeding them is fragile. You are building a more sophisticated bridge over a foundation that has gaps nobody is measuring.

Let me be specific.

---

## The Reversed Card Problem Is Worse Than You Think

The `TarotCard` type in `src/data/tarot/types.ts` has two fields: `uprightMeaning` and `reversedMeaning`. The engine at line 735 of `src/engine/tarot.ts` selects between them:

```ts
coreMeaning: reversed ? card.reversedMeaning : card.uprightMeaning,
```

This `coreMeaning` is what the GPT prompt receives for *all three handlers* — Single, Three-Card, and Celtic Cross. Look at the Celtic Cross handler in `gptTarot.ts`, lines 877–879. What does it send for each of the ten cards?

```ts
${card.symbolicTheme}. ${card.coreMeaning}
```

That's it. The `coreMeaning` field is doing enormous weight. The vision document (lines 35–37 of sprint-0026 vision) acknowledges the `reversedMeaning` quality problem. But the sprint team treats it as a data quality issue to be addressed at some future point, not as a structural failure already producing silent damage today.

Here is what actually happens right now when a reversed Minor Arcana court card — say, Knight of Swords reversed — lands in position 3 of a Celtic Cross (Unconscious Influence). The GPT receives `card.reversedMeaning` as its entire textual input about that card. Look at the `wands.ts` file for the pattern. The reversed meanings are genuine — they are written thoughtfully. But they were written for an isolated card draw, not for position 3 of a Celtic Cross. And there is no mechanism that tells GPT that the reversed meaning it is reading was written *without position context*. The GPT will read "skill being wasted or misdirected" (the Magician reversed, `majorArcana.ts` line 32) and try to make that work as an Unconscious Influence. Sometimes it will succeed through hallucination. Sometimes it will produce a reading that is technically coherent but symbolically wrong — and the user will never know.

The asymmetry is dangerous: correct readings feel insightful, wrong readings feel like they apply. Tarot language is general enough that the model can almost always find a sentence that sounds true. You cannot distinguish a real signal from a confabulation by reading the output.

---

## The 44-Card Blind Spot in Transit Adaptations

I counted the distinct card IDs in `transitAdaptations.ts`. There are 32 unique card IDs in the adaptations file, covering 56 total entries across condition variants. The deck has 78 cards. Run the diff:

- **44 Minor Arcana cards have zero transit adaptations.** These include all 16 court cards, and 28 pip cards (two-of-wands through nine-of-wands, two-of-cups through nine-of-cups minus four-of-cups and nine-of-cups, and so on for swords and pentacles).
- **2 Major Arcana cards have zero transit adaptations**: The Fool and Justice.

The sprint-0025 changelog (`task-0005`) celebrates that the Tower under a Pluto transit now returns the Pluto-specific note. This is real progress. But the 44 cards with no adaptations all fall through to Level 2 (element-affinity) or Level 3 (baseline). Look at Level 2 in `src/engine/tarot.ts`, lines 590–610. For a card with no transit adaptation and a matching element:

```ts
return `The current ${planet} transit amplifies this card's ${cardElement} nature — ${kw0} and ${kw1} are heightened now.`
```

This is a template, not an interpretation. "The current Saturn transit amplifies this card's Earth nature — planning and vision are heightened now" will be generated identically for the Two of Wands, the Three of Pentacles, and the Seven of Pentacles, under Saturn. Same planet, same element, same template, different cards with radically different symbolic content. The GPT synthesizer receives this as its `transitInfluence` field and proceeds as if it were a real signal.

Nobody is measuring the Level 1 hit rate in production. You do not know what fraction of readings are drawing from real transit adaptations versus falling through to templates. My estimate based on the data: for a random draw from the 78-card deck, roughly 43% of cards will produce a real transit adaptation (assuming the dominant transit planet is one that has an entry for that card). For the 44 missing Minor Arcana, the hit rate is zero regardless of transit conditions. The sprint-0026 vision mentions adding court card adaptations as a "secondary target." It is not secondary — it is the thing that determines whether the transit context in the prompt is real information or filler text.

---

## The Chart Ruler Is Absent From Every Handler

The sprint-0026 vision itself acknowledges this (lines 29–31): "Chart ruler is not derived. Chart ruler is one of the most important personal astrology signals for card-to-self bridging." I am citing the team's own diagnosis. What the vision doesn't say clearly enough is what this costs in practice.

Look at the natal context block sent to GPT in all three handlers. Here is what Single receives (lines 588–594 of `gptTarot.ts`):

```
Sun in ${natalSunSign}, Moon in ${natalMoonSign}${natalMoonHouse ? ` in your ${ordinalHouse} house` : ''}, Ascendant in ${natalAscSign}
Venus in your Xth house
North Node in your Xth house
Mars in your Xth house
```

No chart ruler. No dominant element. No dominant modality. These two fields — `natalDominantElement` and `natalDominantModality` — are computed in `buildTarotAstroContext` (lines 482–483 of `src/engine/tarot.ts`) and stored in `TarotAstroContext`. They are then... dropped. They are not included in any of the GPT payload types (`TarotSingleSynthesisPayload`, `TarotThreeSynthesisPayload`, `TarotCelticSynthesisPayload`). Computed, stored, never sent.

The chart ruler omission creates a specific failure mode. Consider a Scorpio Rising person — chart ruler is Pluto. They draw Death reversed in the Hopes and Fears position of a Celtic Cross during a Pluto transit. The synthesis will mention Pluto (from the transit summary), mention Death (from the card data), and mention Scorpio Rising (from the natal context). But it will not know that Pluto is their *chart ruler*, which is the reason this particular combination lands with a completely different weight for a Scorpio Rising person than for an Aries Rising person drawing the same card under the same transit. The GPT will write something that sounds specific but is missing the key that makes it actually specific.

---

## The Duplicate `formatTransitSummary` Is a Maintenance Trap

The sprint-0025 changelog (`task-0006`) explicitly created a shared utilities module. But look at `tarotUtils.ts` line 57–93 and `gptTarot.ts` lines 396–431. The server-side comment in `gptTarot.ts` says:

> "Any behaviour change must be applied to both copies in lockstep."

This is a guarantee waiting to be violated. The two implementations are currently identical. They will diverge. There is no test that checks for divergence. The sprint that modifies the client-side `formatTransitSummary` to improve the transit summary quality (sprint-0026 will likely do this as part of the prompt improvement work) will fix one copy and forget the other. The server will then be sending different transit context than the client computed. Nobody will notice because the output difference will be subtle — one extra aspect in the client summary, a missing retrograde in the server summary — and the synthesis will still be coherent.

This is not a minor code smell. This is a single point of failure directly in the data pipeline feeding every GPT synthesis call.

---

## The Prompt Assumes the Model Will Distinguish Specific From Generic

The single-card synthesis prompt (lines 614–621 of `gptTarot.ts`) says:

> "Before writing this question, verify internally that it could only arise from this specific card, this specific intention or astrological context, and this specific sky — revise it if it would apply equally to a different person's reading."

This instruction asks GPT to perform its own quality check. The model cannot do this reliably. Asking it to "verify internally" that a question is specific is asking it to apply a criterion it has no ground truth for. The model has no way to know what a *different* person's reading would have produced. It will perform the verification gesture — it will believe it is complying — and then produce a reflection question that sounds specific but would pass for any reading involving The Moon, or any reading involving a Saturn transit, or any reading involving career questions. The instruction produces the *appearance* of specificity verification, not the reality.

The prompt structure throughout all three handlers shares this failure mode: instructions that prohibit generic outputs ("Generic tarot questions are prohibited," "Do not drift into a standalone astrology reading," "Do not restate what you have already written") are enforced only by the model's self-monitoring. The model cannot see its own output's genericness relative to other outputs it hasn't produced. These instructions reduce genericness on average. They do not prevent it.

---

## The Biggest Risk Everyone Is Ignoring

The product is betting that GPT synthesis quality can be continuously improved through prompt engineering and data enrichment. This is the working assumption behind sprint-0026 and apparently every sprint before it. It is not wrong — quality has clearly improved across sprints 0023 through 0025. But it is fragile in a specific way that nobody has named.

The synthesis quality is entirely dependent on the token budget and model behavior of `gpt-4o-mini` at `temperature: 0.85`. The Celtic Cross handler is requesting 3000 tokens. The Three-Card handler is requesting 1400. These are the maximum output limits — the model will often produce less. The entire sprint-0026 quality improvement program assumes that what comes back from the API at these settings, with these prompts, will be at a certain quality floor.

Temperature 0.85 is high. It produces varied, non-mechanical outputs, which is appropriate for this domain. But at 0.85, you also get outputs where the model takes creative license with the structural requirements — occasionally collapsing two labeled sections into one, occasionally omitting the `REFLECTION:` label in the single-card output, occasionally producing a `REFLECTION_PROMPTS` block with only two entries instead of three. Look at the Celtic Cross response parsing — the product renders named sections as chapters. If the model doesn't produce a section label exactly as specified, the parser either silently drops that section or renders nothing for it. The user sees a gap. Nobody calls it a bug because it only happens intermittently.

This is the tail risk. The elaborate prompt architecture assumes the model will reliably output exactly the structural format specified. It won't. Not at temperature 0.85, not 100% of the time, not at 3000 tokens where the model is sometimes running against its own internal coherence limits near the end. The product has no fallback for malformed structure — it gets a synthesis string back and either parses it or doesn't. The user experience at the failure boundary has not been designed; it has been ignored.

---

## What Should Actually Be Done Before Sprint-0026 Ships

1. **Measure the transit adaptation Level 1 hit rate in production.** Add a logging dimension that records which level (1, 2, or 3) `buildTransitInfluence` returned for each draw. If more than 40% of Celtic Cross draws are falling through to Level 2 templates, the synthesis quality improvement work is layering polish on noise.

2. **Pass `natalDominantElement` and `natalDominantModality` into all three payload types.** They are already computed. They are not transmitted. This is a free improvement that costs one field addition to three payload interfaces and a few prompt lines. The sprint vision identifies the chart ruler gap — but dominant element is equally missing and equally computed.

3. **Write a structure conformance test for the GPT output parsers.** Feed each synthesis handler a known input and assert that the output parser does not silently drop sections when the model skips a label. Make the failure loud.

4. **Resolve the duplicate `formatTransitSummary` with a module-boundary crossing solution or an automated diff test.** The comment "must be applied in lockstep" is not enforcement. It is documentation of a future bug.

5. **Stop asking GPT to verify its own specificity.** The "verify internally" instructions will not prevent generic outputs. If specificity is the quality bar, build a structural check: require that the reflection question contain the user's stated intention verbatim, or at minimum contain one of the drawn card names. A text check is not perfect but it is verifiable.

The product is closer to genuinely good than most projects get. The synthesis already surprises people. That is exactly why the structural fragilities matter — the gap between "sometimes surprising" and "reliably specific" is not a prompt gap. It is a data completeness gap and a robustness gap in the parsing layer. Closing those would do more for sprint-0026's stated quality bar than any amount of additional instruction text.
