# Voice: Steve Jobs — Tarot Module Review
## Sprint 0027

---

I've spent the morning going through everything: the sprint vision, the card data files, the engine, the interpretation panel, the GPT handlers. I want to tell you something first. The product has gotten substantially better. Sprint 0026 wired the chart ruler in. The court card transit adaptations are complete. Seven Major Arcana reversals were rewritten from scratch. The synthesis prompt architecture is mature enough to stop touching. That is real progress, and I'm not going to pretend otherwise just to seem tough.

But I've also been sitting with the actual experience of drawing a card today — or rather, the experience I would have drawing a card if I were a user who doesn't know what the code says. And I want to describe what I found, because the product has a specific problem that is bigger than "28 pip cards are missing transit entries." That's the technical diagnosis. Let me give you the experiential diagnosis.

---

## What I Actually Felt

Draw a Two of Wands under a Saturn transit. What does the user receive in the "In Your Sky Now" panel? They get the Level 2 fallback: "The current Saturn transit introduces grounding energy into this Fire card — a call to integrate these opposing forces consciously." That sentence is technically not wrong. It is also the kind of sentence that a user reads, nods at, and immediately forgets. It tells them nothing about the Two of Wands specifically. It tells them nothing about Saturn specifically. "Grounding energy meets Fire" could apply to twenty different cards on any given Saturn day. It is the product failing its own stated mission.

Now draw the Four of Pentacles under Pluto. Same problem, different wrapper: "The current Pluto transit introduces emotional energy into this Earth card — a call to integrate these opposing forces consciously." The Four of Pentacles under Pluto is one of the most psychologically precise combinations in the deck — the grip that Pluto is excavating, the material security that is being asked to surrender at the root level, the specific experience of holding so tightly to what you have that Pluto must pry your hands open. That is a story. What the user receives is a sentence about integrating opposing forces.

This is the gap. And it is not a small gap. The transit adaptation system was built to close exactly this gap, and for half the pip deck it remains open.

I want to be precise about the scope. The sprint vision says 28 pip cards — Twos through Nines of all four suits — have zero Level 1 transit adaptations. That means for roughly 36% of the deck, every draw under Saturn, Pluto, Uranus, or Mars silently falls through to the generic element-affinity line. Saturn is almost always active for someone. Pluto transits can last years. This means a large fraction of actual daily draws — I'd estimate more than a third — produce "In Your Sky Now" content that is structurally no different from what it would produce if the astro layer didn't exist at all. The user paid for the sky. We're handing them the generic earth report.

---

## The Pip Reversal Problem Is Worse Than the Vision Admits

The sprint vision correctly identifies the reversed pip meanings as lagging behind the Major Arcana standard set in sprint 0026. What it understates is how frequently the current reversed text reduces a complex psychological state to its structural inversion.

Read the reversed Two of Pentacles: "The Two of Pentacles reversed suggests that the juggling has become genuinely unsustainable — too many plates in the air and too little attention on any of them, a growing sense that something is about to drop and the anxiety of not knowing which." This is correct. But look at what it's doing: it's describing the situation from the outside. It names the behavior (juggling unsustainably) and the feeling (anxiety). It doesn't name the *psychology* that produces it. Why is the person juggling unsustainably? What is the inner arrangement that makes them unable to put any plate down? That's what the sprint 0026 rewrites got right: the reversed Strength doesn't just say "endurance pushed too far." It says "someone who has confused endurance with courage and cannot put the weight down because the weight has become their name." That sentence names the specific arrested psychology. The Two of Pentacles reversed names the experience of the symptom.

The difference matters because the coreMeaning field is what the user reads in the interpretation panel as their primary insight. If the card is drawn reversed — and 30% of draws are reversed — the coreMeaning is what they sit with. "The juggling has become unsustainable" leaves the user nodding in recognition. "The person who cannot set the plate down because setting it down would require admitting they picked it up wrong in the first place" leaves the user still.

The Swords suit is particularly underdeveloped here. The reversed Nine of Swords says the anxiety is beginning to subside or "has gone deeper underground." The reversed Eight of Swords says release is beginning, "the blindfold slipping." These are directional descriptions, not psychological portraits. Compare what the sprint vision proposes: "the Eight of Swords reversed is not just 'escaping self-imposed limitation' but the specific experience of realizing the blindfold was voluntary all along." That specific experience has a name and a texture. The current text doesn't find it.

---

## The Level 2 Fallback Is Not a Fallback

There's something in the engine that I want to name directly. When `buildTransitInfluence` falls through to Level 2, it produces the element-affinity line. For a single-card draw where the user is not in a spread position (null position), the code reads:

```
if (register !== null) {
  return buildPositionAwareAffinityLine(...)
}
// No position (single-card draw) — unchanged generic output
```

Single-card draws are the most common draw type. A user who opens the app every morning for a daily draw and draws 200 days in a row will hit this exact code path 200 times for every pip card without transit adaptations. And for those 200 draws, they receive: "The current Saturn transit amplifies this card's Fire nature — creative spark and new venture are heightened now." Same structure, every time.

The tertiary fix the sprint vision proposes — treating single-card draws as having an implicit position register — would give Level 2 fallbacks slightly warmer language. But I want to be honest about what that fix is: it's polishing the fallback. The actual fix is eliminating the fallback condition for Saturn, Pluto, and Uranus by writing the Level 1 entries. The position-register improvement is worthwhile, but its value is conditional on the transit adaptation coverage still having gaps. If the coverage is complete, single-card draws get Level 1. The Level 2 fix only matters at the margins.

Don't let the Level 2 improvement become a reason to under-invest in the transit adaptation entries. Write the entries first.

---

## What the Sprint Vision Gets Right

The quality bar the vision sets is exactly right: "Draw any of the 78 cards, make a daily draw as a user whose chart has an active outer planet transit, open the instant interpretation panel, and the 'In Your Sky Now' section should show a card-specific transit note." One sentence, perfectly targeted. Not "improve coverage" — draw any card and it works. That is the standard.

The voice guidance for transit adaptation entries is also exactly right: they must describe the specific meeting between the card's symbolic field and the transit planet's register. The existing Major Arcana entries are the model. The King of Wands under Pluto doesn't say "Pluto brings deep transformation to the King of Wands." It says: "What Pluto is uncovering now is not a failure of the King's leadership but the cost of it — the subterranean life that has been running beneath the world the King built, asking for an accounting it has never received." That entry names something that is specific to the King of Wands and specific to Pluto. Nothing about it would apply to a different card under the same transit.

The pip entries need to meet that standard. Not approximate it. Meet it.

Let me be concrete about what meeting it looks like for the cards the sprint identifies. The Seven of Cups under Neptune: the card is already about illusion and undifferentiated fantasy. Neptune deepens illusion — so what is the specific experience? It's the person who has been living inside a vision of their life for so long, under Neptune's intensification of the Seven's fog, that they have lost the ability to test any of it against reality. Not "Neptune amplifies the Seven of Cups' themes of fantasy." The person who built an elaborate inner world that now feels more real than the world outside it — that's the entry. The Two of Swords under Mercury retrograde: the card is already about blocked decision through deliberate non-seeing. Mercury retrograde adds cognitive fog to a mind that was already choosing not to see. The entry is the person who postponed the decision until Mercury retrograde gave them permission to postpone it indefinitely. Name the specific psychological permission structure, not the general transit-plus-element combination.

---

## Three Things That Are Still Mediocre

Beyond the coverage gap and the reversal depth, I noticed three things in the actual interface and data that are mediocre when they should be good.

**The numerology section in the interpretation panel is orphaned.** Section 5 of `TarotInterpretationPanel.tsx` renders the card's number enormous — `clamp(4rem, 15vw, 7rem)` — and then the numerology note below it. The numerology note on every card is well-written: specific to the card's suit expression of the number, often resonant. But the display treats the number as a visual accent rather than as meaning. There's nothing connecting the numerology section to the user's personal day or personal year beyond a single bolted-on sentence when the personal day matches the card number. What about when the card number matches the personal year? What about when the card number matches the life path? These are significant resonances and the engine has the data. The connection is not being made. The numerology section could be a powerful personalization moment and it's currently a decorative element.

**The astro headline is doing work the transit influence should be doing.** In the "In Your Sky Now" section, the `astroHeadline` renders above the `transitInfluence` in gold italic. For cards with Level 1 transit entries, the headline is often redundant — it says something like "Saturn's grounding current amplifies the Tower's creative spark — now is the moment" while the Level 1 entry below says something much more specific and true. For cards falling through to Level 2, the headline is often the best sentence in the section, but then the body below it is generic. There's a mismatch in quality between the two components that becomes perceptible as a user who reads the product regularly. The headline should either be derived from the Level 1 entry directly (distilled to one sentence) or it should be eliminated for Level 1 cards and reserved as the primary content for Level 2/3 fallbacks.

**The `buildAstroHeadline` function is template-driven in a place that should be specific.** Look at the three cases: retrograde planet generates "X retrograde turns Card Name's keyword inward — review before moving forward." Same template every time. Element match generates "Planet's element current amplifies Card Name's keyword — now is the moment." Same template every time. Default generates "Planet's influence meets Card Name — keyword and transformation walk together today." Same template every time. These are string templates with variable substitution. They produce sentences that are grammatically coherent but symbolically empty. "Venus's influence meets the Two of Cups — connection and transformation walk together today" is not a headline. It's a madlib. The fix isn't complicated: the headline should be generated from the transit adaptation text itself when Level 1 is available, not from a formula. When the entry is this specific — "Pluto arrives below the level of what the King of Pentacles can manage and maintain, to ask what the dedication has been organized around" — a distilled headline could be: "Pluto asks what the work has been for — this is the specific question the Five of Pentacles raises now." Something with actual symbolic content, not structural fill.

---

## The Experience Gap at the Reversed Card Threshold

Here is what happens experientially when a user draws a reversed pip card right now. They see the card flipped. The `coreMeaning` shows the reversed meaning. And what they read is — depending on the card — something that describes the reversed state correctly at the level of behavior or situation but doesn't name the internal experience of being that person.

The experience gap shows up most in the Cups suit, where the reversed meanings tend to describe what the cards look like from the outside. The reversed Six of Cups says nostalgia has been "idealized to the point where it prevents full engagement with the present." True. But who is this person? They're someone who has gotten better at remembering the past than inhabiting the present. Not better at nostalgia in general — better at the specific past that felt safe. The present is too uncertain; the past is edited by memory into a place where the self was okay. That is the psychology the reversed Six of Cups is pointing at. The current text is correct but it's describing the symptom rather than naming the inner arrangement that produces it.

The sprint vision is asking for this exact upgrade for the Twos through Nines. What I'm saying is: when you do it, prioritize the entries that users are most likely to draw in readings about difficult situations. The Swords suit gets drawn when someone is in mental anguish, when they can't sleep, when they're carrying a decision that is eating at them. The reversed Nine of Swords, Eight of Swords, Seven of Swords — these are the cards where the reading needs to do genuine work, because the person drawing them is in genuine distress. "The anxiety is beginning to subside or has gone deeper underground" is not helpful to someone drawing the reversed Nine of Swords at 3am. What is helpful is a reading that names the specific psychology of the person who has been managing their anxiety so successfully that they've forgotten what the anxiety was trying to tell them.

---

## The Single Proposal That Would Unlock Everything

If sprint 0027 accomplishes only the transit adaptation entries for the pip cards — written to the standard of the existing Major Arcana entries, covering Saturn, Pluto, Uranus, and suit-appropriate planets — the product reaches a qualitatively different state. Not incrementally better. Actually different.

Here's why. Right now there is a user who draws cards regularly, whose chart has an active Saturn transit — and this describes almost every adult, because Saturn is always somewhere significant — and who draws a Three of Cups on a Tuesday. What they currently receive in "In Your Sky Now" is the Level 2 fallback. After sprint 0027, if the entry is done right, what they receive is something that names the specific experience of Saturn arriving at the Three of Cups' domain: the celebration that is being asked to become something more serious, the community that is being tested by responsibility, the joy that is being deepened rather than merely felt. That specific signal — arriving for a card drawn by a specific person under a specific transit on a specific day — is the experience that produces word of mouth. Not the interface. Not the visual polish. The moment when the card says something true about where they are.

Write the entries. Write them to the standard. Don't approximate. The quality bar in the vision is exactly right: if an entry reads like "Saturn brings restriction to the Two of Wands," it is not done. The Two of Wands reversed under Saturn is the person who has been planning the same journey for three years because planning is the version of the journey that cannot disappoint. Saturn, arriving at exactly that moment, is not bringing restriction — it is asking whether the planning has become permanent. That is one sentence. It is the right sentence. Write that sentence.

---

## Proposals

**Feature — Transit Adaptation Coverage for Pip Cards Two Through Nine**

Write Level 1 transit adaptation entries for all 28 missing pip cards in `src/data/tarot/transitAdaptations.ts`. Two to three entries per card: Saturn (any), Pluto (any), and the suit-appropriate third planet (Mars for Wands/Swords, Neptune for Cups, Venus for Pentacles). Additionally, Mercury retrograde for the mental/decision cards: Two of Swords, Eight of Swords, Seven of Cups. Include the two missing Major Arcana entries: the-fool under Uranus and Saturn; justice under Venus and Saturn.

Each entry must meet the existing Major Arcana voice standard: it names the specific meeting between the card's symbolic field and the transit planet's register. "Saturn brings restriction" is not an entry. The entry is the specific psychology of what happens to a person at this particular junction of this card's symbolic territory and this planet's demands.

**Feature — Pip Card Reversed Meaning Depth**

Rewrite the `reversedMeaning` field for the pip cards where the current text describes the reversed state from the outside without naming the specific arrested psychology. Prioritize in this order: Nine and Eight of Swords (highest distress draw), Nine of Cups (hollow fulfillment — a counterintuitive reversal), Six of Cups (nostalgia-as-avoidance), Eight of Cups (return without completion), Two of Wands (the permanent planner), Seven of Cups (illusion-as-protection), Five of Cups (grief management instead of grief). The goal is not a complete rewrite of all 28 — it is the entries where the current text would produce a generic note if drawn reversed. The standard is the sprint 0026 reversals: they name the specific off-axis psychology, not the behavior of the reversed state in general.

**Code Enhancement — Single-Card Draw Position Register**

In `buildTransitInfluence` within `src/engine/tarot.ts`, the single-card draw path (null position) bypasses the position-aware Level 2 affinity logic and falls through to the generic template. Add a minimal position-register inference for single-card draws: the `'single'` spread position ID already exists in `SPREAD_POSITIONS`. Providing it as a `present-active` register to `buildPositionAwareAffinityLine` would produce warmer, slightly more specific Level 2 fallback language for daily draws. This is a secondary improvement — it only matters when Level 1 is still missing, so it should be shipped alongside or after the transit adaptation entries, not as a substitute for them.

**Code Enhancement — Transit Adaptation Voice Check**

After writing the pip transit adaptation entries, do a pass over the Level 2 fallback output for cards that *do* have Level 1 entries under certain planets but fall through to Level 2 for others (the Aces, some Minors with partial coverage). Verify that the position-aware Level 2 fallback, when it fires for these cards, doesn't contradict or dilute the card's established symbolic register as defined by its Level 1 entries. For example: the Ace of Wands has a Mars Level 1 entry. Under Saturn, it falls through to Level 2. The Level 2 line should acknowledge the tension between the Ace's pure initiation energy and Saturn's demand for demonstrated preparation — it should feel like the right Level 2 for this specific card, not a generic element-affinity note. This is a quality audit, not a rewrite — but it's the kind of audit that closes the gap between a system that mostly works and one that consistently works.

---

## What I Would Not Touch

The GPT synthesis prompt architecture is correct and closed. The sprint vision is right to prohibit reopening it. The three synthesis handlers — single, three-card, Celtic — have been tightened through two sprints and have reached a quality that earns protection. Don't touch them.

The spread types are correct. Three spreads, each with a distinct structural logic. The Celtic Cross is complex enough that it contains the full vocabulary. Adding a fourth spread type would diffuse the ritual rather than deepen it.

The interpretation panel layout in `TarotInterpretationPanel.tsx` is correctly ordered. Position frame, then core meaning, then what it carries, then today's invitation, then the sky section, then numerology, then the reflection question. This sequence is right. The sections are the right sections at the right weight.

The visual language — the Cormorant Garamond headings, the deep charcoal ground, the gold at `#c9a84c`, the `border-mystic-gold/20` borders — this is settled and correct. Don't redesign it.

---

## The Question I Keep Coming Back To

If I were a user who draws a tarot card every morning, and I drew 78 cards in rotation, how many of those draws would produce an "In Your Sky Now" section that felt genuinely true to me rather than generically applicable? Right now, with Saturn or Pluto active (which describes almost everyone), for 28 of those 78 cards the answer is: generic. After sprint 0027, if the entries are written correctly, the answer is: all of them.

That's the change. It's not a visual change. It's not a structural change. It's a data change that makes the experience qualitatively different for every user who draws a pip card under a major outer planet transit — which is most users, most of the time.

Write the entries. Write them well. That's the sprint.

---

*Written as Steve Jobs, advisory voice for sprint-0027 planning.*
