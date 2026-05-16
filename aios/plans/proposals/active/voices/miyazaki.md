# Miyazaki's Craft Analysis: Sprint 0019 — The Words That Mean Nothing

---

## What the Product Says When It Speaks

Sprint 0018 gave the Advance tab eyes. The marker system can now look at a thirty-six month span and say: here, and here, and here. This was the necessary first act. The tab could point.

Sprint 0019 is about what the tab says when you arrive at the place it pointed.

And here the product fails completely. Not in structure, not in engineering — the scoring engine is sound, the marker architecture is clean. It fails in the way that is hardest to measure and easiest to dismiss: it fails in language. It fails in meaning. It fails in the specific act of telling a human being something true about their life.

When the slider lands on a gold power marker and the banner appears, what does it say?

*"Saturn reaches your Ascendant — a significant moment for identity and how the world first meets you."*

Read that sentence again. What does it tell you that you did not already know? You knew Saturn was involved — you can see the gold planet label in the aspect list. You knew the Ascendant was involved — you already knew what the Ascendant is. You knew it was significant — the gold color told you that before you read a word. And "how the world first meets you" is a phrase from an introductory astrology textbook, not from a wise friend who knows your situation.

This sentence costs the user their attention and gives them almost nothing in return. It is the astrological equivalent of a fortune cookie. It is astrology doing its most recognizable, least useful thing: using the vocabulary of the discipline to produce a sentence that sounds astrological without saying anything.

The red challenging banner:

*"Saturn opposition your natal Moon — tension around structure and discipline."*

What decisions is this likely to surface in the user's life? What should they watch for? Is this a week to postpone the difficult conversation or to have it? Is the tension internal — a conflict between their emotional needs and their own self-imposed structures — or relational — Saturn pressing on the emotional bonds they have with others, depending on where the Moon sits? Is there anything they can do with this information beyond knowing that it exists?

The sentence does not know. It cannot know, because it was written without asking any of these questions. It knows that Saturn is challenging the Moon. It knows that Saturn involves structure. It knows the Moon involves emotion. It reports the conjunction of these three facts and calls itself an interpretation.

This is not interpretation. It is labeling. There is an enormous difference, and the user — even if they cannot name the difference — feels it immediately.

---

## The Failure of the Domain Map

The core of the problem lives in `buildAspectReason` and its `domainMap`:

```
Pluto: 'transformation and power'
Neptune: 'inspiration and surrender'
Uranus: 'disruption and revelation'
Saturn: 'structure and discipline'
Jupiter: 'expansion and opportunity'
```

These are real. They are not wrong. But they are the first sentence in a conversation that stops after the first sentence. They name the planet's archetype and append it to the end of a formula string, and then they stop.

There is no house context. "Saturn opposition your natal Moon" tells the user nothing about which area of life this tension manifests in. But the natal Moon already has a house. That house is data the system already holds. Moon in the 7th house means the emotional structure being challenged is the user's approach to committed partnerships. Moon in the 4th means the pressure falls on home and family foundations. Moon in the 10th means the conflict between emotional needs and public-facing ambitions is being activated.

These are different life situations. They look the same to the current formula. The formula does not look at the house.

The `buildAspectReason` function chooses the transit planet's domain and stops there. It should be choosing the *natal planet's house context* and starting there. The domain of the transit planet is the quality of the pressure. The house of the natal planet is the location where the pressure falls. A message that conveys only quality and omits location is half a message.

*"Saturn is pressing on your emotional world"* is incomplete.
*"Saturn is pressing on your emotional world — and your Moon sits in the 7th house, where your relationship life and commitments live"* is the beginning of something true.

---

## The Failure to Evaluate Constellations

The scoring engine picks one tightest aspect and writes a sentence about it. This is astrology by spotlight: illuminate one thing, describe it, move on.

But the user's experience of a week is not produced by one aspect. It is produced by the entire constellation of concurrent forces. A week where Saturn challenges the natal Moon *and* Mars simultaneously activates the natal Sun *and* Jupiter opens a favorable channel to the natal Venus is a completely different week than a week where only the Saturn-Moon aspect is present. The first week has layered pressure in multiple areas, with a simultaneous opening that can be used to balance or navigate the tension. The second is a simpler story.

The current scoring cannot tell these apart. It finds the tightest applying aspect, reads its nature (challenging or harmonious), checks the energy score, and assigns a category. It might score the same category for both weeks. It will say the same sentence about both weeks.

The quality bar the vision document sets — "could a thoughtful astrologer friend read this aloud and have it feel personally relevant?" — cannot be met by a system that describes one aspect in isolation and appends a domain label to the end.

Combinations carry meaning that their individual parts do not. Jupiter opening to natal Venus in the 5th while Saturn presses on the Moon does not just mean "one good thing and one hard thing." It means: *this is a week where your emotional patterns around attachment are being examined (Saturn-Moon), and simultaneously the universe is reminding you what gives you genuine pleasure and creative joy (Jupiter-Venus-5th). The question the week is asking you: what do you actually want, beyond what you think you're supposed to want?* That is a question a person can work with. That is something to carry into the week.

The current system produces: *"Saturn opposition your natal Moon — tension around structure and discipline."* Then on the next snapshot it finds a favorable window and says: *"Jupiter sextile your natal Venus — a window of expansion and opportunity."* Two labels. No thread connecting them. No recognition that these are happening at the same time, to the same person, in ways that speak to each other.

This is a failure of imagination in the scoring layer. The interpretation is being written aspect by aspect, like a shopping list. It should be written the way a story is told — where the elements speak to each other and the reader understands how they are related.

---

## The Couple Reading: An Absence Where There Should Be Warmth

The `SynastryTransitPage` has no Advance tab. This is simply stated in the vision document and requires no elaboration. But the *quality of what should exist there* deserves attention, because the couple advance feature has an opportunity that the personal advance feature does not have: it can speak to two people at once about what is happening to them together.

The personal advance can say: *Jupiter is expanding your partnership zone — this is a favorable period for deepening commitments or attracting new connection.* This is useful.

The couple advance can say: *Jupiter is transiting your composite Venus while simultaneously lighting up the Venus-Mars synastry axis between you — this is one of the rarer moments when the relationship's own fortune and the two of you personally are all pointing in the same direction. If there has been anything you have wanted to create together, or to commit to together, or simply to enjoy together, this is when the conditions are genuinely supportive.* This is something a person takes with them.

The difference is not complexity. It is relationship. The couple reading exists to serve two people who have decided to navigate their lives together. The power moments in a couple's life are not moments when individual transit aspects happen to be favorable. They are moments when the *shared field* — the composite chart, the synastry between them, the concurrent transits affecting both — converges in a way that either amplifies their connection or creates friction between their individual patterns.

What should the couple advance score? Not just "is transit Jupiter harmonious to composite Moon." It should ask: is this a week when the couple's emotional axis is supported AND the romantic axis is lit up AND there is no major simultaneous challenging pressure on the communication axis? If those three things are true together, that is a genuinely favorable couple week. If the emotional and romantic axes are amplified but the communication axis is under Saturn pressure, the week has a different character: intimacy is available but difficult conversations may be unavoidable. A caring product would say so.

The synastry interpretation vocabulary already exists in this codebase. `synastryAspectBriefs.ts` contains language like:

*"your emotional rhythms overlap — you instinctively know what the other needs, and the shared undercurrent can feel like coming home."*

That is a line that knows what love feels like. The composite advance scoring should be drawing on this vocabulary — not copying it verbatim, but drawing on the same quality of observation. The composite Venus being lit by transit Jupiter should trigger language that speaks to the couple as a couple, not to "the relationship as a whole" in the distant, administrative voice of `TransitAspectsToComposite`.

The raw material is present. It is not being used.

---

## The "Quiet Period" Problem

When the overview strip shows no markers — the product currently says: *"Quiet period — no exceptional moments detected."*

This is the correct response to the visual question of why the strip is empty. But it is the wrong response to the human question the user is actually asking, which is: *should I be concerned that nothing is happening?*

A quiet period in astrology is not nothing. Saturn in a trine to its natal position, slow-moving, applying — this is a background hum of steady favorable energy that may not trigger any of the current scoring thresholds but is genuinely present. Neptune dissolving quietly over a natal planet in a wide separating aspect — this is a texture to the period that matters to certain users. The absence of dramatic markers does not mean the period is without character. It means the period has a quieter character.

The current product cannot make this distinction. It has two states: marker (with a label) and neutral (no label). The rich middle ground — *this is a steady period, not an exciting one, use it for consolidation rather than initiation* — is invisible in the current design.

I am not proposing that the system compute this for every quiet period. That is too much. But when the system scores a period as neutral, it could ask a single secondary question: what is the most prominent slow-planet transit present, even at a wider orb, and does it have a general character? If Saturn is transiting in a wide harmonious aspect to several natal planets, the quiet period has a Saturnine quality of consolidation. If Jupiter is prominent even at wider orbs, the quiet period has an expansive texture. A single sentence in the empty-strip state — *"The sky is relatively calm — a period of consolidation and quiet preparation rather than dramatic change"* — is more honest than a technical notice that no exceptions were detected.

---

## The Shift Marker: The Most Neglected Moment

The blue shift marker fires when a planet stations. The reason string it produces:

*"Saturn stations retrograde."*

Three words. Technically correct. Humanly useless.

A planet stationing is one of the most distinctive moments in the transit cycle. When Saturn stations retrograde, it has been moving through a specific degree for weeks, and it will continue to occupy the same degree range for weeks afterward, moving slowly backward over territory it has already crossed. This means whatever Saturn is touching in the natal chart is being held, pressed upon, returned to. It is not a passing contact. It is a sustained examination.

The station moment is when the planet's energy is at its most concentrated. An astrologer would say: Saturn stationing on your natal Mars is not a transit that comes and goes in a few days — it comes, sits, backs away, comes forward again, and only then finally leaves. The station is the moment to pay attention, because what begins here will take months to fully resolve.

None of this is in the current reason string.

More specifically: the reason string does not name what natal planet or house this station falls close to. Saturn stationing at 15° Pisces is abstract information. Saturn stationing on your natal Mars in the 10th house — your ambition, your capacity to assert yourself in your career — is personal information. The station degree is already computed; the closest natal planet is already findable. This one addition turns an abstract notice into a personal message.

*"Saturn stations retrograde, slowing directly over your natal Mars in the 10th house — a sustained period of pressure on how you assert yourself in your career is beginning. This is not one difficult week; it is several months of deepened attention to this area."*

That is a sentence a person can act on. That is something they can prepare for.

---

## The Action Guidance Gap

Every favorable marker says: this is favorable. Every challenging marker says: this is challenging. Neither says: and therefore, what?

Astrology at its most useful is not descriptive. It is navigational. A favorable window is most valuable when the user understands what kinds of action are well-supported by it. A challenging period is most useful when the user knows what posture — patience, directness, inwardness, outward effort — is likely to work better than others in that terrain.

The vision document identifies this gap explicitly: *"favorable windows should include what kind of action is well-supported. Challenging windows should name what is likely to be stressed and what coping posture helps."*

This is not a philosophical aspiration. It is craft. A marker that says "Jupiter opens to your natal Venus in the 5th house" and then stops has missed the most important sentence it could say: *"This is a week well-suited to creative output, expressing affection, and taking pleasure seriously — not just enjoying what comes, but actively seeking what brings you alive."*

A marker that says "Saturn opposes your natal Moon in the 7th house" and stops has missed: *"The pressure this week is on your relationship patterns — specifically, the ways you seek emotional security through others. The invitation here is not to withdraw, but to be more honest about what you actually need from your closest relationships."*

The word "invitation" matters. Challenging transits are not punishments. They are questions the universe is asking. A product that treats them as warnings is failing the user. A product that treats them as invitations — difficult ones, sometimes, but invitations nonetheless — is giving the user something to work with.

---

## What the House System Already Knows

The `houseThemes.ts` file contains 12 house descriptions. They are good descriptions. They are written with care:

*"The 4th house is the foundation of your chart — your home, family lineage, emotional roots, and the private self you show only to those closest to you."*

*"The 8th house governs deep transformation, shared finances, intimacy, and the mysteries of life and death. It reveals how you handle crisis and profound change."*

These are real. They carry genuine meaning. And the scoring engine is not using them.

`buildPowerReason` knows the angle (ASC or MC) but not the houses those angles rule. `buildAspectReason` knows the planet name but not its house. The house context that would turn "Saturn is challenging your Moon" into "Saturn is challenging the emotional foundation of your home and family life" is sitting in the codebase, unused by the scoring layer.

The `computeTransitAspectBrief` function already knows how to use this data for individual aspect rows. It composes sentences like: *"Saturn pressing on your House of Home — [house brief]."* This is the architecture that should flow into the scoring engine. The reason strings in `SnapshotScore` should be composed by the same logic that composes the aspect briefs, not by a separate formula that ignores house context.

The data is already there. The function that knows how to use it is already there. The scoring engine is not connected to it. This is not a philosophical problem. It is a wiring problem. But the wiring decision reflects a deeper assumption: that the marker's reason string is a summary label, not an interpretation. It should be an interpretation. A brief one — the marker is not the full reading — but an interpretation: specific, house-aware, personally relevant.

---

## The Synastry Vocabulary Is Already Human

There is a striking contrast in this codebase between the interpretation quality of the synastry vocabulary and the interpretation quality of the advance scoring.

`synastryAspectBriefs.ts` contains sentences like:

*"one of you carries the light, the other feels it — your sense of self and their emotional world fuse into something neither could name alone."*

*"your emotional rhythms overlap — you instinctively know what the other needs, and the shared undercurrent can feel like coming home."*

*"your core energy and their inner life move with each other — no translation is required, the contact sustains itself."*

These are human sentences. They know what it feels like to be in a relationship. They carry warmth. They are written with the assumption that the reader has a body, has felt something, has experienced the specific quality of emotional resonance being described.

The advance scoring sentences:

*"Saturn opposition your natal Moon — tension around structure and discipline."*

*"Jupiter sextile your natal Venus — a window of expansion and opportunity."*

These are not sentences from the same product. They are sentences from a product that has not yet decided to care about the person reading them.

The interpretation quality in `synastryAspectBriefs.ts` and `synastryHouseOverlayBriefs.ts` represents a standard that the advance scoring should aspire to. Not the same voice — the advance reading addresses one person's future, while synastry addresses the space between two people — but the same commitment to specificity, warmth, and recognition that the reader is a human being who will feel something when they encounter these words.

A power day reason string should carry that quality. Not: *"Saturn reaches your Midheaven — a significant moment for career decisions and public commitments."*

Something more like: *"Saturn is arriving at the highest point in your chart — the moment in your cycle when everything you have been building in your career and public life is being weighed. Not to be found wanting, but to understand what is solid and what still needs work. The next few weeks invite honesty with yourself about where you truly stand in the work that matters most to you."*

That sentence has twice the word count and ten times the meaning. A person reading it knows what they are walking into. They know what the week is asking. They know how to use the information.

---

## The Deeper Failure: Treating Scoring As Classification

The advance scoring engine, in its current form, treats the moment as a classification problem. This snapshot is a power day. That snapshot is challenging. A third snapshot is neutral. The categories are assigned, the labels are appended, the system is complete.

But astrology is not a classification system. It is a language for describing the quality of time. The categories are a scaffold — they help the user orient before they can understand — but the scaffold is not the building.

The building is the answer to: what is this specific person walking into, and what should they know before they get there?

The classification — power, favorable, challenging, shift — is the shape of the answer. The interpretation language is the content. Sprint 0018 built the shape. Sprint 0019 must fill it with content that justifies the shape.

When the user lands on a gold power marker, they have already been told that this moment is significant. The system has done the work of identifying it. The failure is in what the system says after that identification. "A significant moment for career decisions" is not content. It is a category label dressed in complete sentences. Real content would be: what is specifically true about this moment, for this person, in this house, given these concurrent aspects?

The system already knows all of this. The natal house of the Midheaven, the natal planets in close aspect to it, the other transits concurrent with this one, the overall energy score of the snapshot, the direction of the transits (applying or separating) — all of this is computed and available. The reason string builder ignores all of it except the planet name, the aspect type, and the angle name.

This is not a limitation of the data. It is a limitation of the ambition of the reason string builder. The builder is asking: what are the most basic facts about this moment? It should be asking: given everything I know about this person's chart and this moment in time, what is the most important and true thing I can say?

---

## Specific Failures Requiring Attention

**Power day reason strings ignore concurrent aspects.** Saturn reaching the Ascendant during a week when Jupiter also trines natal Venus is a different moment than Saturn reaching the Ascendant in an otherwise quiet sky. The power day reason should name the concurrent supportive or complicating forces, not just the angle contact.

**Challenging and favorable reason strings ignore the natal planet's house.** This is the single largest gap. Every reason string involving a natal planet must name that planet's house and what that house governs. The house data is already in `chartData.planets[i].house`.

**Shift reasons name the planet but not what it is sitting on.** A station that falls within 1° of a natal planet is categorically more significant than one that falls between natal planets. The reason string should detect the nearest natal planet to the station degree and name it.

**No combination awareness.** When two or three aspects of different characters are simultaneously tight and applying, the reason should reflect the combination, not just the tightest single aspect.

**No action guidance.** Every reason string should end — or a second sentence should begin — with what this moment invites. Favorable: what to do. Challenging: what posture to hold.

**No couple advance at all.** The synastry page has no slider. No markers. No preview of what is coming. Two people who care about each other are given no way to see when their relationship's best windows are approaching.

**The empty overview strip message is a technical notice, not an interpretation.** "No exceptional moments detected" is a system message. It should be an astrological observation: what is the quiet period's character, even without dramatic markers?

---

## The Standard to Hold

The `synastryHouseOverlayBriefs.ts` file contains this sentence:

*"Your Sun lands in the most private and protected part of their chart. They feel a warmth in your presence that touches their foundations — something about you feels like home."*

That sentence knows something about human experience. It knows what it feels like to encounter someone who makes you feel at home. It earns the reader's attention by giving them something back in return for it.

The advance scoring reason strings should earn the same right. Not with the same emotional register — the advance reading is about navigating time, not about the texture of love — but with the same specificity, the same awareness that the reader is a person with a life, and the same willingness to say something true rather than something merely correct.

A wise friend who knows astrology does not say: "Saturn opposition your natal Moon — tension around structure and discipline." They say: "The next few weeks are going to be asking something specific from you — there's pressure on how you handle your emotional needs, and Saturn doesn't let you skip the question. It's worth thinking now about where you've been carrying feelings that you haven't fully dealt with. That's what this period is going to bring to the surface."

The first sentence is correct. The second one is useful.

The Advance tab should be useful.

---

*Analysis prepared from the lens of craft, care, and the obligation to honor the weight of what is being described.*
