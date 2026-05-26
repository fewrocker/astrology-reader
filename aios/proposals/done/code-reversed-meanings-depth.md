# Proposal: code-reversed-meanings-depth

**Type:** Code Enhancement
**Originated by:** Miyazaki, Carmack, Taleb

---

**User guidance:** Go deep on tarot itself — the cards' classical Rider-Waite-Smith symbolism, how meanings shift by position in a spread, card-to-card combinations, and how experienced readers weave cards into a single narrative rather than disconnected mini-readings. The synthesis must be anchored to what the user came to explore. Prefer one true thing the user didn't already know over five plausible things they did. Distill ruthlessly. If a reading could plausibly apply to any other person drawing the same card with the same intention, it is not done.

---

## Problem / Opportunity

### The negation model and why it matters structurally

The `reversedMeaning` field in `src/data/tarot/majorArcana.ts` is the first textual data the GPT synthesis model receives about a reversed card. The engine selects it at line 735 of `src/engine/tarot.ts`:

```
coreMeaning: reversed ? card.reversedMeaning : card.uprightMeaning,
```

This `coreMeaning` field is then sent as the primary card description in all three GPT handlers — Single, Three-Card, and Celtic Cross. In the Celtic Cross handler, every card is transmitted as:

```
${card.symbolicTheme}. ${card.coreMeaning}
```

The reversed meaning is therefore the interpretive floor on which the entire synthesis stands. If the floor describes failure or blocked energy in generic terms, the model begins its synthesis with a limited palette and compensates through tarot boilerplate. The quality of the reversed meaning is not merely a data concern — it is the ceiling on what the synthesis can say.

### The specific failure: negation rather than transformation

The reversed meanings for the 22 Major Arcana, read carefully, reveal a consistent structural pattern: the reversed card is described as the upright card going wrong. The card's central principle is negated, blocked, or tipped over — but the symbolic field is not turned. It remains the same field, just damaged.

**The Tower reversed** (line 285): *"a necessary collapse is being forestalled — through extraordinary effort, the structure is being kept standing despite its rotten foundation."*

This is the negation of the Tower's upright meaning: instead of collapse occurring, collapse is being delayed. The Tower reversed is described as the absence of the Tower's event. But the symbolic field of the Tower is not about the event of collapse — it is about misalignment between a structure and its foundation. Reversed, that misalignment doesn't disappear; it goes underground. The person who draws the Tower reversed is not someone who has successfully avoided catastrophe. They are someone who has organized enormous energy around preventing a truth from landing. The Tower reversed is the exhausted caretaker of a lie, the person who has become very skilled at maintaining what cannot be maintained. That portrait is not present in the current meaning.

**Death reversed** (line 234): *"an ending that is being refused — a chapter whose last page has already been written but that is being reread compulsively rather than closed."*

This is more nuanced than simple negation, but it still describes the upright meaning's failure condition: Death upright ends things; Death reversed refuses to end things. The actual symbolic territory of Death reversed is more specific. Death's card principle is not "endings happen" — it is "what cannot be undone creates what could not have otherwise existed." Reversed, that principle does not simply fail. It internalizes: the person is undergoing transformation but cannot yet see it. They are in the middle of becoming someone new and reading it as loss. Death reversed is not refusal; it is the disorientation of transformation that has not yet resolved into identity. The person experiencing Death reversed is not keeping something alive — they are in the process of dying to something without the map that shows what comes next.

**The Moon reversed** (line 319): *"the fears being suppressed in daylight are surfacing in distorted form — through anxiety, misperception, or the projection of inner darkness onto outer circumstances. Alternatively, the fog is beginning to clear."*

The "alternatively" construction here is a tell: the reversed meaning is doing double duty, offering two incompatible interpretations that together add up to generic uncertainty. The Moon's principle is not "uncertainty and fear" — it is the specific quality of consciousness that cannot distinguish instinct from projection, intuition from paranoia, the animal sense from the animal fear. Reversed, this principle doesn't simply increase or decrease. It becomes selective: the Moon reversed speaks to a person who has managed their fear so effectively that they no longer feel afraid — which is the most dangerous position the Moon can put someone in. The distortion is not that fear is surfacing in disguised form; it is that the person has mistaken their own shadow for the landscape.

**The Hanged Man reversed** (line 217): *"a necessary period of suspension is being resisted — that the ego continues to push and strategize when the situation is calling for release."*

Again: the upright card is about willing surrender; the reversed card resists surrender. This is the most literal possible negation. The Hanged Man's symbolic field is not primarily about surrender — it is about the particular wisdom that becomes available only when normal orientation is abandoned. The Hanged Man reversed speaks to someone who has been suspended involuntarily rather than willingly. They are not refusing the pause; they are experiencing it as punishment rather than as a gift. The halo does not appear on the reversed Hanged Man because the reversal is not about resistance to the inversion — it is about the same inversion happening without the spiritual consent that would transform it into revelation. This is a qualitatively different portrait: not the person who won't stop, but the person who has been stopped and cannot find the meaning in it.

**Judgement reversed** (line 353): *"the inner summons is being heard but is not being answered — there is a resistance to the rising, a preference for the familiar weight of the coffin over the terrifying possibility of what standing upright might demand. Alternatively, self-condemnation has taken the place of honest reckoning."*

Another "alternatively" construction, two incompatible interpretations. Judgement's principle is not "rising" — it is the recognition that arrives when the accumulated weight of a life becomes undeniable. Reversed, that recognition is not refused; it is turned back against the self. The person who draws Judgement reversed has heard the trumpet but is using it to prosecute themselves rather than to rise. The verdict is real, but it is being delivered without mercy and without the possibility of a new chapter. Judgement reversed is not "I won't get up" — it is "I got up and immediately concluded I was not good enough." That is a specific psychological portrait: the person who wakes up and uses the waking to condemn themselves for having slept.

**The High Priestess reversed** (line 47): *"intuition is being suppressed in favor of logic, or that the inner voice is being drowned out by external noise. There may be an unwillingness to sit with what is not yet known."*

Upright: intuition is present. Reversed: intuition is suppressed. This is the cleanest negation in the entire Major Arcana data. The High Priestess's symbolic field is not "intuition flows freely" — it is the quality of knowing that exists below language, that cannot be verified by external means, that sometimes cannot even be distinguished from obsession or delusion. Reversed, this field does not turn off. It turns inward past the point of usefulness. The High Priestess reversed is not someone who has stopped listening to her inner voice. She is someone who has listened so exclusively to it that she has lost the capacity to test it against reality. This can manifest as the person who knows things no one else can confirm, who trusts their intuition to the exclusion of any evidence to the contrary, who has mistaken internal certainty for truth. The suppression model misses the more dangerous form: not the person who has silenced the Priestess, but the person who has let her run the entire operation without correction.

**Strength reversed** (line 149): *"fear has taken over where courage once stood — either through a retreat into passivity that feels like acceptance but is actually avoidance, or through a resort to domination and control that is a symptom of feeling deeply unsafe."*

The two-option construction again: passivity or domination. Both are described as fear displacing courage. Strength's principle is the holding of what is wild and dangerous with love rather than suppression — the open hand on the lion. Reversed, that relationship inverts: either the lion is suppressed (caged) or the lion is running the person. But the more specific and less-often-named expression of Strength reversed is the person who has confused endurance with strength, who has been carrying something genuinely painful for so long that they have begun to identify with the carrying. Strength reversed can be the person who cannot put down the lion even when it has become tame, because their sense of themselves has been organized entirely around holding it.

### Why negation-model meanings produce flat synthesis

The GPT synthesis prompt receives `coreMeaning` as its primary interpretive instruction for the card. When that field says "the energy is blocked, refused, or going wrong," the model has two paths: it can elaborate on the generic blockage, or it can try to connect the blockage to the natal context and transit data. Both paths produce the same problem — the synthesis is operating on a negative space rather than a symbolic field. Negative space does not connect meaningfully to a specific natal chart or transit. "This transit amplifies what is being blocked in you" is not a real sentence in the way that "this transit is activating the part of you that already knows the answer and won't say it" is a real sentence. The specific failure of the negation model is that it does not give the synthesis model anything to connect — no interior portrait, no specific psychological terrain, no symbolic field that can be mapped against the user's actual chart and question.

Miyazaki names this directly in the sprint-0026 voice review: "The reversed High Priestess is not 'suppressed intuition'; she is intuition that has been turned inward so completely it has become obsession, or paranoia, or the refusal to share what is known." Carmack identifies the structural consequence: the `reversedMeaning` in `majorArcana.ts` is "the card's central principle operating off-axis" failing to be expressed — the description is instead "the negation of the upright." Taleb observes the compounded risk: "Tarot language is general enough that the model can almost always find a sentence that sounds true. You cannot distinguish a real signal from a confabulation by reading the output." When the reversed meaning provides a generic failure-mode template, the synthesis fills in with plausible-sounding content that is not actually grounded in the card's symbolic field — and the user cannot tell.

---

## Desired State

### What reversed meanings should feel like

A well-written reversed meaning describes the same symbolic field as the upright meaning, operating in a different register. It does not negate the card's principle — it shows where and how that principle manifests when it cannot move in its normal direction. The three legitimate registers for a reversed meaning are:

**Internalized expression:** The card's principle is operating inward rather than outward. The card's energy is present but it is not visible to others, and often not fully visible to the person themselves. The Magician reversed is not someone whose skill is wasted — it is someone who has become very skilled at the wrong thing, who has turned the tools of manifestation inward in a way that looks like competence but is actually self-construction that was never examined.

**Resistance:** The card's principle is present but meeting a force that is preventing its normal expression. This force can be internal (the person is resisting what the card wants from them) or external (circumstances are preventing the card's energy from flowing). The difference from negation is critical: resistance is a dynamic state, not an absence. The Tower reversed is not "no collapse" — it is the enormous energy required to hold collapse at bay, which is itself a form of the Tower's force expressing sideways.

**Distortion:** The card's principle is operating, but through a filter that warps its output. The result resembles the card's upright expression but has been bent in a direction that carries the card's quality past the point of health. Strength reversed as the person who cannot put down the burden because they have made the burden their identity. Judgement reversed as the person who uses the trumpet to prosecute rather than to rise. The distortion is recognizable — it comes from the same source as the upright meaning — but it is the card's principle past its useful range.

### The seven priority cards

The following seven cards are the highest priority for revision because they appear most frequently in Celtic Cross readings, carry the most archetypal weight in reversals, and currently have the greatest gap between their negation-model reversed meanings and the off-axis expressions their symbolic fields actually describe.

**The Tower (XVI):** The reversed meaning must describe the experience of organizing a life around preventing the truth from landing — the exhausted maintainer of a structure that the person already knows, somewhere, cannot stand. It should name the specific quality of energy that goes into keeping the Tower upright: vigilance, control, the refusal to examine foundation. The reversal should not be framed as crisis deferred but as the particular cost of deferral — what the person has had to become in order to keep the structure standing.

**Death (XIII):** The reversed meaning must describe transformation that has not yet resolved into recognizable identity — the person who is already becoming something new but is reading the process as loss rather than as crossing. It should distinguish between the refusal to end and the inability to locate oneself within an ending that is already underway. Death reversed is not the person holding on to the past; it is the person inside the passage who cannot yet see the other side.

**The Moon (XVIII):** The reversed meaning must describe the danger of managed fear — the person who has handled their anxiety so successfully that they have lost the signals the anxiety was providing. The Moon reversed is not the fog lifting; it is the person who has stopped being afraid of the dark and has therefore stopped being able to read it. It should address what happens to intuition when it is brought fully under control: it stops being useful as a navigation tool and becomes instead a private cosmology the person cannot share.

**The Hanged Man (XII):** The reversed meaning must distinguish between willing suspension and involuntary suspension without its transformative yield. The reversed card is not resistance to the pause — it is the pause happening without the person's consent or spiritual orientation, which means it produces disorientation rather than wisdom. It should name what enforced suspension without meaning feels like from the inside, and what the absence of the halo actually represents: not refused illumination but illumination that requires a different kind of consent than the person has yet given.

**Judgement (XX):** The reversed meaning must describe the trumpet turned inward as a prosecutorial instrument rather than a call to rise. The reversed card is not the summons being refused — it is the summons being answered with a verdict of guilty before any examination has occurred. It should capture the specific dynamic of the person who wakes up to themselves and immediately uses the waking to condemn rather than to begin again.

**The High Priestess (II):** The reversed meaning must describe the inward turn of intuition past the point of usefulness — not the silencing of the inner voice but its amplification beyond the possibility of error-correction. The reversed High Priestess is the person who has made their private knowing an absolute authority. It should address the particular quality of certainty that cannot be verified, the place where depth of inner knowing becomes a form of isolation from reality.

**Strength (VIII):** The reversed meaning must describe the person who has organized their identity around carrying the lion — who has confused endurance with courage, and who cannot put down the weight because the weight has become their name. It should distinguish between the courage that holds what is difficult with an open hand and the compulsion that holds the difficult thing because without it there is no self left to speak of.

### What must be true of any revised reversed meaning

**1. The card's symbolic field must be recognizable in both the upright and reversed meanings.** A person reading both should be able to see that they describe the same principle operating in different registers — not two separate cards.

**2. The reversed meaning must produce a specific interior portrait that can be connected to a person's natal chart.** A meaning that describes a dynamic, a psychology, or a specific quality of experience gives GPT synthesis something to map against house placements, transit activations, and stated intentions. A meaning that describes absence or blockage does not.

**3. The reversed meaning must be something a person could recognize in themselves without being told what card they drew.** The best reversed meaning is one that reads like a description of a real state — something a person in that state would recognize immediately. If a person experiencing the Moon reversed reads the reversed meaning and thinks "that's not me," the meaning has failed. If they think "I hadn't put it in those words but yes," the meaning is doing its work.

**4. The reversed meaning must not use "alternatively" constructions that offer two incompatible interpretations.** A reversed meaning with two incompatible options is not a meaning — it is a placeholder that defers interpretive work to the reader. Every reversed meaning should describe one coherent symbolic register, even if that register has multiple possible expressions within it.

**5. The reversed meaning must not describe the upright meaning's opposite.** Upright: strength. Reversed: weakness. Upright: clarity. Reversed: confusion. Upright: beginnings. Reversed: stagnation. These are the floor, not the ceiling. Every revised reversed meaning should pass this test: if you remove the word "reversed" and the word "not" from the meaning, does it still say something? If not, it is a negation.

**6. The length and register of the reversed meaning should be comparable to the upright meaning.** The upright meanings in `majorArcana.ts` are written with craft — specific imagery, specific psychological portraiture, sentences that earn their place. The reversed meanings for the seven priority cards should aspire to the same standard. A one-sentence reversed meaning for a card whose upright meaning is four sentences has made a choice about the relative value of reversed cards that the synthesis system will inherit.

---

## Out of Scope

This proposal covers the seven named Major Arcana cards — Tower, Death, Moon, Hanged Man, Judgement, High Priestess, Strength. A full audit of all 22 Major Arcana reversed meanings and all 56 Minor Arcana reversed meanings is a separate scope.

This proposal does not modify the engine, the GPT prompt templates, or any payload types. The change is entirely in `src/data/tarot/majorArcana.ts`. The quality improvement flows into synthesis through the existing `coreMeaning` selection at engine line 735.

This proposal does not change how reversed meanings are displayed in the instant interpretation panel. The `TarotInterpretationPanel.tsx` component renders `coreMeaning` as a string. The content improvement is invisible at the component level; it surfaces only in synthesis quality.

This proposal does not introduce a third meaning field (e.g., a separate "internalized" or "blocked" variant). The two-field structure (`uprightMeaning`, `reversedMeaning`) is the current type contract and sufficient for this improvement. A future proposal could consider whether the reversed field should be subdivided by register (internalized vs. resistant vs. distorted), but that is a type and schema change, not a content change.
