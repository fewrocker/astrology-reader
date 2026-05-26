# feat-pip-transit-adaptations

**Type:** Feature
**Originated by:** Jobs, Carmack, Miyazaki, Taleb (all four)

---

## Problem / Opportunity

The "In Your Sky Now" section of the instant interpretation panel has three levels of output. Level 1 returns a card-specific, planet-specific transit entry from `src/data/tarot/transitAdaptations.ts` via `buildTransitInfluence` in `src/engine/tarot.ts` (lines 680–710). Level 2 returns a generic element-affinity line constructed from the card's suit element and the dominant transit planet's element category (lines 712–737). Level 3 returns the card's baseline astrological note or a fully generic fallback.

Level 1 is the system working as designed. Levels 2 and 3 are the system failing its core promise.

`TRANSIT_ADAPTATIONS` currently contains 92 entries across 48 unique card IDs. The 28 pip cards — Two through Nine of Wands, Cups, Swords, and Pentacles — have zero entries in this file. The Fool and Justice, two Major Arcana with strong planetary signatures, also have zero entries. These 30 cards represent 38% of the 78-card deck.

The consequence is observable and specific: a user whose chart has an active Saturn transit — which describes almost every adult at some point in their life, since Saturn is almost always in aspect to something in a natal chart — draws the Two of Wands and receives: "The current Saturn transit introduces structured energy into this Fire card — a call to integrate these opposing forces consciously." This sentence is structurally identical to what any other Fire card without transit adaptations would produce under the same transit. It says nothing about the Two of Wands specifically. It says nothing about Saturn's particular demand at this card's symbolic register — the person who has been holding the world in their hand at the parapet and has not yet stepped through. The card's most symbolically charged transit combination produces the least specific output the system can generate.

The `buildTransitInfluence` fallthrough is silent. The user in the "In Your Sky Now" section sees text that looks and reads like a transit interpretation. There is no indicator that the system fell through to a procedural template rather than locating a written entry. The user cannot tell the difference between depth and its appearance.

This affects roughly one third of all actual draws. Saturn, Pluto, or Uranus is almost always the dominant transit planet for adult users, because outer planets move slowly and maintain orb for months or years. For every draw of a Two, Three, Four, Five, Six, Seven, Eight, or Nine of any suit — and for every draw of The Fool or Justice — the "In Your Sky Now" section generates transit content from element labels rather than from the card's symbolic field.

The guidelines are explicit: "only decide to print the most insightful one with the most supporting combination of elements, or the strongest and clearest ones." The current fallback path violates this — it prints the element-affinity line because it has no other option. The card's symbolic field exists and is fully written in the suit data files; the transit adaptation entries simply have not been written for this tier.

---

## Vision

A user draws any of the 78 cards under an active outer planet transit and the "In Your Sky Now" section of the interpretation panel says something specific to that card and that transit. Not "this Fire card meets Saturn's energy" but language that names the actual experience of someone at the symbolic territory of that particular card being met by that particular planet's register.

Draw the Two of Wands under Saturn. The section speaks to the experience of a person who has been standing at the edge of commitment — the vision mapped, the world in hand — being met by Saturn's requirement that the holding-in-place either become a real departure or be acknowledged as a permanent avoidance. Not a paraphrase of Saturn's general reputation. Not a summary of the Two of Wands' general theme. The specific quality of their meeting.

Draw the Eight of Swords under Pluto. The section names what Pluto does when it arrives at the Eight's particular form of self-imprisonment: the excavation of how the blindfold was originally put on, who authorized it, what it protected against, and whether the protection is still worth the cost. Pluto does not merely deepen the Eight's fog; it asks what the cage was built to contain.

Draw The Fool under Uranus. The section recognizes this as the purest possible alignment between a card's archetype and a transit planet's register — the leap card meeting the liberation planet — and speaks to that alignment with the directness it deserves rather than treating it as a coincidence.

Draw Justice under Venus. The section does not congratulate the user on a harmonious alignment. It asks whether the accounting has been honest about desire — whether what has been called fair has actually been weighed with full honesty about what is genuinely wanted, not only about what seems appropriately measured.

When this feature is complete: draw any of the 78 cards under an active Saturn, Pluto, or Uranus transit as a daily draw, and the "In Your Sky Now" content feels addressed to you specifically rather than to anyone who drew any Fire or Water or Earth or Air card on this planet's day. The card and the sky converge into something that names where you are.

---

## Specifications

### 1. Coverage: which cards require entries

All 28 pip cards and both Major Arcana must have entries in `src/data/tarot/transitAdaptations.ts` upon completion:

- Two of Wands, Three of Wands, Four of Wands, Five of Wands, Six of Wands, Seven of Wands, Eight of Wands, Nine of Wands
- Two of Cups, Three of Cups, Four of Cups*, Five of Cups, Six of Cups, Seven of Cups, Eight of Cups, Nine of Cups*
- Two of Swords, Three of Swords*, Four of Swords, Five of Swords, Six of Swords, Seven of Swords, Eight of Swords, Nine of Swords
- Two of Pentacles, Three of Pentacles, Four of Pentacles*, Five of Pentacles, Six of Pentacles, Seven of Pentacles, Eight of Pentacles, Nine of Pentacles*
- The Fool
- Justice

Cards marked with asterisk already have one or more entries in the current file. These entries must be preserved; the missing planet conditions for those cards must be added to complete their coverage.

### 2. Planet requirements per card

Each of the 28 pip cards must have entries for at least two of the following three planets, with a strong preference for all three where the card's symbolic field supports it:

- **Saturn (condition: any)** — required for every pip card. Saturn's register of earned maturation, structural demand, and the enforcement of consequence is relevant to every card in the deck.
- **Pluto (condition: any)** — required for every pip card. Pluto's register of excavation, root-level transformation, and the confrontation with what has real power is relevant to every card in the deck.
- **Suit-appropriate third planet** — required, planet varies by suit:
  - Wands: **Mars (condition: any)** — fire meeting fire, the question of whether drive is being directed or merely burned
  - Cups: **Neptune (condition: any)** — water deepening water, the distinction between genuine feeling and the projection of feeling
  - Swords: **Mars (condition: any)** — force meeting intellect, the charge that the mind's argument has been building toward
  - Pentacles: **Venus (condition: any)** — the question of value applied to what is materially held or sought

**Mercury retrograde** entries are additionally required for three specific pip cards where the card's symbolic field is directly engaged by retrograde communication and mental fog:
- Two of Swords (condition: retrograde) — the mind that has already chosen not to see, meeting a transit that deepens the fog it chose
- Eight of Swords (condition: retrograde) — the self-built mental cage, now reinforced by the retrograde's disruption of clarity
- Seven of Cups (condition: retrograde) — the proliferation of untested fantasy, amplified by retrograde's tendency to cycle options without resolution

**The Fool** requires two entries:
- Uranus (condition: any) — the archetype whose entire symbolic field is the leap, meeting the planet whose register is sudden liberation; the most complete expression of both forces simultaneously
- Saturn (condition: any) — the leap that feels most unreasonable, taken precisely because Saturn has made clear that the conditions will not improve, and at some point courage is required not because it is easy but because the alternative is permanent deferral

**Justice** requires two entries:
- Venus (condition: any) — the honest accounting of whether what has been called fair actually reflects genuine values or the comfortable fiction of balance; whether the scales have been weighed with honesty about desire
- Saturn (condition: any) — cause and effect arriving with the full impersonality of natural law, the consequences of choices made long ago presenting themselves without softening or negotiation

### 3. Entry format

Each entry follows the existing `{ cardId, planet, condition, emphasis }` structure as defined in the `TransitAdaptation` type. The `condition` field takes values `'any'`, `'retrograde'`, or `'direct'`. All new entries use `'any'` or `'retrograde'` conditions — no new `'direct'` condition entries, since `'direct'` only fires when the specified planet is simultaneously the dominant transit planet and not retrograde, which for lower-priority planets (Mercury, Venus) rarely occurs.

### 4. Voice and quality requirements

Each entry's `emphasis` field must name the specific meeting between the card's symbolic field and the transit planet's register. The quality bar is not approximated; it is met or the entry is not done.

The test for a passing entry: read the `emphasis` text without knowing which card it was written for. You should be able to reconstruct which card it describes from the entry alone, because the entry names something specific to that card's symbolic territory. If the entry could plausibly have been written for any Fire card, any Water card, or any card in the deck — if it uses "your Fire energy," "your themes of connection," "this card's quality" as its primary specificity — it does not pass.

The test for a failing entry: "Saturn brings restriction to the Two of Wands' vision." This sentence has two named elements (Saturn, Two of Wands) and zero specific meeting between them. It describes Saturn in its most generic function and the Two of Wands in its most generic theme. It does not name the experience of the person at the parapet — who has been experiencing the horizon as more real than the journey — being met by the planet whose register is exactly the enforcement of consequence for perpetual deferral.

A passing entry for this same combination names that experience specifically. The Two of Wands under Saturn is the person who has been planning the same journey with sufficient detail to experience it emotionally without taking its risk, meeting a transit whose entire nature is to make the gap between vision and commitment unavoidable. The entry should name that specific encounter: the held world, the held-in-place decision, the question that Saturn is now forcing.

The existing Major Arcana and court card entries in `transitAdaptations.ts` are the quality model. Specifically: the King of Wands under Pluto (lines 408–418), the Hermit under Saturn (lines 39–43), and the Devil under Saturn (lines 248–252) illustrate what is required. New pip entries must meet this standard. They are permitted to be shorter — pip cards warrant somewhat more concentrated language than court cards — but they must be equally specific.

### 5. Priority order for writing

Within the 28 pip cards, entries should be written in this priority order if implementation proceeds incrementally:

1. **Swords suit** — highest psychic density, most commonly drawn in readings around mental anguish, trapped states, and decision paralysis; the transit adaptations for Swords cards under Saturn and Pluto are the most immediately meaningful for users in distress
2. **Cups suit** — emotional territory that Neptune and Saturn activate most specifically; the Neptune entries for Cups are the most symbolically precise opportunities in the feature
3. **Wands suit** — fire and drive under Saturn and Pluto; the Two of Wands under Saturn (planning as permanent avoidance) and the Nine of Wands under Saturn (resilience at the edge of its sustainable limit) are among the highest-value single entries in the set
4. **Pentacles suit** — material and practical territory where Venus and Saturn meet most specifically; the Venus entries for Pentacles distinguish this feature's output from anything generically available in transit astrology

### 6. The Fool and Justice must be written first

Both Major Arcana entries should be completed before the pip card work begins. They are two entries (four total `emphasis` fields), they are symbolically precise, and their absence is audible in any reading that produces them under the named transit conditions. The Fool under Uranus is the single most specific card-planet alignment in the deck — the only case where the card's ruling planet is Uranus and the transit planet is Uranus simultaneously. This entry has been missing from the data since the system was built. It should not remain missing.

### 7. Where entries are added in the file

New entries are appended to `src/data/tarot/transitAdaptations.ts` within clearly commented sections by suit and card, following the organizational pattern already established in the file (inline `// Card Name` comments before each card's entries). The new entries must be grouped: all Wands pip entries together, all Cups pip entries together, all Swords pip entries together, all Pentacles pip entries together, with The Fool and Justice entries added adjacent to the existing Major Arcana entries at the top of the file. Within each card's group, entries should be ordered: Saturn first, Pluto second, third planet (Mars/Neptune/Venus) third, Mercury retrograde last if present. This ordering is functionally relevant: `buildTransitInfluence` iterates in array order, and for a user with Saturn as dominant planet, placing Saturn entries first ensures the loop returns the most-priority entry first without depending on the retrograde-OR condition to select for them.

### 8. Count targets

- Minimum 2 entries per pip card (Saturn + Pluto)
- Target 3 entries per pip card (Saturn + Pluto + suit planet)
- Plus Mercury retrograde entries for Two of Swords, Eight of Swords, Seven of Cups (3 additional entries)
- Plus 4 entries for The Fool and Justice (2 each)
- Minimum new entry count: 28 × 2 + 4 = **60 entries**
- Target new entry count: 28 × 3 + 3 Mercury retrograde + 4 Major Arcana = **91 entries**

The total file size will approximately double. This remains a single-file format. No restructuring of the file into per-suit modules is required for this sprint.

### 9. Verification against the quality bar

After all entries are written, the complete set must be reviewed against two specific failure conditions:

First, any entry whose `emphasis` text contains phrases of the form "this card's [generic quality]" or "[planet] brings [planet-general-trait] to [card-general-theme]" must be rewritten. These phrases are structural indicators that the entry has described the two forces in their general registers without finding the specific meeting between them.

Second, read each entry without its cardId visible. If you cannot identify which pip card the entry was written for — if the language of the entry would not change significantly if it had been written for a different card in the same suit or even a different suit — the entry does not meet the standard. Every entry must contain at least one clause that is exclusive to the card it describes: something that names the specific symbolic territory of this card (the parapet figure of the Two of Wands, the spilled cups of the Five, the cage of the Eight of Swords, the battle-worn figure of the Nine of Wands) rather than the general territory of its suit.

---

## Out of Scope

- **No changes to `buildTransitInfluence` or any engine code.** The three-level fallback architecture is correct. This feature is purely additive data. No function signatures, no engine logic, no type definitions, no component code changes.
- **No changes to suit data files (`wands.ts`, `cups.ts`, `swords.ts`, `pentacles.ts`, `majorArcana.ts`).** Reversed meaning depth for pip cards is a separate proposal. Do not combine the two writing tasks into a single implementation pass — the quality bars are different and the review criteria are different.
- **No changes to the GPT synthesis handlers.** The synthesis prompt architecture in `server/services/gptTarot.ts` is correct and closed. Transit adaptation entries are written to the instant interpretation layer. They feed into the GPT synthesis payload via `card.transitInfluence` on the payload type, which already exists. No new fields, no new handlers.
- **No new transit planets beyond the specified set.** Jupiter, the Sun, the Moon, and Chiron are not targets for this sprint. The entries for the outer planets and suit-appropriate planets cover the most symbolically charged transit conditions for pip cards.
- **No Ace entries.** Aces already have selective transit coverage in the existing file. The scope is Two through Nine.
- **No court card entries.** Court cards received full Saturn, Pluto, and Uranus coverage in sprint 0026. The scope is pip cards only.
- **No changes to the `TRANSIT_ADAPTATIONS_BY_CARD` reduce function.** The reduce is correct, runs at module load time, and requires no changes to accommodate additional entries.
- **No per-card coverage test.** Adding a coverage assertion to `cards.completeness.test.ts` is a separate proposal (`code-transit-coverage-test`). It should be written after this feature ships but is not a requirement for completing the feature.
- **No fix to the retrograde priority-override issue** identified by Taleb (the `condition: 'any'` retrograde-OR branch can fire before the dominant-planet entry when a lower-priority planet is retrograde). That is a separate issue proposal (`issue-retrograde-condition-priority-override`). The entry ordering spec above (Saturn first, Pluto second) partially mitigates this for the most important planet combinations, but the underlying logic bug is out of scope here.

---

## Open Questions

**1. Whether the Nine of Cups and Four of Cups existing entries need completion before the pip sprint begins.**

`four-of-cups` has one existing entry (Neptune) and `nine-of-cups` has one existing entry (Jupiter). Neither has a Saturn or Pluto entry. Since coverage completeness requires Saturn and Pluto entries for every pip card Two through Nine, these two cards need additional entries as part of this sprint. The question is whether this is handled as part of the main pass or flagged separately as a completion of partial coverage. The practical answer is: handle it in the main pass, since the writing task is the same.

**2. Whether any pip card warrants a Uranus entry.**

The sprint vision and voice documents focus on Saturn, Pluto, and suit-appropriate third planets. Uranus is not listed as a target for pip cards. However, several pip cards have symbolic fields that are specifically activated by Uranus: the Five of Wands (sudden disruption of a competitive equilibrium), the Eight of Wands (acceleration suddenly stopped or reversed), the Seven of Pentacles (the long investment suddenly destabilized). Implementors should use judgment here — if a specific pip card's symbolic field is more precisely activated by Uranus than by Mars or Venus, a Uranus entry is better than forcing the suit-planet assignment. The constraint is minimum coverage (Saturn + Pluto for every card), not maximum prescription. The suit-planet guidance is the default when the symbolic field does not indicate a different third planet.

**3. Whether Mercury retrograde entries are appropriate for pip cards beyond the specified three.**

The Three of Swords, Five of Swords, Seven of Swords, and Nine of Swords all have Mercury-adjacent symbolic fields (heartbreak through truth, hollow victory, deception, mental anguish). Mercury retrograde entries for these cards would be symbolically appropriate. The vision documents specify only Two of Swords, Eight of Swords, and Seven of Cups as mandatory Mercury retrograde targets. Whether to extend this to additional Swords cards should be decided during implementation based on what the Swords transit entries reveal about which combinations are genuinely charged. Do not add Mercury retrograde entries mechanically to every Swords card — add them where the meeting between the card's symbolic field and Mercury retrograde is specific and not already covered by the Saturn or Pluto entries.

**4. The `condition: 'direct'` exclusion.**

The spec above excludes `'direct'` condition entries for this feature, noting that `'direct'` only fires when the specified planet is simultaneously the dominant transit planet and not retrograde, which rarely applies to lower-priority planets. This exclusion should be verified during implementation. Specifically: if there is a pip card where a Mercury-direct entry would be meaningfully different from an `'any'` entry and where Mercury being direct (as opposed to retrograde) is the symbolically charged condition, an exception can be made. The Two of Swords already gets a Mercury retrograde entry; a Mercury-direct entry for that card (the fog lifting, the blindfold partially off) would be a symbolically useful counterpart. However, given the `'direct'` condition's firing requirements, this would only produce output for the rare user with no outer planet transits active. The tradeoff should be considered on a per-card basis.

---
## Outcome
Status: done
Implementation: Added 101 new entries to transitAdaptations.ts. Coverage: The Fool (2 entries: Saturn, Uranus), Justice (2 entries: Saturn, Venus), all 28 pip cards Two-Nine with Saturn+Pluto+suit-planet entries (Swords/Wands: +Mars, Cups: +Neptune, Pentacles: +Venus). Mercury retrograde entries for Two of Swords, Eight of Swords, Seven of Cups. Also included: vite.config.ts test exclusion for .worktrees. Total entries after: 193.
