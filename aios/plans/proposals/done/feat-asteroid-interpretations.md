**Type:** Feature
**Originated by:** Jobs, Miyazaki
**User guidance:** "The goal of this sprint is very simple but needs to be well done: add asteroids to the charts. All of them; birth charts, synastry, transits. They have to look nice and mean something. Focus on the main ones."

---

## Problem / Opportunity

The product currently renders eleven bodies in the natal chart — ten classical planets plus the North Node. When sprint 0014 adds Chiron, Ceres, Pallas, Juno, and Vesta to the chart wheel, those five bodies will appear on-screen with no interpretation behind them.

The immediate failure mode is visible: a user hovers Chiron, the tooltip opens, and either the sign/house interpretation card is empty or it falls through to the generic fallback — "No specific interpretation is recorded for this aspect — its meaning is shaped by the signs and houses of both bodies." A user who sees that message does not think "this app is in progress." They think "this app does not know what Chiron is." That impression is permanent.

The subtler failure is equally serious. The GPT context assembled in `buildTransitPrompt()` and the natal planet context in `server/services/gpt.ts` will list asteroid positions — "Chiron: 17°43' Taurus (House 2)" — without any archetype framing. GPT receiving that line produces the same Chiron language it would produce for any user who typed "I have Chiron in Taurus" into a chatbot: generic wounded-healer boilerplate that could appear on any free birth chart site. The differentiation that makes this product worth paying for disappears.

The five asteroids represent the part of the chart most relevant to depth psychology and modern astrological practice. Chiron describes the formative wound and the path to wisdom. Ceres describes the grief cycle and what nourishes or fails to nourish. Pallas describes intelligence that does not fit conventional categories. Juno describes the commitment bond and what we will or will not tolerate in partnership. Vesta describes sacred devotion and what a person keeps burning even at personal cost. These are the placements people take to therapy, return to at inflection points in their lives, and share with close friends in specific language. If the product names them correctly, it earns a level of trust that no Sun-sign feature can reach. If it names them incorrectly — or does not name them at all — it has added noise to a chart that was working without it.

The opportunity is real: 125 new entries (60 sign, 60 house, 5 retrograde) written at the quality of the synastry briefs transform five dots on a chart into the product's most compelling differentiator.

---

## Vision

The moment a user expands their Chiron card and reads something true, the product crosses a threshold. Not something accurate — accurate is table stakes. Something *true*: language that names the shape of an experience the user has carried for years without being able to articulate it.

Jobs describes this moment precisely: *"That is a moment of recognition that makes them share the app."* He envisions the reading for Chiron in Taurus in the 2nd house landing like this — *"your wound around self-worth and material security — the place where early experiences taught you that having enough, or being enough, was uncertain"* — and someone taking a screenshot and sending it to their therapist. That is not an aspiration. That is the quality bar.

Miyazaki's framing clarifies the writing mode required to reach it. The existing planet-in-sign database writes in the mode of a textbook that is trying to be friendly: "Your Sun in Aries gives you a fearless, pioneering spirit." Grammatically correct. Astrologically accurate. The synastry database writes in a different mode: "one of you carries the light, the other feels it — your sense of self and their emotional world fuse into something neither could name alone." That second sentence does not describe a configuration. It addresses a person. The asteroid interpretations must be written in the second mode.

The distinction Miyazaki draws is exact: "The first version describes. The second version addresses." An interpretation that describes Chiron in Aries as a wound in the area of selfhood is technically correct and experientially hollow. An interpretation that says — *"your wound lives in the place of pure beginning — the impulse to act first, claim space, be seen as someone who leads. Something early taught you that to want this was too much"* — is something a person reads and recognizes. They were not told about their chart. They were seen by it.

This is the interpretive experience the asteroid entries must create: specific enough that someone who does not have this placement would notice, resonant enough that someone who does have it feels recognized. Miyazaki's test is precise: "If the person reading this did not know they had this placement, would this interpretation make them feel recognized? If the answer is no — if the text could apply to anyone, or could appear in a generic horoscope column — it must be rewritten."

Each asteroid carries a core question that must live beneath every entry, regardless of sign or house:

- **Chiron**: Where is the wound that will not close, and how has living with it made you a healer for others?
- **Ceres**: What is your relationship to nourishment, loss, and return — how do you metabolize grief and the cycles of receiving and losing what sustains you?
- **Pallas**: What is the pattern you see that others walk past — what kind of intelligence do you carry that does not fit the usual categories?
- **Juno**: What is your understanding of commitment and what you will and will not tolerate in a bond — what has the experience of partnership taught you about who you are?
- **Vesta**: What is your sacred dedication, and what do you sacrifice in order to tend it — what flame do you keep lit even when keeping it costs you something?

The sign modifies *how* the asteroid's archetype manifests. The house says *where in life* it is most active. The core question must remain present in every entry, giving it gravity. Chiron in Aries and Chiron in Libra are both about wound and wisdom — they differ in where the wound lives and how the person navigates it, not in what kind of body Chiron is.

The retrograde entries deserve special attention. Chiron retrograde is said to intensify the wound's internalization — the healing journey becomes more private, more solitary, longer to begin. That is not simply "Chiron retrograde turns Chiron inward." It is a lived experience with a specific texture. The existing retrograde entries for Venus (*"your sense of beauty is unique and often ahead of its time. Self-worth is an ongoing journey that deepens with maturity"*) reach for that texture. The asteroid retrograde entries must reach for it too.

---

## Specifications

### 1. Data structure for asteroid entries

All asteroid interpretation entries use the identical `InterpretationEntry` shape already defined in `src/data/interpretations/types.ts`:

```typescript
interface InterpretationEntry {
  brief: string   // 1 sentence, ≤ 15 words
  detail: string  // 2–4 sentences, 40–100 words
}
```

**Key format — planet-in-sign:** `${AsteroidName}_${ZodiacSign}`
Examples: `Chiron_Aries`, `Ceres_Scorpio`, `Pallas_Aquarius`, `Juno_Cancer`, `Vesta_Capricorn`

**Key format — planet-in-house:** `${AsteroidName}_H${houseNumber}`
Examples: `Chiron_H1`, `Ceres_H12`, `Pallas_H7`, `Juno_H10`, `Vesta_H3`

**Key format — retrograde:** `${AsteroidName}` (matching the existing `NATAL_RETROGRADE` record structure)
Examples: `Chiron`, `Ceres`, `Pallas`, `Juno`, `Vesta`

These entries are added directly to the existing records:
- `PLANET_IN_SIGN` in `src/data/interpretations/planetInSign.ts`
- `PLANET_IN_HOUSE` in `src/data/interpretations/planetInHouse.ts`
- `NATAL_RETROGRADE` in `src/data/interpretations/retrogrades.ts`

No new files, no new lookup functions. The existing `getPlanetInSignInterpretation`, `getPlanetInHouseInterpretation`, and `NATAL_RETROGRADE` table will serve asteroid lookups automatically once the entries are present, provided the function signatures are extended from `PlanetName | 'NorthNode'` to `PlanetName | 'NorthNode' | AsteroidName`. That type extension is handled in the `code-asteroid-type-system` proposal and is a prerequisite.

### 2. Scope — exactly which entries are required

**Planet-in-sign: 60 entries**

All five asteroids × all twelve signs:

| Asteroid | Signs |
|----------|-------|
| Chiron | Aries, Taurus, Gemini, Cancer, Leo, Virgo, Libra, Scorpio, Sagittarius, Capricorn, Aquarius, Pisces |
| Ceres | Aries, Taurus, Gemini, Cancer, Leo, Virgo, Libra, Scorpio, Sagittarius, Capricorn, Aquarius, Pisces |
| Pallas | Aries, Taurus, Gemini, Cancer, Leo, Virgo, Libra, Scorpio, Sagittarius, Capricorn, Aquarius, Pisces |
| Juno | Aries, Taurus, Gemini, Cancer, Leo, Virgo, Libra, Scorpio, Sagittarius, Capricorn, Aquarius, Pisces |
| Vesta | Aries, Taurus, Gemini, Cancer, Leo, Virgo, Libra, Scorpio, Sagittarius, Capricorn, Aquarius, Pisces |

**Planet-in-house: 60 entries**

All five asteroids × all twelve houses (H1 through H12).

**Natal retrograde: 5 entries**

One entry per asteroid: Chiron, Ceres, Pallas, Juno, Vesta.

**Special case — Chiron Return: 1 entry**

One dedicated entry in `transitAspectBriefs.ts` (or an equivalent lookup) keyed `Chiron_Conjunction_Chiron` for the transit case where transiting Chiron approaches within 3° of natal Chiron. This entry requires dedicated language — see Specification 8.

**Total: 126 entries** (60 + 60 + 5 + 1)

### 3. Writing quality standard

#### The quality bar, precisely stated

The existing planet-in-sign entries are accurate and competent. They are not the bar. The bar is the synastry interpretation database.

Compare:

> *planetInSign.ts:* "Your Sun in Scorpio gives you extraordinary depth and intensity. You see beneath surfaces and are drawn to life's mysteries."

> *synastryAspectBriefs.ts:* "one of you carries the light, the other feels it — your sense of self and their emotional world fuse into something neither could name alone."

Both are real astrological writing. Only the second one is felt rather than read. The asteroid entries must be written in the mode of the second.

#### What "generic" means — and why it fails

Generic text is text that a person reads and thinks: "yes, and?" It correctly describes the placement without creating recognition. It applies equally to every person born with Chiron in Aries. It could appear unchanged in a newspaper horoscope column.

**Examples of unacceptable generic text:**

- "Chiron in Aries means your deepest wound is in the area of selfhood and independence. You may have experienced early challenges around asserting yourself." — This is the wounded-healer formula applied mechanically. It describes without addressing.
- "Ceres in Scorpio indicates a complex relationship with nourishment and emotional depth." — Technically accurate. Says nothing a person can feel.
- "Pallas in Aquarius gives you intellectual gifts and innovative thinking." — This could be any air-sign Mercury placement. It names no specific intelligence.

**Examples of acceptable text (directional targets, not final copy):**

For Chiron in Aries — "Your wound lives in the place of pure beginning — the impulse to act first, claim space, be seen as someone who leads. Something early taught you that to want this was too much, or that you were not the kind of person who gets to go first. The paradox is that this wound is also your deepest gift: you know what it costs to be the pioneer."

For Ceres in Scorpio — "Your nourishment moves through grief cycles — the Persephone logic of descent and return. You do not lose things lightly; you lose them completely, and then something in you must find the underground before spring comes again. This pattern is not dysfunction. It is the shape your care takes."

For Pallas in Aquarius — "You see the system — not one corner of it, the whole architecture. The intelligence you carry is not personal; it is structural. You understand how things connect before anyone else in the room has framed the question. This gift is frequently invisible to those around you until it is suddenly decisive."

#### The Miyazaki test — editorial gate for every entry

Before an entry is considered complete, apply this test: *If the person reading this did not know they had this placement, would this interpretation make them feel recognized?*

If the answer is no — if the text could appear in a generic horoscope column or apply to any person on earth — it must be rewritten. This test is binary. There is no "somewhat specific." An entry either passes or it does not.

A secondary test: *Does this entry say something a person could not already know from their sign alone?* Chiron in Aries must say something that Chiron in Scorpio does not. If swapping the sign would leave the entry largely intact, the entry has not earned its sign.

#### Length and register

- The `brief` field is one sentence, fifteen words or fewer. It must carry the archetype of the asteroid *and* the coloring of the sign or house. It is not a tagline. It is the first thing a user reads, and it must either make them want to read the detail or, for users who read nothing else, carry enough truth to matter on its own. "Deep thinker who revisits and refines ideas" (existing Mercury retrograde brief) is the right register — specific, direct, no filler.
- The `detail` field is two to four sentences, forty to one hundred words. It should open by naming the specific texture of this placement — not the archetype in the abstract, but how this sign or house shapes the asteroid's energy for this person. It should include one moment of recognition — a sentence specific enough that the person reading it can check it against their own experience. It should close with something that orients the person toward the placement's potential, not its limitation. Do not end with a warning; end with something a person can use.
- Do not begin with "Your [Asteroid] in [Sign]..." as a rote formula. The planet-in-sign entries use this construction universally, and the result is database-language. The asteroid entries should vary their openings: begin with the experience, the paradox, the texture, the question — and let the placement emerge from that.

### 4. Core archetypal question for each asteroid

These questions must be present implicitly in every entry for the asteroid, regardless of sign or house. The sign and house color the answer. The question remains constant.

**Chiron — The Wounded Healer**
Core question: *Where is the wound that will not close, and how has living with it made you a healer for others?*

The Chiron entry is never only about the wound. It is always about the wound-as-teacher and the eventual gift that comes from having survived the specific territory this placement describes. A Chiron entry that ends only in wounding has failed. Every Chiron entry must point toward mastery, even if that mastery is still in progress.

The sign describes what territory the wound occupies — Chiron in Taurus: self-worth and the body; Chiron in Gemini: words, communication, being understood; Chiron in Scorpio: betrayal, loss, the dark night. The house says where in life it is most active — Chiron in the 2nd: finances and inherent value; Chiron in the 7th: committed relationships; Chiron in the 12th: solitude, the unconscious, what cannot be named. Neither the sign alone nor the house alone describes the person's experience. Both together do.

**Ceres — The Nourisher**
Core question: *What is your relationship to nourishment, loss, and return — how do you metabolize grief and the cycles of receiving and losing what sustains you?*

Ceres is the Persephone myth: not simply nurturing, but the entire cycle of abundance, loss, grief, and renewal. The Ceres entry must name what nourishes this person, what they lose, and how they relate to the cycle of losing and returning. Ceres in Taurus nourishes through physical comfort and loses it through disruption of material security. Ceres in Scorpio nourishes through intensity and must pass through symbolic death before renewal. These are different grief signatures and must be written as such.

Ceres is not simply "the mother asteroid." The Ceres story is about what happens when what sustains us is taken away — and what we do in that darkness. Every Ceres entry should acknowledge the grief dimension of the placement without reducing the placement to grief alone.

**Pallas — The Strategist**
Core question: *What is the pattern you see that others walk past — what kind of intelligence do you carry that does not fit the usual categories?*

Pallas describes intelligence that is not Mercurial quick-wit but Athenian strategic pattern-recognition: the mind of the general, the healer, the weaver, the person who sees how systems connect. Pallas entries must name the specific mode of intelligence — Pallas in Aquarius sees structural systems; Pallas in Scorpio investigates hidden patterns; Pallas in Taurus perceives sensory and material intelligence; Pallas in Gemini synthesizes across domains.

People with strong Pallas often feel their intelligence is "different" — they are frequently underestimated and then suddenly decisive. The entries should name this experience: the gap between how their intelligence is perceived and what it actually accomplishes. Pallas entries should give people permission to trust how their mind actually works.

**Juno — The Committed Partner**
Core question: *What is your understanding of commitment and what you will and will not tolerate in a bond — what has the experience of partnership taught you about who you are?*

Juno is not Venus. Venus describes attraction, aesthetic, the quality of love. Juno describes the bond itself — what kind of commitment a person is capable of, what they demand from their partner in return, and where partnership becomes either sanctuary or prison. People with Juno in challenged positions often have complex relationship histories that Venus and Mars alone cannot explain. Juno explains the pattern at a deeper level.

Juno entries must distinguish between what this person gives in commitment and what they require. Juno in Leo gives commitment with dramatic generosity and requires recognition in return. Juno in Virgo gives commitment through devoted service and requires reliability in return. These are not the same bond and must not be written as if they are.

**Vesta — The Sacred Flame**
Core question: *What is your sacred dedication, and what do you sacrifice in order to tend it — what flame do you keep lit even when keeping it costs you something?*

Vesta is devotion that burns beneath all social and practical layers. It is not what a person does for a living, it is what they are truly dedicated to. Vesta in the 12th is the person whose most sacred work happens in private. Vesta in the 10th is the person whose career is genuinely a vocation — not ambition but calling. Vesta in Scorpio is the person whose devotion, when it is genuine, is total and terrifying in its intensity.

The cost dimension is essential to Vesta. Devotion is not free. The Vesta entry must name both what the person keeps burning and what that costs them. Vesta in the 7th directs sacred focus toward relationship — the cost is sometimes self-erasure. Vesta in the 1st keeps the flame for the self alone — the cost is sometimes isolation. Neither the dedication nor the cost is the whole picture; both together constitute the Vesta story.

### 5. The brief field vs the detail field — what each must accomplish

**The brief field (one sentence, ≤ 15 words)**

The brief appears in collapsed cards and tooltip headers. It is the only text a user reads if they do not expand the card. It must do two things simultaneously: name the asteroid's core archetype *and* name how this specific sign or house colors it. It is not a tagline. It is the seed of the interpretation.

Test for the brief: if you removed the sign or house from the key and read only the brief, could you guess the sign or house? If yes, the brief has earned its specificity. If the brief for Chiron in Taurus and Chiron in Scorpio could be swapped without loss, both briefs have failed.

Examples of passing briefs (directional):
- Chiron in Taurus: "Wound of self-worth that becomes unshakable inner authority" — names Chiron's wound-to-mastery arc *and* Taurus's domain of value.
- Ceres in Pisces: "Nourished by dissolution, grief flows to grace" — names Ceres's loss-and-return cycle *and* Pisces's oceanic quality.
- Pallas in Capricorn: "Sees the architecture beneath institutions, plans with long patience" — names Pallas's strategic intelligence *and* Capricorn's structural, time-oriented mode.

Examples of failing briefs:
- "Chiron in Taurus brings lessons of self-worth" — this is a description, not an address. It could be a Saturn entry.
- "Ceres in Pisces indicates spiritual nourishment" — generic enough to apply to Neptune in Pisces or Jupiter in Pisces.
- "Pallas in Capricorn is strategic and disciplined" — this could be any Saturn placement.

**The detail field (2–4 sentences, 40–100 words)**

The detail must accomplish four things in sequence, though not necessarily in this order:
1. Name the specific texture of this placement — not the archetype abstractly, but how this sign or house shapes it for this person.
2. Include one sentence specific enough that the person reading can check it against their own experience — a moment of recognition.
3. Acknowledge the difficulty or paradox of the placement without reducing the person to it.
4. Close with something that orients the person toward the placement's potential or wisdom — not a warning, not generic encouragement, but a specific truth about what this placement eventually offers.

The detail must not begin with "Your [Asteroid] in [Sign]..." as a mechanical opening. Vary the entry point: begin with the experience, the paradox, the question, the specific texture. Let the placement be implied by what is said before it is named.

### 6. GPT archetype context — the five sentences to add to gptInterpretation.ts

In `src/services/gptInterpretation.ts` and `server/services/gpt.ts`, when assembling the natal planet context string for GPT prompts, each asteroid position must be preceded by a parenthetical archetype framing. GPT without this framing produces generic "healing" or "nourishing" language. GPT with this framing produces language grounded in the specific nature of what each asteroid means.

The five sentences, one per asteroid, to be added inline with position data in the natal planet context block:

```
Chiron (the wounded healer — formative wounds that do not close, which become the source of wisdom and care for others) is in {sign} in the {house} house.
Ceres (nourishment, grief cycles, the pattern of losing and returning to what sustains us — the Persephone archetype) is in {sign} in the {house} house.
Pallas (strategic intelligence and pattern recognition — the mind of the general and the healer, the intelligence that sees systems others miss) is in {sign} in the {house} house.
Juno (committed partnership and the bond itself — what this person demands and offers in long-term commitment, where partnership becomes sanctuary or prison) is in {sign} in the {house} house.
Vesta (sacred devotion and the flame kept at personal cost — what this person is truly dedicated to beneath all practical and social layers) is in {sign} in the {house} house.
```

These parentheticals appear once per asteroid, inline with the position data. The token cost is negligible — roughly 60 additional tokens per reading. The interpretive return is substantial: GPT without archetype context produces interchangeable healing/nourishing language. GPT with archetype context produces Chiron language that sounds like Chiron.

Do not add the retrograde flag `[Rx]` after the asteroid name without also including a brief note that asteroid retrograde is common and does not carry the same cultural weight as Mercury or Mars retrograde — otherwise GPT will over-foreground retrograde asteroids.

### 7. Transit prompt slow-body instruction — the exact text for buildTransitPrompt()

In `src/engine/transits.ts`, within the `buildTransitPrompt()` function's `## Instructions` block (currently lines 369–423), add the following instruction immediately before the period-specific focus guidance:

```
Asteroid transit speed note: Chiron, Ceres, Pallas, Juno, and Vesta are slow-moving bodies. Chiron moves approximately 2° per year; Ceres approximately 1.5° per year. A transit aspect involving any of these five bodies to a natal planet represents an extended theme measured in months or years, not days. In a daily or weekly reading, mention asteroid transits as background context only — do not lead with them and do not treat them as the day's primary energy. In a monthly reading, asteroid transits within 2° of exact may be foregrounded as a season-of-life theme rather than a weekly influence. Never instruct the reader to take action based on an asteroid transit the same way you would for a Moon or Mercury transit.
```

This instruction must appear before the `Priority: Lead with the tightest applying aspect —` line, or that priority instruction must be conditioned to exclude asteroid bodies from the "lead with" logic. The current prompt already sorts aspects by orb ascending, so a slow-body asteroid opposition at 0.5° orb will appear at the top of the list and could be elected as the tightest applying aspect. The slow-body note ensures GPT frames it correctly even when it appears first.

Additionally, in the monthly focus guidance (`period === 'monthly'` branch, currently line 401), the existing instruction "Slow planet (Jupiter, Saturn, Uranus, Neptune, Pluto) transits — these are the most significant" should be updated to:

```
Slow planet (Jupiter, Saturn, Uranus, Neptune, Pluto) and slow asteroid (Chiron, Ceres, Pallas, Juno, Vesta) transits — these are the most significant for monthly readings and represent extended life themes
```

### 8. The Chiron Return detection — dedicated transit aspect interpretation

When transiting Chiron approaches within 3° of natal Chiron, the transit aspect will appear in the aspect list with the key `Chiron_Conjunction_Chiron` (or the reversed equivalent). This is one of the most significant life events in a human chart: the Chiron Return occurs around age 49–51 and represents a confrontation with the original wound and an invitation to move from wounding to wisdom.

The entry for this contact should not use the standard transit aspect interpretation format. It requires dedicated language in whatever lookup table handles transit aspect briefs (`transitAspectBriefs.ts` or equivalent):

```
Key: Chiron_Conjunction_Chiron

brief: "Chiron is returning to where it stood at your birth — the wound teacher comes full circle."

detail: "This is your Chiron Return — one of the most significant transits of a human life, occurring around age 49–51. Chiron has completed one full orbit and is arriving at the exact place it occupied when you were born. The wound that has shaped your life — the original pattern of not-enough, of early wounding in the area described by Chiron's natal sign and house — is now asking to be met consciously rather than carried. This is not a crisis. It is an invitation: from the wound to the wisdom, from the teacher to the healed healer."
```

The brief must be qualitatively different from any other transit interpretation in the database. Jobs describes the target precisely: "This is a moment that should stop a user. It is the kind of sentence that makes someone take a screenshot and send it to their therapist."

The detection mechanism: the existing `calculateTransitAspects()` function in `src/engine/transits.ts` already cross-joins transit planet positions against natal planet positions. When asteroids are added to both the transit and natal planet arrays, Chiron–Chiron contacts will be detected automatically. The `transitAspectBriefs.ts` lookup will need the `Chiron_Conjunction_Chiron` key; for the opposite order `Chiron_Conjunction_Chiron` the key is symmetric so no reversal is needed.

### 9. Fallback state for missing entries — graceful null handling

When a user's asteroid falls in a sign or house for which no entry exists (during the gap between the asteroid appearing on-screen and the full 125-entry database being complete), the components must degrade gracefully rather than crashing or showing misleading text.

**In PlanetCard / ReadingDisplay.tsx:**
When `signInterpretation` or `houseInterpretation` is null for an asteroid body, do not render the interpretation card at all — render nothing in that slot rather than a fallback paragraph. The card header (name, glyph, sign, degree, house) still renders. The collapsed state is the interpretation; the expanded state simply does not open. This is preferable to rendering an empty card or the current generic "minor aspect" fallback text.

**In AspectRow / AspectTooltip:**
When no aspect interpretation exists for an asteroid-to-planet aspect, the fallback text must not say "This is a minor aspect contributing subtle energy to your chart." That text is wrong on two counts: asteroid-to-planet aspects are not minor by definition, and the word "minor" will confuse users who know that Chiron conjunct their Moon is not a minor configuration. Use instead: "No specific interpretation is recorded for this configuration — its meaning is shaped by the signs, houses, and natures of both bodies." This is honest, non-dismissive, and gives the user something to work with.

**In assembleReading() in interpretations/index.ts:**
The current guard for dignity lookup is `p.name !== 'NorthNode' ? getDignity(p.name as PlanetName, p.sign) : null`. When asteroid names flow through this function, this cast will TypeScript-error because `AsteroidName` is not included in `PlanetName`. The guard must be extended before asteroid entries are added. The correct pattern uses the `isAsteroid()` helper specified in the `code-asteroid-type-system` proposal: `isAsteroid(p.name) ? null : getDignity(p.name as PlanetName, p.sign)`. Similarly, the retrograde lookup guard `p.retrograde && p.name !== 'NorthNode' ? (NATAL_RETROGRADE[p.name] ?? null) : null` correctly handles asteroids by key lookup — this requires no change once asteroid retrograde entries are present in `NATAL_RETROGRADE`.

**In computeEnergyRating() in transits.ts:**
Asteroid transit aspects must be excluded from the daily energy rating computation. A Chiron opposition (challenging, −1 in the rating) that lasts three months will permanently bias the rating toward "Tense." For this sprint, the simplest and most accurate approach is to filter asteroid names out of the aspects passed to `computeEnergyRating()`: `aspects.filter(a => !isAsteroid(a.transitPlanet) && !isAsteroid(a.natalPlanet))`. This preserves the energy rating's intended function as a reflection of the day's felt weather rather than a slow background pressure.

### 10. Validation — editorial review criteria for every entry

Before any entry is considered complete, it must pass all of the following checks. These are not aspirational guidelines; they are gates.

**Gate 1 — The recognition test (Miyazaki)**
If the person reading this did not know they had this placement, would this interpretation make them feel recognized? If no, rewrite.

**Gate 2 — The specificity test**
Could this entry appear unchanged with a different sign or house substituted, and still be true? If yes, it is not specific enough. Chiron in Taurus must say something that Chiron in Scorpio does not. Vesta in the 2nd must say something that Vesta in the 7th does not.

**Gate 3 — The reference-book test (Miyazaki)**
Read the entry aloud. Does it sound like something a wise person said, or like something a reference book wrote? If the latter, rewrite. The test is tonal: reference books describe; wise people address.

**Gate 4 — The archetypal integrity test**
Does the entry remain true to the asteroid's core archetype? Chiron entries must contain the wound-and-wisdom arc. Ceres entries must acknowledge the loss-and-return cycle. Pallas entries must name a specific mode of intelligence. Juno entries must name something about the bond itself — not attraction, the bond. Vesta entries must name both the devotion and its cost. If any of these elements is absent, the entry is incomplete.

**Gate 5 — The brief test**
Remove the sign or house from the key. Read only the brief. Can you identify which sign or house it belongs to from the brief alone? If yes, the brief has done its job. If no, the brief is too generic.

**Gate 6 — The opening sentence test**
Does the detail begin with "Your [Asteroid] in [Sign]..."? If yes, rewrite the opening. Vary the entry point. Begin with the experience, the paradox, the question. The formula opening has already been used 120 times in the planet-in-sign database. The asteroid entries should demonstrate that a different mode of writing is possible.

**Gate 7 — The closing test**
Does the detail end with a warning, a caveat, or generic encouragement? ("...though this can be challenging." / "...but you have what it takes." / "...with patience, this becomes your strength.") If yes, rewrite the closing. End with a specific truth about what this placement eventually offers — not a promise, not a warning, a fact about the archetype's trajectory when lived consciously.

---

## Out of Scope

**Dignities for asteroids.** Ceres's rulership of Virgo is contested. Vesta's connection to Virgo and Scorpio is contested. None of this is canonical in the way Saturn ruling Capricorn is canonical. The `getDignity()` function returns null for unknown names — no crash, no phantom dignity badge. Asteroid dignities are not added in this sprint.

**Synastry aspect briefs for asteroid-to-planet contacts.** The 25 most significant asteroid synastry contacts (Chiron conjunct Sun, Chiron conjunct Moon, Chiron conjunct Venus, Juno conjunct Juno, and others) are meaningful astrological territory. They are not in scope for this sprint. The fallback language in the synastry aspect brief system handles missing entries gracefully; asteroid synastry aspects will use the fallback until a dedicated sprint writes these entries.

**Transit aspect briefs for all asteroid-to-planet transit contacts.** The one exception is `Chiron_Conjunction_Chiron` (the Chiron Return), which is in scope as specified in Specification 8. All other asteroid transit aspect interpretations fall back to the graceful null handling specified in Specification 9.

**Asteroid-to-asteroid natal aspect entries.** Chiron opposite Vesta, Juno square Ceres — real configurations, out of scope. Without interpretation text, detected asteroid-to-asteroid aspects are noise.

**Aspect pattern detection for asteroids.** `detectPatterns()` remains planet-only. A Chiron Yod without interpretation text for that specific pattern is confusing rather than illuminating.

**TRANSIT_RETROGRADE entries for asteroids.** The natal retrograde entries (5) are in scope. Transit retrograde entries for asteroids — "what does it mean when Chiron is retrograde in the sky right now" — are not. All five asteroids spend significant portions of their orbits retrograde (Chiron is retrograde roughly half the year). A transit retrograde interpretation for Chiron that appears for six months and is treated the same as Mercury retrograde would mislead users about what asteroid retrograde means.

**Lilith.** Not a Keplerian body. Not a sprint target.

---

## Open Questions

**1. Ordering of asteroid entries within the reading cards.**
When asteroids appear in `chartData.planets`, they are appended after the classical planets. In `PlanetSection` in `ReadingDisplay.tsx`, they will appear at the bottom of the planet card list, after Pluto. This is probably the correct order — Miyazaki notes that there is something fitting about asteroids arriving after the classical bodies. But should Chiron be first among the five (as the most archetypal and widely known) or should they appear in ecliptic order (positional order in the chart)? The current implementation will use positional order since `calculateChart()` appends asteroids in calculation order. This should be reviewed once the feature is visible.

**2. Whether the brief for the Chiron Return entry should name the user's age.**
The Chiron Return occurs around age 49–51. Naming the age in the brief ("around age 50, Chiron returns") is specific and useful, but it surfaces only for users in that life phase. If the transit detection fires at any orb within 3°, some users will be seeing this entry for several years. The brief should probably not commit to a single age but instead use language like "the wound teacher comes full circle" that is accurate regardless of exact timing.

**3. How to handle asteroids with no house data (unknownTime charts).**
When `natalChart.unknownTime` is true, house numbers are unavailable. The planet-in-house interpretations are already suppressed in this case (`getPlanetInHouseInterpretation` is not called when `unknownTime` is true). No change needed for asteroids — they follow the same guard. But the user will see asteroid cards with sign interpretations only, no house interpretations. This is correct behavior; it should be confirmed that the asteroid sign entries are written to be complete without the house context.

**4. Quality review process.**
The 125 entries represent a significant volume of writing. Who reviews them before commit? The editorial gate in Specification 10 is the standard, but human review against a sample of existing synastry briefs is the practical check. The recommendation is: write five entries (one per asteroid, each in a different sign), review against the synastry brief register, adjust the voice until it passes, then write the remaining 120 in that voice. Do not write all 125 and then review — the voice drift over a single sitting is real and the beginning and end of the database should not sound like different writers.
