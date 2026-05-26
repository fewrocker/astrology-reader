# Sprint 0027 — Vision

## Sprint Focus

Complete the transit adaptation coverage gap and deepen the Minor Arcana interpretive layer so the instant interpretation is never generic for any of the 78 cards under any active sky. 28 pip cards (Two through Nine of all four suits) and 2 Major Arcana (The Fool, Justice) have zero transit adaptations — when these cards are drawn under an active Saturn, Pluto, Uranus, or Mars transit, the system silently falls through to the Level 3 baseline note, discarding the most contextually powerful data available. Alongside this, the Minor Arcana pip card reversed meanings — currently competent but not specifically crafted — should be elevated to the same standard as the seven Major Arcana rewrites shipped in sprint 0026: not negations of the upright, but named descriptions of the card's symbolic field operating as blocked, internalized, or arrested.

## Why Now

Sprint 0026 closed the natal personalization layer: chart ruler is derived and threaded to all three synthesis handlers, dominant modality reaches every GPT prompt, court card transit adaptations cover all 16 court cards across Saturn/Pluto/Uranus conditions, and the seven most-rewritten Major Arcana reversals now describe off-axis psychology rather than absent qualities. The synthesis prompt architecture is mature.

What remains is a coverage gap in the interpretive data layer that every sprint has so far deferred. The transit adaptation lookup (`src/data/tarot/transitAdaptations.ts`) currently has 92 entries across 48 unique card IDs. Of the 56 Minor Arcana cards, 28 pip cards — the Two through Nine of Wands, Cups, Swords, and Pentacles — have no entries at all. This means that for roughly half the deck, `buildTransitInfluence` in `src/engine/tarot.ts` always falls through Level 1 to Level 2 (generic element-affinity) or Level 3 (baseline note). Given that Saturn, Pluto, or Uranus is almost always active in anyone's chart, this means a large fraction of actual draws produce transit notes that are not card-specific.

The guidelines are explicit: "only decide to print the most insightful one with the most supporting combination of elements, or the strongest and clearest ones." The current fallback path fails this — it prints the element-affinity line because it has no other option. The data to do better exists (the card's symbolic field is fully written); the transit adaptation entries simply have not been written for this tier.

Additionally, The Fool and Justice — the two remaining Major Arcana without transit adaptations — have the kinds of symbolic charges (Uranus liberation for The Fool, Venus/Saturn accountability for Justice) where the absence is audible when they appear under strong transits.

## Where to Look

### Primary Target — Transit Adaptation Coverage

**`src/data/tarot/transitAdaptations.ts`** — currently 664 lines, 92 entries.

The 28 missing pip cards need entries for their two or three most symbolically charged planet conditions. Not every planet × every card: the standard is which transit would most dramatically shift the card's meaning for the person drawing it. The reliable trio is Saturn (restriction, delay, maturation), Pluto (deep transformation, power dynamics, excavation), and Uranus (sudden disruption, liberation, unexpected reversal). For suit-appropriate transits, Mars is relevant for Wands and Swords; Neptune for Cups; Venus for Pentacles. Mercury retrograde applies specifically to the mental/communication cards: Two of Swords (decision in fog), Eight of Swords (self-imprisonment through thought), Seven of Cups (illusion/choice paralysis). Two to three entries per card, each in the same voice and register as the existing Major Arcana entries: specific to the card's symbolic field, not generic transit-astrology copy.

The two missing Major Arcana entries:
- `the-fool` + Uranus (any), `the-fool` + Saturn (any) — The Fool under Uranus is the purest expression of the card's own archetype; under Saturn it is the courage required when the leap feels most unreasonable.
- `justice` + Venus (any), `justice` + Saturn (any) — Justice under Venus asks whether the accounting is honest about desire; under Saturn it is the cosmic enforcement of cause and effect, with no softening.

Card-by-card reference: the upright and reversed meanings in `src/data/tarot/wands.ts`, `src/data/tarot/cups.ts`, `src/data/tarot/swords.ts`, and `src/data/tarot/pentacles.ts` should be the primary source. The suit element and the card's symbolic theme dictate which transit creates the most meaningful signal.

### Secondary Target — Minor Arcana Pip Reversed Meanings

**`src/data/tarot/wands.ts`**, **`src/data/tarot/cups.ts`**, **`src/data/tarot/swords.ts`**, **`src/data/tarot/pentacles.ts`** — the `reversedMeaning` field for the 28 pip cards (Two through Nine of each suit).

The current reversed meanings for pip cards are short and structurally correct, but they tend to describe the reversed card as "the energy being delayed/blocked/turned inward" without naming the specific psychology that produces that experience. Sprint 0026 set the standard: the reversed Fool describes "fear of looking foolish preventing the freedom you desire"; the reversed Strength describes "someone who has confused endurance with courage and cannot put the weight down because the weight has become their name." That level of specificity — naming the particular arrested form of the archetype — is achievable for pip cards too. The Two of Wands reversed is not just "vision without movement" but specifically the person who re-plans the same journey to avoid the risk of taking it. The Eight of Swords reversed is not just "escaping self-imposed limitation" but the specific experience of realizing the blindfold was voluntary all along.

Prioritize the Swords suit (most drawn in readings around mental anguish, decision-making, conflict) and the Eight, Nine, and Ten of each suit (the most psychologically dense pip numbers). The goal is not a rewrite of every field — just the reversed meanings for pip cards where the current text would produce a generic note if the card is drawn reversed. The existing upright meanings across the Minor Arcana are strong; the reversed meanings lag behind.

### Tertiary Target — Position-Aware Transit Affinity for Single Card Draws

**`src/engine/tarot.ts`** — `buildTransitInfluence` function, Level 2 fallback (lines 712–738).

The position-aware Level 2 affinity lines are currently only generated when a `register` (past-root, present-active, future-emerging) is detected from a spread position. For single card draws, the `position` is `null` and the function falls through to the non-position-aware generic line. Single card draws are the most common draw type. Adding a minimal position context for the single card position (id: `'single'`, which already exists in `SPREAD_POSITIONS`) would activate position-aware logic for this case, making the transit affinity line slightly warmer and more grounded for daily draws.

## Quality Bar

"Deep, not shallow" for this sprint means:

**Every card drawn under a Saturn, Pluto, or Uranus transit should have a Level 1 hit.** Draw any of the 78 cards, make a daily draw as a user whose chart has an active outer planet transit (almost all users), open the instant interpretation panel, and the "In Your Sky Now" section should show a card-specific transit note — not "this Fire card meets Pluto's energy" but something that names both the card's specific symbolic territory and the planet's specific register together. After this sprint, falling through to Level 2 should be the exception (unusual transit planets, or outer planet conditions not yet covered), not the default for half the deck.

**Reversed pip card text must describe a psychology, not a negation.** Draw any pip card reversed — say, the Six of Cups reversed — and the `coreMeaning` field shown in `TarotInterpretationPanel.tsx` should describe a specific form of arrested or off-axis nostalgia: what it looks like when someone is living in memory rather than moving through it. Not "blocked nostalgia" or "inability to release the past" but the name of how that pattern actually operates in a person.

**Transit entries must match the voice of the existing data.** The existing entries for Major Arcana are written with care: they describe the specific meeting between the card's symbolic field and the transit planet's register. The new pip entries must meet the same standard. If an entry reads like "Saturn brings restriction to the Two of Wands" rather than naming the specific experience of sustained effort being tested at exactly the moment when commitment was just forming, it is not done.

## What This Sprint Is NOT

- Not a new spread type. Celtic Cross, Three-Card, and Single are the complete vocabulary. The reading architecture is closed.
- Not GPT prompt restructuring. The prompts in `server/services/gptTarot.ts` emerged from two sprints of tightening. Do not modify the prompt architecture or the Section structure of any handler unless a specific defect was found.
- Not natal chart, transit reading, synastry, or solar return work. Those surfaces are stable and not the focus of the tarot depth arc.
- Not synthesis payload types or handler wiring. The payload types (`TarotSingleSynthesisPayload`, `TarotThreeSynthesisPayload`, `TarotCelticSynthesisPayload`) are correct and complete. No new fields are needed.
- Not visual changes. The interpretation panel, card reveal, synthesis panel, and deck selection UI are at the right level. Do not re-open those surfaces.
- Not the Aces or court cards. Aces already have selective transit coverage; the court cards received full transit coverage in sprint 0026. The target is pip cards Two through Nine.
- Not a reversal rewrite for Major Arcana. Seven cards were rewritten in sprint 0026; the remaining 15 Major Arcana reversals are strong enough. The reversal work this sprint is confined to Minor Arcana pip cards where the text is short and non-specific.
