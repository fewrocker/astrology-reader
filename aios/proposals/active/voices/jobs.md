# What I Would Change — Steve Jobs

I've used the product. I've read every line of code that touches the tarot experience. Here is what I think.

---

## The emotional core — and whether it's being delivered

A tarot reading, at its best, is the feeling that the universe just spoke directly to you. Not to a demographic. Not to someone who shares your Sun sign. To *you* — your exact life, your exact question, your exact moment. That's the emotional core. That's what makes someone put down their phone after a reading and feel something shift.

The product is getting close. The infrastructure is genuinely impressive — ten-card Celtic Cross wired to transit data, daily and weekly aspects feeding the GPT prompt, card pairs analyzed for elemental dignity, the user's original intention threaded through the synthesis. It's more astrologically grounded than anything else on the market. But "astrologically grounded" is not the same as "feels like it was written for me." The gap is still there, and it's in the specificity of the language that comes back.

I pulled the synthesis prompt for the single-card reading. Paragraph 2 says: "Mention at least one natal placement and explain why this specific card... resonates with this person's birth pattern specifically." That phrase — "at least one" — is the enemy. One natal placement mentioned in passing is not a bridge between a card and a life. It's a footnote. The prompt is asking for coverage, not for the one connection that actually lands.

The product feels, right now, like a very well-read astrologer who has done their homework but is still introducing themselves. It should feel like a reader who has known you for years — who cuts straight to the thing you were afraid to say out loud.

---

## The three moments that should be signature but currently fall flat

**1. The first sentence of the synthesis.**

When the synthesis loads and the person reads the opening line, that is the moment that either grabs them or loses them. It's the moment where they decide whether this reading is *for them*. Right now, the opening is competent. It names the card. It acknowledges the intention. But it doesn't surprise anyone. Read the single-card prompt — the opening paragraph instruction says "lead with the card's symbolic and psychological meaning in the context of the person's intention." That's not wrong. But it's not enough. The opening sentence should name the *specific* thing the card is doing to the person's question — not what the card means in general, not even what the card means in the context of the intention, but the precise collision between card and question that produces an insight neither could have produced alone.

Compare: "The Hermit, reversed, arriving as you seek clarity on your career..." versus "The Hermit reversed doesn't want you to find the answer faster — it wants you to stop trusting the answer you already decided on." The second one might be wrong for some people. That's fine. It's saying a real thing to a real person, not a plausible thing to everyone.

The chart ruler is not being sent to any of the three synthesis handlers. This is the single highest-leverage missing data point. A Scorpio Rising person has Pluto as their chart ruler. When they draw The Tower under a Pluto transit, the synthesis should be able to say something categorically different from what it says to a Sagittarius Rising person drawing the same card. The `buildTarotAstroContext` function in `src/engine/tarot.ts` computes `natalDominantElement` and `natalDominantModality` but never derives the chart ruler, despite the Ascendant sign being available at line 481. Every synthesis prompt that touches natal context is working without the most important personal signature.

**2. The position-meaning gap in the instant interpretation panel.**

The instant interpretation panel — `TarotInterpretationPanel.tsx` — shows Core Meaning, What It Carries, Today's Invitation, In Your Sky Now, Number, Sit With This. It shows everything about the card. It shows nothing about the *position*. A Three-Card reading where someone draws The Tower in the Mind position should produce a fundamentally different instant interpretation than The Tower in the Action position. The position label and meaning are available in `InstantInterpretation` — `positionLabel` and `positionMeaning` both exist on the interface — but they aren't rendered anywhere in `TarotInterpretationPanel.tsx`.

This is the gap between the pre-GPT experience and the GPT experience. While the person waits for synthesis, they read the instant interpretation panel. If it doesn't acknowledge what position they're in, the reading hasn't started yet. The person is reading a generic card description, not a reading. The component has all the data it needs. It's just not showing it.

**3. The moment of reveal.**

I walked through `CardReveal.tsx` and `DeckShuffleAnimation.tsx`. The engineering is solid — the 6-phase ritual state machine, the flip animation, the glow-on-reveal. But here's what I observed: the card flips, the glow fires, and immediately below the card the instant interpretation sections appear — Core Meaning, What It Carries, Today's Invitation. Everything at once. All six sections, stacked, waiting to be scrolled.

The reveal is not a door opening. It's a file cabinet opening. The experience of receiving a card should have silence in it. The flip should complete, the card should breathe for a moment in its revealed state, and then the first piece of meaning should arrive — just one thing, with presence. Then the next. The current architecture dumps all six interpretation sections simultaneously. This is the product telling you everything it knows instead of telling you the one thing it came to say.

---

## What should be cut or simplified

The `TarotHomeView.tsx` screen has a design problem. There are three reading types — Single, Three-Card, and Celtic Cross — but after selecting Three-Card, a second menu expands showing five spread options: Past/Present/Future, Situation/Challenge/Advice, Mind/Heart/Action, Self/Other/Bridge, Theme/Shadow/Gift. That is eight choices total before a card is drawn. For someone coming to a tarot reading for the first time — or for someone in distress who needs clarity — eight choices before a single card is drawn is a design failure.

The five three-card spread options are genuinely distinct and well-designed. I'm not saying eliminate them. I'm saying the interface should not present them all as equal entries in a list. Most people want Past/Present/Future because they know what it is. The other four spreads are for people who want to go deeper. The UI should reflect that hierarchy. One visible default, four discoverable alternatives.

The FOCUS_CHIPS array in `TarotHomeView.tsx` — Love, Career, Growth, Decision, Today's Energy, General — is fine, but it exists in a different component from `TarotIntentionScreen.tsx` which has its own chip set: Today's Energy, Love & Relationships, Career & Purpose, Growth, Custom Question. These two components appear to serve similar purposes at different points in the flow. I found both during my read. The product should have one intention-setting moment, not two different approaches that the two components implement slightly differently.

---

## What would make someone show this to a friend

A reading that contains exactly one sentence they have never read anywhere else. Not a clever reframing. Not a personalized horoscope. One sentence that could only have been written by something that knew their chart, their question, their sky, and their card. Something that makes them go quiet.

The mechanism for that sentence exists. The transit adaptations in `src/data/tarot/transitAdaptations.ts` show what it looks like when the writing is operating at that level — the Tower under Pluto: "root-level change, the kind that does not leave the soil the same after it passes through." That's a sentence you remember. The problem is that this quality is concentrated in the transit adaptation layer and dilutes as it moves through the synthesis prompt. The synthesis prompt at line 614 in `gptTarot.ts` asks for "2-4 sentences" per paragraph with the card "mentioned," the natal placement "mentioned," the transit "tied back to the card." All of these instructions optimize for completeness. None of them optimize for the one sentence that stops someone.

The sprint-0026 vision document says it correctly: "prefer one true thing the user didn't already know over five plausible things they did." That principle isn't yet enforced in the prompt. It's stated in a guidelines document that the model reads as context, not as a hard constraint on its output length. The model produces five plausible things because it's instructed to produce four paragraphs. Reducing permitted paragraph count and explicitly prohibiting the hedged, covering-all-bases sentence — not just recommending against it, but prohibiting it by name — would be a higher-value change than any new data field.

---

## What the product feels like now vs. what it should feel like

Right now it feels like a very intelligent assistant who has studied astrology and tarot seriously and is giving you a personalized reading based on everything it knows about you. That's good. That's actually better than most competitors. But it feels like knowledge being applied rather than meaning being received. There's a register difference between a reading that explains things to you and a reading that names the thing you already know but haven't said yet. The product is currently in the explanation register.

It should feel like sitting down with someone who sees you. Who looks at your question and your chart and your sky and your card and then says the one thing that was true and you didn't know you needed to hear. Not because they ran a sophisticated algorithm, but because they paid attention to what was actually in front of them and had the courage to say the specific thing instead of the safe thing.

The chart ruler fix is a technical task. The position context in the interpretation panel is a UI task. The prompt specificity work is a writing task. But underneath all three is the same problem: the product is currently optimized to never be wrong. It hedges. It covers. It says "this card can mean..." instead of "this card, in your hands, right now, means." The tone is careful where it should be direct.

The resolution is not in adding more signals to the prompt. The signals are already there and growing. The resolution is in constraining the output to the most specific interpretation the available signals can support, and trusting the person receiving it to handle a real thing being said to them.

---

*Written after reviewing: `aios/plans/sprints/sprint-0026/vision.md`, `aios/guidelines.md`, `aios/planning/define-product.md`, `server/services/gptTarot.ts`, `src/engine/tarot.ts`, `src/data/tarot/majorArcana.ts`, `src/data/tarot/transitAdaptations.ts`, `src/components/tarot/TarotInterpretationPanel.tsx`, `src/components/tarot/TarotHomeView.tsx`, `src/components/tarot/TarotIntentionScreen.tsx`, `src/components/tarot/SingleCardSynthesisPanel.tsx`, `src/components/tarot/CardReveal.tsx`, `src/components/tarot/DeckShuffleAnimation.tsx`, `src/components/tarot/TarotSynthesisPanel.tsx`, sprint-0024 and sprint-0025 changelogs.*
