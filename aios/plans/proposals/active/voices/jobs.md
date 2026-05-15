# Steve Jobs — Sprint 0014 Voice

This sprint is about asteroids. Five of them: Chiron, Ceres, Pallas, Juno, Vesta. The temptation — and I have seen this mistake made at Apple, I have made it myself — is to treat this as an additive feature. More points on the chart. More entries in the database. More items in the tooltip. Bigger scope, sprint done.

That would be a failure.

The question is not "how do we add asteroids?" The question is "what happens inside a person when they first see Chiron in their chart?" Because if we get the answer to that question right, the asteroids become the most powerful thing in this product. If we get it wrong, they become noise. And noise in an astrology app is not neutral — noise actively destroys the experience, because the experience depends on the user feeling that every element means something. The moment the chart looks cluttered, the reading feels generic. The moment Chiron is just another dot on a wheel, we have lost the thread.

Everything that follows comes from that single question.

---

## Core Experience Vision

The natal birth chart currently shows eleven bodies: ten planets plus the North Node. The ring is populated. The user already has to work to decode what is there. We are about to add five more.

This is a visual problem before it is an astrological problem. If we render asteroids at the same size, the same color, the same ring radius as planets, the chart becomes a crowded dial. A user who sees that chart for the first time will not think "how rich." They will think "I cannot read this."

But here is the insight: asteroids are not planets. They are not lesser — Chiron in a tight conjunction to someone's Moon is more important than Jupiter in a wide trine to their Mercury — but they occupy a different *layer* of the chart. In every serious astrological tradition, the planets form the chart's skeleton and the asteroids provide the connective tissue. The visual design should reflect that reality.

The vision document in `sprint-0014/vision.md` already gets this right: asteroids should render at a slightly different radius and in a distinct color — "soft amber or muted teal, not gold which is for natal planets." This is the correct instinct. Push it further. The asteroid ring should feel like a second layer of revelation, not an extension of the first. The user finishes reading the planetary ring, and then they discover there is another ring just inside it, quieter, more specific, more personal. That discovery should feel like lifting a corner of a map and finding more map underneath.

In `ChartWheel.tsx`, the current `PLANET_R` is 263 in a 700×700 SVG with `INNER_R` at 228. There is approximately 35 pixels between the inner circle and the planet ring. Asteroid glyphs at a radius of roughly 235–240 — between the inner boundary and the planet ring — would create this inner layer effect. They would read as deeper in the chart, closer to the center, more interior. Psychologically, that is correct: Chiron, Ceres, Juno, Vesta, Pallas represent inner dynamics — wounds, nurturing patterns, committed relating — rather than the outward planetary energies.

The glyph circle radius should be 10 pixels against the planet's 13. The color should be a soft amber — something like `#c4a26e` — rather than the planet gold `#c9a84c`. Distinct enough to read as different, close enough to feel like they belong to the same family. The glow filter should be softer, lower opacity. These are quieter bodies. The visual language should honor that.

If two asteroid glyphs fall within 5 degrees of each other — or within 5 degrees of a planet — they must be offset angularly so they do not collide. The vision document correctly identifies this requirement. It is not optional. A collision between Chiron and Venus glyphs on the chart is not an aesthetic problem; it is a legibility failure that makes the entire feature feel broken. A simple angular offset algorithm — push each glyph 4 degrees clockwise from any colliding neighbor — is sufficient. This matters more than it might seem, because conjunctions are precisely the interesting cases: Chiron conjunct Venus is one of the most poignant synastry contacts possible, and the rendering should show the conjunction elegantly, not obscure it through collision.

---

## The Moment of First Encounter

Let me be specific about what I want the user's experience to be when they see Chiron in their chart for the first time.

They have loaded their natal chart. The planetary ring is there. They see their planets in their familiar positions. And then they notice: there are additional glyphs in an inner ring. Smaller. More muted. They hover one.

The tooltip shows: **⚷ Chiron — 17°43' Taurus — House 2**

And then below it: *"Your wound around self-worth and material security — the place where early experiences taught you that having enough, or being enough, was uncertain. Chiron in Taurus in the 2nd house means this wound runs through your relationship with your body, your finances, and your sense of inherent value. This is also your greatest eventual mastery."*

That is the moment. That is the sentence that makes someone say: "This app actually knows Chiron."

Not because it correctly computed the orbital elements using `astronomia`'s `elliptic.Elements` class. Not because the JPL Keplerian elements are accurate to within one arcminute. Because it said something *true* about their life. Something that landed.

This means the interpretation text for the tooltip — sourced from `src/data/interpretations/planetInSign.ts` and `planetInHouse.ts` — is not a secondary implementation detail. It is the feature. The calculation is infrastructure. The interpretation is the product.

Every one of the 120 new interpretation entries (5 asteroids × 12 signs, 5 asteroids × 12 houses) must be written at the same quality as the best planet entries currently in the database. Look at `Sun_Scorpio` in `planetInSign.ts`: *"Your Sun in Scorpio gives you extraordinary depth and intensity. You see beneath surfaces and are drawn to life's mysteries."* That is good. The asteroid entries need to be that good, and they need to be *specific to the asteroid's archetype*. Chiron in Scorpio is about wounding through loss, betrayal, and the dark night of the soul. Ceres in Scorpio is about grief cycles and the necessity of symbolic death before renewal. Pallas in Scorpio is about strategic intelligence expressed through investigation and the uncovering of hidden patterns. These are not interchangeable.

Generic filler text like "Chiron in Aries means you are wounded in the area of self" is not acceptable — the vision document says this explicitly, and I want to underscore it. The quality bar for interpretation text is the thing that separates this product from every free birth chart website on the internet. Those sites have the same orbital elements. They do not have better prose.

---

## Signature Moments That Could Be Magical

**1. The Chiron Return disclosure**

Chiron takes approximately 50 years to complete one orbit. Everyone, around age 49–51, experiences their Chiron Return — the transit of Chiron back to its natal position. This is one of the most significant events in a human life: a confrontation with the original wound, and an invitation to move from wounding to wisdom.

In the transit reading, when transiting Chiron approaches within 3 degrees of natal Chiron, the transit aspect list in `TransitReadingPage.tsx` will show this aspect. But the transit interpretation text for this specific contact should be qualitatively different from any other transit aspect interpretation. It should name what is happening: *"Chiron is returning to the place it occupied when you were born. You are approaching your Chiron Return — the moment the wound teacher comes full circle."*

This is a moment that should stop a user. It is the kind of sentence that makes someone take a screenshot and send it to their therapist.

The mechanism to implement this is straightforward: in `transitAspectBriefs.ts` or a new lookup, a special case for `Chiron_Conjunction_Chiron` with a dedicated interpretation entry. One entry. One sentence. But the right sentence.

**2. Chiron-Sun synastry disclosure**

The vision document notes this explicitly: "If Person 1's Chiron conjuncts Person 2's Sun, that is one of the most significant synastry contacts in depth psychology." This is true. In synastry, Chiron-Sun contacts describe relationships where one person's wound and another person's core identity are inextricably linked. The Chiron person may project their wound onto the Sun person; the Sun person may unconsciously act out the Chiron person's unhealed pattern. The relationship is rarely neutral.

The existing `synastryAspectBriefs.ts` structure uses `${p1}_${aspectType}_${p2}` keys sorted alphabetically. A `Chiron_Conjunction_Sun` entry in that table — with a brief that says something true — would make the synastry page transformative for anyone whose chart has this contact.

**3. The asteroid's natal house disclosure in the reading cards**

Currently in `ReadingDisplay.tsx`, each planet gets its own expanded card showing the planet-in-sign interpretation and the planet-in-house interpretation. When asteroids appear in `chartData.planets` after the type extension, they will flow into this display automatically — but only if the reading data pipeline includes them.

The moment a user expands their Vesta card and reads: *"Vesta in your 7th house — your sacred focus is directed toward committed relationships. Your deepest devotion is not to yourself, but to the one you choose. This placement sometimes means you give more than you receive, and learning to keep a flame burning for yourself is part of the work"* — that is a moment of recognition that makes them share the app.

**4. The slow-moving asteroid as a life chapter marker**

Chiron moves approximately 2 degrees per year. In the transit timeline in `TransitTimeline.tsx`, a Chiron transit through a natal planet's orb might last months. In the monthly reading, this should be called out differently than a fast-moving planet transit. When Saturn or Chiron or Pluto is transiting a natal angle or luminary, that is not a weekly influence. That is a season of life.

The transit reading prompt in `buildTransitPrompt()` in `transits.ts` should include a note to GPT that Chiron, Ceres, Pallas, Juno, and Vesta are slow-moving and when they appear in the monthly aspect list, GPT should frame them as extended themes rather than daily events. One sentence added to the instructions block.

---

## What to Cut or Deprioritize

**Asteroid-to-asteroid aspects in the natal chart.** Chiron opposite Vesta, Juno square Ceres — these are real astrological configurations, but they are advanced territory. The orbs should be tighter than planet-to-planet aspects (no more than 3 degrees for major aspects), as the vision document specifies. But more importantly: these aspects should appear in the transit and natal aspect lists only if they involve a planet as one of the two bodies. Asteroid-to-asteroid only is too deep for this sprint. It dilutes the reading and pushes users into territory that requires significant astrological fluency to interpret. Ship asteroid-planet aspects. Asteroid-asteroid aspects can come later, once users have learned to read Chiron at all.

**Aspect pattern detection for asteroids.** The vision document already calls this out as out of scope. Confirm it. Chiron in a Yod is astrologically significant — but detecting it requires the `detectPatterns()` function in `aspects.ts` to include asteroids, which will find patterns that currently only have planetary precedent in the interpretation database. Without interpretation text, a detected asteroid Yod is noise. Leave `detectPatterns()` planet-only.

**Dignities for asteroids.** Ceres and Virgo rulership is contested. Vesta and Virgo/Scorpio is contested. None of this is canonical in the way that Saturn ruling Capricorn is canonical. The vision document correctly says: skip dignities for asteroids in this sprint. The `getDignity()` function in `dignities.ts` will get called for asteroids if they flow through the same PlanetCard component, so make sure the dignity lookup returns null for asteroid names rather than crashing.

**Lilith.** The vision document says explicitly this is not a sprint target. Do not add it. Not because it is not astrologically significant — it is — but because it is a calculated point, not a Keplerian body, and it requires different calculation infrastructure. Adding it half-heartedly alongside asteroids would produce a bad Lilith implementation. Ship it properly in a future sprint or not at all.

**Asteroid-specific filter UI in the transit timeline.** `TransitTimeline.tsx` has a filter bar for event types: Aspects, Ingresses, Stations, Lunar, Moon. Adding an "Asteroids" filter is possible but premature — it assumes users understand the distinction well enough to want to filter on it. For this sprint, asteroids appear in the Aspects filter alongside planets. If user testing reveals asteroid overload, a filter can be added. Do not add it preemptively.

---

## What Would Make Someone Love This Feature

People love features that tell them something true about themselves that they had not consciously articulated.

Chiron is uniquely positioned to do this because it touches the wound — and everyone has a wound. Not a metaphorical wound, not a self-help concept. An actual pattern of early experience — a place where something broke or never quite formed — that has shaped every significant relationship and decision since. Most people carry this pattern for decades before naming it. When a product tells you the precise location of that wound (Chiron in Taurus in the 2nd house: "self-worth and material security"), and tells you in language that is not therapeutic or clinical but astrological and archetypal, and does it for free, in 30 seconds, based on the time you were born — that is a product people love.

Ceres is the grief planet. She rules the cycles of loss and return — the Persephone myth, the descent and the coming back. Everyone who has lost a parent, a child, a home, a version of themselves recognizes Ceres immediately when it is explained correctly. Ceres in Scorpio, Ceres in the 4th house, Ceres conjunct Pluto — these are placements that describe specific grief signatures, specific patterns of attachment and release.

Pallas is intelligence — not Mercury's quick mind, but the strategic pattern-recognition of Athena. People who have Pallas prominent often feel that their intelligence is "different" — they see patterns others miss, they think in systems, they are often underestimated and then suddenly decisive. Naming this correctly, in the natal reading, gives someone permission to trust how their mind actually works.

Juno is commitment — the asteroid of the marriage bond, of long-term partnership, of what we are willing to stay for. People with Juno in challenged positions often have complex relationship histories that they cannot understand through Venus or Mars alone. Juno explains the pattern at a deeper level: what kind of commitment you are capable of, what you demand in return, where partnership becomes either your prison or your sanctuary.

Vesta is devotion — the sacred flame, the focus that burns. Vesta in a chart describes what a person is truly devoted to, beneath all the social and practical layers. Vesta in the 12th house is the person who does their most sacred work in private. Vesta in the 10th is the person whose career is a vocation. Vesta in Scorpio is the person whose devotion, when it is genuine, is total and terrifying in its intensity.

All five of these have one thing in common: they describe experiences that feel *personal*. Not generically personal, the way "Sun in Scorpio means you are intense" is personal. Specifically personal, in the way that makes someone say "how did it know that?"

The interpretation entries must be written to that standard.

---

## Proposed Improvements and Issues

**1. The `PlanetName` type union in `types.ts` is a bottleneck.**

Currently, `PlanetName` is defined as a strict union of 10 strings (line 15–17 of `types.ts`). `PlanetPosition.name` is typed as `PlanetName | 'NorthNode'`. Adding asteroids means either extending the union (making `PlanetName` a union of 15 strings) or introducing a parallel `AsteroidName` type and a combined `BodyName` type.

The vision document recommends `AsteroidName` as a separate type. This is the right call. It preserves the semantic distinction between classical planets and modern asteroids, and it prevents asteroid names from bleeding into code paths that should only touch classical bodies (like `BODY_MAP` in `astronomy.ts` and `transits.ts`, which maps to `astronomy-engine` Body enums that have no asteroid support).

The practical implementation: `AsteroidName = 'Chiron' | 'Ceres' | 'Pallas' | 'Juno' | 'Vesta'`. Then `PlanetPosition.name` becomes `PlanetName | 'NorthNode' | AsteroidName`. `PLANET_GLYPHS` in `types.ts` must be extended — or a separate `ASTEROID_GLYPHS` constant created — with the Unicode characters: Chiron ⚷, Ceres ⚳, Pallas ⚴, Juno ⚵, Vesta ⚶.

The `ChartWheel.tsx` tooltip component at line 71 does `planet.name !== 'NorthNode' ? getDignity(planet.name as PlanetName, planet.sign) : null` — this cast will need to be guarded for asteroids as well, since `getDignity()` does not have asteroid entries and should return null rather than looking up a phantom.

**2. The `BODY_MAP` pattern in `astronomy.ts` and `transits.ts` is correct but must not be extended with pseudo-entries for asteroids.**

Lines 13–24 of `astronomy.ts` define `BODY_MAP: Record<PlanetName, Astronomy.Body>`. The `astronomy-engine` library does not support asteroid bodies. The asteroid calculation must go through a *different* code path — `astronomia`'s `elliptic.Elements.position()` — and should not be made to look like a BODY_MAP entry, because that would imply `astronomy-engine` is handling it when it is not.

The cleanest implementation: a separate `calculateAsteroidPosition(name: AsteroidName, time: Date): ZodiacPosition` function in `astronomy.ts` that uses hardcoded JPL orbital elements via `astronomia`. Then `calculateChart()` calls this function for each asteroid after the planet loop and appends the results to the `planets` array. This keeps the two calculation paths distinct and auditable.

**3. The applying/separating detection in `aspects.ts` is incorrect.**

Lines 76–77 of `aspects.ts`: `const applying = orb < def.orb * 0.5`. This is a heuristic, not an astronomical determination. A planet is "applying" to an aspect when the orb is decreasing — when the two planets are moving toward exactness — and "separating" when the orb is increasing. The correct determination requires comparing the longitude difference at time T with the longitude difference at time T+1 day, not comparing the orb to half the maximum orb.

This bug is already present and affects the existing planets. Fixing it for all bodies, including the new asteroids, would make the "applying/separating" flag in the aspect tooltips and transit cards accurate rather than a guess. The fix: in `calculateAspects()`, compute the aspect at the current time and at T+1 day, compare the orb direction. This requires access to the time parameter, which means `calculateAspects()` currently lacks it. For natal charts, the birth time is available; for transit aspects, it is already handled more correctly in `calculateTransitAspects()` using `tp.dailyMotion`. Fix the natal chart implementation.

**4. The `computeEnergyRating()` in `transits.ts` will be skewed by asteroid aspects.**

Lines 454–466 of `transits.ts` compute a daily energy rating from the top 8 transit aspects — harmonious aspects add +1, challenging aspects subtract 1. When asteroids are added to the transit aspect list, asteroid-planet aspects will enter this pool. Since asteroids have slower daily motion, they produce aspects with smaller orbs over longer periods. An asteroid opposition (challenging, -1) that lasts three months will permanently deflect the daily energy rating toward "Tense."

The fix: either exclude asteroids from the energy rating computation, or weight asteroid aspects differently (e.g., half the contribution), or apply a separate scoring calculation for asteroids. For this sprint, the simplest and most honest approach is to exclude asteroids from `computeEnergyRating()` entirely and add a separate contextual note if a major asteroid aspect (especially Chiron) is prominent. The energy rating is meant to reflect the day's felt quality; slow-moving asteroid aspects are background context, not daily weather.

**5. The transit `buildTransitPrompt()` function must be taught the difference between fast and slow aspects.**

The current prompt in `transits.ts` (lines 298–423) lists all transit aspects, sorted by orb, and tells GPT to lead with the tightest applying aspect. When Chiron is transiting conjunct natal Mars — a transit that could last 6 months — it may show up as a tight applying aspect and dominate the daily reading. GPT will be instructed to lead with it. But a daily reading dominated by a year-long Chiron transit is not useful.

The prompt should distinguish transit speed. The GPT instructions should say: "Chiron, Ceres, Pallas, Juno, and Vesta are slow-moving. Their transits to natal planets represent extended themes measured in months, not days. In a daily or weekly reading, mention asteroid transits as background context only — do not lead with them. In a monthly reading, they can be foregrounded if within 2 degrees of exact."

**6. The `SolarReturnBiWheel.tsx` needs a visual pass.**

The vision document notes that `SolarReturnBiWheel.tsx` "renders only the bodies in `ChartData.planets`" and that "if `calculateChart()` includes asteroids in the planets array, they appear automatically." This is true. But the bi-wheel has no visual distinction between planets and asteroids. When the solar return chart appears with five additional inner glyphs and no color or radius differentiation, it will be unreadable.

The `SolarReturnBiWheel.tsx` file should apply the same visual logic as `ChartWheel.tsx`: asteroids at a different radius and color. Since `SolarReturnBiWheel.tsx` is a separate component, this logic needs to be added explicitly — it will not inherit from `ChartWheel.tsx`.

**7. The glyph collision detection in `ChartWheel.tsx` is partial.**

Lines 782–788 of `ChartWheel.tsx` check if a transit planet is "too close" to a natal planet and nudge it outward by 12 pixels. There is no equivalent collision detection for natal planets among themselves — if two natal planets are within 5 degrees, their glyphs overlap. For ten bodies this is a rare problem; for sixteen bodies (ten planets + North Node + five asteroids), it becomes a frequent problem.

Specifically: if an asteroid falls within 5 degrees of a planet (a conjunction), the asteroid glyph will overlap the planet glyph when they are at the same radius. Since asteroids are on an inner ring, this is less severe than two planets overlapping — but if the radius difference is only 25 pixels, glyphs at the same longitude will still visually overlap. The angular offset logic from the vision document (offset by 4 degrees if within 5 degrees of a neighbor) must be implemented before the feature ships.

**8. The type guards in `ChartWheel.tsx` use unsafe casts.**

Line 141: `PLANET_GLYPHS[aspect.planet1 as PlanetName] ?? '☊'`. When aspects involving asteroids flow into the chart, `aspect.planet1` may be `'Chiron'`, which is not in `PLANET_GLYPHS` (only `PlanetName | 'NorthNode'`). The fallback `'☊'` (North Node glyph) is used — incorrect. The correct fallback is `ASTEROID_GLYPHS[aspect.planet1]` with a final fallback to `'?'`. Same issue at line 255 in the transit aspect tooltip: `PLANET_GLYPHS[aspect.transitPlanet as PlanetName] ?? '☊'`. Both need to be fixed to check asteroid glyphs before falling back.

---

## The Standard

I want to state it plainly: this sprint is the moment the product either earns its astrological depth or reveals itself as a chart-display tool that got too big for its britches.

The planets are there. The interpretations are there. The chart is beautiful. But Chiron, Ceres, Pallas, Juno, and Vesta are where the product crosses a threshold. They are the bodies that depth psychology and modern astrology care about most deeply, because they describe the inner landscape — the wounds, the cycles, the commitments, the devotions — that planets do not reach.

If we add them correctly, we have a product that can look at someone's chart and say something true about their wound and their wisdom. That is a product people pay for. That is a product people tell their friends about in specific language, not "I found this cool astrology app" but "I used this app and it told me that my Chiron in Taurus in the 2nd house means I've been healing my relationship with money and self-worth my whole life, and that made me cry."

If we add them carelessly — as more dots on a chart, with placeholder interpretations and no visual hierarchy — we will have added noise. And noise in this product does not just fail to help; it actively undermines what was already working.

Ship this right.
