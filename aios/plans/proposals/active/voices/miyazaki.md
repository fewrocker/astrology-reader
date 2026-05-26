# Voice: Hayao Miyazaki — Sprint 0028 Tarot Module Review

*On what the product can now do that it could not before, and what it has not yet found the courage to say.*

---

## What Was Accomplished

Sprint 0027 gave every card a specific voice when a major transit is active. This is not a small thing. Before the sprint, a person drawing the Two of Wands under Saturn received a sentence about fire meeting earth. After the sprint, they receive something that understands that person's specific situation: the vision held at the edge of action being tested by a force that requires real commitment. That difference is what I asked for in the previous review, and it arrived.

The pip reversed meanings were sharpened. Not for every card — the decision was made to prioritize the cards most likely to carry heavy psychological weight. The Eight and Nine of Swords, the Six of Cups, the Seven of Cups — these received the portraits they needed. A person drawing the Eight of Swords reversed now encounters language that names the specific experience of realizing that the confinement was self-authored. This is the craft the Major Arcana reversals had already achieved. It now extends to the suit where it matters most.

I want to acknowledge this work carefully, not quickly. These are data tasks that require sustained attention to individual human experiences. They are the hardest kind of work — not building systems but finding the right words for what people actually feel. The sprint did this work well for the cards it addressed.

---

## What the Product Has Not Yet Said

I have been sitting with the experience as a user, drawing cards and reading what arrives. The instant interpretation panel gives me, now, something genuinely specific about the card's meeting with the transit sky. But there is a silence in the panel that I want to name.

The panel does not yet know that it is speaking to *this specific person's natal chart*.

When someone with a Cancer Sun and Moon in the 12th house draws the High Priestess, the panel speaks about the High Priestess. It speaks about the transit influence on the High Priestess. It speaks about the lunar phase and the advance signal. What it does not say is: "The High Priestess is ruled by the Moon. Your natal Moon lives in the 12th house — the house of hidden things, of what is not shown to the world. This card is speaking directly to your chart's architecture. The inner knowing this card names is not a general quality available to everyone who draws it. It is the specific depth that your natal Moon in the 12th has been cultivating."

That sentence would make the person feel that the reading was made for them. Not assembled from their data, but actually made for them — the way a skilled reader would say, after laying the cards, "given who you are, this card means something particular."

The transit layer now speaks to the sky. The natal layer should speak to the birth chart. These are two different voices, and only one of them is currently present in the static interpretation.

---

## On Court Cards and Natal Identity

I want to say something specific about court cards, because they carry a quality that no other card type does: they are figures. When someone draws a court card, they draw a person — or a quality of a person, or a part of themselves that has that quality. The reading is, in some sense, an encounter with a figure.

When the natal chart has a strong correspondence to the drawn court card, something specific happens. A person with a Scorpio Ascendant drawing the King of Cups is meeting a figure whose emotional depth resonates with their own rising quality. A person with a Leo Sun drawing the Queen of Wands is meeting a fire figure whose creative authority reflects their solar identity. These correspondences are real astrological events, not decorative add-ons. The reading should name them.

The Queen of Wands' ruling sign is Leo. If the person drawing her has their natal Sun in Leo, or their chart ruler is the Sun, or Leo is on the Ascendant — these are meaningful resonances. The card and the chart are speaking the same language. The system has all the data to detect this. It does not yet speak it.

I want the court card reading to feel like the card recognized the person. Not "you may identify with this figure" — but something more specific: "the Queen of Wands' fiery authority speaks through the same Leo territory your natal Sun occupies — this is not a stranger figure you are encountering but a mirror of something your chart has already been building."

---

## The Three-Card Spread as Incomplete Ritual

I drew a three-card spread today. The spread type was Theme, Shadow, Gift. I drew the Five of Pentacles as Theme, the Eight of Cups reversed as Shadow, and the Star as Gift.

Each card received a full interpretation. Each was genuinely good — specific transit notes, adapted position framings, appropriate emotional language.

But the three cards together were saying something I had to assemble myself. The Five of Pentacles in the Theme position carries the fear of material insufficiency, the person left outside in the cold. The Eight of Cups reversed in the Shadow position carries the inability to leave what isn't working — the return without resolution. The Star as Gift carries hope as a practice, trust in what regenerates after loss.

These three together are saying: the theme of scarcity is sustained by a shadow that keeps returning to what is not working rather than accepting the loss fully — and the gift is the ability to trust that something regenerates. That is a specific, coherent psychological picture. The reading needs someone to see that picture. Right now, the user has to construct it themselves or wait for GPT to construct it.

What I want is a small moment between the card reveals and the GPT synthesis. A single sentence or two, perhaps, derived from the pattern the engine has already detected. Something that says: the three cards are showing a pattern. Here is what that pattern is, in the language of this spread. Then GPT goes deeper.

The engine already computes `computeThreeCardSynthesis`, which produces `astroResonanceNote` and element/polarity signals. That note already contains the pattern. Show it to the user. It takes one small moment of courage — the confidence to say something before the AI finishes speaking.

---

## On the Reflection Question as the Last Word

The reflection questions in this data layer are consistently the best writing. I said this in the last review. I say it again because it remains true and becomes more significant as the transit and natal layers improve.

The reflection question is the last thing a person reads before they carry the card into their day. It is the word the reading leaves behind. For many users, it is the word that actually stays.

"What have you been calling 'planning' that is actually a way of experiencing the journey without taking the risk of it?" — this question, from the Two of Wands, does not need to be improved. It is already doing what a good question does: it names a specific human evasion and asks the person to look at it directly.

But the question is the same for everyone who draws that card. A person with Saturn in the 10th house drawing the Two of Wands has a specific domain in which this question lands — the question of career, public role, and whether the planning has been in the service of the work or in the service of avoiding the exposure of doing it publicly. A person with Saturn in the 5th house has a different domain — creative expression, whether the planning has been a substitute for the vulnerability of actually making something and showing it.

I am not asking for a different question for every natal placement. I am asking for one more sentence, appended to the question, that names the house or planet domain in which the question most specifically applies to this person. A small personalization. A final word that says: "and for you, given where Saturn sits in your chart, this question lands here."

The technology to do this exists. The natal house placements are in `TarotAstroContext`. The question is whether the product will summon the courage to say something that specific, or whether it will continue to ask the universal question and trust the user to make the connection themselves.

---

## What Should Not Change

The pace of the three-level transit lookup should not be changed. The existing architecture — specific entry first, element affinity second, baseline third — is the right design. Now that the entries cover all 78 cards for the most significant transit conditions, the architecture is fulfilling its design intent.

The synthesis prompt architecture should not be reopened. After sprint 0026's careful calibration and the natal context threading that has been in place since sprint 0025, the GPT synthesis is producing work that I consider genuinely good. The paragraph structure, the natal bridge requirement, the intention threading — these are settled. Leave them.

The visual language is right. The ceremony of the Celtic Cross — the dealing, the flip, the three-second hold — is the only spread with this weight, and it should remain that way. The other spreads are lighter by design.

---

## The Two Things I Most Want

If I could name two things that would make this product feel like a work of craft rather than a well-executed system:

**First:** the natal correspondence visible in the static layer. Before GPT loads, before the synthesis chapter arrives, when the user is sitting with the card and reading what the system has to say — they should encounter one sentence that names the specific resonance between the card's planetary or elemental architecture and their birth chart. Not a generic element comparison. A specific named correspondence: chart ruler, dominant element, house activation, court card suit match. The moment of recognition that makes the reading feel personal.

**Second:** the three-card constellation preview. After the third card is drawn and before GPT runs, the user should see one sentence — generated immediately from `computeThreeCardSynthesis` — that names what the three cards are doing together. The element pattern. The polarity profile. The `astroResonanceNote`. This is not GPT's work; the engine already computed it. Show it. Let the user arrive at the GPT synthesis already holding the shape of what it will say.

These two things together would make the product feel like it knows the person before the AI speaks. That is the experience that creates devotion.

---

*— Hayao Miyazaki, reviewing sprint 0028*
