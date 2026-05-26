# Voice: Steve Jobs — Tarot Module Review
## Sprint 0028

---

Sprint 0027 delivered. Every card now has at least one transit adaptation. The pip reversed meanings got sharper psychological portraits for the most charged cards. The single-card draw was fixed to pass the `single` position register. All 193 transit entries landed. The coverage contract test is in place.

So where are we now?

I drew cards today as a real user. I drew a Two of Cups under a Venus transit. Beautiful transit entry — it named something real. Then I drew the Queen of Pentacles under Saturn. Specific, well-crafted. The system is delivering what it promised on the transit layer.

But I noticed something. After the transit note, the reading continues. There's a "Sit With This" section with a reflection question. And then — it just ends. There's a button that says "✦ Discuss" and GPT synthesis loads. But between the instant interpretation and the GPT synthesis, there is this gap. The user is sitting with a card that the system has said something specific and true about, and there is nothing to do except wait for GPT. The experience has no momentum.

Here's the real problem I want to name: **the natal chart is almost invisible in the instant interpretation.**

The "In Your Sky Now" section has the transit influence. It has the lunar phase note. It has the advance category note. But it doesn't say anything about the user's natal chart in the static layer. The natal context — their Sun sign, their chart ruler, the houses their personal planets occupy — all of that only appears in the GPT synthesis paragraph 2. That's 10 seconds after the card draws. The person who draws the High Priestess as a Cancer Sun with Moon in the 12th house — that combination should be visible *immediately*, before the GPT loads. Not as a decorative addition but as the core signal: "This card's Moon rulership speaks directly to your natal Moon in the 12th house — the inner knowing this card names is in your chart's architecture."

That's a natal card correspondence. It's the thing that makes someone feel seen before the AI finishes loading. Right now we're hiding it behind a network call.

The second thing I noticed: the three-card spread delivers three separately interpreted cards. Each card gets its own "In Your Sky Now," its own "What It Carries," its own reflection question. But after all three cards are drawn — what is the arc? The GPT synthesis handles the arc, but the synthesis is a paragraph. The user has to read three full interpretation panels and hold the arc in their head until GPT delivers it. There's no immediate visual synthesis of the three-card constellation. No moment where the user sees "these three cards together say: Fire-Earth-Air, with the center reversed, and your Venus in the 7th is lit up by all three positions." That emergent picture exists in the code — `computeThreeCardSynthesis` computes it — but it's not surfaced to the user before GPT runs.

The signature missing moment is this: the user draws three cards, and before the AI speaks, they see a small, beautiful summary of what those three cards say together in the language of the spread structure. One sentence. Like: "A Fire-Earth tension with Air bridging them — the mind is seeking to reconcile what your body knows and what your spirit wants." Something derived from the actual synthesis engine. The computeThreeCardSynthesis function already produces `astroResonanceNote`, `elementDistribution`, `dominantArcana`, `fireWaterTension`. None of it reaches the user's eyes until GPT arrives.

Show the user the constellation. Show it immediately. Don't make them wait for GPT to tell them what their own cards are doing together.

**Three things I want fixed:**

1. Natal card correspondence surfaced in the instant interpretation panel — the specific resonance between a card's ruler or element and the user's natal placements. Not generic ("your Fire nature meets this Fire card") but specific ("this card's Venus ruler speaks directly to your natal Venus in Taurus in the 2nd house — abundance is the theme in your personal architecture").

2. Three-card spread constellation preview — a small immediate summary of the three-card structure derived from `computeThreeCardSynthesis` output, shown before GPT loads. One to three lines. Makes the waiting feel purposeful rather than empty.

3. Court card natal resonance — when a court card is drawn and the court's suit element matches the user's dominant natal element or chart ruler, name it explicitly in the instant interpretation. The King of Cups drawn by someone with a Cancer Ascendant is a different event than the King of Cups drawn by a Capricorn rising. The card knows this. We should too.

One more thing: I looked at the reflection questions across the deck. They're the best writing in the data layer, as Miyazaki noted. But they're static — the same reflection question for the Queen of Pentacles whether you're a Taurus Sun or an Aries Sun, whether your North Node is in the 2nd house or the 10th. The reflection question is the last thing the user reads before they carry the card through their day. That's the moment to make it personal. Not a rewrite of the question — a single personalization line appended: "For someone with Saturn in the 10th, this question lands especially in the domain of career and public life." Something that takes what's already there and anchors it to the individual's chart architecture.

That's four specific, implementable improvements. All of them deepen the natal-card connection. All of them make the experience feel made for this person, not generated for any person. That's the difference between a feature and a product people love.

---

*Written as Steve Jobs, advisory voice for sprint-0028 planning.*
