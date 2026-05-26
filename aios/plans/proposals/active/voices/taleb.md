# Taleb's Risk Review — Sprint 0027: Transit Coverage & Reversed Depth

*Nassim Nicholas Taleb. May 2026.*

---

## Opening Observation

Let me begin with what has been accomplished since I wrote the sprint-0024 review, because I am capable of acknowledging when a codebase improves.

The three parallel `TarotAstroContext` type definitions are gone. `TarotContext.tsx` now imports from `src/engine/tarot.ts` directly and re-exports the canonical types. The Celtic Cross stub is gone — `CelticCrossReading.tsx` now calls `computeInstantInterpretation` from the real engine. The Celtic Cross synthesis now calls `calculateTransits()` and populates `dailyTransitSummary` and `weeklyTransitSummary`. The intention threading is no longer a one-line insertion — it is an `intentionAnchor` instruction that appears multiple times in the prompt with explicit paragraph-by-paragraph requirements. The seeded draw has been unified. These were the most critical structural fragilities I named, and they were addressed.

The foundation is now honest about what it does.

Sprint 0027 operates on a different problem. The sprint is fundamentally a data completion task: write 56-plus transit adaptation entries and elevate 28 reversed meanings. This is craft work, not structural work. The fragilities I am naming today are different in character from the ones I named before — they are not scaffolding failures but quality-control gaps, coverage logic errors, and hidden assumptions about what "completion" means.

Here is what I see.

---

## 1. The `dominantTransitPlanet` Single-Winner Selection Is the Wrong Architecture for Coverage

This is the most important fragility in the entire transit adaptation system, and the sprint is proposing to build more data on top of it without changing the architecture.

In `buildTransitInfluence()` at line 680–755 of `src/engine/tarot.ts`, the Level 1 lookup iterates through the `TRANSIT_ADAPTATIONS` for a card and matches entries against `astroContext.dominantTransitPlanet` or `astroContext.retrogradeplanets`. The `dominantTransitPlanet` field is computed in `buildTarotAstroContext()` by iterating through `currentTransits` and selecting the single highest-priority planet by `PLANET_PRIORITY`.

The priority table is: Pluto=10, Neptune=9, Uranus=8, Saturn=7, Jupiter=5, Mars=3, Sun=2, Venus=2, Mercury=1, Moon=1.

Here is the fragility: a user with Saturn conjunct natal Sun (orb 0.2°, applying, a defining transit of their year) will have Saturn suppressed as `dominantTransitPlanet` if they also have a Pluto transit active — say, Pluto trine natal Moon (orb 3.5°, separating, largely past its peak). Pluto wins by priority. The Saturn transit adaptation fires, if it exists. The specific, tight, cardinal-year Saturn transit does not.

The priority system treats planet identity as a proxy for significance, but planet identity is not the same thing as the significance of a specific transit. A wide, separating Pluto trine is less significant for most people on most days than a tight, applying Saturn opposition. The system has no concept of orb, applying/separating status, or transit type — it only knows which planet has the highest static priority number.

**What this means for sprint 0027's work:** The team is about to write approximately 56 new transit adaptation entries, each carefully crafted to name "the specific meeting between the card's symbolic field and the transit planet's register." Every one of these entries will fire conditionally based on whether the relevant planet is the highest-priority transit planet active for the user. For a user with Pluto dominant (which is many users, since Pluto moves slowly and its orb window is wide), almost no Saturn, Uranus, or Mars entries will ever fire regardless of how well-written they are. The coverage improvement the sprint claims will materialize for users without an active Pluto transit; for users with an active Pluto transit, it will be invisible.

The team believes writing the entries completes the coverage. Completing the entries only completes the data layer. Whether the entries are accessible to real users depends on the single-winner selection logic that the sprint is not touching.

---

## 2. The Retrograde Matching Logic Has a Priority-Override Bug

Look at the Level 1 matching logic in `buildTransitInfluence()`, specifically the `condition: 'any'` branch:

```typescript
} else {
  // 'any' — match if dominant or retrograde
  if (
    astroContext.dominantTransitPlanet === entry.planet ||
    astroContext.retrogradeplanets.includes(entry.planet)
  ) {
    return entry.emphasis
  }
}
```

The retrograde branch of this condition fires for any planet that is retrograde — regardless of whether that planet is the dominant transit planet. This means that if Mercury is retrograde (which it is for roughly 19% of the year), any card that has an `any`-condition Mercury entry will match, even if Pluto is the dominant transit planet for this user.

Now combine this with iteration order. The function iterates through `adaptations` in array order. If a card's Mercury retrograde entry appears before its Saturn entry in `TRANSIT_ADAPTATIONS`, the Mercury retrograde text fires every time Mercury is retrograde, regardless of what Saturn is doing.

The Three of Swords has: `condition: 'retrograde'` for Venus retrograde. The Hermit has: `condition: 'retrograde'` for Mercury retrograde, `condition: 'direct'` for Mercury direct, and `condition: 'any'` for Saturn. If Mercury is retrograde and Saturn is the dominant transit planet, the Hermit's matching logic will:

1. Check the Mercury retrograde entry: `astroContext.retrogradeplanets.includes('Mercury')` — true. Return the Mercury text.

The Saturn entry is never reached.

This is not a theoretical edge case. Mercury is retrograde three times per year for approximately three weeks each. During Mercury retrograde seasons, any card with a Mercury retrograde `condition: 'any'` entry will always return the Mercury text, even when Saturn or Pluto is doing something far more significant for the person drawing.

The new pip card entries will be written and tested in a non-retrograde-Mercury environment. The sprint will conclude. Three weeks later, Mercury goes retrograde, and every pip card with a Mercury entry among the new additions will snap to that text regardless of the actual dominant transit. Nobody will notice because the text is plausible and Mercury retrograde is a real thing. The silent wrong result will be the common result.

---

## 3. The `condition: 'direct'` Match Logic Is Not What Its Name Implies

For entries with `condition: 'direct'`, the matching logic is:

```typescript
if (
  astroContext.dominantTransitPlanet === entry.planet &&
  !astroContext.retrogradeplanets.includes(entry.planet)
) {
  return entry.emphasis
}
```

This fires only when the planet is both the dominant transit planet AND direct. "Direct" here does not mean the planet is active and moving forward — it means the planet is the single highest-priority active transit planet and not currently retrograde. A Mercury-direct entry for a card fires only when Mercury is the dominant transit planet. Mercury is priority 1 in the priority table. Mercury is almost never the dominant transit planet unless no other transit aspect is active.

The Magician has `condition: 'direct'` for Mercury. The Chariot has `condition: 'direct'` for Mercury retrograde's inverse. The Hermit has `condition: 'direct'` for Mercury direct. These entries are effectively dead letter in any chart where any other transit aspect is active, because Mercury-as-dominant requires the complete absence of active Pluto, Neptune, Uranus, Saturn, Jupiter, Mars, Sun, and Venus transits. This is rare.

The vision document for sprint 0027 explicitly adds `condition: 'direct'` entries to the vocabulary for new pip cards (Mercury direct for Two of Swords). Before writing such entries, the team should verify whether they will ever fire under realistic conditions. For lower-priority planets, `condition: 'direct'` is almost certainly a dead entry.

---

## 4. The Single-Card Draw Falls Through to Generic Text for Most Users on Most Days

The sprint's tertiary target acknowledges this: "For single card draws, the `position` is `null` and the function falls through to the non-position-aware generic line."

I want to name the full scope of what this means.

In `buildTransitInfluence()`, the Level 2 fallback for position-aware affinity requires `register !== null`. The `getPositionRegister()` function returns `null` when the position id is not in `PAST_ROOT_POSITION_IDS` or `FUTURE_EMERGING_POSITION_IDS`. The single card position has `id: 'single'`, which is not in either set. So for single card draws, even when a position object is passed (from `SPREAD_POSITIONS`), the register is null, and the position-aware logic is bypassed.

The fix proposed by the sprint — "adding a minimal position context for the single card position" — would work. But consider the scope of what falls through: single card draws are described as "the most common draw type." For every user who draws a single daily card and does not have a Level 1 specific transit adaptation hit (which is every user who draws any of the 28 pip cards currently missing adaptations, plus any card under a transit planet without a specific entry), the transit note reads:

"The current [Planet] transit amplifies this card's [Element] nature — [keyword0] and [keyword1] are heightened now."

or

"The current [Planet] transit introduces [element-adj] energy into this [Element] card — a call to integrate these opposing forces consciously."

These are not descriptions. They are linguistic templates. They carry no information. Any user who draws a daily card and has an active Saturn transit receives a sentence about Saturn introducing "grounding energy" or "amplifying the card's Earth nature" — regardless of which of the 78 cards they drew, what position they are in, and what Saturn is actually doing in their chart.

The sprint will reduce how often Level 2 is reached by filling Level 1 for the missing pip cards. It will not change the fact that when Level 2 fires, the output is formulaic. The tertiary fix for single-card draws is directionally correct and worth doing. But the Level 2 text itself is never examined in this sprint's scope.

---

## 5. The Reversed Meaning Standard Has an Unmeasurable Quality Bar

The sprint vision sets a specific quality standard: "The Two of Wands reversed is not just 'vision without movement' but specifically the person who re-plans the same journey to avoid the risk of taking it."

This is good. This is the right standard.

Now look at what is actually in the codebase for the pip card reversed meanings. The Two of Wands reversed: "The Two of Wands reversed speaks of vision without movement — a future that has been mapped and planned and re-planned but never committed to." The vision's example improvement is almost literally already in the existing text. The current text says "re-planned but never committed to." The vision says the target is "the person who re-plans the same journey to avoid the risk of taking it." The gap is a single clause.

I am not saying the existing reversed meanings are good enough. Some are genuinely short and non-specific. The Eight of Swords reversed is: "The Eight of Swords reversed signals the beginning of release — the blindfold slipping, the bonds being recognized as loose enough to escape." The vision example for this card is better: "the specific experience of realizing the blindfold was voluntary all along." That is a real improvement.

But the quality bar as stated — "must describe a psychology, not a negation" — is a standard that can be met by any text that avoids the word "blocked" and contains a human-sounding description. A developer writing these entries can satisfy the stated test while producing text that is psychologically vague, that could apply to many people in many situations, and that does not actually "name the particular arrested form of the archetype."

There is no test for this. There is no reviewer. There is no canonical example of a failed reversal text that would help a developer recognize when their proposed improvement falls short. The sprint will declare the reversed meanings elevated when the entries are written. Whether the entries meet the "Six of Cups reversed describes what it looks like when someone is living in memory rather than moving through it" standard is a judgment that will not be made systematically.

The failure mode is not bad writing. The failure mode is competent-but-shallow writing that passes a quick read and does not actually meet the standard. This is the most likely outcome for approximately half the reversed meanings that will be written under time pressure.

---

## 6. The Planet-Condition Matrix Is Sparse in Ways That Will Persist

The sprint vision defines the target coverage: "Two to three entries per card, each in the same voice and register as the existing Major Arcana entries." For 28 pip cards plus 2 Major Arcana, this means approximately 60 to 90 new entries.

But the existing data has a pattern worth examining. Look at what planets are covered across the current 92 entries:

- Saturn: covered for The Tower, Death, Hanged Man, Hermit, Wheel, Judgement, World, Emperor, Hierophant, Temperance, Devil, Ten of Wands, Ten of Pentacles, Four of Pentacles, and all 16 court cards.
- Pluto: covered for Tower, Death, Judgement, Devil, Hanged Man, and court cards.
- Uranus: covered for Tower, Star, Wheel, and court cards.
- Neptune: covered for Moon, Hanged Man, High Priestess, Four of Cups.
- Venus: covered for Lovers, Three of Swords (retrograde), Empress, Ace of Cups.
- Mercury: covered for Hermit (both conditions), Hanged Man (retrograde), Moon (retrograde), Chariot (retrograde), Magician (both conditions).
- Jupiter: covered for Star, Wheel, World, Temperance, Hierophant, Empress, Ace of Pentacles, Nine of Cups, Ten of Cups, Ten of Pentacles.
- Mars: covered for Tower, Strength, Emperor, Chariot, Ace of Wands.
- Sun: covered for Strength, Sun card.

The new pip entries are directed toward Saturn, Pluto, Uranus as the "reliable trio" plus Mars for Wands/Swords, Neptune for Cups, Venus for Pentacles. This is sound guidance.

The fragility is what happens at the boundaries of this coverage. A user with an active Jupiter transit who draws the Eight of Swords — a card with no Jupiter entry and likely no upcoming Jupiter entry because Jupiter is not on the "reliable trio" list for Swords — will continue to fall through to Level 2. Jupiter is priority 5, meaning it will be the dominant planet whenever there is no active outer planet transit. That is a meaningful fraction of users. The sprint's framing of "Saturn/Pluto/Uranus is almost always active" is true at the population level but conceals the individual cases.

More specifically: Mercury retrograde is not being added as a coverage target for most pip cards, yet the vision document calls out Mercury retrograde as specifically relevant for Two of Swords, Eight of Swords, and Seven of Cups. If these three cards get Mercury retrograde entries, and other pip cards do not, the coverage will be internally inconsistent — some cards respond intelligently to Mercury retrograde and most do not. A user who draws the Five of Swords during Mercury retrograde (decision reversed, communication misfire, deception surfacing) will receive a generic Level 2 element affinity note, while someone who draws the Eight of Swords gets a specific insight. Both cards are Swords. Both are highly relevant to Mercury retrograde's themes.

---

## 7. The `formatTransitSummary` Array Truncation Is Still Not Ordered by Significance

I raised this in the sprint-0024 review as fragility #11. It remains.

The `formatTransitSummary` function in `gptTarot.ts` slices `transitData.transitAspects` to the first 5 (daily) or 7 (weekly). The ordering of `transitData.transitAspects` is determined by `calculateTransits()` in the transit engine. I have not seen documentation confirming that this array is ordered by significance (tight orb + applying + outer planet) rather than by calculation order or planet alphabetization.

Sprint 0027 is deepening the interpretive data layer for the instant interpretation panel. The GPT synthesis — which runs after the instant interpretation and provides the deep personalized reading — still feeds from this transit summary. If the array is not ordered by astrological significance, the synthesis continues to receive a potentially misleading top-5 selection.

This is not a sprint-0027 task. But every sprint that deepens interpretation quality without addressing this creates a higher contrast: the instant interpretation panel will have beautifully specific transit adaptations, and the GPT synthesis paragraph will sometimes cite the wrong transit as dominant.

---

## 8. The `retrogradeplanets` Field Name Is a Typo That Has Been Institutionalized

The `TarotAstroContext` interface defines `retrogradeplanets: string[]` — lowercase 'p' in 'planets,' in a field name that is used eleven times across the engine, tests, and context layer.

The conventional TypeScript camelCase for this would be `retrogradePlanets`. The actual name is `retrogradeplanets`. This is harmless in isolation. But it is a signal about how the codebase names things under sprint pressure, and it will be copied by anyone who extends this interface. Every new field added to `TarotAstroContext` that touches retrograde status will need to decide whether to match this non-standard name or introduce an inconsistency. It is already in tests as `retrogradeplanets: ['Mercury']`. The test fixes the error in place.

I raise this not as a blocking issue but as an indicator of how fast a sprint moves relative to how much it stabilizes. The field was named under pressure and the pressure has never paused long enough to rename it.

---

## 9. The Synthesis Handlers Have Three Parallel Implementations of the Same Modality Computation

`gptTarot.ts` contains:
- `computeDominantModality()` at line 88 (using `SIGN_MODALITIES_SERVER`)
- `computeServerDominantModality()` at line 481 (using `SERVER_SIGN_MODALITIES`)

These are two separate functions in the same file computing the same thing from two separate lookup tables. The comment on `computeServerDominantModality` says it is the "Server-side mirror of the canonical `formatTransitSummary`" — but the comment is wrong; it is the mirror of `computeDominantModality` in `src/engine/tarot.ts`. The first function (`computeDominantModality` at line 88) is used nowhere in the file. The second function (`computeServerDominantModality` at line 481) is used in all three synthesis handlers.

This is dead code in a critical service file, and dead code has a cost: it creates the impression that the first function is an alternative path, causing future developers to wonder when to use which one. More concretely, if a sprint fixes a modality calculation bug in the canonical `src/engine/tarot.ts` function, the developer has to remember to propagate the fix to two places in `gptTarot.ts` rather than one. The documentation that says "kept in lockstep" applies to the server-client mirror. It does not address the duplicate within the server file itself.

---

## 10. What the Sprint Is Not Examining That It Should: The `condition: 'any'` Iteration Order Assumption

The `buildTransitInfluence()` loop iterates through a card's adaptations in the order they appear in the `TRANSIT_ADAPTATIONS` array. For cards that will have multiple entries after this sprint — say, Saturn + Pluto + Uranus for each pip card — the order of entries determines which planet's text fires first when multiple transit conditions are simultaneously met.

Consider a user with both Saturn active (dominant transit planet) and Pluto retrograde simultaneously. For a card with entries ordered: [Saturn, Pluto, Uranus]:

1. Saturn entry: `condition: 'any'`, check `dominantTransitPlanet === 'Saturn'` — true. Return Saturn text.

This is correct. Saturn fires because it is dominant.

Now consider the same card with entries ordered: [Pluto, Saturn, Uranus] and the same sky (Saturn dominant, Pluto retrograde):

1. Pluto entry: `condition: 'any'`, check `dominantTransitPlanet === 'Pluto'` (false) OR `retrogradeplanets.includes('Pluto')` (true, because Pluto is retrograde). Return Pluto text.

The Pluto text fires even though Saturn is the dominant transit planet. The retrograde OR condition in the `'any'` handler means any planet that is retrograde will trigger its entry regardless of its priority.

The new pip card entries will be written in a specified order. The sprint vision says nothing about entry ordering within a card's adaptation array. The developer writing these entries will order them by intuition — likely the order they are written, which tends to put Saturn first because Saturn is named first in the vision document. For most users, this will produce correct behavior. For users with multiple outer planets simultaneously retrograde — which is common, since outer planets are retrograde for months at a time — the order becomes the decision-maker, and the order is invisible to anyone reading the output.

---

## 11. The Saved Readings Architecture Has a Latent Fragility From This Sprint's Output

When a user saves a reading, the reading captures `coreMeaning`, `transitInfluence`, and related fields as they were computed at draw time. Sprint 0027 will improve the `reversedMeaning` for 28 pip cards and add transit adaptations for those same cards.

A user who saved a reading before sprint 0027 ships has a stored reading with the old reversed meaning and old (or absent) transit text. When they open that saved reading, they will see the old text — correct, because the reading was saved at that state. The UI displays saved readings using the stored text, not by recomputing.

After sprint 0027 ships, a user who draws the same card under the same conditions will see significantly different text. This is expected and desired. But it creates an implicit quality gap between new readings and saved readings that will widen with each sprint that improves the data layer.

This is not a bug. It is a design consequence. I name it because it means the "quality bar" being raised by this sprint applies only to future draws, not to the entire existing saved reading corpus. Users who return to their saved readings will see the pre-improvement text. Nobody will tell them that a better reading of the same cards now exists.

---

## 12. The OpenAI Model Hardcoding Has Still Not Been Made Configurable

The `callOpenAI` function in `server/services/gpt.ts` hardcodes `model: 'gpt-4o-mini'`. I named this in sprint 0024 (point #5) specifically in the context of the 3000-token Celtic Cross synthesis. The issue has not been addressed.

Sprint 0027 does not touch the synthesis handlers. But the transit adaptation texts being written this sprint will feed into those handlers. A well-crafted transit entry for the Eight of Swords under Saturn will be included in the GPT prompt payload as `card.transitInfluence`. The model that receives it is still `gpt-4o-mini`. Whether that model can synthesize the richer transit language into a deeper reading output is still untested and undocumented.

I am not claiming `gpt-4o-mini` cannot do this. I am claiming that the team's ability to detect when it fails to is still zero. There is no test harness, no canonical sample, no comparison between model outputs for the same payload. The improvement in the data layer has no corresponding improvement in the quality detection infrastructure.

---

## Summary of Fragilities

| # | Fragility | Type | Risk Level |
|---|-----------|------|------------|
| 1 | Single-winner dominant planet selection discards highly relevant transits | Architecture | High — sprint's coverage claims are partially misleading |
| 2 | Retrograde `condition: 'any'` fires regardless of priority, can override dominant planet | Logic bug | High — affects all cards during Mercury/Venus/Saturn retrograde seasons |
| 3 | `condition: 'direct'` for low-priority planets is effectively dead letter | Coverage | Medium — entries will be written that rarely or never fire |
| 4 | Single-card draws fall through to generic text when position register is null | Coverage | Medium — most common draw type often reaches Level 2 |
| 5 | Reversed meaning quality bar is unmeasurable without a review function | Process | High — improvement will be declared without verification |
| 6 | Planet coverage is internally inconsistent (Mercury retrograde selected for 3 cards, not systematically applied) | Coverage | Medium — creates noticeable quality gaps within the same suit |
| 7 | `formatTransitSummary` truncation may not be orb/significance ordered | Data | Medium — GPT synthesis can be fed non-dominant transits |
| 8 | `retrogradeplanets` typo institutionalized across 11 usages | Code quality | Low — accumulating inconsistency |
| 9 | Dead code `computeDominantModality` in `gptTarot.ts` alongside active duplicate | Code quality | Low-Medium — divergence risk on future bug fixes |
| 10 | Adaptation entry iteration order determines output under multi-retrograde skies | Architecture | Medium — invisible decision-making |
| 11 | Improved data layer applies only to future draws; saved readings preserve pre-improvement text | UX | Low — expected behavior with unexamined user-facing implications |
| 12 | OpenAI model hardcoded, no quality detection infrastructure for richer prompts | Infrastructure | Medium — improvements cannot be measured |

---

## What This Sprint Is Actually Getting Right

I want to be precise, because my previous reviews were focused on structural failures that warranted the harshness. This sprint is different.

The work being done in sprint 0027 is the right work. Writing specific, card-keyed, planet-keyed transit adaptations for the 28 pip cards is the only honest way to close the coverage gap. There is no architectural shortcut. The reversed meaning rewrites, when done to the standard the vision sets, will make a real qualitative difference in what users receive. The sprint vision's quality bar — "if this entry reads like 'Saturn brings restriction to the Two of Wands' rather than naming the specific experience of sustained effort being tested at exactly the moment when commitment was just forming, it is not done" — is exactly the right bar.

The fragilities I am naming are not arguments against the sprint. They are arguments for understanding what the sprint's improvements will and will not achieve.

Specifically: after this sprint ships, a user who draws the Two of Wands under an active Saturn transit will receive a beautiful, specific transit note. That is a real improvement. What the sprint cannot control is whether that same user also has Pluto retrograde, in which case the Saturn entry may never fire. What the sprint cannot control is the quality of the reversed meaning under review pressure at entry 23 of 28. What the sprint cannot control is whether the GPT model that receives the richer transit payload produces a commensurately deeper synthesis.

The data layer improvement is real. The system that delivers that improvement to users is fragile in ways that the sprint has not addressed and perhaps should not attempt to address in a single sprint. Name those fragilities clearly so the next review does not find them listed as surprises.

Robustness is not achieved by adding better data to a brittle delivery mechanism. It is achieved when the data quality and the delivery mechanism are improved in proportion.
