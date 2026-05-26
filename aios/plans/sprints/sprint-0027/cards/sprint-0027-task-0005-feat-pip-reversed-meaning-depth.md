# Feature: Pip Card Reversed Meaning Depth

**Type:** Feature
**Originated by:** Jobs, Carmack, Miyazaki, Taleb (all four)

---

## Problem / Opportunity

The `reversedMeaning` field for pip cards Two through Nine is structurally correct but psychologically shallow. It describes the reversed state from the outside — what the situation looks like, what the energy is doing, what behavior is exhibited — without naming the specific inner arrangement that produces that experience.

Sprint 0026 established a quality standard with seven Major Arcana reversals. The reversed Strength does not say "blocked courage" or "endurance pushed too far." It names the specific person: "someone who has confused endurance with courage and cannot put the weight down because the weight has become their name." The reversed High Priestess does not say "blocked intuition." It names the specific distortion: "certainty and truth are not the same thing, and the Priestess reversed is the one who has stopped being able to distinguish between them." These formulations identify a psychology, not a symptom.

The pip card reversed meanings have not reached this standard. Current examples that illustrate the gap:

- **Eight of Swords reversed:** "signals the beginning of release — the blindfold slipping, the bonds being recognized as loose enough to escape, the first moment of seeing that the cage is not as sealed as it appeared." This describes a directional phase (release beginning) and a moment of perception. It does not name what that specific perception costs — the particular recognition that the confinement was self-authored, that the cage was built and maintained voluntarily, and that realizing this carries grief alongside freedom.

- **Nine of Swords reversed:** "the anxiety is beginning to subside as daylight brings perspective back, or the suffering has gone deeper underground." Two possible states, one positive and one negative, each described behaviorally. Neither names the specific psychology of someone whose anxiety management has become a second anxiety — the vigilance of a person who monitors their own mind so carefully they have lost access to what the original signal was actually trying to say.

- **Six of Cups reversed:** "the past is being idealized to the point where it prevents full engagement with the present." Accurate. But it doesn't name who this person is: someone who has gotten better at inhabiting memory than the present because the past has been edited by recollection into a place where the self was okay, and the present hasn't been granted the same editorial mercy yet.

- **Seven of Pentacles reversed:** "impatience that is disrupting a sound long-term investment — harvesting too early, abandoning what needed more time." Names the behavior (harvesting too early). Does not name the psychology that drives it: the specific fear that waiting means being foolish, that the harvest will not come, that the entire investment was a mistake, and that the only remaining dignity is to cut losses before anyone notices.

- **Two of Wands reversed:** "vision without movement — a future that has been mapped and planned and re-planned but never committed to." Closer than most. But it does not name why the re-planning happens: the person who re-plans the same journey specifically because planning is the version of the journey that cannot disappoint, because the horizon stays beautiful precisely as long as it has not been tested by proximity.

Approximately 30% of all draws are reversed. The `coreMeaning` field — which shows the `reversedMeaning` when a card is drawn reversed — is the primary text the user reads in the "Core Meaning" section of `TarotInterpretationPanel.tsx`. It is the first substantial text that renders, it receives the most reading time, and it is the sentence the user carries forward into their day. A reversed pip draw that produces a behavioral description rather than a psychological portrait leaves the user nodding at a label rather than recognizing themselves.

The quality gap is audible. The Swords suit is drawn most frequently in readings about mental anguish, sleeplessness, and decisions that are eating at someone. A person drawing the reversed Nine of Swords at 3am is in genuine distress. What they need is not two options for what their anxiety is doing. What they need is a sentence that names the specific psychology of the person whose anxiety management has become indistinguishable from the anxiety itself.

---

## Vision

When this feature is complete, drawing any pip card reversed produces text that a person could read and recognize themselves — not as a behavioral type or a situation category, but as a specific inner arrangement that they are living inside right now.

The user drawing the reversed Eight of Swords does not read "the blindfold is slipping" and nod. They read about the specific experience of realizing the confinement was voluntary all along — that the story they have been telling themselves about why they cannot leave was a story with them as its author, and that this recognition carries a strange grief because the freedom was always available. They stop.

The user drawing the reversed Six of Cups does not read "living in the past." They read about the person who has become a more skilled inhabitant of memory than of the present, and why: the past has been curated by recollection into a place where the self was okay, while the present hasn't been granted that same mercy. They recognize that this is what they have been doing.

The user drawing the reversed Nine of Cups does not read "fulfillment arrived hollow." They read about the specific disorientation of the wish coming true and the wisher remaining unchanged — the discovery that getting what you wanted does not cure the wanting, and the unsettling question of who you are when you can no longer organize yourself around the pursuit.

In each case the experience of the user changes from recognition-of-category to recognition-of-self. This is the qualitative shift. The current text produces the first. The rewritten text must produce the second.

---

## Specifications

### 1. The Psychological Standard

Each rewritten reversed meaning must name the specific arrested psychology that the reversed card represents — not the behavior the arrested psychology produces, not the situation that results from it, not the feeling associated with it.

The test for compliance is: read the reversed meaning without knowing the card name. Can you reconstruct which card it was written for, and who specifically is being described? A text that could apply to "any blocked emotion" or "any kind of avoidance" fails this test. A text that could only apply to this card's specific symbolic territory, in its specific off-axis form, passes it.

The reversed meaning should describe the person from the inside: what they tell themselves, what mechanism sustains the pattern, what they are getting from staying in it. Not what an observer sees them doing.

### 2. The Relationship Between Upright and Reversed

Reversed is not negation. The reversed meaning should not read as the upright with "blocked," "not," "unable to," or "difficulty with" prepended. The upright and reversed are the same symbolic field operating on different axes: the upright expresses the card's energy forward and outward, the reversed expresses the same energy turned inward, arrested at a specific point, or operating in an off-axis direction that produces a distinct and nameable psychology.

The reversed Two of Wands is not "the absence of the Two of Wands' vision." It is the Two of Wands' vision functioning in a specific pathological mode: the planning that has become the substitute for the journey, sustained because the journey itself would risk making the vision ordinary.

The reversed Nine of Swords is not "the Nine of Swords' anxiety becoming less." It is the Nine of Swords' anxiety operating underground after having been managed so successfully that the management has become a second layer of the same problem.

Each rewritten reversed meaning should be recognizable as the shadow of the upright — the same symbolic charge operating in the specific arrested or inverted form that the card's number, suit, and imagery support.

### 3. Priority Order

Rewrites must be completed in this order, stopping only if all high-priority cards are done:

**Tier 1 — Highest priority (must be completed):**
- Eight of Swords
- Nine of Swords
- Seven of Swords
- Two of Swords
- Six of Cups
- Eight of Cups
- Nine of Cups
- Seven of Cups

**Tier 2 — High priority:**
- Nine of Wands
- Seven of Wands
- Two of Wands
- Eight of Wands
- Seven of Pentacles
- Eight of Pentacles
- Nine of Pentacles
- Two of Pentacles

**Tier 3 — Complete if time permits:**
- Three of Swords, Four of Swords, Five of Swords, Six of Swords
- Three of Cups, Four of Cups, Five of Cups
- Three of Wands, Four of Wands, Five of Wands, Six of Wands
- Three of Pentacles, Four of Pentacles, Five of Pentacles, Six of Pentacles

The Swords suit is Tier 1 because it carries the highest psychological density and is most frequently drawn in distress readings. Numbers Eight and Nine across all suits are Tier 1 or Tier 2 because they represent the suit's most psychologically saturated positions — where the energy has reached its fullest and most complex expression before the Ten's completion. Number Two appears in Tier 1 (Swords, Cups) or Tier 2 (Wands, Pentacles) because the Two holds the suit's initial tension in its most symbolically precise form, where the reversal is distinctly characterizable.

The rationale for this ordering: cards with short, generic reversed meanings that could apply to multiple cards produce the weakest readings for the largest user populations. Eight of Swords reversed and Nine of Swords reversed are drawn in night-mind, 3am, genuine-distress contexts. Those are the highest-stakes reading moments in the deck.

### 4. The Adequacy Test

Before rewriting any pip reversed meaning, apply this diagnostic: could the current text apply, with minor substitution, to a different card in the same suit or a card in a different suit? If yes, it is a candidate for rewrite.

Texts that name a suit-general condition ("blocked Water energy," "emotional avoidance," "delayed Fire") without naming the card-specific psychology are candidates. Texts that name a behavior category ("harvesting too early," "returning to what was left") without naming the inner arrangement that produces that behavior are candidates.

Texts that already name a specific psychology may not need rewriting. The reversed Ace of Cups — "a heart that wants to receive but is protecting itself from the vulnerability that receiving requires" — names a specific inner arrangement (wanting + protecting against the vulnerability of receiving). This is marginally adequate. The reversed Three of Cups — "a celebration that substitutes for depth rather than enabling it" — names a specific substitution. These are closer to the standard, though the Three of Cups could go further into who performs that substitution and why.

The minimum bar: if a person in the exact psychological state the card describes reads the reversed meaning, they should recognize themselves specifically, not just generally.

### 5. Count Targets

All eight Tier 1 cards must be rewritten. The minimum total rewrite count is 8. A sprint that completes Tier 1 and Tier 2 (16 rewrites) is preferred. Completing all 28 pip reversed meanings is the ideal target but is secondary to quality — 8 excellent rewrites at the standard are preferable to 28 adequate ones that describe behaviors rather than psychologies.

### 6. Voice Requirements

The voice of the rewritten reversed meanings must match the register established by the sprint 0026 Major Arcana rewrites: first-person interiority without literally using first person, present tense, naming the specific inner arrangement from the inside.

- Name the mechanism, not just the effect. What is the person doing to sustain the pattern, and why does that specific action feel necessary or rational to them from the inside?
- Use the card's imagery as the ground for the psychology, not as a metaphor to be decoded. The Eight of Swords reversed is the blindfold being recognized as voluntary. The reversal is not "like" the blindfold being removed — it is specifically the recognition of voluntariness that is the psychological event.
- Avoid the vocabulary of blockage: "blocked," "unable to," "difficulty with," "stuck in," "resisting." These describe the state from outside. Name the inner arrangement that looks like a block from outside but feels like something else from inside.
- Avoid directional optimism: "beginning to release," "starting to emerge," "the opening of." These describe a trajectory, not a psychology. The reversed meaning should describe the state, not its resolution.
- Match or exceed the length of the current reversed meaning. The sprint 0026 reversals — reversed Strength, reversed High Priestess — are significantly longer than the current pip reversals and have more psychological precision. Length is not the goal, but compression of complex psychology into a single short sentence often produces the generic register. Two to four sentences that build a portrait is typically the right scope.

### 7. Relationship to Existing Upright Meanings

The upright pip meanings across the Minor Arcana are strong. The reflection questions in particular — "What have you been calling 'planning' that is actually a way of experiencing the journey without taking the risk of it?" (Two of Wands) — are the best-written elements in the data layer. The reversed meaning rewrites should be in dialogue with these: the upright meaning's reflection question often names the specific avoidance that the reversed meaning should make fully visible.

Do not change the upright meanings. Do not change the reflection questions, emotional meanings, practical guidance, or symbolic themes. The scope is strictly the `reversedMeaning` field.

### 8. Adequacy of Currently Acceptable Reversed Meanings

Several pip reversed meanings are already at or near the psychological standard and should not be rewritten:

- **Ten of Wands reversed:** "the burden is finally being set down — either through a conscious decision to delegate and release, or through a collapse that forced the setting-down that was long overdue. There may also be a resistance to releasing the burden because the weight has become part of the identity: who would I be without this to carry?" — The final clause names a specific psychology (identity organized around the burden). Adequate.
- **Ten of Pentacles reversed:** names specific dysfunction hidden beneath idealized exterior. Adequate.
- **Six of Wands reversed:** "a dependency on external validation that leaves the self hollow when the crowd's attention moves elsewhere" — names a specific inner arrangement. Adequate.
- **Four of Pentacles reversed:** describes the grip loosening and its causes. Acceptable but could be deepened.

These may be improved if time permits in Tier 3, but they are not blocking defects.

### 9. Acceptance Test

After each rewrite is written, apply this test before accepting it:

Read the reversed meaning and ask: does this describe the person from the inside, or from the outside?

If it describes what the person is doing (behavior), what their situation is (circumstance), or what the energy is producing (effect), it is from the outside. Revise.

If it describes what the person is telling themselves, what mechanism is sustaining the pattern, what the inner arrangement feels like from within it, or what the person is getting from staying in the pattern — it is from the inside. Accept.

A secondary test: does the reversed meaning name something a person in this state might not have been able to name about themselves before reading it? If the text only confirms what is already obvious, it is not deep enough. The target is the specific formulation that makes something previously unnameable suddenly visible.

---

## Out of Scope

- Upright meanings, reflection questions, emotional meanings, practical guidance, symbolic themes, and numerology resonance fields for any pip card — these are not modified by this feature.
- Major Arcana reversals — seven were rewritten in sprint 0026; the remaining 15 are strong enough. This feature is confined to pip cards Two through Nine.
- Ace reversed meanings — Aces have their own quality register and are not pip cards in the same sense.
- Court card reversed meanings — court card reversals were not identified as deficient and are out of scope.
- Any changes to the interpretation engine, GPT prompts, or display components — this is a data-only change to the `reversedMeaning` field.
- Transit adaptation entries — that is a separate feature (feat-pip-transit-adaptations).
- Reversed meanings for the Ten of each suit — Tens are not pip cards in the Two-through-Nine sense and have separate symbolic logic.
- New fields or new data structures — only the existing `reversedMeaning` string field is modified.

---

## Open Questions

1. **Prioritization within Tier 2:** The ordering within Tier 2 lists both Wands and Pentacles numbers 7–9 together. Is there a basis for preferring, say, the Nine of Wands over the Seven of Pentacles? The current ordering assumes equal weight within Tier 2, but actual draw frequency data (if available) would sharpen this ranking.

2. **The Two of Cups reversed:** Currently reads: "a connection that is out of balance — one person investing more than the other, or a mutual recognition that has been clouded by misunderstanding." This is in the middle range — not as shallow as the Swords reversals but not as specific as the Strength reversal. Does it belong in Tier 2 or Tier 3? The case for Tier 2: the Two of Cups is frequently drawn in relationship readings, and relationship readings are the highest-emotional-stakes category. The case for Tier 3: the current text, while behavioral, is specific enough to the Two of Cups' exact symbolic territory that it would not pass to a different card.

3. **Cards with two-option reversed meanings:** Several reversed meanings present two possible interpretations (e.g., Nine of Swords reversed: "the anxiety is beginning to subside... or the suffering has gone deeper underground"). These bifurcated texts are a structural problem — they describe two different psychological states and ask the reader to self-identify. The rewrite approach for these should be: pick the psychologically specific reading rather than preserving the bifurcation. But is there any context (e.g., Celtic Cross spread position) where the two-option structure serves the user better than a single named psychology? This question does not need resolution before the sprint starts, but should inform how the most-bifurcated reversals (Nine of Swords, Three of Swords, Five of Swords reversed) are handled.

4. **Length calibration:** The sprint 0026 Major Arcana reversals range from two sentences (Empress reversed) to six sentences (High Priestess reversed, Strength reversed). The appropriate length for pip reversals is unclear — the Major Arcana carry more symbolic weight and arguably justify longer treatments. The guidance in Specification 6 says "two to four sentences" for pip reversals. Is that the right range, or should some high-density pip reversals (Eight of Swords, Nine of Swords) receive the full six-sentence portrait treatment?
