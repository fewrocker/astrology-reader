# Hayao Miyazaki — Sprint 0014 Voice

---

I have been thinking about how things grow in nature.

A tree does not add branches uniformly. It grows where it needs to grow — toward the light, through the gap, following its own logic of reaching. When you look at an old tree you feel that every branch was necessary. Nothing was added carelessly. Each addition was an answer to something the tree had been asking for.

Sprint 0014 wants to add five bodies to three chart surfaces. One hundred and twenty interpretation entries. Asteroids in the natal ring, asteroids in synastry, asteroids in transit. This is the sprint where the product either grows like a tree or like a building under renovation — where new parts are attached to the old structure and you can always see the seam.

I want to walk through the seams before they are sealed.

---

## The Thing That Must Be Said First

There is a significant quality difference between the synastry interpretation writing and everything else in this codebase.

The `synastryAspectBriefs.ts` file writes: *"one of you carries the light, the other feels it — your sense of self and their emotional world fuse into something neither could name alone."* The `synastryHouseOverlayBriefs.ts` writes: *"Your Sun lands in the heart of their self — you illuminate who they are simply by being present."*

Then I open `planetInSign.ts` and I read: *"Your Sun in Aries gives you a fearless, pioneering spirit. You lead with action rather than words, and your natural courage makes you a trailblazer."*

Both are real astrological writing. But the first sounds like something a wise person said. The second sounds like something a reference book wrote. The synastry text was written with a different hand — one that was thinking about the reader, not about completeness.

The asteroid interpretation entries — all 120 of them — will be written at Sprint 0014's pace, probably in a single sitting. If they are written in the mode of the planet-in-sign database, they will be correct. If they are written in the mode of the synastry briefs, they will be felt. That is the most important craft decision this sprint makes. I will say more about this below.

---

## Craft Vision for Asteroid Visual Integration

The sprint vision says asteroids should render at a slightly smaller glyph size (10–11px) with a distinct color — soft amber or muted teal — in either a separate ring or at a visually distinct radius from natal planets. The vision document is technically precise on this. I want to speak to what this should *feel* like, not just what it should measure.

The current natal planet ring in `ChartWheel.tsx` has a beautiful visual hierarchy already. The Sun glows (`url(#sunGlow)`) with a radius of 22 at rest. The Moon glows (`url(#moonGlow)`) at radius 18. Standard planets sit at radius 13 with a muted purple glow at opacity 0.2. Transit planets run teal in the outer ring at radius 11. The system has learned to distinguish fast from slow, inner from outer, natal from transit, through concentric rings and color.

Asteroids must join this system without disrupting it.

My concern is the glyph shapes themselves. The asteroid glyphs — ⚷ (Chiron), ⚳ (Ceres), ⚴ (Pallas), ⚵ (Juno), ⚶ (Vesta) — are visually heavier than the classical planet glyphs (☉ ☽ ☿ ♀ ♂ ♃ ♄ ♅ ♆ ♇). They have more internal structure, more visual noise. At small sizes, especially rendered on a dark background, they risk looking like smudges rather than symbols. The Sun glyph is a circle with a dot — simple, iconic. Chiron's glyph ⚷ is a key-like symbol with a circle atop a cross atop a crescent. At 10–11px these elements compete with each other.

This is not a problem that can be solved by increasing size — the chart is already asking eleven bodies to share the natal ring. The answer is in the color and the glow filter. If asteroid glyphs are rendered in a warm amber (something like `#d4a853`, slightly more orange than the gold `#c9a84c` used for natal labels) at perhaps 60% opacity with a very subtle glow, the eye will recognize them as distinct without trying to read every pixel. The rendering convention says: these are a different category. The interpretation tells you what category they are. The user's eye learns to navigate both layers.

Chiron specifically deserves special attention. The sprint vision is right that Chiron has a unique archetypal meaning — the wounded healer, the place of the incurable wound that becomes the source of healing power. This is not the same archetype as Ceres or Juno. In clinical astrology, Chiron's transits to natal planets are treated with the weight of Saturn transits. It is not a minor body in practice.

Visually, I would give Chiron a slightly larger glyph radius than the other four asteroids — perhaps 12px at rest versus 10px for the others — and a faintly warmer glow color. Not enough to cause confusion with natal planets, but enough that a practiced eye can locate Chiron on the chart without scanning every glyph. In animation terms: when the chart loads and glyphs animate in (`chart-planet-glow` with staggered `animationDelay`), Chiron should enter with the same timing cadence as Saturn or Uranus — slowly, with weight. Not with the quick entrance of Mercury or Venus.

The retrograde marker for asteroids also needs design thought. Currently retrograde planets display a small `R` in red at position `{pos.x + 12, pos.y - 10}`. For asteroids in the inner ring, at smaller radius, this superscript will collide with adjacent glyphs. The sprint vision notes that all five asteroids go retrograde. The current marker is adequate for eleven bodies with room to breathe. It may not survive sixteen bodies in the same ring. I would suggest: for asteroids, the retrograde marker should be `℞` (the pharmaceutical symbol for retrograde) at `7px`, positioned below the glyph rather than above-right, and rendered in the same amber color as the asteroid glyph rather than the harsh retrograde red. This makes it part of the body's visual identity rather than an alarm.

The collision detection described in the sprint vision — *"if two points fall within 5° of each other they must be offset angularly"* — is the most technically complex craft problem. The current code at `transitPlanets` already has a simple nudge: `if (tooClose) r = TRANSIT_PLANET_R + 12`. For natal asteroids, the approach needs to be more deliberate. Five asteroids in a chart with eleven planets means up to sixteen bodies competing for ring positions. At 5° of arc, that is roughly 23px of chart circumference. The current glyph circles are 13px radius — 26px diameter. So any two glyphs within 5° will literally overlap. The sprint needs a collision resolution loop, not just a radius nudge. My recommendation: after computing all sixteen positions, run a single-pass angular spread: for each pair within 5°, push them apart by half the collision distance. This is simpler than a full force-directed layout and sufficient for the expected density.

---

## Interpretation Quality Standards

This is where I will spend the most words, because this is where the sprint will succeed or fail in the user's heart.

The planet-in-sign entries in `planetInSign.ts` follow a consistent structure: two sentences, second-person, present tense. "Your [Planet] in [Sign] gives you/makes you/connects you to..." They are grammatically correct and astrologically accurate. They read like a textbook that is trying to be friendly.

The asteroid interpretations cannot be written in this mode.

Here is why. Planets have spent centuries acquiring cultural resonance. When someone reads "Your Sun in Leo gives you natural charisma and a warm, generous spirit," they arrive with twenty or forty years of pop-astrology context for what Leo and the Sun mean. The words activate a known frame. The product is confirming and deepening something the reader already senses.

Asteroids are different. For most users, Chiron is either unknown or vaguely familiar. Ceres, Pallas, Juno, Vesta — the majority of people opening this app will be seeing these names for the first time in a personal astrological context. The interpretation text is not confirming a frame; it is *creating* one. This demands different writing.

A bad Chiron interpretation reads: *"Chiron in Aries means your deepest wound is in the area of selfhood and independence. You may have experienced early challenges around asserting yourself..."*

This is the wounded-healer formula applied mechanically to Aries. The person reading it will think: yes, and? What is this for? The formula has not become insight — it has become a template.

A better Chiron in Aries reads: *"Your wound lives in the place of pure beginning — the impulse to act first, claim space, be seen as someone who leads. Something early taught you that to want this was too much, or that you were not the kind of person who gets to go first. The paradox of Chiron is that the wound is also the gift: your understanding of what it costs to be the pioneer, the one who starts without permission, is something you will one day offer others who need someone to have survived that territory before them."*

That is more words. But this is not a matter of length — it is a matter of direction. The first version describes. The second version addresses. The user should feel that the interpretation is speaking to something they actually carry, not categorizing them.

The sprint vision is clear: "Generic filler text... is not acceptable." I agree completely. I want to add precision to what "generic" means. Generic means: the text could apply to any person born with this placement, and it does not invite the reader to feel recognized. Non-generic means: the text is specific enough to the archetype that a person who does not identify with it will notice, and a person who does identify with it will feel seen.

For each of the five asteroids, here is the core archetypal question that should drive the writing:

**Chiron** — Where is the wound that will not close, and how has living with it made you a healer for others? Not: what is your trauma? But: what have you learned to navigate that others need guides for?

**Ceres** — What is your relationship to nourishment, loss, and return? Not: are you a nurturing person? But: how do you metabolize grief and the cycles of receiving and losing what sustains you?

**Pallas** — What is the pattern you see that others walk past? Not: are you strategic? But: what kind of intelligence do you carry that does not fit the usual categories — the intelligence of the general, the healer, the weaver, the problem-solver who knows how things connect?

**Juno** — What is your understanding of commitment, equality, and what you will and will not tolerate in a bond? Not: are you a good partner? But: what has the experience of partnership — its justice and its injustice — taught you about who you are?

**Vesta** — What is your sacred dedication, and what do you sacrifice in order to tend it? Not: what are you devoted to? But: what flame do you keep lit even when keeping it costs you something, and what does that cost reveal about who you are?

These questions should be present, implicitly, in every one of the 120 asteroid-in-sign and asteroid-in-house entries. The sign colors the *how* of the wound or pattern. The house says *where in life* the archetype is most active. But the core question must remain in the background of every entry, giving it gravity.

One more note on the retrograde entries. The current natal retrograde interpretations in `retrogrades.ts` are genuinely good. The Venus retrograde entry — *"your sense of beauty is unique and often ahead of its time. Self-worth is an ongoing journey that deepens with maturity"* — has real texture. The asteroid retrograde entries (five new ones needed) should reach for the same standard. Chiron retrograde especially deserves care: Chiron retrograde is said to intensify the wound's internalization, making the healing journey more private, more solitary, longer to begin. That is not simply "Chiron retrograde turns Chiron inward" — that is a lived experience that deserves specific language.

---

## Current Craft Failures I Noticed

I want to name specific places in the existing codebase where craft is not yet what it should be, particularly in areas this sprint will touch.

**The aspects table in ResultsPage.tsx (lines 126–138).**

The Planet Positions table renders `p.name` directly — so after asteroids are added, users will see "Chiron" in a table row alongside "Sun" and "Moon" with no visual distinction. The table has no visual hierarchy between the luminaries, the personal planets, the social planets, the transpersonals, and now the asteroids. Every row looks identical. A simple visual separator — a thin rule between the planets and the asteroids, or a muted subheading "Asteroids" — would communicate the chart's categorical structure to a user who does not yet know that structure.

**The fallback glyph `☊` throughout the codebase.**

In `ChartWheel.tsx`, `ReadingDisplay.tsx`, `SynastryPage.tsx`, and `TransitTimeline.tsx`, any unknown planet falls back to `☊` — the North Node glyph. This means that if asteroid glyphs are not in `PLANET_GLYPHS` when any component renders, those bodies will display the North Node symbol. This is not a minor visual bug; it suggests to the user that the body is a lunar node, which carries a completely different astrological meaning. The sprint must add `AsteroidName` to `PLANET_GLYPHS` before any asteroid can appear on-screen, and every fallback in the codebase that uses `?? '☊'` should be audited. A question mark `?` or a small circle `○` would be a less misleading fallback than the North Node glyph.

**The aspect interpretation missing text in the AspectRow.**

When no interpretation exists for an aspect, `AspectRow` and `AspectTooltip` both render: *"This is a minor aspect contributing subtle energy to your chart."* This message will appear for all asteroid-to-planet and asteroid-to-asteroid aspects until interpretation entries are written. The current fallback language is generic to the point of uselessness — it also incorrectly implies the aspect is "minor" when it may be a conjunction or opposition. The asteroid sprint will produce many aspects with no entries in `ASPECT_INTERPRETATIONS`. The fallback should be: *"No specific interpretation is recorded for this aspect — its meaning is shaped by the signs and houses of both bodies."* That is honest rather than dismissive, and it gives the user something to work with.

**The PlanetSection renders all planets identically (ReadingDisplay.tsx, line 141).**

`PlanetSection` passes every planet to `PlanetCard` in the same loop. There is no visual distinction between a luminary, a classical planet, and an asteroid. When asteroids join the `chartData.planets` array, they will appear in the same card format as the Sun and the Moon. The only thing that distinguishes a Sun card from a Chiron card will be the glyph and the name. For a user arriving with no astrological background, this communicates: all of these are equally important. They are not. The luminaries have primacy. The personal planets have weight. The asteroids are refinements.

I would add a simple section break within `PlanetSection` between classical planets and asteroids, with a small label — *"Asteroids"* — in the `text-mystic-muted` style that the section headers already use. This does not require a redesign. It requires four lines of code and a judgment call about ordering.

**The `PlanetTooltip` dignity check (`planet.name !== 'NorthNode'`).**

The current guard `planet.name !== 'NorthNode' ? getDignity(planet.name as PlanetName, planet.sign) : null` will TypeScript-error when asteroid names appear, because `PlanetName` does not include them. This is a technical craft failure: the type system will refuse to compile until the dignity check is extended to handle the new type union. The sprint vision notes that dignities should be skipped for asteroids — the guard should be extended to read `!isAsteroid(planet.name)` rather than `planet.name !== 'NorthNode'`, using a helper function that can be updated in one place as the type system evolves.

**The hover tooltip for unknown bodies.**

`TransitPlanetTooltip` and `PlanetTooltip` both show the dignity badge and retrograde interpretation only for known planet types. After asteroid addition, the asteroid retrograde interpretation (when present in `NATAL_RETROGRADE`) should display. But the current check `planet.name !== 'NorthNode'` will not exclude NorthNode while including asteroids — it will need to be `isClassicalPlanet(planet.name)` or similar. The tooltip should gracefully handle both the presence and absence of a retrograde interpretation for asteroid bodies.

---

## Specific Opportunities for Care and Beauty

**The entry of Chiron onto the chart should be marked.**

In `ChartWheel.tsx`, natal planets animate in sequentially with `animationDelay: ${0.5 + idx * 0.07}s`. If asteroids are appended to `chartData.planets` in order (Chiron, Ceres, Pallas, Juno, Vesta), they will arrive on the chart after the classical planets in the animation sequence. There is something fitting about this — the asteroids arrive after the classical bodies have established themselves. I would preserve this sequencing deliberately, not accidentally. Chiron should arrive after Pluto in the animation chain. The user who watches the chart draw itself will see the solar system's hierarchy rendered in time.

**Chiron's tooltip should acknowledge its unique status.**

The `PlanetTooltip` header for planets reads: `{planet.name === 'NorthNode' ? 'North Node' : planet.name}` — so Chiron would render as "Chiron." This is correct but incomplete. A small badge below the name — in the style of the dignity badges — could read "⚷ Wounded Healer" in muted text, the way a dignity badge reads "☌ Domicile." This would require no new data structure: a simple map of asteroid archetypes (one string per asteroid) would suffice. The user hovering Chiron for the first time would immediately understand they are looking at something categorically different from Saturn.

**The asteroid section in the planet table should not be an afterthought.**

In `ResultsPage.tsx`, the planet positions table (lines 77–108) renders all planets in a single loop. After asteroid addition, this table could have sixteen rows. For a user who does not know what Pallas or Vesta are, the table becomes noise. A simple design choice — an `<tbody>` break with a subtle `<tr>` that reads `Asteroids` in `text-mystic-muted text-xs uppercase tracking-wider` — would communicate the structure of the sky to someone learning to read it. This is what a good textbook does: it organizes information so the organization itself teaches.

**The daily snapshot in `DailySnapshotCard.tsx` should acknowledge asteroid transits selectively.**

The current snapshot prompt (line 37) takes the six tightest transit aspects. After asteroid addition, the transit aspect list will include Chiron transiting natal planets. Chiron transiting natal Saturn is a significant configuration — a multi-year contact that astrology practitioners treat with great seriousness. The snapshot prompt is currently agnostic about which aspects it selects (simply `aspects.slice(0, 6)`). A small weight adjustment — giving Chiron transit aspects to natal luminaries or Saturn priority over, say, Mars transiting Chiron — would make the daily reading more astrologically meaningful without requiring any additional UI. This is a craft choice in the prompt construction, not a visual feature.

**The GPT context assembly should name each asteroid archetype explicitly.**

The GPT prompt construction in `src/services/gptInterpretation.ts` and `server/services/gpt.ts` will need to include asteroid positions. When this context is assembled, it should not simply list "Chiron in Taurus, 12th house" the way it lists "Mars in Gemini, 3rd house." Chiron's position requires a sentence of framing context: not just where it is, but what question it is asking. Something like:

*"Chiron (the wounded healer — represents formative wounds that become sources of wisdom and care for others) is in Taurus in the 12th house."*

This is one sentence per asteroid, five sentences total, added to the prompt. The cost in tokens is negligible. The cost in interpretation quality if they are omitted is large: GPT without archetype context for Chiron will produce generic healing language. GPT with archetype context will produce language that is grounded in the specific nature of what Chiron means.

---

## Broader Craft Observations — Beyond Asteroid Integration

Walking through the codebase, I noticed several places where the product is not lazy but has small gaps in care that accumulate into something the user might feel without being able to name.

**The "Planets in Signs & Houses" section title (ReadingDisplay.tsx, line 143).**

The section heading is functional. But when the user opens the reading, they first see "Planets in Signs & Houses" — bureaucratic language in a product that otherwise uses poetic language everywhere else. The daily snapshot card speaks of "your sky." The UpgradeModal speaks of "your sky." The transit reading speaks of "the sky for your chart." But the planet section uses "Signs & Houses" — the taxonomic language of a reference manual. Even "Where Your Planets Fall" or "The Sky at Your Birth" would be warmer without sacrificing clarity. This is a small thing, but small things accumulate.

**The "Aspects (N)" section count heading.**

`AspectSection` renders `Aspects (${reading.aspects.length})` as its section title. After asteroids are added, this count will increase significantly — potentially to 60–80 aspects for a populated chart. "Aspects (72)" communicates: there are 72 things here and you should feel overwhelmed. A label like "Planetary Connections" — without the count — would invite the user in rather than warn them away. The count can remain visible in the table itself. The section title does not need to announce the volume before the user decides to open it.

**The empty house language in HouseCard.**

When a house has no planets, `HouseCard` renders: *"Ruled by Saturn — look to its placement for this house's influence."* This sentence is helpful but mechanical. It sounds like instructions. The phrasing "look to its placement" is an instruction to the user about how to use astrology, not an observation about their chart. A warmer rendering might be: *"This house is quiet in your natal sky — its energy flows through Saturn, wherever Saturn falls."* The difference is that the second sentence describes the person's chart rather than instructing them in a technique.

**The `NatalMoonPhaseWidget` lives in `ResultsPage.tsx` but is formatted as a sub-card inside a gold border box.**

It sits inside `<div className="bg-mystic-gold/5 rounded-lg p-5 border border-mystic-gold/20">`. This matches the Big Three styling above it, which makes the Moon phase feel like a tertiary data point in the same category as Sun sign and Rising sign. But the natal Moon phase is a distinct and evocative piece of astrological information — the shape of the Moon at the moment of birth. It deserves its own visual language, not the same box as the Big Three. Even placing it below the planet section, with more breathing room and a larger Moon phase glyph, would give it the weight it deserves.

**The `RetrogradeSummarySection` title includes the count.**

`℞ Retrograde Planets (${retrogradePlanets.length})` has the same problem as the aspect count. After asteroid integration, this count could rise to eight or nine retrograde bodies in a chart where all five asteroids are retrograde. "Retrograde Planets (9)" is a bureaucratic announcement. "Planets Moving Inward" or simply "℞ Retrograde" would be warmer and would let the user encounter the depth themselves.

---

## Proposals

**Proposal 1 — Chiron's Visual Identity in the Chart Ring**

In `ChartWheel.tsx`, give Chiron a distinct visual tier within the asteroid rendering: glyph radius 12px (versus 10px for Ceres, Pallas, Juno, Vesta), animation delay aligned with Pluto's position in the sequence (so it arrives last among asteroids, with weight), and a glow filter color of `#d4853c` — a warmer amber than the asteroid group's standard amber, slightly more orange. This is a one-time SVG parameter decision that communicates Chiron's categorical distinctiveness without inventing new visual vocabulary. The chart learns to carry hierarchy through size and warmth, the way a symphony communicates theme through register and timbre.

**Proposal 2 — Asteroid Archetype Badge in PlanetTooltip**

Add a small `ASTEROID_ARCHETYPES` map in `src/engine/types.ts` alongside `ASTEROID_GLYPHS`:

```
Chiron: 'Wounded Healer'
Ceres: 'Nourisher'
Pallas: 'Strategist'
Juno: 'Devoted Partner'
Vesta: 'Sacred Flame'
```

When `PlanetTooltip` renders an asteroid, display this archetype as a single quiet badge below the planet name — in `text-mystic-muted text-xs italic`, not a colored badge, just a gentle label. This costs the user nothing in reading time and costs the developer four lines of code. It gives every first-time encounter with an asteroid a moment of orientation before the interpretation text begins.

**Proposal 3 — Asteroid Section Break in Planet Table and PlanetSection**

In `ResultsPage.tsx`, add a separator row between classical planets and asteroids in the Planet Positions table. In `ReadingDisplay.tsx`, add a subtle separator between the classical planet cards and asteroid cards in `PlanetSection`, with a small label "Asteroids ↓" in `text-mystic-muted text-xs`. This is a structural communication, not a visual redesign. It tells the user: you have now read your natal sky. These bodies are a refinement layer.

**Proposal 4 — Asteroid Retrograde Marker Redesign**

Replace the current retrograde `R` superscript in `ChartWheel.tsx` for asteroids with `℞` at `7px` positioned below the glyph (at `pos.y + 14`) in the asteroid's amber color rather than the retrograde red. This prevents visual collision with adjacent glyphs in the now-crowded inner ring, and it removes the alarm connotation of retrograde-red for asteroids — whose retrograde status is common and unremarkable compared to Mercury or Mars retrograde in the current reading context.

**Proposal 5 — GPT Archetype Context Lines for Asteroids**

In `src/services/gptInterpretation.ts` and `server/services/gpt.ts`, when assembling the natal planet context string for GPT prompts, add one framing sentence per asteroid:

- Chiron: "Chiron (formative wounds that become sources of wisdom and care for others)"
- Ceres: "Ceres (nourishment, cycles of loss and return, the mother wound)"
- Pallas: "Pallas (strategic intelligence, pattern recognition, the wisdom that does not fit conventional authority)"
- Juno: "Juno (committed partnership, equality, what we demand and what we cannot forgive in bonds)"
- Vesta: "Vesta (sacred dedication, the flame kept at personal cost, devotion as identity)"

These parentheticals appear once, inline with the position data, and give GPT the interpretive frame it needs to produce Chiron language that sounds like Chiron rather than generic "wounded" language.

**Proposal 6 — Write the Asteroid Interpretations in the Voice of the Synastry Database**

This is not a code proposal. It is a writing proposal. Before the first line of asteroid interpretation text is committed, the writer should re-read `synastryAspectBriefs.ts` and `synastryHouseOverlayBriefs.ts` to remember what a different quality of attention sounds like. Then they should write one entry — Chiron in Scorpio, or Pallas in Aquarius — and ask: does this read like the synastry text, or does it read like the planet-in-sign text? If it reads like the planet-in-sign text, it is too safe. It is correct but not felt. Rewrite it. Then continue.

Every one of the 120 entries should answer a specific question: if the person reading this did not know they had this placement, would this interpretation make them feel recognized? If the answer is no — if the text could apply to anyone, or could appear in a generic horoscope column — it must be rewritten. The asteroids are new to the product. They have one chance to introduce themselves to the user. That introduction should be unforgettable.

---

A good craftsman does not add new tools to the workbench without first understanding how the existing tools work together. The chart wheel has its visual grammar. The interpretation database has its written voice — two voices, in fact, one that is textbook and one that is human. The tooltip system has its behavioral logic. The asteroids must enter this grammar, deepen the voice, and fit the logic. Not as bolted-on additions. As branches that grew because the tree needed them.

That is the standard. It is achievable. It requires care at every step, not only at the moments when care is obvious.
