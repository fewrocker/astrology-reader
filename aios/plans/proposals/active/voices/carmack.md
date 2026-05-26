# Technical Analysis — Tarot Module (Sprint 0027)
*Voice: John Carmack*

---

## What I Read Before Writing This

Sprint 0027 vision, the guidelines, then the actual code: `src/engine/tarot.ts` (full), `src/data/tarot/transitAdaptations.ts` (full), `src/data/tarot/wands.ts`, `cups.ts`, `swords.ts`, `pentacles.ts`, `majorArcana.ts` (pip cards scanned), `server/services/gptTarot.ts` (full), `src/components/tarot/TarotInterpretationPanel.tsx`, `src/components/tarot/tarotUtils.ts`, `src/engine/__tests__/tarot.test.ts`, `src/data/tarot/__tests__/cards.completeness.test.ts`, `src/data/tarot/spreadPositions.ts`, `src/data/tarot/types.ts`, and the previous Carmack voice document for sprint 0024 to understand what was fixed.

The sprint 0024 analysis identified eight major structural problems. All of them appear to have been resolved by sprints 0025 and 0026: the Celtic stub is gone, `buildEngineCtx` now calls `buildTarotAstroContext` with real transit data via `tarotUtils.ts`, the type proliferation was consolidated, elemental dignity signals were added to both three-card and Celtic synthesis, the formatTransitSummary duplication was given a canonical home in `tarotUtils.ts` (still with a server-side mirror, which is the right trade-off). The architecture is genuinely in good shape. What remains is data, not code.

---

## The Coverage Gap: What It Actually Is Mechanically

The sprint vision explains the problem correctly. Let me restate it as a concrete trace through the code:

`buildTransitInfluence` in `src/engine/tarot.ts` lines 680–755 implements three levels:

- **Level 1** (lines 687–710): Looks up `TRANSIT_ADAPTATIONS_BY_CARD[card.id]` and iterates entries to find a matching planet/condition pair. If found, returns `entry.emphasis`.
- **Level 2** (lines 712–737): Element affinity. Uses `PLANET_ELEMENT_MAP` to classify the dominant transit planet as a Fire/Earth/Air/Water planet, compares to `card.element`, and generates a generic or position-aware affinity string.
- **Level 3** (lines 741–754): Falls through to the card's `baselineNote` in `ASTRO_CONNECTIONS`, or the card's `rulingPlanet`, or the card's `element`, or a fully generic fallback.

The `TRANSIT_ADAPTATIONS_BY_CARD` lookup reduces to a hash map keyed on `cardId`. For any card not in that map, Level 1 silently exits and Level 2 runs. Level 2 works by classifying the transit planet's element and comparing to the card's element — it does not know the specific card at all. The output for a Saturn transit on the Two of Wands is structurally identical to the output for a Saturn transit on the Nine of Pentacles: "The current Saturn transit introduces grounding energy into this Fire card" versus "The current Saturn transit amplifies this Earth card's nature." Neither sentence names anything specific to the card drawing it.

The current entry count is 92 adaptations across 48 unique card IDs. The 28 pip cards (Two through Nine of all four suits) have zero entries. The Fool and Justice have zero entries. That is 30 of 78 cards with no Level 1 path, representing 38% of the deck.

The practical impact: under a Saturn, Pluto, or Uranus transit — which is almost always the `dominantTransitPlanet` for most users' charts given how these outer planets operate — drawing any of these 30 cards produces a Level 2 output. Level 2 is not wrong, but it is not card-specific. The transit note in the "In Your Sky Now" panel for a Two of Wands draw under Pluto reads the same structure as for a Seven of Cups draw under Pluto. The card's specific symbolic charge — the Two of Wands' particular burden of vision held without movement, versus the Seven of Cups' particular burden of fantasy untethered from commitment — is completely absent from the transit note.

---

## The Reversed Meaning Quality Gap: A Data Fidelity Problem

Reading the pip card reversed meanings across all four suits, the pattern is consistent: the reversed text for Twos through Nines is structurally a simple negation or blockage framing. Two of Wands reversed: "vision without movement." Three of Wands reversed: "delays and setbacks." Eight of Cups reversed: "difficulty leaving something." Nine of Pentacles reversed: "independence has become isolation."

These are accurate. They are not wrong. But compare them to what sprint 0026 established as the bar with the Major Arcana reversals: the reversed High Priestess is not "blocked intuition" — it is "certainty and truth are not the same thing, and the Priestess reversed is the one who has stopped being able to distinguish between them." The reversed Strength is not "blocked courage" — it is "someone who has confused endurance with courage and cannot put the weight down because the weight has become their name."

The pip reversed meanings are doing description, not diagnosis. They describe what the energy looks like when reversed, not what specific psychological configuration produces that appearance. The difference matters because the `coreMeaning` field in `TarotInterpretationPanel.tsx` is what the user reads first and most carefully. A reversed pip card drawn in the "In Your Sky Now" context should name the arrested psychology with the same precision that the Major Arcana reversals now achieve.

The Swords suit is the most critical target here. Eight of Swords reversed: "the beginning of release — the blindfold slipping, the bonds being recognized as loose enough to escape, the first moment of seeing that the cage is not as sealed as it appeared." That is a description of the reversal's resolution phase, but it doesn't name the specific form of self-imprisonment the card is diagnosing. Compare to what the vision asks for: naming "the specific experience of realizing the blindfold was voluntary all along." That is a different and much sharper psychological identification. Nine of Swords reversed: "the anxiety is beginning to subside as daylight brings perspective back, or the suffering has gone deeper underground." Again, description of possible states rather than diagnosis of the specific pattern.

---

## The Single-Card Position Fallthrough: An Underexplored Improvement

`buildTransitInfluence` in `src/engine/tarot.ts` lines 719–733: when `register !== null` (spread positions with temporal or relational valence), the position-aware `buildPositionAwareAffinityLine` function is called. This is good — it produces contextually warmer Level 2 output when the card lands in a "past-root" or "future-emerging" position.

But single-card draws pass `position: null` to `computeInstantInterpretation`, which propagates to `getPositionRegister(null)` returning `null`, which means `register === null` at line 720. The code falls through to the generic non-position-aware affinity lines at lines 724–732: "The current Saturn transit amplifies this card's Earth nature — patience and long game are heightened now." This runs regardless of whether this is a daily draw with no question or a pull within an untracked reading context.

The `SPREAD_POSITIONS` array at `src/data/tarot/spreadPositions.ts` already has a `'single'` position entry (id: `'single'`, label: `'The Card'`) at line 18. `computeInstantInterpretation` in `src/engine/tarot.ts` is called with `position: SpreadPosition | null` — passing the single-card position object instead of `null` would flow through `getPositionRegister`, which would return `'present-active'` (since `single` is in neither `PAST_ROOT_POSITION_IDS` nor `FUTURE_EMERGING_POSITION_IDS`), and then `buildPositionAwareAffinityLine` would run with the `present-active` register. The resulting text would be marginally warmer: "The current Saturn transit amplifies this card's Earth nature — patience and long game are heightened now" becomes "The current Saturn transit amplifies this card's Earth nature — patience and long game are immediately alive in this position." Not a dramatic change, but it routes the single-card draw through the same code path as all spread positions, removing a special case.

The callers of `computeInstantInterpretation` for single draws — in `SingleCardReading.tsx` or equivalent — would need to pass the `single` position from `SPREAD_POSITIONS.find(p => p.id === 'single')` instead of `null`. Small change, removes a special-case branch.

---

## A Typo in a Public Interface

`TarotAstroContext` in `src/engine/tarot.ts` line 53: the field is named `retrogradeplanets` with a lowercase 'p'. Should be `retrogradeplanets` → `retrogradePlanets`. This is a public interface exported from the engine. The typo propagates through `src/engine/__tests__/tarot.test.ts` line 102 (`retrogradeplanets: ['Mercury']`), through `buildTarotAstroContext` in the same file at line 573, and through all the access sites at lines 690, 696, 704, 764. It does not cause any functional bug since the name is consistent throughout, but it is a camelCase violation in a public type that will be visible forever if not corrected. Every sprint adds more code that touches this field. The longer it stays wrong, the more expensive the rename becomes. This sprint is adding transit adaptation entries that will reference `astroContext.retrogradeplanets` — more sites to fix later.

The fix is a project-wide rename. There are exactly 9 occurrences of `retrogradeplanets` in the codebase. Run the rename now while the count is low.

---

## The SIGN_RULERSHIPS Duplication Is Still Unresolved

`SIGN_RULERSHIPS` in `src/engine/tarot.ts` lines 20–33 and `SIGN_RULERSHIPS_SERVER` in `server/services/gptTarot.ts` lines 43–56 are identical records. The comment on line 19 says "Server-side mirror lives in `server/services/gptTarot.ts` — kept in lockstep." The `SIGN_MODALITIES_SERVER` in `gptTarot.ts` at lines 74–79 is also duplicated: there is a `SIGN_MODALITIES` in `src/engine/types.ts` already (confirmed by the import on `src/engine/tarot.ts` line 8: `import { SIGN_ELEMENTS, SIGN_MODALITIES } from './types'`). And `SERVER_SIGN_MODALITIES` at lines 475–479 in `gptTarot.ts` is a third copy of the same data.

That means `SIGN_MODALITIES` exists in three places in the codebase. The sprint 0024 analysis noted `formatTransitSummary` was duplicated; it now has a canonical home in `tarotUtils.ts`. The modality and rulership constants have not received the same treatment. For this sprint, the risk is low — the sprint vision explicitly says "Not GPT prompt restructuring" and the server handler is not being touched. But if the constants diverge (someone adds an Aquarius traditional rulership note, or updates Scorpio from Pluto to Mars-traditional), the bug will be silent and planet-specific and hard to diagnose.

---

## The Test Coverage Gap for Transit Adaptations

`src/data/tarot/__tests__/cards.completeness.test.ts` tests that `TRANSIT_ADAPTATIONS.length >= 50` (line 98-100). After sprint 0027 adds ~60-90 new entries, this threshold will need updating or it becomes a meaninglessly low floor. More importantly, there is no test that verifies coverage against a target card set. There is a test that all transit adaptation `cardId` values reference valid cards (lines 111-119), but no test that says "the pip cards Two through Nine of each suit must each have at least one transit adaptation entry."

After this sprint ships, adding such a coverage test would lock in the work and prevent future regressions where someone reorganizes the file and accidentally removes entries. The test would be:

```typescript
it('all pip cards Two through Nine have at least one transit adaptation entry', () => {
  const suits = ['wands', 'cups', 'swords', 'pentacles'] as const
  const adaptationCardIds = new Set(TRANSIT_ADAPTATIONS.map(e => e.cardId))
  for (const suit of suits) {
    for (let n = 2; n <= 9; n++) {
      const id = `${numberToWord(n)}-of-${suit}` // e.g. 'two-of-wands'
      expect(adaptationCardIds.has(id), `Missing transit adaptations for ${id}`).toBe(true)
    }
  }
})
```

This is the right kind of guard for data that is being actively maintained — the test defines the coverage contract, not just a floor.

---

## The `TRANSIT_ADAPTATIONS_BY_CARD` Reduce Is Correct but Positioned Wrong

`transitAdaptations.ts` exports two things: the raw `TRANSIT_ADAPTATIONS` array (used by tests) and the `TRANSIT_ADAPTATIONS_BY_CARD` Record (used by the engine). The reduce operation at lines 656-664 runs at module load time. That is fine — it runs once.

What concerns me is the format of the primary array. `transitAdaptations.ts` is 664 lines for 92 entries. After this sprint adds roughly 60-90 more entries (28 pip cards × 2-3 entries each, plus 4 Major Arcana entries), the file will be approximately 1,200-1,400 lines. That is still manageable in a single file, but the organizational pattern — entries grouped by card with inline comments — will require discipline to maintain as the count approaches 150+. No structural change is needed for this sprint, but when the entry count crosses 150 a split into per-suit files (transitAdaptations.wands.ts, etc.) with a barrel export would be worth doing.

The current data model is flat: `{ cardId, planet, condition, emphasis }`. There is no ordering guarantee within the array for a given `cardId`. `buildTransitInfluence` iterates through the adaptations for a card in insertion order. If a card has three entries — say, Saturn, Pluto, Uranus — and the actual dominant transit planet is Pluto, the function scans Saturn first, doesn't match, scans Pluto, matches, returns. That's O(n) per lookup with n being the number of entries per card (small, typically 2-4), not O(total entries), because of the reduce into `TRANSIT_ADAPTATIONS_BY_CARD`. So the lookup is actually fine. The reduce pays the organization cost at load time. No issue here.

---

## What the Sprint Vision Got Right Technically

The three-level fallback architecture was the right design. The current sprint is exactly what the architecture was designed to accommodate: adding data to Level 1 without touching Level 2 or Level 3. The `transitAdaptations.ts` data file is decoupled from the engine function that reads it. Adding 60-90 entries does not require changing `buildTransitInfluence`, does not require changing the tests for the engine, and does not require changing the components. Pure data addition. This is the correct interface.

The instructions on which planets to target per suit (Mars for Wands and Swords, Neptune for Cups, Venus for Pentacles, Mercury retrograde for mental Swords cards) are not in the code — they are in the vision document. They should also be encoded as comments in `transitAdaptations.ts` when the entries are added, so future maintainers understand the selection logic without re-reading the sprint document. Something like `// Two through Nine: Wands entries — Saturn (all), Pluto (all), Mars (all), Uranus (Fives, Sevens, Eights)` as a section header.

The reversed meaning bar set by sprint 0026's Major Arcana rewrites is the right bar. The test at line 67-73 in `cards.completeness.test.ts` (`all reversed meanings are at least 20 chars long`) is not the right quality gate — 20 characters is trivially achievable with generic text. The real quality gate is editorial: does the reversed text name a specific psychological configuration, or does it describe a generic blockage? No automated test can catch the difference. The only way to enforce the standard is to have the sprint vision document state it explicitly and then hold it during review. The vision document does state it explicitly. The enforcement is human.

---

## What to Do In This Sprint, Precisely

The sprint is data, not code. Two writing tasks:

**Task 1** (`transitAdaptations.ts`): Add transit adaptation entries for the 30 missing cards. For each of the 28 pip cards (Two through Nine × four suits), write 2-3 entries. For The Fool and Justice, write 2 entries each. Each entry must pass the same quality bar as the existing Major Arcana entries: name the specific meeting between that card's symbolic field and that planet's register, not generic transit-astrology copy. Saturn on the Two of Wands is not "Saturn brings restriction to your vision" — it is the person who has held the world in their hand for so long without taking the step that Saturn is now requiring the commitment cost of the decision itself. Every entry should be testable against the question: if you read this without knowing the card's name, could you reconstruct which card it was written for?

**Task 2** (four suit files): Elevate the `reversedMeaning` field for pip cards Two through Nine where the current text is generic. Priority order: Swords (highest psychic density), then Cups, then Wands, then Pentacles. Focus on Eight, Nine, and Ten of each suit first (densest psychology), then Two and Three (most symbolically specific). The standard: the reversed text should name a psychology, not a blockage. "Escaped self-imposed limitation" is a blockage. "The specific experience of realizing the blindfold was voluntary all along" is a psychology.

**Task 3** (optional, low effort): Pass the `single` position from `SPREAD_POSITIONS` instead of `null` to `computeInstantInterpretation` for single-card draws. Routes single draws through the same `buildPositionAwareAffinityLine` path as spread positions, removes the special-case branch, produces slightly warmer Level 2 text for the cases where Level 1 still doesn't apply after this sprint's data additions.

The `retrogradeplanets` typo is not a sprint 0027 item — it is cross-cutting and will touch files not otherwise modified. Schedule it for a dedicated refactor sprint or do it as a standalone commit before the data additions start.

---

## Final Assessment

The architecture is sound. The engine's three-level fallback was designed for exactly this kind of incremental data expansion. The separation between the interpretation engine and the data files means this sprint is a pure writing task — no risk of breaking the synthesis prompt architecture, no risk of introducing type mismatches, no risk of altering component behavior.

The only technical risk is quality: writing 60-90 transit adaptation entries is a lot of text, and the temptation to produce generic copy ("Saturn brings challenge to the Two of Wands' vision") is real. The existing entries for court cards and Major Arcana were clearly written with care; the pip card entries need the same care. The vision document's quality test — "if this entry reads like 'Saturn brings restriction to the Two of Wands' rather than naming the specific experience of sustained effort being tested at exactly the moment when commitment was just forming, it is not done" — is the right test. Apply it to every entry.

The second technical risk is scope creep. The sprint vision correctly excludes GPT prompt restructuring, new spreads, and visual changes. The temptation to improve the transit influence text for cards that *already have* Level 1 entries is a scope risk — don't. The existing entries are strong. The gap is the 30 cards with no entries. Fix the gap.

*The code is ready for the data. Write the data.*
